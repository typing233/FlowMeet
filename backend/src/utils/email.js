const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP not configured. Emails will be logged to console.');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  return transporter;
}

async function sendBookingConfirmation(booking, host, eventType) {
  const mailTransporter = getTransporter();
  
  const startTime = moment(booking.startTime).tz(booking.timezone);
  const endTime = moment(booking.endTime).tz(booking.timezone);
  
  const emailSubject = `预约确认: ${eventType.title} - ${startTime.format('YYYY年MM月DD日 HH:mm')}`;
  
  const emailText = `
您好 ${booking.guestName}，

您的预约已确认！

预约详情：
- 类型: ${eventType.title}
- 时间: ${startTime.format('YYYY年MM月DD日 HH:mm')} - ${endTime.format('HH:mm')}
- 时长: ${eventType.duration} 分钟
- 地点: ${eventType.locationType === 'online' ? (booking.meetingUrl || '线上会议') : (booking.location || '线下')}

${booking.meetingUrl ? `会议链接: ${booking.meetingUrl}` : ''}
${booking.guestNotes ? `备注: ${booking.guestNotes}` : ''}

主持人: ${host.name} (${host.email})

如有任何问题，请联系 ${host.email}。

--
FlowMeet 智能日程调度平台
`;
  
  const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">预约确认</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">${startTime.format('YYYY年MM月DD日')}</p>
  </div>
  
  <div style="padding: 30px; background: #f8f9fa;">
    <h2 style="color: #333; margin-top: 0;">${eventType.title}</h2>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <div style="margin: 10px 0;">
        <span style="color: #666; font-weight: bold;">时间:</span>
        <span style="margin-left: 10px;">${startTime.format('YYYY年MM月DD日 HH:mm')} - ${endTime.format('HH:mm')}</span>
      </div>
      <div style="margin: 10px 0;">
        <span style="color: #666; font-weight: bold;">时长:</span>
        <span style="margin-left: 10px;">${eventType.duration} 分钟</span>
      </div>
      <div style="margin: 10px 0;">
        <span style="color: #666; font-weight: bold;">地点:</span>
        <span style="margin-left: 10px;">${eventType.locationType === 'online' ? '线上会议' : '线下'}</span>
      </div>
    </div>
    
    ${booking.meetingUrl ? `
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>会议链接:</strong> <a href="${booking.meetingUrl}" style="color: #1976d2;">${booking.meetingUrl}</a></p>
    </div>
    ` : ''}
    
    ${eventType.description ? `
    <div style="margin: 20px 0;">
      <p style="color: #666;"><strong>预约说明:</strong></p>
      <p style="margin: 5px 0 0;">${eventType.description}</p>
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="color: #666; margin: 5px 0;">主持人: ${host.name} (${host.email})</p>
    </div>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #888; margin: 0; font-size: 12px;">
      由 <a href="#" style="color: #667eea; text-decoration: none;">FlowMeet</a> 智能日程调度平台发送
    </p>
  </div>
</div>
`;
  
  const mailOptions = {
    from: process.env.SMTP_USER || 'no-reply@flowmeet.local',
    to: booking.guestEmail,
    cc: host.email,
    subject: emailSubject,
    text: emailText,
    html: emailHtml
  };
  
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${booking.guestEmail}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  } else {
    console.log('=== EMAIL (Logged) ===');
    console.log('To:', mailOptions.to);
    console.log('CC:', mailOptions.cc);
    console.log('Subject:', mailOptions.subject);
    console.log('Text:', mailOptions.text);
    console.log('======================');
  }
  
  return true;
}

async function sendBookingReminder(booking, host, eventType, minutesBefore) {
  const mailTransporter = getTransporter();
  
  const startTime = moment(booking.startTime).tz(booking.timezone);
  const endTime = moment(booking.endTime).tz(booking.timezone);
  
  const emailSubject = `预约提醒: ${eventType.title} 将在 ${minutesBefore} 分钟后开始`;
  
  const emailText = `
您好 ${booking.guestName}，

您的预约即将开始！

预约详情：
- 类型: ${eventType.title}
- 时间: ${startTime.format('YYYY年MM月DD日 HH:mm')} - ${endTime.format('HH:mm')}
- 地点: ${eventType.locationType === 'online' ? (booking.meetingUrl || '线上会议') : (booking.location || '线下')}

${booking.meetingUrl ? `会议链接: ${booking.meetingUrl}` : ''}

请准时参加！

--
FlowMeet 智能日程调度平台
`;
  
  const mailOptions = {
    from: process.env.SMTP_USER || 'no-reply@flowmeet.local',
    to: booking.guestEmail,
    cc: host.email,
    subject: emailSubject,
    text: emailText
  };
  
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail(mailOptions);
      console.log(`Reminder email sent to ${booking.guestEmail}`);
    } catch (error) {
      console.error('Failed to send reminder email:', error);
    }
  } else {
    console.log('=== REMINDER EMAIL (Logged) ===');
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    console.log('==============================');
  }
  
  return true;
}

module.exports = {
  sendBookingConfirmation,
  sendBookingReminder
};
