import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  Calendar as CalendarIcon,
  Plus,
  Video,
  Link as LinkIcon,
  ChevronRight,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, calendarAPI, eventTypeAPI } from '../services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ today: 0, upcoming: 0 });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes, eventTypesRes, calendarRes] = await Promise.all([
        bookingAPI.getStats(),
        bookingAPI.getUpcoming(),
        eventTypeAPI.getAll(),
        calendarAPI.getStatus()
      ]);
      
      setStats(statsRes.data);
      setUpcomingBookings(bookingsRes.data.bookings);
      setEventTypes(eventTypesRes.data.eventTypes);
      setCalendarStatus(calendarRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (eventType) => {
    const link = `${window.location.origin}/book/${user.id}/${eventType.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(eventType.id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'online':
        return <Video className="w-4 h-4" />;
      case 'inperson':
        return <Users className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            欢迎回来，{user?.name}
          </h1>
          <p className="text-gray-600">
            今天是 {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </p>
        </div>

        {!calendarStatus.connected && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-1">
                  连接您的日历
                </h3>
                <p className="text-amber-700 text-sm mb-4">
                  连接 Google 日历以同步您的日程安排，让访客看到您的实时空闲时间。
                </p>
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  连接日历
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-primary-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                今日
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.today}</p>
            <p className="text-sm text-gray-600">今日预约</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                即将到来
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.upcoming}</p>
            <p className="text-sm text-gray-600">即将到来的预约</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                活跃
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {eventTypes.filter(et => et.isActive).length}
            </p>
            <p className="text-sm text-gray-600">活跃预约类型</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${calendarStatus.connected ? 'bg-green-100' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                <Calendar className={`w-6 h-6 ${calendarStatus.connected ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <span className={`text-xs font-medium ${calendarStatus.connected ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded-full`}>
                {calendarStatus.connected ? '已连接' : '未连接'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">
              {calendarStatus.provider === 'google' ? 'Google 日历' : '日历'}
            </p>
            <p className="text-sm text-gray-600">
              {calendarStatus.connected ? '已同步日程' : '请连接日历'}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">即将到来的预约</h2>
                <Link
                  to="/bookings"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="p-6">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">暂无即将到来的预约</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {booking.eventType?.title || '预约'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          与 {booking.guestName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(booking.startTime), 'MM月dd日 HH:mm', { locale: zhCN })}
                        </p>
                      </div>
                      {booking.meetingUrl && (
                        <a
                          href={booking.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors"
                          title="加入会议"
                        >
                          <Video className="w-5 h-5 text-green-600" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">我的预约类型</h2>
                <Link
                  to="/event-types/new"
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  新建
                </Link>
              </div>
            </div>
            <div className="p-6">
              {eventTypes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LinkIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">还没有创建预约类型</p>
                  <Link
                    to="/event-types/new"
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    创建第一个预约类型
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventTypes.slice(0, 5).map((eventType) => (
                    <div
                      key={eventType.id}
                      className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg hover:border-primary-200 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${eventType.isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        {getLocationIcon(eventType.locationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {eventType.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {eventType.duration} 分钟 · {eventType._count?.bookings || 0} 次预约
                        </p>
                      </div>
                      <button
                        onClick={() => copyLink(eventType)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                        title="复制链接"
                      >
                        {copiedLink === eventType.id ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
