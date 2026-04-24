const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

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

function parseEventType(eventType) {
  if (!eventType) return null;
  return {
    ...eventType,
    availability: parseJsonField(eventType.availability, {}),
    customFields: parseJsonField(eventType.customFields, []),
    questions: parseJsonField(eventType.questions, [])
  };
}

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });
    
    const parsedEventTypes = eventTypes.map(parseEventType);
    res.json({ eventTypes: parsedEventTypes });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', [
  param('id').isString().withMessage('无效的ID')
], async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const eventType = await prisma.eventType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });
    
    if (!eventType) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    if (eventType.userId !== req.user.id) {
      return res.status(403).json({ error: '无权限访问此预约类型' });
    }
    
    res.json({ eventType: parseEventType(eventType) });
  } catch (error) {
    next(error);
  }
});

router.post('/', [
  body('title').notEmpty().withMessage('请输入标题'),
  body('slug').notEmpty().withMessage('请输入链接标识'),
  body('duration').isInt({ min: 1 }).withMessage('请输入有效的时长')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      title,
      slug,
      description,
      duration,
      locationType,
      locationValue,
      minBookingNotice,
      bufferTime,
      maxBookingsPerDay,
      availability,
      customFields,
      questions,
      sendReminder,
      reminderMinutes
    } = req.body;
    
    const existingSlug = await prisma.eventType.findUnique({
      where: { userId_slug: { userId: req.user.id, slug } }
    });
    
    if (existingSlug) {
      return res.status(400).json({ error: '该链接标识已被使用' });
    }
    
    const eventType = await prisma.eventType.create({
      data: {
        userId: req.user.id,
        title,
        slug,
        description,
        duration,
        locationType: locationType || 'online',
        locationValue,
        minBookingNotice: minBookingNotice || 24,
        bufferTime: bufferTime || 0,
        maxBookingsPerDay: maxBookingsPerDay || 5,
        availability: JSON.stringify(availability || {}),
        customFields: JSON.stringify(customFields || []),
        questions: JSON.stringify(questions || []),
        sendReminder: sendReminder !== undefined ? sendReminder : true,
        reminderMinutes: reminderMinutes || 60
      }
    });
    
    res.json({ message: '创建成功', eventType: parseEventType(eventType) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', [
  param('id').isString().withMessage('无效的ID'),
  body('title').optional().notEmpty().withMessage('标题不能为空'),
  body('slug').optional().notEmpty().withMessage('链接标识不能为空'),
  body('duration').optional().isInt({ min: 1 }).withMessage('请输入有效的时长')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      duration,
      locationType,
      locationValue,
      minBookingNotice,
      bufferTime,
      maxBookingsPerDay,
      availability,
      customFields,
      questions,
      sendReminder,
      reminderMinutes,
      isActive
    } = req.body;
    
    const existingEventType = await prisma.eventType.findUnique({
      where: { id }
    });
    
    if (!existingEventType) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    if (existingEventType.userId !== req.user.id) {
      return res.status(403).json({ error: '无权限修改此预约类型' });
    }
    
    if (slug && slug !== existingEventType.slug) {
      const existingSlug = await prisma.eventType.findUnique({
        where: { userId_slug: { userId: req.user.id, slug } }
      });
      
      if (existingSlug) {
        return res.status(400).json({ error: '该链接标识已被使用' });
      }
    }
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration;
    if (locationType !== undefined) updateData.locationType = locationType;
    if (locationValue !== undefined) updateData.locationValue = locationValue;
    if (minBookingNotice !== undefined) updateData.minBookingNotice = minBookingNotice;
    if (bufferTime !== undefined) updateData.bufferTime = bufferTime;
    if (maxBookingsPerDay !== undefined) updateData.maxBookingsPerDay = maxBookingsPerDay;
    if (availability !== undefined) updateData.availability = JSON.stringify(availability);
    if (customFields !== undefined) updateData.customFields = JSON.stringify(customFields);
    if (questions !== undefined) updateData.questions = JSON.stringify(questions);
    if (sendReminder !== undefined) updateData.sendReminder = sendReminder;
    if (reminderMinutes !== undefined) updateData.reminderMinutes = reminderMinutes;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const eventType = await prisma.eventType.update({
      where: { id },
      data: updateData
    });
    
    res.json({ message: '更新成功', eventType: parseEventType(eventType) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', [
  param('id').isString().withMessage('无效的ID')
], async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existingEventType = await prisma.eventType.findUnique({
      where: { id }
    });
    
    if (!existingEventType) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    if (existingEventType.userId !== req.user.id) {
      return res.status(403).json({ error: '无权限删除此预约类型' });
    }
    
    await prisma.eventType.delete({
      where: { id }
    });
    
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
