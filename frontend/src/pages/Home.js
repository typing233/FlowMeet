import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Mail, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <Calendar className="w-8 h-8" />,
      title: '连接您的日历',
      description: '一键连接 Google 或 Outlook 日历，实时同步您的日程安排。'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: '智能档期推荐',
      description: '访客可以直接看到您的实时空闲时间，自动排除已占用时段。'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: '多种预约类型',
      description: '创建不同类型的预约，如30分钟咨询、15分钟快速沟通。'
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: '自动通知提醒',
      description: '预约确认后自动发送日历邀请和会议链接，减少爽约。'
    }
  ];

  const steps = [
    {
      number: '01',
      title: '连接日历',
      description: '登录后连接您的 Google 或 Outlook 日历'
    },
    {
      number: '02',
      title: '设置预约类型',
      description: '创建不同类型的预约，设置可约时段和规则'
    },
    {
      number: '03',
      title: '分享链接',
      description: '将预约链接分享给客户或合作伙伴'
    },
    {
      number: '04',
      title: '自动预约',
      description: '访客自助选择时间，系统自动完成预约'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Calendar className="w-4 h-4" />
                智能日程调度平台
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                让预约变得
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
                  {' '}简单高效
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                连接您的 Google 或 Outlook 日历，让访客自助查看实时空闲档期并自动完成预约。
                再也不用微信或邮件来回确认时间。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="btn-primary text-lg py-4 px-8"
                  >
                    进入仪表盘
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="btn-primary text-lg py-4 px-8"
                    >
                      免费开始
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                      to="/login"
                      className="btn-secondary text-lg py-4 px-8"
                    >
                      登录账户
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  免费使用
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  无需信用卡
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  快速上手
                </div>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-slide-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">张三的预约链接</h3>
                    <p className="text-sm text-gray-500">30分钟咨询</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">选择日期</div>
                  <div className="grid grid-cols-7 gap-2 text-center text-sm">
                    {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
                      <div key={i} className="text-gray-400 text-xs py-2">{day}</div>
                    ))}
                    {[...Array(28)].map((_, i) => {
                      const isAvailable = i > 3 && i < 25 && i % 7 !== 5 && i % 7 !== 6;
                      const isSelected = i === 10;
                      return (
                        <div
                          key={i}
                          className={`py-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : isAvailable
                              ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                              : 'text-gray-300'
                          }`}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="text-sm font-medium text-gray-700 mb-3">可用时间</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time, i) => (
                    <button
                      key={i}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        i === 1
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -right-4 w-64 h-64 bg-gradient-to-br from-primary-200 to-purple-200 rounded-2xl -z-10 opacity-50"></div>
              <div className="absolute -top-4 -left-4 w-40 h-40 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-xl -z-10 opacity-50"></div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              为什么选择 FlowMeet
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              告别繁琐的日程协调，让预约变得简单高效
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
          </div>
        </section>

        <section className="py-20 bg-white rounded-3xl mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              简单四步，开始使用
            </h2>
            <p className="text-lg text-gray-600">
              几分钟内完成设置，开始智能日程调度
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-6xl font-bold text-primary-100 mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-transparent -ml-8"></div>
              )}
            </div>
          ))}
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-3xl p-12 lg:p-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              准备好提升您的工作效率了吗？
            </h2>
            <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
              立即注册，免费开始使用 FlowMeet。让预约变得简单高效。
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold py-4 px-8 rounded-xl hover:bg-primary-50 transition-all duration-200"
            >
              免费开始使用
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
      
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">FlowMeet</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2024 FlowMeet. 智能日程调度平台。
          </p>
        </div>
        </div>
      </footer>
    </div>
  );
}
