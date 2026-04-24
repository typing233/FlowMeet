import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { bookingAPI } from '../services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const statusLabels = {
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
  rescheduled: { label: '已改期', color: 'bg-yellow-100 text-yellow-700' }
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await bookingAPI.getAsHost();
      let filteredBookings = response.data.bookings;
      
      const now = new Date();
      
      if (filter === 'upcoming') {
        filteredBookings = filteredBookings.filter(b => 
          new Date(b.startTime) >= now && b.status === 'confirmed'
        );
      } else if (filter === 'past') {
        filteredBookings = filteredBookings.filter(b => 
          new Date(b.startTime) < now || b.status === 'cancelled'
        );
      }
      
      setBookings(filteredBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      await bookingAPI.cancel(bookingId);
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
      setShowCancelConfirm(null);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('取消失败，请稍后重试');
    }
  };

  const groupByDate = (bookings) => {
    const grouped = {};
    bookings.forEach(booking => {
      const dateKey = format(new Date(booking.startTime), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });
    return grouped;
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

  const groupedBookings = groupByDate(bookings);
  const sortedDates = Object.keys(groupedBookings).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的预约</h1>
            <p className="text-gray-600 mt-1">查看和管理所有预约</p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
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
        </div>

        {bookings.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
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
          <div className="space-y-8">
            {sortedDates.map((dateKey) => {
              const date = new Date(dateKey);
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;
              
              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isToday ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-lg font-bold ${
                        isToday ? 'text-primary-700' : 'text-gray-700'
                      }`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div>
                      <p className={`font-semibold ${isToday ? 'text-primary-700' : 'text-gray-900'}`}>
                        {isToday ? '今天' : format(date, 'EEEE', { locale: zhCN })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(date, 'yyyy年MM月dd日', { locale: zhCN })}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-sm text-gray-500">
                        {groupedBookings[dateKey].length} 个预约
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {groupedBookings[dateKey].map((booking) => {
                      const status = statusLabels[booking.status] || statusLabels.confirmed;
                      
                      return (
                        <div key={booking.id} className="card p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                              {booking.meetingUrl ? (
                                <Video className="w-8 h-8 text-primary-600" />
                              ) : (
                                <Users className="w-8 h-8 text-primary-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {booking.eventType?.title || '预约'}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    与 {booking.guestName} · {booking.guestEmail}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 mt-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {format(new Date(booking.startTime), 'HH:mm')} - 
                                    {format(new Date(booking.endTime), 'HH:mm')}
                                  </span>
                                </div>
                                
                                {booking.meetingUrl && (
                                  <a
                                    href={booking.meetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    会议链接
                                  </a>
                                )}
                                
                                {booking.guestNotes && (
                                  <p className="text-sm text-gray-500">
                                    备注: {booking.guestNotes}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {booking.status === 'confirmed' && (
                              <div className="flex flex-col gap-2">
                                {booking.meetingUrl && (
                                  <a
                                    href={booking.meetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 hover:bg-green-100 transition-colors"
                                    title="加入会议"
                                  >
                                    <Video className="w-5 h-5 text-green-600" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setShowCancelConfirm(booking)}
                                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                                  title="取消预约"
                                >
                                  <X className="w-5 h-5 text-red-400" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                取消预约
              </h3>
              <p className="text-gray-600 mb-2">
                确定要取消以下预约吗？
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="font-medium text-gray-900">
                  {showCancelConfirm.eventType?.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  与 {showCancelConfirm.guestName} · 
                  {format(new Date(showCancelConfirm.startTime), 'MM月dd日 HH:mm')}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                取消后，系统将不会自动通知相关人员。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(null)}
                  className="flex-1 btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={() => handleCancel(showCancelConfirm.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  确认取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
