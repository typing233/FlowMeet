import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Video,
  Users,
  Phone,
  Plus,
  Trash2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { eventTypeAPI } from '../services/api';

const defaultAvailability = {
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
  saturday: [],
  sunday: []
};

const daysOfWeek = [
  { key: 'monday', label: '周一' },
  { key: 'tuesday', label: '周二' },
  { key: 'wednesday', label: '周三' },
  { key: 'thursday', label: '周四' },
  { key: 'friday', label: '周五' },
  { key: 'saturday', label: '周六' },
  { key: 'sunday', label: '周日' }
];

export default function EventTypesForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    duration: 30,
    locationType: 'online',
    locationValue: '',
    minBookingNotice: 24,
    bufferTime: 0,
    maxBookingsPerDay: 5,
    availability: defaultAvailability,
    customFields: [],
    questions: [],
    sendReminder: true,
    reminderMinutes: 60,
    isActive: true
  });

  const [newCustomField, setNewCustomField] = useState({
    name: '',
    type: 'text',
    required: false
  });

  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchEventType();
    }
  }, [id]);

  const fetchEventType = async () => {
    setLoading(true);
    try {
      const response = await eventTypeAPI.getById(id);
      const data = response.data.eventType;
      setFormData({
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        duration: data.duration,
        locationType: data.locationType,
        locationValue: data.locationValue || '',
        minBookingNotice: data.minBookingNotice,
        bufferTime: data.bufferTime,
        maxBookingsPerDay: data.maxBookingsPerDay,
        availability: data.availability || defaultAvailability,
        customFields: data.customFields || [],
        questions: data.questions || [],
        sendReminder: data.sendReminder,
        reminderMinutes: data.reminderMinutes,
        isActive: data.isActive
      });
    } catch (error) {
      console.error('Failed to fetch event type:', error);
      setError('加载失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'title' && !isEdit) {
      setFormData(prev => ({
        ...prev,
        title: value,
        slug: generateSlug(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  };

  const toggleDay = (dayKey) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [dayKey]: prev.availability[dayKey]?.length > 0 ? [] : [{ start: '09:00', end: '18:00' }]
      }
    }));
  };

  const updateTimeSlot = (dayKey, index, field, value) => {
    setFormData(prev => {
      const newAvailability = { ...prev.availability };
      newAvailability[dayKey] = [...newAvailability[dayKey]];
      newAvailability[dayKey][index] = {
        ...newAvailability[dayKey][index],
        [field]: value
      };
      return { ...prev, availability: newAvailability };
    });
  };

  const addTimeSlot = (dayKey) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [dayKey]: [...prev.availability[dayKey], { start: '14:00', end: '18:00' }]
      }
    }));
  };

  const removeTimeSlot = (dayKey, index) => {
    setFormData(prev => {
      const newAvailability = { ...prev.availability };
      newAvailability[dayKey] = newAvailability[dayKey].filter((_, i) => i !== index);
      return { ...prev, availability: newAvailability };
    });
  };

  const addCustomField = () => {
    if (!newCustomField.name.trim()) return;
    setFormData(prev => ({
      ...prev,
      customFields: [...prev.customFields, { ...newCustomField }]
    }));
    setNewCustomField({ name: '', type: 'text', required: false });
  };

  const removeCustomField = (index) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion.trim()]
    }));
    setNewQuestion('');
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.title.trim()) {
      setError('请输入标题');
      return;
    }
    if (!formData.slug.trim()) {
      setError('请输入链接标识');
      return;
    }
    if (formData.duration <= 0) {
      setError('请输入有效的时长');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await eventTypeAPI.update(id, formData);
      } else {
        await eventTypeAPI.create(formData);
      }
      navigate('/event-types');
    } catch (error) {
      setError(error.response?.data?.error || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/event-types"
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? '编辑预约类型' : '新建预约类型'}
            </h1>
            <p className="text-gray-600 mt-1">
              设置预约的基本信息、可约时段和规则
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="form-label">标题 *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="例如：30分钟咨询"
                  required
                />
              </div>
              <div>
                <label className="form-label">链接标识 *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                    /book/
                  </span>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    className="form-input rounded-l-none"
                    placeholder="30min-consult"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="form-label">描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="form-input"
                placeholder="描述这个预约的用途..."
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">时间设置</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="form-label">时长（分钟）</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min={1}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">提前预约（小时）</label>
                <input
                  type="number"
                  name="minBookingNotice"
                  value={formData.minBookingNotice}
                  onChange={handleInputChange}
                  min={0}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">缓冲时间（分钟）</label>
                <input
                  type="number"
                  name="bufferTime"
                  value={formData.bufferTime}
                  onChange={handleInputChange}
                  min={0}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">每天最大预约数</label>
                <input
                  type="number"
                  name="maxBookingsPerDay"
                  value={formData.maxBookingsPerDay}
                  onChange={handleInputChange}
                  min={1}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">地点设置</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { value: 'online', label: '线上会议', icon: Video, desc: '自动生成会议链接' },
                { value: 'inperson', label: '线下', icon: Users, desc: '输入具体地址' },
                { value: 'phone', label: '电话', icon: Phone, desc: '访客提供号码' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, locationType: option.value }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.locationType === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <option.icon className={`w-6 h-6 mb-2 ${
                    formData.locationType === option.value ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <p className={`font-medium ${
                    formData.locationType === option.value ? 'text-primary-900' : 'text-gray-900'
                  }`}>{option.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{option.desc}</p>
                </button>
              ))}
            </div>
            {formData.locationType === 'inperson' && (
              <div>
                <label className="form-label">具体地址</label>
                <input
                  type="text"
                  name="locationValue"
                  value={formData.locationValue}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="例如：北京市朝阳区..."
                />
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">可约时段</h2>
            <div className="space-y-3">
              {daysOfWeek.map((day) => {
                const slots = formData.availability[day.key] || [];
                const isDayEnabled = slots.length > 0;
                
                return (
                  <div key={day.key} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={`w-12 h-12 rounded-lg font-medium transition-colors flex-shrink-0 ${
                        isDayEnabled
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {day.label}
                    </button>
                    
                    {isDayEnabled ? (
                      <div className="flex-1 space-y-2">
                        {slots.map((slot, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateTimeSlot(day.key, index, 'start', e.target.value)}
                              className="form-input py-2 w-28"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateTimeSlot(day.key, index, 'end', e.target.value)}
                              className="form-input py-2 w-28"
                            />
                            {slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTimeSlot(day.key, index)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTimeSlot(day.key)}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          添加时段
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 py-2">全天不可约</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">自定义表单字段</h2>
            <p className="text-sm text-gray-600 mb-4">
              添加访客预约时需要填写的额外字段
            </p>
            
            {formData.customFields.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.customFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{field.name}</span>
                    <span className="text-sm text-gray-500">
                      ({field.type === 'text' ? '文本' : field.type === 'phone' ? '电话' : '长文本'})
                    </span>
                    {field.required && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">必填</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="ml-auto text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newCustomField.name}
                onChange={(e) => setNewCustomField(prev => ({ ...prev, name: e.target.value }))}
                className="form-input py-2 flex-1"
                placeholder="字段名称，例如：公司名称"
              />
              <select
                value={newCustomField.type}
                onChange={(e) => setNewCustomField(prev => ({ ...prev, type: e.target.value }))}
                className="form-input py-2 w-32"
              >
                <option value="text">文本</option>
                <option value="phone">电话</option>
                <option value="textarea">长文本</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCustomField.required}
                  onChange={(e) => setNewCustomField(prev => ({ ...prev, required: e.target.checked }))}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-gray-600">必填</span>
              </label>
              <button
                type="button"
                onClick={addCustomField}
                className="btn-primary py-2 px-4"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">前置问题</h2>
            <p className="text-sm text-gray-600 mb-4">
              访客预约前需要回答的问题
            </p>
            
            {formData.questions.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.questions.map((question, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{question}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="ml-auto text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="form-input py-2 flex-1"
                placeholder="例如：您想咨询什么问题？"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
              />
              <button
                type="button"
                onClick={addQuestion}
                className="btn-primary py-2 px-4"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">提醒设置</h2>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="sendReminder"
                  checked={formData.sendReminder}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-primary-600"
                />
                <span className="font-medium text-gray-700">发送预约提醒</span>
              </label>
            </div>
            {formData.sendReminder && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">提前</span>
                <select
                  name="reminderMinutes"
                  value={formData.reminderMinutes}
                  onChange={handleInputChange}
                  className="form-input py-2 w-40"
                >
                  <option value={15}>15 分钟</option>
                  <option value={30}>30 分钟</option>
                  <option value={60}>1 小时</option>
                  <option value={1440}>1 天</option>
                </select>
                <span className="text-sm text-gray-600">发送提醒</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Link
              to="/event-types"
              className="btn-secondary px-6"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-8"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
