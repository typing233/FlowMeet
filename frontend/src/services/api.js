import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
};

export const eventTypeAPI = {
  getAll: () => api.get('/event-types'),
  getById: (id) => api.get(`/event-types/${id}`),
  create: (data) => api.post('/event-types', data),
  update: (id, data) => api.put(`/event-types/${id}`, data),
  delete: (id) => api.delete(`/event-types/${id}`),
};

export const bookingAPI = {
  getAsHost: (params) => api.get('/bookings/host', { params }),
  getAsGuest: () => api.get('/bookings/guest'),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
  getUpcoming: () => api.get('/bookings/upcoming'),
  getStats: () => api.get('/bookings/stats/today'),
};

export const calendarAPI = {
  getAuthUrl: () => api.get('/calendar/google/auth-url'),
  getStatus: () => api.get('/calendar/status'),
  disconnect: () => api.delete('/calendar/disconnect'),
  getFreeBusy: (data) => api.post('/calendar/free-busy', data),
};

export const publicAPI = {
  getEventTypes: (userId) => api.get(`/public/event-types/${userId}`),
  getEventType: (userId, slug) => api.get(`/public/event-type/${userId}/${slug}`),
  getAvailableSlots: (data) => api.post('/public/available-slots', data),
  createBooking: (data) => api.post('/public/book', data),
};

export const aiAssistantAPI = {
  getSessions: () => api.get('/ai-assistant/sessions'),
  createSession: (data) => api.post('/ai-assistant/sessions', data),
  getSession: (sessionId) => api.get(`/ai-assistant/sessions/${sessionId}`),
  sendMessage: (data) => api.post('/ai-assistant/chat', data),
  confirmAction: (actionId) => api.post(`/ai-assistant/actions/${actionId}/confirm`),
  cancelAction: (actionId) => api.post(`/ai-assistant/actions/${actionId}/cancel`),
};

export const recommendationAPI = {
  getTimezones: () => api.get('/recommendations/timezones'),
  getRecommendedSlots: (data) => api.post('/recommendations/slots', data),
  getPublicRecommendations: (userId, slug, guestTimezone) => 
    api.get(`/recommendations/event-types/${userId}/${slug}/recommendations`, { 
      params: { guestTimezone } 
    }),
};

export const timelineAPI = {
  getLifecycle: () => api.get('/timeline/lifecycle'),
  getBookings: (status) => api.get('/timeline/bookings', { params: { status } }),
  getBookingDetail: (bookingId) => api.get(`/timeline/bookings/${bookingId}`),
  getNotificationRules: () => api.get('/timeline/notifications/rules'),
  createNotificationRule: (data) => api.post('/timeline/notifications/rules', data),
  updateNotificationRule: (ruleId, data) => api.put(`/timeline/notifications/rules/${ruleId}`, data),
  deleteNotificationRule: (ruleId) => api.delete(`/timeline/notifications/rules/${ruleId}`),
  createDefaultRules: () => api.post('/timeline/notifications/rules/defaults'),
  getNotificationLogs: (bookingId) => api.get('/timeline/notifications/logs', { params: { bookingId } }),
  getWebhooks: () => api.get('/timeline/webhooks'),
  createWebhook: (data) => api.post('/timeline/webhooks', data),
  updateWebhook: (subscriptionId, data) => api.put(`/timeline/webhooks/${subscriptionId}`, data),
  deleteWebhook: (subscriptionId) => api.delete(`/timeline/webhooks/${subscriptionId}`),
  testWebhook: (data) => api.post('/timeline/webhooks/test', data),
  getWebhookLogs: (subscriptionId) => api.get(`/timeline/webhooks/logs/${subscriptionId}`),
};

export default api;
