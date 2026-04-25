const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone');
const { sendBookingConfirmation, sendBookingReminder } = require('../utils/email');

const prisma = new PrismaClient();

const TIMELINE_EVENT_TYPES = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
  REMINDER_SENT: 'reminder_sent',
  MEETING_STARTING: 'meeting_starting',
  MEETING_STARTED: 'meeting_started',
  MEETING_ENDED: 'meeting_ended',
  FOLLOWUP_SENT: 'followup_sent',
  WEBHOOK_TRIGGERED: 'webhook_triggered',
  NOTE_ADDED: 'note_added'
};

const TRIGGER_TYPES = {
  STATUS_CHANGE: 'status_change',
  BEFORE_MEETING: 'before_meeting',
  AFTER_MEETING: 'after_meeting',
  DAILY_DIGEST: 'daily_digest'
};

const CHANNEL_TYPES = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  SMS: 'sms'
};

async function createTimelineEvent(bookingId, eventType, eventData = {}, triggeredBy = null) {
  return prisma.bookingTimelineEvent.create({
    data: {
      bookingId,
      eventType,
      eventData: JSON.stringify(eventData),
      triggeredBy
    }
  });
}

async function getBookingTimeline(bookingId) {
  const events = await prisma.bookingTimelineEvent.findMany({
    where: { bookingId },
    orderBy: { triggeredAt: 'asc' }
  });
  
  return events.map(event => ({
    ...event,
    eventData: JSON.parse(event.eventData || '{}')
  }));
}

async function getBookingsWithTimelines(userId, status = null) {
  const where = {
    OR: [
      { hostId: userId },
      { guestUserId: userId }
    ]
  };
  
  if (status) {
    where.status = status;
  }
  
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      eventType: true,
      timelineEvents: {
        orderBy: { triggeredAt: 'asc' }
      }
    },
    orderBy: { startTime: 'desc' }
  });
  
  return bookings.map(booking => ({
    ...booking,
    timelineEvents: booking.timelineEvents.map(event => ({
      ...event,
      eventData: JSON.parse(event.eventData || '{}')
    }))
  }));
}

function getLifecycleStages() {
  return [
    {
      id: 'created',
      label: '预约创建',
      icon: 'calendar',
      color: 'blue',
      description: '预约已创建，等待确认'
    },
    {
      id: 'confirmed',
      label: '预约确认',
      icon: 'check',
      color: 'green',
      description: '预约已确认'
    },
    {
      id: 'reminder_sent',
      label: '提醒发送',
      icon: 'bell',
      color: 'yellow',
      description: '已发送预约提醒'
    },
    {
      id: 'meeting_starting',
      label: '会议即将开始',
      icon: 'clock',
      color: 'purple',
      description: '会议即将开始'
    },
    {
      id: 'meeting_ended',
      label: '会议结束',
      icon: 'check-circle',
      color: 'gray',
      description: '会议已结束'
    },
    {
      id: 'followup_sent',
      label: '跟进发送',
      icon: 'mail',
      color: 'blue',
      description: '已发送跟进通知'
    },
    {
      id: 'cancelled',
      label: '已取消',
      icon: 'x-circle',
      color: 'red',
      description: '预约已取消'
    }
  ];
}

async function createDefaultNotificationRules(userId) {
  const existingRules = await prisma.notificationRule.count({ where: { userId } });
  
  if (existingRules > 0) {
    return { message: '规则已存在' };
  }
  
  const defaultRules = [
    {
      name: '会议前24小时提醒',
      triggerType: TRIGGER_TYPES.BEFORE_MEETING,
      triggerOffset: 1440,
      channelType: CHANNEL_TYPES.EMAIL,
      channelConfig: JSON.stringify({ recipientType: 'both' })
    },
    {
      name: '会议前1小时提醒',
      triggerType: TRIGGER_TYPES.BEFORE_MEETING,
      triggerOffset: 60,
      channelType: CHANNEL_TYPES.EMAIL,
      channelConfig: JSON.stringify({ recipientType: 'both' })
    },
    {
      name: '会议结束后1小时跟进',
      triggerType: TRIGGER_TYPES.AFTER_MEETING,
      triggerOffset: 60,
      channelType: CHANNEL_TYPES.EMAIL,
      channelConfig: JSON.stringify({ recipientType: 'host' })
    },
    {
      name: '预约状态变更通知',
      triggerType: TRIGGER_TYPES.STATUS_CHANGE,
      triggerOffset: 0,
      channelType: CHANNEL_TYPES.EMAIL,
      channelConfig: JSON.stringify({ recipientType: 'both' })
    }
  ];
  
  for (const rule of defaultRules) {
    await prisma.notificationRule.create({
      data: {
        userId,
        ...rule
      }
    });
  }
  
  return { created: defaultRules.length };
}

async function checkAndSendNotifications() {
  const now = moment();
  
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      startTime: {
        gte: now.toDate(),
        lte: now.clone().add(24, 'hours').toDate()
      }
    },
    include: {
      eventType: true,
      host: true
    }
  });
  
  for (const booking of upcomingBookings) {
    const startTime = moment(booking.startTime);
    const minutesUntilMeeting = startTime.diff(now, 'minutes');
    
    if (minutesUntilMeeting <= 1440 && minutesUntilMeeting > 1435) {
      await sendTimedReminder(booking, 1440);
    }
    
    if (minutesUntilMeeting <= 60 && minutesUntilMeeting > 55) {
      await sendTimedReminder(booking, 60);
    }
  }
  
  const pastBookings = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      endTime: {
        lte: now.toDate(),
        gte: now.clone().subtract(2, 'hours').toDate()
      }
    },
    include: {
      eventType: true,
      host: true
    }
  });
  
  for (const booking of pastBookings) {
    const endTime = moment(booking.endTime);
    const minutesSinceEnd = now.diff(endTime, 'minutes');
    
    if (minutesSinceEnd >= 60 && minutesSinceEnd < 65) {
      await sendFollowupNotification(booking);
    }
  }
  
  return { processed: upcomingBookings.length + pastBookings.length };
}

async function sendTimedReminder(booking, minutesBefore) {
  const existingLog = await prisma.notificationLog.findFirst({
    where: {
      bookingId: booking.id,
      sentAt: {
        gte: moment().subtract(30, 'minutes').toDate()
      }
    }
  });
  
  if (existingLog) {
    return { skipped: 'Already sent' };
  }
  
  try {
    await sendBookingReminder(booking, booking.host, booking.eventType, minutesBefore);
    
    await prisma.notificationLog.create({
      data: {
        bookingId: booking.id,
        channelType: CHANNEL_TYPES.EMAIL,
        recipient: booking.guestEmail,
        subject: `预约提醒: ${booking.eventType?.title}`,
        status: 'sent'
      }
    });
    
    await createTimelineEvent(
      booking.id,
      TIMELINE_EVENT_TYPES.REMINDER_SENT,
      {
        minutesBefore,
        recipient: booking.guestEmail,
        channel: 'email'
      },
      'system'
    );
    
    return { success: true };
  } catch (error) {
    await prisma.notificationLog.create({
      data: {
        bookingId: booking.id,
        channelType: CHANNEL_TYPES.EMAIL,
        recipient: booking.guestEmail,
        subject: `预约提醒: ${booking.eventType?.title}`,
        status: 'failed',
        errorMessage: error.message
      }
    });
    
    return { error: error.message };
  }
}

async function sendFollowupNotification(booking) {
  const existingLog = await prisma.notificationLog.findFirst({
    where: {
      bookingId: booking.id,
      sentAt: {
        gte: moment().subtract(2, 'hours').toDate()
      }
    }
  });
  
  if (existingLog) {
    return { skipped: 'Already sent' };
  }
  
  try {
    const mailTransporter = require('nodemailer').createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>会议跟进</h2>
  <p>您好 ${booking.host.name}，</p>
  <p>您与 ${booking.guestName} 的会议刚刚结束。</p>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>会议详情：</strong></p>
    <p>类型: ${booking.eventType?.title}</p>
    <p>时间: ${moment(booking.startTime).tz(booking.timezone).format('YYYY年MM月DD日 HH:mm')}</p>
    <p>访客: ${booking.guestName} (${booking.guestEmail})</p>
  </div>
  <p>感谢您使用 FlowMeet！</p>
</div>`;
    
    if (process.env.SMTP_HOST) {
      await mailTransporter.sendMail({
        from: process.env.SMTP_USER,
        to: booking.host.email,
        subject: `会议跟进: ${booking.eventType?.title}`,
        html: emailHtml
      });
    } else {
      console.log('=== FOLLOWUP EMAIL (Logged) ===');
      console.log('To:', booking.host.email);
      console.log('Subject:', `会议跟进: ${booking.eventType?.title}`);
      console.log('==============================');
    }
    
    await prisma.notificationLog.create({
      data: {
        bookingId: booking.id,
        channelType: CHANNEL_TYPES.EMAIL,
        recipient: booking.host.email,
        subject: `会议跟进: ${booking.eventType?.title}`,
        status: 'sent'
      }
    });
    
    await createTimelineEvent(
      booking.id,
      TIMELINE_EVENT_TYPES.FOLLOWUP_SENT,
      {
        recipient: booking.host.email,
        channel: 'email'
      },
      'system'
    );
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send followup:', error);
    return { error: error.message };
  }
}

async function triggerWebhook(userId, eventType, payload) {
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      userId,
      isActive: true
    }
  });
  
  const results = [];
  
  for (const subscription of subscriptions) {
    const events = JSON.parse(subscription.events || '[]');
    
    if (events.length > 0 && !events.includes(eventType) && !events.includes('*')) {
      continue;
    }
    
    try {
      const response = await require('axios').post(subscription.url, {
        eventType,
        timestamp: new Date().toISOString(),
        payload
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': subscription.secret || ''
        },
        timeout: 10000
      });
      
      await prisma.webhookLog.create({
        data: {
          subscriptionId: subscription.id,
          eventType,
          payload: JSON.stringify(payload),
          statusCode: response.status,
          response: JSON.stringify(response.data)
        }
      });
      
      results.push({
        subscriptionId: subscription.id,
        success: true,
        statusCode: response.status
      });
    } catch (error) {
      await prisma.webhookLog.create({
        data: {
          subscriptionId: subscription.id,
          eventType,
          payload: JSON.stringify(payload),
          statusCode: error.response?.status,
          errorMessage: error.message
        }
      });
      
      results.push({
        subscriptionId: subscription.id,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

async function notifyStatusChange(booking, oldStatus, newStatus) {
  const eventTypeMap = {
    'cancelled': TIMELINE_EVENT_TYPES.CANCELLED,
    'rescheduled': TIMELINE_EVENT_TYPES.RESCHEDULED,
    'confirmed': TIMELINE_EVENT_TYPES.CONFIRMED
  };
  
  const eventType = eventTypeMap[newStatus] || TIMELINE_EVENT_TYPES.STATUS_CHANGE;
  
  await createTimelineEvent(
    booking.id,
    eventType,
    {
      oldStatus,
      newStatus,
      source: 'system'
    },
    'system'
  );
  
  await triggerWebhook(booking.hostId, 'booking.status_changed', {
    bookingId: booking.id,
    oldStatus,
    newStatus,
    booking
  });
  
  return { success: true };
}

module.exports = {
  createTimelineEvent,
  getBookingTimeline,
  getBookingsWithTimelines,
  getLifecycleStages,
  createDefaultNotificationRules,
  checkAndSendNotifications,
  sendTimedReminder,
  sendFollowupNotification,
  triggerWebhook,
  notifyStatusChange,
  TIMELINE_EVENT_TYPES,
  TRIGGER_TYPES,
  CHANNEL_TYPES
};
