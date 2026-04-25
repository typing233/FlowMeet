import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Bell,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Webhook
} from 'lucide-react';
import { timelineAPI, bookingAPI } from '../services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const lifecycleIcons = {
  created: Calendar,
  confirmed: CheckCircle,
  reminder_sent: Bell,
  meeting_starting: Clock,
  meeting_started: Calendar,
  meeting_ended: CheckCircle,
  followup_sent: Mail,
  cancelled: XCircle,
  rescheduled: RefreshCw,
  webhook_triggered: Webhook
};

const lifecycleColors = {
  created: 'blue',
  confirmed: 'green',
  reminder_sent: 'yellow',
  meeting_starting: 'purple',
  meeting_started: 'blue',
  meeting_ended: 'gray',
  followup_sent: 'blue',
  cancelled: 'red',
  rescheduled: 'orange',
  webhook_triggered: 'indigo'
};

const lifecycleLabels = {
  created: '预约创建',
  confirmed: '预约确认',
  reminder_sent: '提醒已发送',
  meeting_starting: '会议即将开始',
  meeting_started: '会议开始',
  meeting_ended: '会议结束',
  followup_sent: '跟进已发送',
  cancelled: '已取消',
  rescheduled: '已改期',
  webhook_triggered: 'Webhook触发'
};

export default function BookingTimeline() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [notificationRules, setNotificationRules] = useState([]);
  const [webhooks, setWebhooks] = useState([]);

  useEffect(() => {
    loadBookings();
    loadNotificationRules();
    loadWebhooks();
  }, [filter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'upcoming') params.status = 'confirmed';
      else if (filter === 'past') params.status = 'cancelled';
      
      const response = await timelineAPI.getBookings(filter === 'all' ? null : filter);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationRules = async () => {
    try {
      const response = await timelineAPI.getNotificationRules();
      setNotificationRules(response.data.rules || []);
    } catch (error) {
      console.error('Failed to load notification rules:', error);
    }
  };

  const loadWebhooks = async () => {
    try {
      const response = await timelineAPI.getWebhooks();
      setWebhooks(response.data.subscriptions || []);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  };

  const loadBookingDetail = async (bookingId) => {
    try {
      const response = await timelineAPI.getBookingDetail(bookingId);
      setSelectedBooking(response.data);
    } catch (error) {
      console.error('Failed to load booking detail:', error);
    }
  };

  const toggleRuleStatus = async (rule) => {
    try {
      await timelineAPI.updateNotificationRule(rule.id, { isActive: !rule.isActive });
      loadNotificationRules();
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm('确定要删除此通知规则吗？')) return;
    try {
      await timelineAPI.deleteNotificationRule(ruleId);
      loadNotificationRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const toggleWebhookStatus = async (webhook) => {
    try {
      await timelineAPI.updateWebhook(webhook.id, { isActive: !webhook.isActive });
      loadWebhooks();
    } catch (error) {
      console.error('Failed to update webhook:', error);
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!window.confirm('确定要删除此Webhook订阅吗？')) return;
    try {
      await timelineAPI.deleteWebhook(webhookId);
      loadWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const createDefaultRules = async () => {
    try {
      await timelineAPI.createDefaultRules();
      loadNotificationRules();
    } catch (error) {
      console.error('Failed to create default rules:', error);
    }
  };

  const getTimelineStatus = (booking) => {
    const events = booking.timelineEvents || [];
    if (events.length === 0) return 'created';
    
    const eventTypes = events.map(e => e.eventType);
    
    if (eventTypes.includes('cancelled')) return 'cancelled';
    if (eventTypes.includes('meeting_ended')) return 'completed';
    if (eventTypes.includes('reminder_sent')) return 'reminder_sent';
    if (eventTypes.includes('confirmed')) return 'confirmed';
    
    return 'created';
  };

  const getProgressPercentage = (booking) => {
    const status = getTimelineStatus(booking);
    const stages = ['created', 'confirmed', 'reminder_sent', 'meeting_ended', 'completed'];
    const cancelledStages = ['cancelled'];
    
    if (cancelledStages.includes(status)) return 100;
    
    const index = stages.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / stages.length) * 100;
  };

  const renderTimeline = (timeline) => {
    if (!timeline || timeline.length === 0) {
      return (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无时间轴记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {timeline.map((event, index) => {
          const Icon = lifecycleIcons[event.eventType] || AlertCircle;
          const color = lifecycleColors[event.eventType] || 'gray';
          const label = lifecycleLabels[event.eventType] || event.eventType;

          const colorClasses = {
            blue: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-200' },
            green: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-green-200' },
            yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', border: 'border-yellow-200' },
            purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-200' },
            gray: { bg: 'bg-gray-100', icon: 'text-gray-600', border: 'border-gray-200' },
            red: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-red-200' },
            orange: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-200' },
            indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-200' }
          };

          const colors = colorClasses[color] || colorClasses.gray;

          return (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                {index < timeline.length - 1 && (
                  <div className={`w-0.5 flex-1 ${colors.border} border-l-2`} />
                )}
              </div>
              
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{label}</h4>
                  <span className="text-xs text-gray-500">
                    {format(new Date(event.triggeredAt), 'MM月dd日 HH:mm', { locale: zhCN })}
                  </span>
                </div>
                
                {event.triggeredBy && event.triggeredBy !== 'system' && (
                  <p className="text-sm text-gray-500 mt-1">
                    操作人: {event.triggeredBy}
                  </p>
                )}
                
                {event.eventData && Object.keys(event.eventData).length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                    {event.eventData.oldStatus && event.eventData.newStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">状态变更:</span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                          {event.eventData.oldStatus}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          {event.eventData.newStatus}
                        </span>
                      </div>
                    )}
                    {event.eventData.minutesBefore && (
                      <p className="text-gray-600">
                        会议前 {event.eventData.minutesBefore} 分钟提醒
                      </p>
                    )}
                    {event.eventData.source && (
                      <p className="text-gray-600">
                        来源: {event.eventData.source === 'ai_assistant' ? 'AI助手' : event.eventData.source}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (selectedBooking) {
    const { booking, timeline } = selectedBooking;
    const progress = getProgressPercentage({ timelineEvents: timeline });
    const status = getTimelineStatus({ timelineEvents: timeline });

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setSelectedBooking(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回列表
          </button>

          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {booking.eventType?.title || '预约详情'}
                </h1>
                <p className="text-gray-600 mt-1">
                  与 {booking.guestName} · {booking.guestEmail}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                booking.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {booking.status === 'confirmed' ? '已确认' :
                 booking.status === 'cancelled' ? '已取消' :
                 booking.status === 'rescheduled' ? '已改期' :
                 booking.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">开始时间</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(booking.startTime), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">结束时间</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(booking.endTime), 'HH:mm', { locale: zhCN })}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">时长</p>
                <p className="font-medium text-gray-900">
                  {Math.round((new Date(booking.endTime) - new Date(booking.startTime)) / 60000)} 分钟
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">时区</p>
                <p className="font-medium text-gray-900">{booking.timezone}</p>
              </div>
            </div>

            {booking.guestNotes && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>访客备注:</strong> {booking.guestNotes}
                </p>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">旅程进度</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    status === 'cancelled' ? 'bg-red-500' :
                    status === 'completed' ? 'bg-green-500' :
                    'bg-primary-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">旅程时间轴</h2>
            {renderTimeline(timeline)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">预约旅程</h1>
            <p className="text-gray-600 mt-1">查看预约生命周期和自动化通知</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showNotifications 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              通知规则
            </button>
            <button
              onClick={() => setShowWebhooks(!showWebhooks)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showWebhooks 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Webhook className="w-4 h-4 inline mr-2" />
              Webhook
            </button>
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          {[
            { key: 'upcoming', label: '即将到来' },
            { key: 'past', label: '历史记录' },
            { key: 'all', label: '全部' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === option.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showNotifications && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">通知规则</h3>
              {notificationRules.length === 0 && (
                <button
                  onClick={createDefaultRules}
                  className="px-3 py-1.5 text-sm btn-primary flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  创建默认规则
                </button>
              )}
            </div>

            {notificationRules.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无通知规则</p>
                <p className="text-sm text-gray-400 mt-1">点击上方按钮创建默认规则</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notificationRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        rule.isActive ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Bell className={`w-5 h-5 ${
                          rule.isActive ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rule.name}</p>
                        <p className="text-sm text-gray-500">
                          {rule.triggerType === 'before_meeting' && `会议前 ${rule.triggerOffset} 分钟`}
                          {rule.triggerType === 'after_meeting' && `会议后 ${rule.triggerOffset} 分钟`}
                          {rule.triggerType === 'status_change' && '状态变更时'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleStatus(rule)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          rule.isActive ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            rule.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showWebhooks && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Webhook 订阅</h3>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-8">
                <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无 Webhook 订阅</p>
                <p className="text-sm text-gray-400 mt-1">Webhook 可用于接收预约状态变更的实时通知</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div 
                    key={webhook.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        webhook.isActive ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        <Webhook className={`w-5 h-5 ${
                          webhook.isActive ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{webhook.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{webhook.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleWebhookStatus(webhook)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          webhook.isActive ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            webhook.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'upcoming' ? '暂无即将到来的预约' : 
               filter === 'past' ? '暂无历史预约' : '暂无预约'}
            </h2>
            <p className="text-gray-600">
              {filter === 'upcoming' 
                ? '创建预约类型并分享链接，让客户预约您的时间'
                : '您的预约记录将显示在这里'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = getTimelineStatus(booking);
              const progress = getProgressPercentage(booking);
              
              return (
                <div 
                  key={booking.id} 
                  className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => loadBookingDetail(booking.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {booking.eventType?.title || '预约'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        与 {booking.guestName} · {booking.guestEmail}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      booking.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status === 'confirmed' ? '已确认' :
                       booking.status === 'cancelled' ? '已取消' :
                       booking.status === 'rescheduled' ? '已改期' :
                       booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">时间</p>
                      <p className="font-medium text-gray-900">
                        {format(new Date(booking.startTime), 'MM月dd日 HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">时长</p>
                      <p className="font-medium text-gray-900">
                        {Math.round((new Date(booking.endTime) - new Date(booking.startTime)) / 60000)} 分钟
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">旅程进度</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1.5">
                        <div 
                          className={`h-2 rounded-full ${
                            status === 'cancelled' ? 'bg-red-500' :
                            status === 'completed' ? 'bg-green-500' :
                            'bg-primary-600'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {booking.timelineEvents && booking.timelineEvents.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 pt-3 border-t border-gray-100">
                      <div className="flex -space-x-2">
                        {booking.timelineEvents.slice(0, 3).map((event, idx) => {
                          const Icon = lifecycleIcons[event.eventType] || AlertCircle;
                          return (
                            <div 
                              key={event.id}
                              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white"
                            >
                              <Icon className="w-3 h-3 text-gray-600" />
                            </div>
                          );
                        })}
                      </div>
                      <span>
                        {booking.timelineEvents.length} 个事件
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
