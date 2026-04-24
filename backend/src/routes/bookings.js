const express = require('express');
const { param, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const moment = require('moment-timezone');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authMiddleware);

// 获取用户的所有预约（作为主持人）
router.get('/host', async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    const where = {
      hostId: req.user.id
    };
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }
    
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        eventType: true,
        host: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

// 获取用户的所有预约（作为访客）
router.get('/guest', async (req, res, next) => {
  try {
    const { email } = req.user;
    
    const bookings = await prisma.booking.findMany({
      where: {
        guestEmail: email
      },
      include: {
        eventType: true,
        host: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

// 获取单个预约详情
router.get('/:id', [
  param('id').isString().withMessage('无效的ID')
], async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: true,
        host: {
          select: { id: true, name: true, email: true, avatar: true, timezone: true }
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: '预约不存在' });
    }
    
    if (booking.hostId !== req.user.id && booking.guestEmail !== req.user.email) {
      return res.status(403).json({ error: '无权限访问此预约' });
    }
    
    res.json({ booking });
  } catch (error) {
    next(error);
  }
});

// 取消预约
router.post('/:id/cancel', [
  param('id').isString().withMessage('无效的ID')
], async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: true,
        host: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: '预约不存在' });
    }
    
    if (booking.hostId !== req.user.id && booking.guestEmail !== req.user.email) {
      return res.status(403).json({ error: '无权限取消此预约' });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: '预约已取消' });
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' }
    });
    
    res.json({ message: '预约已取消', booking: updatedBooking });
  } catch (error) {
    next(error);
  }
});

// 获取即将到来的预约
router.get('/upcoming', async (req, res, next) => {
  try {
    const now = new Date();
    
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { hostId: req.user.id },
          { guestEmail: req.user.email }
        ],
        status: 'confirmed',
        startTime: {
          gte: now
        }
      },
      include: {
        eventType: true,
        host: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 10
    });
    
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

// 获取今日预约统计
router.get('/stats/today', async (req, res, next) => {
  try {
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'days').startOf('day').toDate();
    
    const todayBookings = await prisma.booking.count({
      where: {
        hostId: req.user.id,
        status: 'confirmed',
        startTime: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    const upcomingBookings = await prisma.booking.count({
      where: {
        hostId: req.user.id,
        status: 'confirmed',
        startTime: {
          gte: new Date()
        }
      }
    });
    
    res.json({
      today: todayBookings,
      upcoming: upcomingBookings
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
