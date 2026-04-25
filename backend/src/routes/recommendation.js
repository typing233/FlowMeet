const express = require('express');
const { body, param, query } = require('express-validator');
const { getRecommendedSlots, TIMEZONE_OFFSETS } = require('../services/recommendation');

const router = express.Router();

router.get('/timezones', (req, res) => {
  res.json({ 
    timezones: Object.entries(TIMEZONE_OFFSETS).map(([name, offset]) => ({
      name,
      offset,
      label: offset >= 0 ? `UTC+${offset} ${name}` : `UTC${offset} ${name}`
    }))
  });
});

router.post('/slots', [
  body('eventTypeId').isString().withMessage('请提供预约类型ID'),
  body('guestTimezone').optional().isString().withMessage('无效的时区')
], async (req, res, next) => {
  try {
    const { eventTypeId, guestTimezone = 'Asia/Shanghai' } = req.body;
    
    const recommendation = await getRecommendedSlots(eventTypeId, guestTimezone);
    
    res.json(recommendation);
  } catch (error) {
    next(error);
  }
});

router.get('/event-types/:userId/:slug/recommendations', [
  param('userId').isString().withMessage('无效的用户ID'),
  param('slug').isString().withMessage('无效的链接标识'),
  query('guestTimezone').optional().isString().withMessage('无效的时区')
], async (req, res, next) => {
  try {
    const { userId, slug } = req.params;
    const { guestTimezone = 'Asia/Shanghai' } = req.query;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const eventType = await prisma.eventType.findUnique({
      where: { userId_slug: { userId, slug } }
    });
    
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: '预约类型不存在' });
    }
    
    const recommendation = await getRecommendedSlots(eventType.id, guestTimezone);
    
    res.json(recommendation);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
