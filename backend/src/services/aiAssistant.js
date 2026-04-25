const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone');

const prisma = new PrismaClient();

const INTENT_TYPES = {
  CREATE_BOOKING: 'create_booking',
  RESCHEDULE_BOOKING: 'reschedule_booking',
  CANCEL_BOOKING: 'cancel_booking',
  QUERY_SCHEDULE: 'query_schedule',
  QUERY_AVAILABILITY: 'query_availability',
  UPDATE_SETTINGS: 'update_settings',
  UNKNOWN: 'unknown'
};

const KEYWORDS = {
  [INTENT_TYPES.CREATE_BOOKING]: ['新建', '创建', '预约', '安排', '定', 'book', 'create', 'new', 'schedule'],
  [INTENT_TYPES.RESCHEDULE_BOOKING]: ['改期', '更改时间', '重新安排', '换时间', 'reschedule', 'change', 'move'],
  [INTENT_TYPES.CANCEL_BOOKING]: ['取消', '删除', '撤销', 'cancel', 'delete', 'remove'],
  [INTENT_TYPES.QUERY_SCHEDULE]: ['查询', '看看', '查看', '我的日程', '我有什么', 'query', 'show', 'what', 'when', 'schedule', 'calendar'],
  [INTENT_TYPES.QUERY_AVAILABILITY]: ['空闲', '有空', '可用', '什么时候有空', 'available', 'free', 'when can']
};

function parseIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  let detectedIntent = INTENT_TYPES.UNKNOWN;
  let maxMatches = 0;
  
  for (const [intent, keywords] of Object.entries(KEYWORDS)) {
    const matches = keywords.filter(kw => 
      lowerMessage.includes(kw.toLowerCase())
    ).length;
    
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedIntent = intent;
    }
  }
  
  return detectedIntent;
}

function extractDateTime(message, timezone = 'Asia/Shanghai') {
  const patterns = [
    { regex: /(\d{4})年(\d{1,2})月(\d{1,2})日/, groups: ['year', 'month', 'day'] },
    { regex: /(\d{1,2})月(\d{1,2})日/, groups: ['month', 'day'] },
    { regex: /(\d{1,2})号/, groups: ['day'] },
    { regex: /今天/, keyword: 'today' },
    { regex: /明天/, keyword: 'tomorrow' },
    { regex: /后天/, keyword: 'dayAfterTomorrow' },
    { regex: /下周[一二三四五六日天]/, keyword: 'nextWeek' },
    { regex: /(\d{1,2})点(\d{0,2})/, groups: ['hour', 'minute'] },
    { regex: /上午(\d{1,2})/, groups: ['hour'], modifier: 'am' },
    { regex: /下午(\d{1,2})/, groups: ['hour'], modifier: 'pm' }
  ];
  
  const result = {
    date: null,
    time: null,
    raw: {}
  };
  
  const now = moment().tz(timezone);
  
  if (message.includes('今天')) {
    result.date = now.clone().startOf('day');
  } else if (message.includes('明天')) {
    result.date = now.clone().add(1, 'days').startOf('day');
  } else if (message.includes('后天')) {
    result.date = now.clone().add(2, 'days').startOf('day');
  }
  
  const dateMatch = message.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (dateMatch) {
    result.date = moment.tz(
      `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`,
      'YYYY-MM-DD',
      timezone
    );
  }
  
  const monthDayMatch = message.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDayMatch && !result.date) {
    const year = now.year();
    result.date = moment.tz(
      `${year}-${monthDayMatch[1].padStart(2, '0')}-${monthDayMatch[2].padStart(2, '0')}`,
      'YYYY-MM-DD',
      timezone
    );
  }
  
  const dayMatch = message.match(/(\d{1,2})号/);
  if (dayMatch && !result.date) {
    const month = now.month() + 1;
    const year = now.year();
    result.date = moment.tz(
      `${year}-${month.toString().padStart(2, '0')}-${dayMatch[1].padStart(2, '0')}`,
      'YYYY-MM-DD',
      timezone
    );
  }
  
  const timeMatch = message.match(/(\d{1,2})点(\d{0,2})/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    
    if (message.includes('下午') || message.includes('pm')) {
      if (hour < 12) hour += 12;
    } else if ((message.includes('上午') || message.includes('am')) && hour === 12) {
      hour = 0;
    }
    
    result.time = { hour, minute };
  }
  
  return result;
}

function extractDuration(message) {
  const patterns = [
    { regex: /(\d+)\s*(分钟|min|minute)/i, multiplier: 1 },
    { regex: /(\d+)\s*(小时|hour|hr)/i, multiplier: 60 },
    { regex: /(\d+)\s*(半)?\s*小时/i, multiplier: 60, half: true }
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      let minutes = parseInt(match[1]) * pattern.multiplier;
      if (pattern.half && match[2]) {
        minutes += 30;
      }
      return minutes;
    }
  }
  
  return 30;
}

function extractBookingId(message) {
  const idPattern = /[a-z0-9]{20,}/i;
  const match = message.match(idPattern);
  return match ? match[0] : null;
}

async function parseMessage(message, userId, timezone = 'Asia/Shanghai') {
  const intent = parseIntent(message);
  const dateTime = extractDateTime(message, timezone);
  const duration = extractDuration(message);
  const bookingId = extractBookingId(message);
  
  const result = {
    intent,
    message,
    parsedData: {
      dateTime,
      duration,
      bookingId,
      timezone
    }
  };
  
  return result;
}

async function generateResponse(intent, parsedData, userId) {
  const responses = {
    [INTENT_TYPES.CREATE_BOOKING]: async () => {
      const { dateTime, duration } = parsedData;
      
      if (!dateTime.date) {
        return {
          type: 'clarification',
          message: '请问您想预约哪一天？',
          suggestions: ['明天上午', '后天下午', '下周一10点']
        };
      }
      
      const eventTypes = await prisma.eventType.findMany({
        where: { userId, isActive: true },
        select: { id: true, title: true, duration: true }
      });
      
      return {
        type: 'preview',
        message: '我帮您找到了以下可用的预约类型，请选择：',
        actionType: 'create_booking',
        previewData: {
          date: dateTime.date?.format('YYYY-MM-DD'),
          time: dateTime.time ? `${dateTime.time.hour}:${(dateTime.time.minute || 0).toString().padStart(2, '0')}` : null,
          duration: duration || 30,
          eventTypes
        }
      };
    },
    
    [INTENT_TYPES.RESCHEDULE_BOOKING]: async () => {
      const { bookingId, dateTime } = parsedData;
      
      if (!bookingId) {
        const upcomingBookings = await prisma.booking.findMany({
          where: {
            hostId: userId,
            status: 'confirmed',
            startTime: { gte: new Date() }
          },
          include: { eventType: true },
          orderBy: { startTime: 'asc' },
          take: 5
        });
        
        return {
          type: 'clarification',
          message: '请问您想改期哪个预约？以下是您近期的预约：',
          bookings: upcomingBookings.map(b => ({
            id: b.id,
            title: b.eventType?.title || '预约',
            time: moment(b.startTime).tz(parsedData.timezone).format('MM月DD日 HH:mm'),
            guest: b.guestName
          }))
        };
      }
      
      if (!dateTime.date) {
        return {
          type: 'clarification',
          message: '请问您想改到什么时间？',
          suggestions: ['明天上午10点', '后天下午3点', '下周一']
        };
      }
      
      return {
        type: 'preview',
        message: '请确认改期信息：',
        actionType: 'reschedule_booking',
        previewData: {
          bookingId,
          newDate: dateTime.date?.format('YYYY-MM-DD'),
          newTime: dateTime.time ? `${dateTime.time.hour}:${(dateTime.time.minute || 0).toString().padStart(2, '0')}` : null
        }
      };
    },
    
    [INTENT_TYPES.CANCEL_BOOKING]: async () => {
      const { bookingId } = parsedData;
      
      if (!bookingId) {
        const upcomingBookings = await prisma.booking.findMany({
          where: {
            hostId: userId,
            status: 'confirmed',
            startTime: { gte: new Date() }
          },
          include: { eventType: true },
          orderBy: { startTime: 'asc' },
          take: 5
        });
        
        return {
          type: 'clarification',
          message: '请问您想取消哪个预约？',
          bookings: upcomingBookings.map(b => ({
            id: b.id,
            title: b.eventType?.title || '预约',
            time: moment(b.startTime).tz(parsedData.timezone).format('MM月DD日 HH:mm'),
            guest: b.guestName
          }))
        };
      }
      
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { eventType: true }
      });
      
      if (!booking) {
        return {
          type: 'error',
          message: '未找到该预约'
        };
      }
      
      return {
        type: 'preview',
        message: '请确认取消以下预约：',
        actionType: 'cancel_booking',
        previewData: {
          bookingId: booking.id,
          title: booking.eventType?.title || '预约',
          time: moment(booking.startTime).tz(parsedData.timezone).format('YYYY年MM月DD日 HH:mm'),
          guest: booking.guestName
        }
      };
    },
    
    [INTENT_TYPES.QUERY_SCHEDULE]: async () => {
      const { dateTime, timezone } = parsedData;
      
      let startDate, endDate;
      
      if (dateTime.date) {
        startDate = dateTime.date.clone().startOf('day');
        endDate = dateTime.date.clone().endOf('day');
      } else {
        startDate = moment().tz(timezone).startOf('day');
        endDate = moment().tz(timezone).add(7, 'days').endOf('day');
      }
      
      const bookings = await prisma.booking.findMany({
        where: {
          hostId: userId,
          status: 'confirmed',
          startTime: {
            gte: startDate.toDate(),
            lte: endDate.toDate()
          }
        },
        include: { eventType: true },
        orderBy: { startTime: 'asc' }
      });
      
      if (bookings.length === 0) {
        return {
          type: 'info',
          message: dateTime.date 
            ? `${dateTime.date.format('MM月DD日')}您没有预约` 
            : '近期您没有预约'
        };
      }
      
      return {
        type: 'info',
        message: dateTime.date 
          ? `${dateTime.date.format('MM月DD日')}您有 ${bookings.length} 个预约：` 
          : `您近期有 ${bookings.length} 个预约：`,
        bookings: bookings.map(b => ({
          id: b.id,
          title: b.eventType?.title || '预约',
          time: moment(b.startTime).tz(timezone).format('MM月DD日 HH:mm'),
          guest: b.guestName,
          location: b.meetingUrl ? '线上' : (b.location || '待定')
        }))
      };
    },
    
    [INTENT_TYPES.QUERY_AVAILABILITY]: async () => {
      const { dateTime, timezone } = parsedData;
      
      let targetDate = dateTime.date || moment().tz(timezone);
      
      const eventTypes = await prisma.eventType.findMany({
        where: { userId, isActive: true },
        take: 1
      });
      
      if (eventTypes.length === 0) {
        return {
          type: 'error',
          message: '您还没有创建预约类型'
        };
      }
      
      const bookings = await prisma.booking.findMany({
        where: {
          hostId: userId,
          status: 'confirmed',
          startTime: {
            gte: targetDate.clone().startOf('day').toDate(),
            lte: targetDate.clone().endOf('day').toDate()
          }
        },
        orderBy: { startTime: 'asc' }
      });
      
      const busySlots = bookings.map(b => ({
        start: moment(b.startTime).tz(timezone).format('HH:mm'),
        end: moment(b.endTime).tz(timezone).format('HH:mm')
      }));
      
      if (busySlots.length === 0) {
        return {
          type: 'info',
          message: `${targetDate.format('MM月DD日')}您全天有空`,
          available: true,
          busySlots: []
        };
      }
      
      return {
        type: 'info',
        message: `${targetDate.format('MM月DD日')}您的忙碌时段：`,
        available: false,
        busySlots
      };
    },
    
    [INTENT_TYPES.UNKNOWN]: async () => {
      return {
        type: 'clarification',
        message: '我不太明白您的需求。您可以试试说：\n• "帮我预约明天上午10点"\n• "查询明天的日程"\n• "取消下周一的预约"\n• "看看我什么时候有空"',
        suggestions: ['预约明天', '查询日程', '查看空闲时间']
      };
    }
  };
  
  const handler = responses[intent] || responses[INTENT_TYPES.UNKNOWN];
  return handler();
}

async function executeAction(actionType, actionData, userId) {
  switch (actionType) {
    case 'create_booking':
      return executeCreateBooking(actionData, userId);
    case 'reschedule_booking':
      return executeRescheduleBooking(actionData, userId);
    case 'cancel_booking':
      return executeCancelBooking(actionData, userId);
    default:
      throw new Error('未知的操作类型');
  }
}

async function executeCreateBooking(actionData, userId) {
  const { eventTypeId, date, time, duration, guestName, guestEmail } = actionData;
  
  if (!eventTypeId || !date || !time) {
    throw new Error('缺少必要的预约信息');
  }
  
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId }
  });
  
  if (!eventType || eventType.userId !== userId) {
    throw new Error('预约类型不存在');
  }
  
  const [hour, minute] = time.split(':').map(Number);
  const startTime = moment.tz(`${date} ${hour}:${minute}`, 'YYYY-MM-DD HH:mm', eventType.user?.timezone || 'Asia/Shanghai');
  const endTime = startTime.clone().add(duration || eventType.duration, 'minutes');
  
  const conflictingBookings = await prisma.booking.findFirst({
    where: {
      hostId: userId,
      status: 'confirmed',
      startTime: { lt: endTime.toDate() },
      endTime: { gt: startTime.toDate() }
    }
  });
  
  if (conflictingBookings) {
    throw new Error('该时间段已有预约');
  }
  
  const booking = await prisma.booking.create({
    data: {
      eventTypeId,
      hostId: userId,
      guestName: guestName || 'AI创建',
      guestEmail: guestEmail || 'ai@flowmeet.local',
      startTime: startTime.toDate(),
      endTime: endTime.toDate(),
      timezone: eventType.user?.timezone || 'Asia/Shanghai',
      status: 'confirmed'
    },
    include: { eventType: true }
  });
  
  await prisma.bookingTimelineEvent.create({
    data: {
      bookingId: booking.id,
      eventType: 'created',
      eventData: JSON.stringify({ source: 'ai_assistant', userId }),
      triggeredBy: userId
    }
  });
  
  return {
    success: true,
    message: '预约创建成功',
    booking: {
      id: booking.id,
      title: booking.eventType?.title,
      startTime: booking.startTime,
      endTime: booking.endTime
    }
  };
}

async function executeRescheduleBooking(actionData, userId) {
  const { bookingId, newDate, newTime } = actionData;
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: true }
  });
  
  if (!booking) {
    throw new Error('预约不存在');
  }
  
  if (booking.hostId !== userId) {
    throw new Error('无权修改此预约');
  }
  
  const [hour, minute] = newTime.split(':').map(Number);
  const newStartTime = moment.tz(`${newDate} ${hour}:${minute}`, 'YYYY-MM-DD HH:mm', booking.timezone);
  const duration = moment(booking.endTime).diff(booking.startTime, 'minutes');
  const newEndTime = newStartTime.clone().add(duration, 'minutes');
  
  const conflictingBookings = await prisma.booking.findFirst({
    where: {
      hostId: userId,
      id: { not: bookingId },
      status: 'confirmed',
      startTime: { lt: newEndTime.toDate() },
      endTime: { gt: newStartTime.toDate() }
    }
  });
  
  if (conflictingBookings) {
    throw new Error('新时间段已有预约');
  }
  
  const oldStartTime = booking.startTime;
  
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      startTime: newStartTime.toDate(),
      endTime: newEndTime.toDate(),
      status: 'rescheduled'
    },
    include: { eventType: true }
  });
  
  await prisma.bookingTimelineEvent.create({
    data: {
      bookingId: booking.id,
      eventType: 'rescheduled',
      eventData: JSON.stringify({
        oldStartTime,
        newStartTime: newStartTime.toDate(),
        source: 'ai_assistant'
      }),
      triggeredBy: userId
    }
  });
  
  return {
    success: true,
    message: '预约改期成功',
    booking: {
      id: updatedBooking.id,
      title: updatedBooking.eventType?.title,
      startTime: updatedBooking.startTime,
      endTime: updatedBooking.endTime
    }
  };
}

async function executeCancelBooking(actionData, userId) {
  const { bookingId, reason } = actionData;
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { eventType: true }
  });
  
  if (!booking) {
    throw new Error('预约不存在');
  }
  
  if (booking.hostId !== userId) {
    throw new Error('无权取消此预约');
  }
  
  if (booking.status === 'cancelled') {
    throw new Error('预约已取消');
  }
  
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'cancelled'
    },
    include: { eventType: true }
  });
  
  await prisma.bookingTimelineEvent.create({
    data: {
      bookingId: booking.id,
      eventType: 'cancelled',
      eventData: JSON.stringify({
        reason: reason || '用户通过AI助手取消',
        source: 'ai_assistant'
      }),
      triggeredBy: userId
    }
  });
  
  return {
    success: true,
    message: '预约取消成功',
    booking: {
      id: updatedBooking.id,
      title: updatedBooking.eventType?.title,
      status: 'cancelled'
    }
  };
}

async function createPendingAction(userId, sessionId, actionType, actionData, previewData) {
  return prisma.aIPendingAction.create({
    data: {
      userId,
      sessionId,
      actionType,
      actionData: JSON.stringify(actionData),
      previewData: JSON.stringify(previewData),
      expiresAt: moment().add(30, 'minutes').toDate()
    }
  });
}

async function confirmPendingAction(actionId, userId) {
  const pendingAction = await prisma.aIPendingAction.findUnique({
    where: { id: actionId }
  });
  
  if (!pendingAction) {
    throw new Error('待确认操作不存在');
  }
  
  if (pendingAction.userId !== userId) {
    throw new Error('无权确认此操作');
  }
  
  if (pendingAction.status !== 'pending') {
    throw new Error('操作已被处理');
  }
  
  if (moment().isAfter(pendingAction.expiresAt)) {
    throw new Error('操作已过期');
  }
  
  const actionData = JSON.parse(pendingAction.actionData);
  const result = await executeAction(pendingAction.actionType, actionData, userId);
  
  await prisma.aIPendingAction.update({
    where: { id: actionId },
    data: { status: 'confirmed' }
  });
  
  return result;
}

module.exports = {
  parseMessage,
  generateResponse,
  executeAction,
  createPendingAction,
  confirmPendingAction,
  INTENT_TYPES
};
