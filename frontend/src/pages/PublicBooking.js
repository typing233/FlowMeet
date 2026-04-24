import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Video,
  Users,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { publicAPI } from '../services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const steps = [
  { id: 'select-date', label: '选择时间' },
  { id: 'enter-info', label: '填写信息' },
  { id: 'confirmation', label: '确认预约' }
];

export default function PublicBooking() {
  const { userId, slug } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestNotes: ''
  });
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    fetchEventType();
  }, [userId, slug]);

  const fetchEventType = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await publicAPI.getEventType(userId, slug);
      setUser(response.data.user);
      setEventType(response.data.eventType);
      
      const slotsResponse = await publicAPI.getAvailableSlots({
        eventTypeId: response.data.eventType.id
      });
      setAvailableDates(slotsResponse.data.availableDates || []);
    } catch (error) {
      setError(error.response?.data?.error || '加载失败，请检查链接是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (slot) => {
    setSelectedTime(slot);
  };

  const goToNextStep = () => {
    if (currentStep === 0 && !selectedTime) {
      setError('请选择一个时间');
      return;
    }
    if (currentStep === 1) {
      if (!formData.guestName.trim()) {
        setError('请输入您的姓名');
        return;
      }
      if (!formData.guestEmail.trim()) {
        setError('请输入您的邮箱');
        return;
      }
    }
    setError('');
    setCurrentStep(currentStep + 1);
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    
    try {
      const response = await publicAPI.createBooking({
        eventTypeId: eventType.id,
        startTime: selectedTime.start,
        endTime: selectedTime.end,
        ...formData,
        timezone: user.timezone
      });
      
      setBookingResult(response.data.booking);
      setCurrentStep(2);
    } catch (error) {
      setError(error.response?.data?.error || '预约失败，请稍后重试');
    } finally {
      setSubmitting(false);
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

  const getLocationLabel = (type) => {
    switch (type) {
      case 'online':
        return '线上会议';
      case 'inperson':
        return '线下会面';
      case 'phone':
        return '电话';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !eventType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">链接无效</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-6"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full" />
              ) : (
                <span className="text-primary-700 font-bold text-xl">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">{user?.name}</p>
              <h1 className="text-2xl font-bold text-gray-900">{eventType?.title}</h1>
              {eventType?.description && (
                <p className="text-gray-600 mt-1">{eventType.description}</p>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{eventType?.duration} 分钟</span>
              </div>
              <div className="flex items-center gap-2">
                {getLocationIcon(eventType?.locationType)}
                <span>{getLocationLabel(eventType?.locationType)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex sm:hidden items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{eventType?.duration} 分钟</span>
            </div>
            <div className="flex items-center gap-2">
              {getLocationIcon(eventType?.locationType)}
              <span>{getLocationLabel(eventType?.locationType)}</span>
            </div>
          </div>
        </div>

        {currentStep < 2 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={`text-sm hidden sm:block ${
                    index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {currentStep === 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">选择日期</h2>
              
              {availableDates.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">近期暂无可用时间</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableDates.slice(0, 20).map((dateItem) => {
                    const date = new Date(dateItem.date);
                    const isSelected = selectedDate === dateItem.date;
                    
                    return (
                      <button
                        key={dateItem.date}
                        onClick={() => handleDateSelect(dateItem.date)}
                        className={`p-3 rounded-lg text-center transition-all ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-50 hover:bg-primary-50 text-gray-700'
                        }`}
                      >
                        <div className="text-xs opacity-75">
                          {format(date, 'EEE', { locale: zhCN })}
                        </div>
                        <div className="text-lg font-semibold">
                          {format(date, 'd')}
                        </div>
                        <div className="text-xs opacity-75">
                          {dateItem.slots.length} 个时段
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedDate 
                  ? format(new Date(selectedDate), 'yyyy年MM月dd日 EEEE', { locale: zhCN })
                  : '选择时间'}
              </h2>
              
              {!selectedDate ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">请先选择日期</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableDates
                    .find(d => d.date === selectedDate)
                    ?.slots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => handleTimeSelect(slot)}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${
                        selectedTime?.start === slot.start
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="card p-6 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">填写您的信息</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">预约摘要</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>时间: {format(new Date(selectedTime.start), 'yyyy年MM月dd日 HH:mm')} - {format(new Date(selectedTime.end), 'HH:mm')}</p>
                <p>时长: {eventType?.duration} 分钟</p>
                <p>地点: {getLocationLabel(eventType?.locationType)}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">姓名 *</label>
                <input
                  type="text"
                  value={formData.guestName}
                  onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                  className="form-input"
                  placeholder="您的姓名"
                />
              </div>
              
              <div>
                <label className="form-label">邮箱 *</label>
                <input
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, guestEmail: e.target.value }))}
                  className="form-input"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">预约确认信将发送到此邮箱</p>
              </div>
              
              {eventType?.customFields?.map((field, index) => (
                <div key={index}>
                  <label className="form-label">
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData.customResponses?.[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customResponses: { ...prev.customResponses, [field.name]: e.target.value }
                      }))}
                      className="form-input"
                      rows={3}
                      required={field.required}
                    />
                  ) : (
                    <input
                      type={field.type === 'phone' ? 'tel' : 'text'}
                      value={formData.customResponses?.[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customResponses: { ...prev.customResponses, [field.name]: e.target.value }
                      }))}
                      className="form-input"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              
              {eventType?.questions?.length > 0 && (
                <div>
                  <label className="form-label">请回答以下问题</label>
                  {eventType.questions.map((question, index) => (
                    <div key={index} className="mt-3">
                      <p className="text-sm text-gray-700 mb-2">{question}</p>
                      <input
                        type="text"
                        value={formData.responses?.[index] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          responses: { ...prev.responses, [index]: e.target.value }
                        }))}
                        className="form-input"
                        placeholder="您的回答"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div>
                <label className="form-label">备注（可选）</label>
                <textarea
                  value={formData.guestNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, guestNotes: e.target.value }))}
                  className="form-input"
                  rows={3}
                  placeholder="有什么想告诉主持人的吗？"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && bookingResult && (
          <div className="card p-8 max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">预约成功！</h2>
            <p className="text-gray-600 mb-6">
              确认信已发送到您的邮箱，请注意查收。
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">时间</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(bookingResult.startTime), 'yyyy年MM月dd日 HH:mm')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时长</span>
                  <span className="font-medium text-gray-900">{eventType?.duration} 分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">主持人</span>
                  <span className="font-medium text-gray-900">{user?.name}</span>
                </div>
                {bookingResult.meetingUrl && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-500 text-sm mb-1">会议链接</p>
                    <a
                      href={bookingResult.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm break-all flex items-center gap-1"
                    >
                      {bookingResult.meetingUrl}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => navigate('/')}
              className="btn-primary px-8"
            >
              返回首页
            </button>
          </div>
        )}

        {currentStep < 2 && (
          <div className="flex justify-between mt-8 max-w-lg mx-auto">
            {currentStep > 0 ? (
              <button
                onClick={goToPrevStep}
                className="btn-secondary px-6"
              >
                <ChevronLeft className="w-5 h-5" />
                上一步
              </button>
            ) : (
              <div></div>
            )}
            
            {currentStep < 1 ? (
              <button
                onClick={goToNextStep}
                disabled={!selectedTime}
                className="btn-primary px-8"
              >
                下一步
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary px-8"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    预约中...
                  </>
                ) : (
                  <>
                    确认预约
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
