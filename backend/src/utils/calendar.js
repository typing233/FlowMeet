const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone');

const prisma = new PrismaClient();

async function getGoogleAuth(userId) {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: 'google' } }
  });
  
  if (!connection) {
    throw new Error('未连接Google日历');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry?.getTime()
  });
  
  if (connection.tokenExpiry && new Date() > connection.tokenExpiry) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || connection.refreshToken,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        }
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('日历连接已过期，请重新连接');
    }
  }
  
  return { oauth2Client, calendarId: connection.calendarId };
}

async function getFreeBusy(userId, timeMin, timeMax, timezone = 'Asia/Shanghai') {
  const { oauth2Client, calendarId } = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: timezone,
      items: [{ id: calendarId }]
    }
  });
  
  const calendars = response.data.calendars || {};
  const busy = calendars[calendarId]?.busy || [];
  
  return busy.map(b => ({
    start: new Date(b.start),
    end: new Date(b.end)
  }));
}

async function createEvent(userId, eventData) {
  const { oauth2Client, calendarId } = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: eventData.timezone || 'Asia/Shanghai'
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: eventData.timezone || 'Asia/Shanghai'
    },
    attendees: eventData.attendees?.map(email => ({ email })) || [],
    conferenceData: eventData.meetingUrl ? undefined : {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: eventData.reminderMinutes || 60 },
        { method: 'popup', minutes: eventData.reminderMinutes || 60 }
      ]
    }
  };
  
  const response = await calendar.events.insert({
    calendarId,
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all'
  });
  
  return {
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
    meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri || eventData.meetingUrl
  };
}

async function deleteEvent(userId, eventId) {
  const { oauth2Client, calendarId } = await getGoogleAuth(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: 'all'
  });
  
  return true;
}

function generateAvailableSlots(availability, busySlots, duration, timezone = 'Asia/Shanghai') {
  const slots = [];
  const now = moment().tz(timezone);
  
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = moment().tz(timezone).add(dayOffset, 'days');
    const dayOfWeek = date.format('dddd').toLowerCase();
    
    const dayAvailability = availability[dayOfWeek];
    if (!dayAvailability || dayAvailability.length === 0) continue;
    
    for (const timeSlot of dayAvailability) {
      const [startHour, startMin] = timeSlot.start.split(':').map(Number);
      const [endHour, endMin] = timeSlot.end.split(':').map(Number);
      
      let slotStart = moment(date).tz(timezone).hour(startHour).minute(startMin).second(0);
      const slotEnd = moment(date).tz(timezone).hour(endHour).minute(endMin).second(0);
      
      if (slotStart.isBefore(now)) continue;
      
      while (slotStart.clone().add(duration, 'minutes').isSameOrBefore(slotEnd)) {
        const slotEndTime = slotStart.clone().add(duration, 'minutes');
        
        const isBusy = busySlots.some(busy => {
          return slotStart.isBefore(busy.end) && slotEndTime.isAfter(busy.start);
        });
        
        if (!isBusy) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEndTime.toISOString(),
            time: slotStart.format('HH:mm'),
            date: slotStart.format('YYYY-MM-DD')
          });
        }
        
        slotStart = slotStart.add(30, 'minutes');
      }
    }
  }
  
  return slots;
}

module.exports = {
  getGoogleAuth,
  getFreeBusy,
  createEvent,
  deleteEvent,
  generateAvailableSlots
};
