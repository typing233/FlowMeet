import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Video,
  Users,
  Clock,
  MoreVertical,
  Link as LinkIcon,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventTypeAPI } from '../services/api';

export default function EventTypes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const fetchEventTypes = async () => {
    try {
      const response = await eventTypeAPI.getAll();
      setEventTypes(response.data.eventTypes);
    } catch (error) {
      console.error('Failed to fetch event types:', error);
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

  const handleDelete = async (id) => {
    try {
      await eventTypeAPI.delete(id);
      setEventTypes(eventTypes.filter(et => et.id !== id));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete event type:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const toggleActive = async (eventType) => {
    try {
      await eventTypeAPI.update(eventType.id, { isActive: !eventType.isActive });
      setEventTypes(eventTypes.map(et => 
        et.id === eventType.id ? { ...et, isActive: !et.isActive } : et
      ));
    } catch (error) {
      console.error('Failed to update event type:', error);
    }
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'online':
        return <Video className="w-5 h-5" />;
      case 'inperson':
        return <Users className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">预约类型</h1>
            <p className="text-gray-600 mt-1">
              创建和管理您的预约类型，设置可约时段和规则
            </p>
          </div>
          <Link
            to="/event-types/new"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建预约类型
          </Link>
        </div>

        {eventTypes.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LinkIcon className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              还没有创建预约类型
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              创建您的第一个预约类型，分享链接给访客，让他们自助选择时间预约您。
            </p>
            <Link
              to="/event-types/new"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              创建第一个预约类型
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventTypes.map((eventType) => (
              <div
                key={eventType.id}
                className="card hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className={`h-2 ${eventType.isActive ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${eventType.isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                        {getLocationIcon(eventType.locationType)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{eventType.title}</h3>
                        <p className="text-sm text-gray-500">
                          {eventType.duration} 分钟
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyLink(eventType)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                        title="复制链接"
                      >
                        {copiedLink === eventType.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {eventType.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {eventType.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {eventType.locationType === 'online' ? '线上会议' : eventType.locationType === 'inperson' ? '线下' : '电话'}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      提前 {eventType.minBookingNotice} 小时可约
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      每天最多 {eventType.maxBookingsPerDay} 个
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {eventType._count?.bookings || 0} 次预约
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(eventType)}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                          eventType.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {eventType.isActive ? '已启用' : '已禁用'}
                      </button>
                      <button
                        onClick={() => navigate(`/event-types/${eventType.id}/edit`)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(eventType.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                确认删除
              </h3>
              <p className="text-gray-600 mb-6">
                删除此预约类型后，相关的预约数据不会被删除，但访客将无法再通过此链接预约。确定要删除吗？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
