const express = require('express');
const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { getFreeBusy } = require('../utils/calendar');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authMiddleware);

// 获取 Google OAuth 授权链接
router.get('/google/auth-url', async (req, res, next) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent'
    });
    
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

// Google OAuth 回调
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: '缺少授权码' });
    }
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const existingConnection = await prisma.calendarConnection.findUnique({
      where: { userId_provider: { userId: req.user.id, provider: 'google' } }
    });
    
    if (existingConnection) {
      await prisma.calendarConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingConnection.refreshToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        }
      });
    } else {
      await prisma.calendarConnection.create({
        data: {
          userId: req.user.id,
          provider: 'google',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        }
      });
    }
    
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?calendar-connected=true`);
  } catch (error) {
    next(error);
  }
});

// 检查日历连接状态
router.get('/status', async (req, res, next) => {
  try {
    const connection = await prisma.calendarConnection.findUnique({
      where: { userId_provider: { userId: req.user.id, provider: 'google' } }
    });
    
    res.json({
      connected: !!connection,
      provider: connection?.provider,
      calendarId: connection?.calendarId
    });
  } catch (error) {
    next(error);
  }
});

// 断开日历连接
router.delete('/disconnect', async (req, res, next) => {
  try {
    await prisma.calendarConnection.deleteMany({
      where: { userId: req.user.id }
    });
    
    res.json({ message: '已断开日历连接' });
  } catch (error) {
    next(error);
  }
});

// 获取未来30天的忙碌时段
router.post('/free-busy', async (req, res, next) => {
  try {
    const { timeMin, timeMax, timezone } = req.body;
    
    const now = new Date();
    const defaultTimeMin = timeMin ? new Date(timeMin) : now;
    const defaultTimeMax = timeMax ? new Date(timeMax) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const busySlots = await getFreeBusy(
      req.user.id,
      defaultTimeMin,
      defaultTimeMax,
      timezone || req.user.timezone
    );
    
    res.json({ busySlots });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
