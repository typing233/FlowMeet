const express = require('express');
const { body, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const moment = require('moment-timezone');
const { 
  parseMessage, 
  generateResponse, 
  createPendingAction, 
  confirmPendingAction,
  INTENT_TYPES 
} = require('../services/aiAssistant');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authMiddleware);

router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.aIChatSession.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20
    });
    
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions', async (req, res, next) => {
  try {
    const { title } = req.body;
    
    const session = await prisma.aIChatSession.create({
      data: {
        userId: req.user.id,
        title: title || '新对话'
      }
    });
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:sessionId', [
  param('sessionId').isString().withMessage('无效的会话ID')
], async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await prisma.aIChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: '无权访问此会话' });
    }
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

router.post('/chat', [
  body('message').notEmpty().withMessage('请输入消息')
], async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const user = req.user;
    
    let session;
    if (sessionId) {
      session = await prisma.aIChatSession.findUnique({
        where: { id: sessionId }
      });
      
      if (!session || session.userId !== user.id) {
        return res.status(403).json({ error: '无权访问此会话' });
      }
    } else {
      session = await prisma.aIChatSession.create({
        data: {
          userId: user.id,
          title: message.length > 30 ? message.substring(0, 30) + '...' : message
        }
      });
    }
    
    await prisma.aIChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message
      }
    });
    
    const userTimezone = user.timezone || 'Asia/Shanghai';
    const parsed = await parseMessage(message, user.id, userTimezone);
    const response = await generateResponse(parsed.intent, parsed.parsedData, user.id);
    
    let pendingAction = null;
    if (response.type === 'preview' && response.actionType) {
      const actionData = buildActionData(response.actionType, response.previewData, parsed.parsedData);
      pendingAction = await createPendingAction(
        user.id,
        session.id,
        response.actionType,
        actionData,
        response.previewData
      );
    }
    
    const assistantMessage = await prisma.aIChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: response.message,
        intent: parsed.intent,
        intentData: JSON.stringify(parsed.parsedData)
      }
    });
    
    await prisma.aIChatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() }
    });
    
    res.json({
      sessionId: session.id,
      userMessage: {
        id: 'temp-user-id',
        role: 'user',
        content: message,
        createdAt: new Date()
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: 'assistant',
        content: response.message,
        type: response.type,
        createdAt: assistantMessage.createdAt
      },
      response: {
        ...response,
        pendingActionId: pendingAction?.id
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/actions/:actionId/confirm', [
  param('actionId').isString().withMessage('无效的操作ID')
], async (req, res, next) => {
  try {
    const { actionId } = req.params;
    const { additionalData } = req.body;
    
    const result = await confirmPendingAction(actionId, req.user.id);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/actions/:actionId/cancel', [
  param('actionId').isString().withMessage('无效的操作ID')
], async (req, res, next) => {
  try {
    const { actionId } = req.params;
    
    const pendingAction = await prisma.aIPendingAction.findUnique({
      where: { id: actionId }
    });
    
    if (!pendingAction) {
      return res.status(404).json({ error: '操作不存在' });
    }
    
    if (pendingAction.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作' });
    }
    
    await prisma.aIPendingAction.update({
      where: { id: actionId },
      data: { status: 'cancelled' }
    });
    
    res.json({ success: true, message: '已取消操作' });
  } catch (error) {
    next(error);
  }
});

function buildActionData(actionType, previewData, parsedData) {
  switch (actionType) {
    case 'create_booking':
      return {
        eventTypeId: previewData.selectedEventTypeId || null,
        date: previewData.date,
        time: previewData.time,
        duration: previewData.duration
      };
    case 'reschedule_booking':
      return {
        bookingId: previewData.bookingId,
        newDate: previewData.newDate,
        newTime: previewData.newTime
      };
    case 'cancel_booking':
      return {
        bookingId: previewData.bookingId
      };
    default:
      return {};
  }
}

module.exports = router;
