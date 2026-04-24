const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone');
const { getFreeBusy, generateAvailableSlots, createEvent } = require('../utils/calendar');
const { sendBookingConfirmation } = require('../utils/email');

const prisma = new PrismaClient();
const router = express.Router();

function parseJsonField(field, defaultValue) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

router.get('/event-types/:userId', [
  param('userId').isString().withMessage('无效的用户ID')
], async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const eventTypes = await prisma.eventType.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        duration: true,
        locationType: true,
        customFields: true,
        questions: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsedEventTypes = eventTypes.map(et => ({
      ...et,
      customFields: parseJsonField(et.customFields, []),
      questions: parseJsonField(et.questions, [])
    }));
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        timezone: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user, eventTypes: parsedEventTypes });
  } catch (error) {
    next(error);
  }
});

router.get('/event-type/:userId/:slug', [
  param('userId').isString().withMessage('无效的用户ID'),
  param('slug').isString().withMessage('无效的链接标识')
], async (req, res, next) => {
  try {
    const { userId, slug } = req.params;
    
    const eventType = await prisma.eventType.findUnique({
      where: {
        userId_slug: { userId, slug }
      }
    });
    
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        timezone: true
      }
    });
    
    res.json({
      user,
      eventType: {
        id: eventType.id,
        slug: eventType.slug,
        title: eventType.title,
        description: eventType.description,
        duration: eventType.duration,
        locationType: eventType.locationType,
        locationValue: eventType.locationValue,
        minBookingNotice: eventType.minBookingNotice,
        bufferTime: eventType.bufferTime,
        maxBookingsPerDay: eventType.maxBookingsPerDay,
        customFields: parseJsonField(eventType.customFields, []),
        questions: parseJsonField(eventType.questions, [])
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/available-slots', [
  body('eventTypeId').isString().withMessage('请提供预约类型ID'),
  body('timezone').optional().isString().withMessage('无效的时区')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { eventTypeId, timezone } = req.body;
    
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { user: true }
    });
    
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    const now = moment();
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
        timezone || eventType.user.timezone
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
      timezone || eventType.user.timezone
    );
    
    const filteredSlots = allSlots.filter(slot => {
      const slotStart = moment(slot.start);
      return slotStart.isAfter(earliestBooking);
    });
    
    const slotsByDate = {};
    filteredSlots.forEach(slot => {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = [];
      }
      slotsByDate[slot.date].push({
        start: slot.start,
        end: slot.end,
        time: slot.time
      });
    });
    
    const availableDates = Object.keys(slotsByDate).sort().map(date => ({
      date,
      slots: slotsByDate[date].sort((a, b) => a.time.localeCompare(b.time))
    }));
    
    res.json({
      availableDates,
      timezone: timezone || eventType.user.timezone,
      eventType: {
        id: eventType.id,
        title: eventType.title,
        duration: eventType.duration
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/book', [
  body('eventTypeId').isString().withMessage('请提供预约类型ID'),
  body('startTime').isISO8601().withMessage('请提供有效的开始时间'),
  body('guestName').notEmpty().withMessage('请输入姓名'),
  body('guestEmail').isEmail().withMessage('请输入有效的邮箱地址')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      eventTypeId,
      startTime,
      endTime,
      guestName,
      guestEmail,
      guestPhone,
      guestNotes,
      customResponses,
      timezone
    } = req.body;
    
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { user: true }
    });
    
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    const start = moment(startTime);
    const end = endTime ? moment(endTime) : start.clone().add(eventType.duration, 'minutes');
    
    const now = moment();
    const minNoticeMinutes = eventType.minBookingNotice * 60;
    
    if (start.isBefore(now.clone().add(minNoticeMinutes, 'minutes'))) {
      return res.status(400).json({ 
        error: `预约需要至少提前 ${eventType.minBookingNotice} 小时` 
      });
    }
    
    const dateKey = start.format('YYYY-MM-DD');
    const bookingsOnDay = await prisma.booking.count({
      where: {
        eventTypeId,
        status: 'confirmed',
        startTime: {
          gte: moment(dateKey).startOf('day').toDate(),
          lte: moment(dateKey).endOf('day').toDate()
        }
      }
    });
    
    if (bookingsOnDay >= eventType.maxBookingsPerDay) {
      return res.status(400).json({ 
        error: '该日期预约已满，请选择其他日期' 
      });
    }
    
    const conflictingBookings = await prisma.booking.findFirst({
      where: {
        hostId: eventType.userId,
        status: 'confirmed',
        startTime: { lt: end.toDate() },
        endTime: { gt: start.toDate() }
      }
    });
    
    if (conflictingBookings) {
      return res.status(400).json({ error: '该时间段已有预约' });
    }
    
    let meetingUrl = eventType.locationValue;
    
    try {
      const calendarConnection = await prisma.calendarConnection.findUnique({
        where: { 
          userId_provider: { 
            userId: eventType.userId, 
            provider: 'google' 
          } 
        }
      });
      
      if (calendarConnection) {
        const eventResult = await createEvent(eventType.userId, {
          title: `${eventType.title} - 与 ${guestName}`,
          description: guestNotes || '',
          startTime: start.toDate(),
          endTime: end.toDate(),
          timezone: timezone || eventType.user.timezone,
          attendees: [guestEmail, eventType.user.email],
          reminderMinutes: eventType.reminderMinutes
        });
        
        meetingUrl = eventResult.meetLink || meetingUrl;
      }
    } catch (error) {
      console.error('Failed to create calendar event:', error);
    }
    
    const booking = await prisma.booking.create({
      data: {
        eventTypeId: eventType.id,
        hostId: eventType.userId,
        guestEmail,
        guestName,
        guestPhone,
        guestNotes,
        customResponses: JSON.stringify(customResponses || {}),
        startTime: start.toDate(),
        endTime: end.toDate(),
        timezone: timezone || eventType.user.timezone,
        meetingUrl,
        location: eventType.locationType === 'inperson' ? eventType.locationValue : null,
        status: 'confirmed'
      },
      include: {
        eventType: true,
        host: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });
    
    try {
      await sendBookingConfirmation(booking, eventType.user, eventType);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
    
    res.json({
      message: '预约成功',
      booking: {
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingUrl: booking.meetingUrl,
        location: booking.location,
        status: booking.status
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
