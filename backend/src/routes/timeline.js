const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { 
  getBookingTimeline, 
  getBookingsWithTimelines, 
  getLifecycleStages,
  createDefaultNotificationRules,
  checkAndSendNotifications,
  triggerWebhook
} = require('../services/timelineService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authMiddleware);

router.get('/lifecycle', (req, res) => {
  const stages = getLifecycleStages();
  res.json({ stages });
});

router.get('/bookings', async (req, res, next) => {
  try {
    const { status } = req.query;
    const bookings = await getBookingsWithTimelines(req.user.id, status);
    
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.get('/bookings/:bookingId', [
  param('bookingId').isString().withMessage('无效的预约ID')
], async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        eventType: true,
        host: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: '预约不存在' });
    }
    
    if (booking.hostId !== req.user.id && booking.guestEmail !== req.user.email) {
      return res.status(403).json({ error: '无权访问此预约' });
    }
    
    const timeline = await getBookingTimeline(bookingId);
    
    res.json({ 
      booking,
      timeline 
    });
  } catch (error) {
    next(error);
  }
});

router.post('/notifications/rules/defaults', async (req, res, next) => {
  try {
    const result = await createDefaultNotificationRules(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/notifications/rules', async (req, res, next) => {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

router.post('/notifications/rules', [
  body('name').notEmpty().withMessage('请输入规则名称'),
  body('triggerType').notEmpty().withMessage('请选择触发类型'),
  body('channelType').notEmpty().withMessage('请选择通知渠道')
], async (req, res, next) => {
  try {
    const { name, triggerType, triggerOffset, channelType, channelConfig, template } = req.body;
    
    const rule = await prisma.notificationRule.create({
      data: {
        userId: req.user.id,
        name,
        triggerType,
        triggerOffset: triggerOffset || 0,
        channelType,
        channelConfig: JSON.stringify(channelConfig || {}),
        template
      }
    });
    
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

router.put('/notifications/rules/:ruleId', [
  param('ruleId').isString().withMessage('无效的规则ID')
], async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const { name, isActive, triggerOffset, channelConfig, template } = req.body;
    
    const rule = await prisma.notificationRule.findUnique({
      where: { id: ruleId }
    });
    
    if (!rule || rule.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此规则' });
    }
    
    const updatedRule = await prisma.notificationRule.update({
      where: { id: ruleId },
      data: {
        name: name || rule.name,
        isActive: isActive !== undefined ? isActive : rule.isActive,
        triggerOffset: triggerOffset !== undefined ? triggerOffset : rule.triggerOffset,
        channelConfig: channelConfig ? JSON.stringify(channelConfig) : rule.channelConfig,
        template: template !== undefined ? template : rule.template
      }
    });
    
    res.json({ rule: updatedRule });
  } catch (error) {
    next(error);
  }
});

router.delete('/notifications/rules/:ruleId', [
  param('ruleId').isString().withMessage('无效的规则ID')
], async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    
    const rule = await prisma.notificationRule.findUnique({
      where: { id: ruleId }
    });
    
    if (!rule || rule.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此规则' });
    }
    
    await prisma.notificationRule.delete({
      where: { id: ruleId }
    });
    
    res.json({ success: true, message: '规则已删除' });
  } catch (error) {
    next(error);
  }
});

router.get('/notifications/logs', async (req, res, next) => {
  try {
    const { bookingId, limit = 20 } = req.query;
    
    const where = {};
    if (bookingId) {
      where.bookingId = bookingId;
    } else {
      const userBookings = await prisma.booking.findMany({
        where: {
          OR: [
            { hostId: req.user.id },
            { guestEmail: req.user.email }
          ]
        },
        select: { id: true }
      });
      where.bookingId = { in: userBookings.map(b => b.id) };
    }
    
    const logs = await prisma.notificationLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

router.get('/webhooks', async (req, res, next) => {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks', [
  body('name').notEmpty().withMessage('请输入Webhook名称'),
  body('url').isURL().withMessage('请输入有效的URL')
], async (req, res, next) => {
  try {
    const { name, url, secret, events, isActive } = req.body;
    
    const subscription = await prisma.webhookSubscription.create({
      data: {
        userId: req.user.id,
        name,
        url,
        secret,
        events: JSON.stringify(events || ['*']),
        isActive: isActive !== false
      }
    });
    
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

router.put('/webhooks/:subscriptionId', [
  param('subscriptionId').isString().withMessage('无效的订阅ID')
], async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { name, url, secret, events, isActive } = req.body;
    
    const subscription = await prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription || subscription.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此订阅' });
    }
    
    const updatedSubscription = await prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        name: name || subscription.name,
        url: url || subscription.url,
        secret: secret !== undefined ? secret : subscription.secret,
        events: events ? JSON.stringify(events) : subscription.events,
        isActive: isActive !== undefined ? isActive : subscription.isActive
      }
    });
    
    res.json({ subscription: updatedSubscription });
  } catch (error) {
    next(error);
  }
});

router.delete('/webhooks/:subscriptionId', [
  param('subscriptionId').isString().withMessage('无效的订阅ID')
], async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription || subscription.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作此订阅' });
    }
    
    await prisma.webhookSubscription.delete({
      where: { id: subscriptionId }
    });
    
    res.json({ success: true, message: 'Webhook订阅已删除' });
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks/test', [
  body('url').isURL().withMessage('请输入有效的URL')
], async (req, res, next) => {
  try {
    const { url, secret } = req.body;
    
    const results = await triggerWebhook(req.user.id, 'test', {
      message: '这是一个测试Webhook事件',
      timestamp: new Date().toISOString()
    });
    
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

router.get('/webhooks/logs/:subscriptionId', [
  param('subscriptionId').isString().withMessage('无效的订阅ID')
], async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { limit = 20 } = req.query;
    
    const subscription = await prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription || subscription.userId !== req.user.id) {
      return res.status(403).json({ error: '无权访问此日志' });
    }
    
    const logs = await prisma.webhookLog.findMany({
      where: { subscriptionId },
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

router.post('/notifications/check', async (req, res, next) => {
  try {
    const result = await checkAndSendNotifications();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
