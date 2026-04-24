import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  Link2,
  Check,
  ExternalLink,
  AlertCircle,
  Copy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calendarAPI } from '../services/api';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [calendarStatus, setCalendarStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    timezone: user?.timezone || 'Asia/Shanghai'
  });

  useEffect(() => {
    fetchCalendarStatus();
    if (user) {
      setFormData({
        name: user.name,
        timezone: user.timezone || 'Asia/Shanghai'
      });
    }
  }, [user]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await calendarAPI.getStatus();
      setCalendarStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await calendarAPI.getAuthUrl();
      window.location.href = response.data.authUrl;
    } catch (error) {
      setError('获取授权链接失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const disconnectCalendar = async () => {
    try {
      await calendarAPI.disconnect();
      setCalendarStatus({ connected: false });
      setSuccess('已断开日历连接');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('断开连接失败，请稍后重试');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await updateUser(formData);
      setSuccess('个人信息已更新');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('更新失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const copyBookingLink = () => {
    if (user) {
      const link = `${window.location.origin}/book/${user.id}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timezones = [
    { value: 'Asia/Shanghai', label: '中国 (北京)' },
    { value: 'Asia/Tokyo', label: '日本 (东京)' },
    { value: 'Asia/Hong_Kong', label: '中国香港' },
    { value: 'Asia/Singapore', label: '新加坡' },
    { value: 'America/New_York', label: '美国 (纽约)' },
    { value: 'America/Los_Angeles', label: '美国 (洛杉矶)' },
    { value: 'Europe/London', label: '英国 (伦敦)' },
    { value: 'Europe/Paris', label: '法国 (巴黎)' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="text-gray-600 mt-1">管理您的账户和偏好设置</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 animate-fade-in">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            个人信息
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="form-label">头像</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-xl">
                      {formData.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    头像功能即将上线
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="form-input bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div>
              <label className="form-label">时区</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="form-input"
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-8"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    保存更改
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            我的预约链接
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">预约主页链接</p>
                <p className="text-sm text-gray-500 truncate">
                  {window.location.origin}/book/{user?.id || '...'}
                </p>
              </div>
              <button
                onClick={copyBookingLink}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              分享此链接给您的客户或合作伙伴，他们可以选择您的预约类型并预约时间。
            </p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            日历连接
          </h2>
          
          {calendarStatus.connected ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-900">已连接 Google 日历</p>
                  <p className="text-sm text-green-700">
                    正在同步您的日程安排，访客可以看到您的实时空闲时间
                  </p>
                </div>
                <button
                  onClick={disconnectCalendar}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  断开连接
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">未连接日历</p>
                    <p className="text-sm text-amber-700 mt-1">
                      连接您的 Google 日历后，系统可以：
                    </p>
                    <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                      <li>查看您的实时忙碌时段，避免重复预约</li>
                      <li>预约确认后自动添加到您的日历</li>
                      <li>自动生成 Google Meet 会议链接</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                onClick={connectGoogleCalendar}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    连接 Google 日历
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
