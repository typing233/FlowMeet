const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone');
const { generateAvailableSlots, getFreeBusy } = require('../utils/calendar');

const prisma = new PrismaClient();

const TIMEZONE_OFFSETS = {
  'Asia/Shanghai': 8,
  'Asia/Tokyo': 9,
  'Asia/Hong_Kong': 8,
  'Asia/Singapore': 8,
  'America/New_York': -5,
  'America/Los_Angeles': -8,
  'America/Chicago': -6,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Australia/Sydney': 11
};

function getTimezoneOffset(timezone) {
  return TIMEZONE_OFFSETS[timezone] || 8;
}

function isTimezoneFriendly(hostTimezone, guestTimezone) {
  const hostOffset = getTimezoneOffset(hostTimezone);
  const guestOffset = getTimezoneOffset(guestTimezone);
  const diff = Math.abs(hostOffset - guestOffset);
  return diff <= 3;
}

function getTimezoneDiffHours(hostTimezone, guestTimezone) {
  const hostOffset = getTimezoneOffset(hostTimezone);
  const guestOffset = getTimezoneOffset(guestTimezone);
  return guestOffset - hostOffset;
}

async function calculateHostLoad(userId, date, timezone) {
  const startOfDay = moment.tz(date, 'YYYY-MM-DD', timezone).startOf('day');
  const endOfDay = startOfDay.clone().endOf('day');
  
  const bookings = await prisma.booking.findMany({
    where: {
      hostId: userId,
      status: 'confirmed',
      startTime: {
        gte: startOfDay.toDate(),
        lte: endOfDay.toDate()
      }
    },
    orderBy: { startTime: 'asc' }
  });
  
  if (bookings.length === 0) {
    return {
      score: 0,
      level: 'low',
      bookings: 0,
      totalMinutes: 0,
      gaps: []
    };
  }
  
  let totalMinutes = 0;
  const gaps = [];
  
  bookings.forEach((booking, index) => {
    const duration = moment(booking.endTime).diff(booking.startTime, 'minutes');
    totalMinutes += duration;
    
    if (index > 0) {
      const prevBooking = bookings[index - 1];
      const gapMinutes = moment(booking.startTime).diff(prevBooking.endTime, 'minutes');
      if (gapMinutes > 0) {
        gaps.push({
          start: prevBooking.endTime,
          end: booking.startTime,
          minutes: gapMinutes
        });
      }
    }
  });
  
  let loadScore = 0;
  const bookingCount = bookings.length;
  
  if (bookingCount >= 5) loadScore += 30;
  else if (bookingCount >= 3) loadScore += 20;
  else if (bookingCount >= 1) loadScore += 10;
  
  if (totalMinutes >= 360) loadScore += 40;
  else if (totalMinutes >= 240) loadScore += 30;
  else if (totalMinutes >= 120) loadScore += 15;
  
  if (gaps.length === 0 && bookingCount > 1) loadScore += 30;
  
  const normalizedScore = Math.min(loadScore / 100, 1);
  
  let level = 'low';
  if (normalizedScore >= 0.7) level = 'high';
  else if (normalizedScore >= 0.4) level = 'medium';
  
  return {
    score: normalizedScore,
    level,
    bookings: bookingCount,
    totalMinutes,
    gaps
  };
}

function estimateCommuteTime(locationType, locationValue) {
  if (locationType !== 'inperson' || !locationValue) {
    return 0;
  }
  
  return 30;
}

function generateSmartTags(slot, hostTimezone, guestTimezone, hostLoad, commuteMinutes) {
  const tags = [];
  
  if (isTimezoneFriendly(hostTimezone, guestTimezone)) {
    tags.push({
      key: 'timezone_friendly',
      label: '时区友好',
      color: 'green',
      description: `双方时区差异在3小时以内`
    });
  } else {
    const diff = getTimezoneDiffHours(hostTimezone, guestTimezone);
    tags.push({
      key: 'timezone_diff',
      label: `时区差异 ${diff > 0 ? '+' : ''}${diff}小时`,
      color: 'yellow',
      description: `访客时区与主人时区相差${Math.abs(diff)}小时`
    });
  }
  
  if (commuteMinutes > 0) {
    if (commuteMinutes <= 15) {
      tags.push({
        key: 'commute_easy',
        label: '通勤便捷',
        color: 'green',
        description: `预计通勤时间约${commuteMinutes}分钟`
      });
    } else if (commuteMinutes <= 45) {
      tags.push({
        key: 'commute_normal',
        label: `通勤约${commuteMinutes}分钟`,
        color: 'blue',
        description: `预计通勤时间约${commuteMinutes}分钟`
      });
    } else {
      tags.push({
        key: 'commute_long',
        label: `通勤较长`,
        color: 'yellow',
        description: `预计通勤时间约${commuteMinutes}分钟`
      });
    }
  }
  
  if (hostLoad.level === 'low') {
    tags.push({
      key: 'low_load',
      label: '低负荷',
      color: 'green',
      description: `主人当日日程宽松，仅有${hostLoad.bookings}个预约`
    });
  } else if (hostLoad.level === 'medium') {
    tags.push({
      key: 'medium_load',
      label: '中等负荷',
      color: 'blue',
      description: `主人当日有${hostLoad.bookings}个预约，共${hostLoad.totalMinutes}分钟`
    });
  } else {
    tags.push({
      key: 'high_load',
      label: '高负荷',
      color: 'yellow',
      description: `主人当日日程较满，建议选择其他日期`
    });
  }
  
  return tags;
}

async function getRecommendedSlots(eventTypeId, guestTimezone = 'Asia/Shanghai') {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    include: { user: true }
  });
  
  if (!eventType || !eventType.isActive) {
    throw new Error('预约类型不存在');
  }
  
  const hostTimezone = eventType.user.timezone || 'Asia/Shanghai';
  const now = moment().tz(hostTimezone);
  
  const minNoticeMinutes = eventType.minBookingNotice * 60;
  const earliestBooking = now.clone().add(minNoticeMinutes, 'minutes');
  
  const timeMin = earliestBooking.toDate();
  const timeMax = now.clone().add(30, 'days').toDate();
  
  let busySlots = [];
  try {
    busySlots = await getFreeBusy(
      eventType.userId,
      timeMin,
      timeMax,
      hostTimezone
    );
  } catch (error) {
    console.warn('Failed to get free/busy:', error.message);
  }
  
  const availability = parseJsonField(eventType.availability, {});
  
  if (Object.keys(availability).length === 0) {
    availability.monday = [{ start: '09:00', end: '18:00' }];
    availability.tuesday = [{ start: '09:00', end: '18:00' }];
    availability.wednesday = [{ start: '09:00', end: '18:00' }];
    availability.thursday = [{ start: '09:00', end: '18:00' }];
    availability.friday = [{ start: '09:00', end: '18:00' }];
  }
  
  const allSlots = generateAvailableSlots(
    availability,
    busySlots,
    eventType.duration,
    hostTimezone
  );
  
  const filteredSlots = allSlots.filter(slot => {
    const slotStart = moment(slot.start);
    return slotStart.isAfter(earliestBooking);
  });
  
  const slotsWithRecommendations = [];
  
  for (const slot of filteredSlots.slice(0, 50)) {
    const slotDate = moment(slot.start).tz(hostTimezone).format('YYYY-MM-DD');
    const hostLoad = await calculateHostLoad(eventType.userId, slotDate, hostTimezone);
    const commuteMinutes = estimateCommuteTime(eventType.locationType, eventType.locationValue);
    
    const tags = generateSmartTags(slot, hostTimezone, guestTimezone, hostLoad, commuteMinutes);
    
    let score = 100;
    
    if (hostLoad.level === 'medium') score -= 10;
    if (hostLoad.level === 'high') score -= 30;
    
    if (!isTimezoneFriendly(hostTimezone, guestTimezone)) {
      const diff = Math.abs(getTimezoneDiffHours(hostTimezone, guestTimezone));
      score -= diff * 5;
    }
    
    if (commuteMinutes > 30) score -= 15;
    else if (commuteMinutes > 15) score -= 5;
    
    const slotHour = moment(slot.start).tz(hostTimezone).hour();
    if (slotHour >= 9 && slotHour < 12) score += 10;
    else if (slotHour >= 14 && slotHour < 17) score += 5;
    else if (slotHour >= 12 && slotHour < 14) score -= 5;
    else if (slotHour < 9 || slotHour >= 18) score -= 10;
    
    const dayOfWeek = moment(slot.start).tz(hostTimezone).day();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) score += 5;
    
    slotsWithRecommendations.push({
      ...slot,
      score: Math.max(0, score),
      tags,
      hostLoad: {
        level: hostLoad.level,
        bookings: hostLoad.bookings,
        totalMinutes: hostLoad.totalMinutes
      },
      commuteMinutes,
      timezoneInfo: {
        host: hostTimezone,
        guest: guestTimezone,
        diffHours: getTimezoneDiffHours(hostTimezone, guestTimezone)
      }
    });
  }
  
  slotsWithRecommendations.sort((a, b) => b.score - a.score);
  
  const topSlots = slotsWithRecommendations.slice(0, 15);
  
  const bestSlot = topSlots[0];
  const alternatives = topSlots.slice(1, 6);
  
  return {
    eventType: {
      id: eventType.id,
      title: eventType.title,
      duration: eventType.duration,
      locationType: eventType.locationType
    },
    host: {
      id: eventType.user.id,
      name: eventType.user.name,
      timezone: hostTimezone
    },
    timezoneInfo: {
      host: hostTimezone,
      guest: guestTimezone,
      diffHours: getTimezoneDiffHours(hostTimezone, guestTimezone),
      isFriendly: isTimezoneFriendly(hostTimezone, guestTimezone)
    },
    recommended: bestSlot,
    alternatives,
    allSlots: slotsWithRecommendations,
    generatedAt: new Date().toISOString()
  };
}

function parseJsonField(field, defaultValue) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

async function convertTimezoneForGuest(slots, guestTimezone, hostTimezone) {
  return slots.map(slot => {
    const startTime = moment(slot.start).tz(hostTimezone);
    const guestStartTime = startTime.clone().tz(guestTimezone);
    
    return {
      ...slot,
      guestTime: {
        date: guestStartTime.format('YYYY-MM-DD'),
        time: guestStartTime.format('HH:mm'),
        datetime: guestStartTime.toISOString(),
        timezone: guestTimezone
      },
      hostTime: {
        date: startTime.format('YYYY-MM-DD'),
        time: startTime.format('HH:mm'),
        datetime: startTime.toISOString(),
        timezone: hostTimezone
      }
    };
  });
}

module.exports = {
  getRecommendedSlots,
  calculateHostLoad,
  generateSmartTags,
  isTimezoneFriendly,
  getTimezoneDiffHours,
  estimateCommuteTime,
  convertTimezoneForGuest,
  TIMEZONE_OFFSETS
};
