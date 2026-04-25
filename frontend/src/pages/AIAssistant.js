import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Clock,
  Calendar,
  Plus,
  Loader2,
  Check,
  X,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { aiAssistantAPI } from '../services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const quickActions = [
  { label: '预约明天', query: '帮我预约明天上午10点' },
  { label: '查询日程', query: '查询明天的日程' },
  { label: '查看空闲', query: '看看我什么时候有空' },
  { label: '取消预约', query: '取消下周一的预约' }
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadSessions();
    startNewSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const response = await aiAssistantAPI.getSessions();
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const startNewSession = async () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是您的AI日程助手。我可以帮您：\n\n• 新建预约 - "帮我预约明天上午10点"\n• 查询档期 - "查询下周的日程"\n• 改期预约 - "把周三的会议改到周五"\n• 取消预约 - "取消下周一的预约"\n\n有什么可以帮您的吗？',
        type: 'info',
        createdAt: new Date()
      }
    ]);
    setSessionId(null);
    setPendingAction(null);
    setShowSessions(false);
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setPendingAction(null);

    try {
      const response = await aiAssistantAPI.sendMessage({
        message: messageText,
        sessionId
      });

      const { assistantMessage, response: responseData, sessionId: newSessionId } = response.data;
      
      if (!sessionId && newSessionId) {
        setSessionId(newSessionId);
      }

      const assistantMsg = {
        id: assistantMessage.id || `ai-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage.content,
        type: responseData?.type || 'info',
        createdAt: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (responseData?.type === 'preview' && responseData?.pendingActionId) {
        setPendingAction({
          actionId: responseData.pendingActionId,
          actionType: responseData.actionType,
          previewData: responseData.previewData,
          message: responseData.message
        });
      }

      if (responseData?.suggestions) {
        setMessages(prev => [...prev, {
          id: `suggestions-${Date.now()}`,
          role: 'assistant',
          content: '',
          type: 'suggestions',
          suggestions: responseData.suggestions,
          createdAt: new Date()
        }]);
      }

      if (responseData?.bookings) {
        setMessages(prev => [...prev, {
          id: `bookings-${Date.now()}`,
          role: 'assistant',
          content: '',
          type: 'bookings_list',
          bookings: responseData.bookings,
          createdAt: new Date()
        }]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了问题。请稍后重试。',
        type: 'error',
        createdAt: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setLoading(true);
    try {
      const response = await aiAssistantAPI.confirmAction(pendingAction.actionId);
      
      setMessages(prev => [...prev, {
        id: `confirm-${Date.now()}`,
        role: 'assistant',
        content: response.data.message || '操作已确认执行！',
        type: 'success',
        createdAt: new Date()
      }]);

      if (response.data.booking) {
        setMessages(prev => [...prev, {
          id: `result-${Date.now()}`,
          role: 'assistant',
          content: '',
          type: 'booking_result',
          booking: response.data.booking,
          createdAt: new Date()
        }]);
      }

      setPendingAction(null);
    } catch (error) {
      console.error('Failed to confirm action:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error.response?.data?.error || '操作执行失败，请重试。',
        type: 'error',
        createdAt: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = async () => {
    if (!pendingAction) return;

    try {
      await aiAssistantAPI.cancelAction(pendingAction.actionId);
      setPendingAction(null);
      setMessages(prev => [...prev, {
        id: `cancel-${Date.now()}`,
        role: 'assistant',
        content: '已取消操作。',
        type: 'info',
        createdAt: new Date()
      }]);
    } catch (error) {
      console.error('Failed to cancel action:', error);
    }
  };

  const handleQuickAction = (query) => {
    sendMessage(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'suggestions':
        return (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(suggestion)}
                className="px-3 py-2 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        );

      case 'bookings_list':
        return (
          <div className="mt-3 space-y-2">
            {message.bookings.map((booking, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="font-medium text-gray-900">{booking.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {booking.time}
                </div>
                {booking.guest && (
                  <div className="text-sm text-gray-500 mt-1">
                    与 {booking.guest}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'booking_result':
        const booking = message.booking;
        return (
          <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
              <Check className="w-5 h-5" />
              操作成功
            </div>
            {booking.title && (
              <div className="text-sm text-gray-700">
                <p><strong>预约:</strong> {booking.title}</p>
                {booking.startTime && (
                  <p className="mt-1">
                    <strong>时间:</strong> {format(new Date(booking.startTime), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{message.content}</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-red-700">{message.content}</span>
          </div>
        );

      default:
        return <p className="whitespace-pre-wrap">{message.content}</p>;
    }
  };

  const renderPendingAction = () => {
    if (!pendingAction) return null;

    const { actionType, previewData } = pendingAction;

    let actionLabel = '';
    let actionDetails = [];

    switch (actionType) {
      case 'create_booking':
        actionLabel = '创建预约';
        if (previewData.date) actionDetails.push({ label: '日期', value: previewData.date });
        if (previewData.time) actionDetails.push({ label: '时间', value: previewData.time });
        if (previewData.duration) actionDetails.push({ label: '时长', value: `${previewData.duration} 分钟` });
        break;

      case 'reschedule_booking':
        actionLabel = '改期预约';
        if (previewData.newDate) actionDetails.push({ label: '新日期', value: previewData.newDate });
        if (previewData.newTime) actionDetails.push({ label: '新时间', value: previewData.newTime });
        break;

      case 'cancel_booking':
        actionLabel = '取消预约';
        if (previewData.title) actionDetails.push({ label: '预约', value: previewData.title });
        if (previewData.time) actionDetails.push({ label: '时间', value: previewData.time });
        if (previewData.guest) actionDetails.push({ label: '访客', value: previewData.guest });
        break;

      default:
        actionLabel = '执行操作';
    }

    return (
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900">请确认操作: {actionLabel}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {actionDetails.map((detail, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">{detail.label}</div>
                  <div className="text-sm font-medium text-gray-900">{detail.value}</div>
                </div>
              ))}
            </div>

            {previewData.eventTypes && previewData.eventTypes.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">选择预约类型:</div>
                <div className="space-y-2">
                  {previewData.eventTypes.map((et, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{et.title}</div>
                      <div className="text-sm text-gray-500">{et.duration} 分钟</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancelAction}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    确认执行
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI 日程助手</h1>
              <p className="text-xs text-gray-500">智能管理您的日程</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={startNewSession}
              className="px-3 py-2 text-sm btn-secondary flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              新对话
            </button>
            {sessions.length > 0 && (
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="px-3 py-2 text-sm btn-secondary"
              >
                历史对话
              </button>
            )}
          </div>
        </div>
      </div>

      {showSessions && sessions.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-2">历史对话</h3>
            <div className="flex flex-wrap gap-2">
              {sessions.slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setSessionId(session.id);
                    setShowSessions(false);
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {session.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                }`}
              >
                {renderMessageContent(message)}
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-primary-200' : 'text-gray-400'
                  }`}
                >
                  {format(new Date(message.createdAt), 'HH:mm', { locale: zhCN })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                  <span className="text-gray-500 text-sm">正在思考...</span>
                </div>
              </div>
            </div>
          )}

          {messages.length <= 1 && !loading && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-500 mb-3 text-center">快速操作</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.query)}
                    className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
                  >
                    <div className="font-medium text-gray-900 group-hover:text-primary-700">
                      {action.label}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      {action.query}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {renderPendingAction()}

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的需求，例如: 帮我预约明天上午10点..."
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            提示: 您可以尝试说 "预约明天上午10点"、"查询下周的日程"、"查看空闲时间" 等
          </p>
        </div>
      </div>
    </div>
  );
}
