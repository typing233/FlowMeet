# FlowMeet - 智能日程调度平台

一个连接个人日历，让访客自助查看实时空闲档期并自动完成预约、会议通知的智能日程调度平台。

## 功能特性

### 核心功能
- **日历集成**：连接 Google 日历，实时同步日程
- **智能档期计算**：结合用户可约时段和日历忙碌时段，生成准确的可用档期
- **访客自助预约**：访客通过链接直接查看空闲时间并完成预约
- **自动日历邀请**：预约确认后自动向双方发送日历邀请
- **在线会议集成**：自动生成 Google Meet 会议链接
- **多类型预约**：支持创建不同时长的预约类型（30分钟咨询、15分钟快速沟通等）

### 高级配置
- **地点设置**：支持线上（Google Meet）、线下、电话等多种地点类型
- **自定义表单**：为每个预约类型单独设置访客需要填写的信息字段
- **前置问题**：设置想向访客询问的问题
- **预约规则**：
  - 至少提前多久可约
  - 一天最多接几个预约
  - 两次预约之间留多长缓冲时间
- **提醒设置**：自定义提醒时间，减少爽约

## 技术栈

### 后端
- **Node.js** + **Express** - 服务器框架
- **Prisma ORM** - 数据库 ORM
- **PostgreSQL** - 关系型数据库
- **JWT** - 用户认证
- **Google Calendar API** - 日历集成
- **Nodemailer** - 邮件通知

### 前端
- **React 18** - 前端框架
- **React Router 6** - 路由管理
- **Tailwind CSS** - 样式框架
- **Axios** - HTTP 客户端
- **Lucide React** - 图标库
- **date-fns** - 日期处理

## 项目结构

```
FlowMeet/
├── backend/                    # 后端代码
│   ├── prisma/
│   │   └── schema.prisma      # 数据库模型定义
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT 认证中间件
│   │   ├── routes/
│   │   │   ├── auth.js        # 用户认证路由
│   │   │   ├── bookings.js    # 预约管理路由
│   │   │   ├── calendar.js    # 日历连接路由
│   │   │   ├── eventTypes.js  # 预约类型管理路由
│   │   │   └── public.js      # 公开 API 路由
│   │   ├── utils/
│   │   │   ├── calendar.js    # Google Calendar API 工具
│   │   │   └── email.js       # 邮件通知工具
│   │   └── server.js          # 服务器入口
│   ├── .env.example           # 环境变量示例
│   └── package.json
├── frontend/                   # 前端代码
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout/
│   │   │       ├── Navbar.js       # 导航栏组件
│   │   │       └── PrivateRoute.js # 私有路由保护
│   │   ├── contexts/
│   │   │   └── AuthContext.js      # 用户认证上下文
│   │   ├── pages/
│   │   │   ├── Dashboard.js        # 用户仪表盘
│   │   │   ├── EventTypes.js       # 预约类型列表
│   │   │   ├── EventTypesForm.js   # 预约类型表单
│   │   │   ├── Bookings.js         # 预约管理
│   │   │   ├── Settings.js         # 设置页面
│   │   │   ├── PublicBooking.js    # 公开预约页面
│   │   │   ├── Login.js            # 登录
│   │   │   ├── Register.js         # 注册
│   │   │   └── Home.js             # 首页
│   │   ├── services/
│   │   │   └── api.js              # API 服务
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## 快速开始

### 前置要求
- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- Google Cloud 账号（用于 Calendar API）

### 安装步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd FlowMeet
```

#### 2. 配置数据库

确保 PostgreSQL 已安装并运行，创建数据库：

```sql
CREATE DATABASE flowmeet;
```

#### 3. 安装后端依赖
```bash
cd backend
npm install
```

#### 4. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/flowmeet?schema=public"

# JWT 配置（请修改为安全的密钥）
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters
JWT_EXPIRES_IN=7d

# Google Calendar API 配置（见下方说明）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# 前端 URL
FRONTEND_URL=http://localhost:3000

# 邮件配置（可选，用于发送通知）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 5. 设置 Google Calendar API

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目
3. 启用 Google Calendar API
4. 创建 OAuth 2.0 客户端 ID
   - 授权类型：Web 应用
   - 授权重定向 URI：`http://localhost:3001/api/auth/google/callback`
5. 将获取的 Client ID 和 Client Secret 填入 `.env` 文件

#### 6. 初始化数据库
```bash
# 在 backend 目录下
npx prisma migrate dev --name init
```

这将：
- 创建数据库表
- 生成 Prisma Client

#### 7. 安装前端依赖
```bash
cd ../frontend
npm install
```

### 运行项目

#### 方式一：分别启动后端和前端

**启动后端服务：**
```bash
cd backend
npm run dev
```
后端服务将在 `http://localhost:3001` 运行

**启动前端开发服务器：**
```bash
cd frontend
npm start
```
前端应用将在 `http://localhost:3000` 运行

#### 方式二：生产部署

**构建前端：**
```bash
cd frontend
npm run build
```

**启动后端：**
```bash
cd backend
npm start
```

## API 文档

### 认证端点

#### POST /api/auth/register
用户注册

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户姓名"
}
```

**响应：**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "用户姓名"
  }
}
```

#### POST /api/auth/login
用户登录

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 日历连接端点

#### GET /api/calendar/google/auth
获取 Google OAuth 授权 URL

**响应：**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### GET /api/auth/google/callback
Google OAuth 回调地址（自动处理）

#### GET /api/calendar/status
检查日历连接状态

**响应：**
```json
{
  "connected": true,
  "provider": "google"
}
```

### 预约类型端点

#### GET /api/event-types
获取用户的所有预约类型

**需要认证：** 是

#### POST /api/event-types
创建新的预约类型

**请求体：**
```json
{
  "title": "30分钟咨询",
  "description": "一对一咨询服务",
  "duration": 30,
  "locationType": "online",
  "minBookingNotice": 24,
  "bufferTime": 15,
  "maxBookingsPerDay": 5,
  "availability": {
    "monday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
    "tuesday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
    "wednesday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
    "thursday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
    "friday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
    "saturday": [],
    "sunday": []
  },
  "customFields": [
    {"name": "phone", "label": "电话", "type": "text", "required": true}
  ],
  "questions": [
    {"question": "请简要描述您的需求", "type": "textarea", "required": true}
  ]
}
```

#### PUT /api/event-types/:id
更新预约类型

#### DELETE /api/event-types/:id
删除预约类型

### 预约端点

#### GET /api/bookings
获取用户的预约列表

**查询参数：**
- `status`: 按状态过滤（confirmed, cancelled）
- `upcoming`: 是否只显示即将到来的预约（true/false）

#### POST /api/bookings/:id/cancel
取消预约

### 公开端点（无需认证）

#### GET /api/public/:userId/:slug
获取预约类型信息（用于访客预约页面）

**响应：**
```json
{
  "eventType": {
    "id": "event-id",
    "title": "30分钟咨询",
    "description": "一对一咨询服务",
    "duration": 30,
    "locationType": "online",
    "customFields": [...],
    "questions": [...]
  },
  "host": {
    "name": "用户姓名",
    "avatar": null
  }
}
```

#### GET /api/public/:userId/:slug/available-slots
获取可用档期

**查询参数：**
- `date`: 日期（YYYY-MM-DD）
- `timezone`: 时区（默认 Asia/Shanghai）

**响应：**
```json
{
  "slots": [
    {
      "start": "2024-03-15T09:00:00+08:00",
      "end": "2024-03-15T09:30:00+08:00",
      "time": "09:00"
    },
    {
      "start": "2024-03-15T09:30:00+08:00",
      "end": "2024-03-15T10:00:00+08:00",
      "time": "09:30"
    }
  ]
}
```

#### POST /api/public/:userId/:slug/book
创建预约

**请求体：**
```json
{
  "startTime": "2024-03-15T09:00:00",
  "endTime": "2024-03-15T09:30:00",
  "timezone": "Asia/Shanghai",
  "guestName": "访客姓名",
  "guestEmail": "guest@example.com",
  "guestPhone": "13800138000",
  "guestNotes": "备注信息",
  "customResponses": {
    "phone": "13800138000"
  },
  "questionResponses": {
    "请简要描述您的需求": "我想咨询关于产品的问题"
  }
}
```

**响应：**
```json
{
  "booking": {
    "id": "booking-id",
    "status": "confirmed",
    "meetingUrl": "https://meet.google.com/abc-defg-hij",
    "startTime": "2024-03-15T09:00:00.000Z",
    "endTime": "2024-03-15T09:30:00.000Z"
  }
}
```

## 使用流程

### 1. 用户注册与登录
1. 访问 `http://localhost:3000`
2. 点击"开始使用"进行注册
3. 填写邮箱、密码和姓名
4. 登录系统

### 2. 连接日历
1. 登录后进入设置页面
2. 点击"连接 Google 日历"
3. 在 Google OAuth 页面授权
4. 授权成功后自动跳转回应用

### 3. 创建预约类型
1. 进入"预约类型"页面
2. 点击"新建预约类型"
3. 填写基本信息：
   - 标题（如：30分钟咨询）
   - 描述
   - 时长（分钟）
4. 配置地点：
   - 线上：自动生成 Google Meet 链接
   - 线下：填写地址
   - 电话：需要访客提供电话
5. 设置可约时段：
   - 为每周各天设置可约时间段
6. 配置预约规则：
   - 至少提前多少小时可约
   - 缓冲时间（分钟）
   - 每天最多预约数
7. 自定义表单字段（可选）
8. 设置前置问题（可选）
9. 保存

### 4. 分享预约链接
1. 在预约类型列表中，每个类型都有唯一的预约链接
2. 链接格式：`http://localhost:3000/book/{userId}/{slug}`
3. 将链接分享给访客

### 5. 访客预约流程
1. 访客打开预约链接
2. 查看预约类型信息
3. 选择日期和可用时间
4. 填写个人信息
5. 回答前置问题（如有）
6. 确认预约
7. 系统自动：
   - 在双方日历创建事件
   - 生成 Google Meet 链接（线上会议）
   - 发送确认邮件

## 数据库模型

### User（用户）
- `id`: 唯一标识
- `email`: 邮箱（唯一）
- `password`: 密码（加密）
- `name`: 姓名
- `avatar`: 头像
- `timezone`: 时区

### CalendarConnection（日历连接）
- `id`: 唯一标识
- `userId`: 用户 ID
- `provider`: 日历提供商（google/outlook）
- `accessToken`: 访问令牌
- `refreshToken`: 刷新令牌
- `tokenExpiry`: 令牌过期时间
- `calendarId`: 日历 ID

### EventType（预约类型）
- `id`: 唯一标识
- `userId`: 用户 ID
- `slug`: URL 标识
- `title`: 标题
- `description`: 描述
- `duration`: 时长（分钟）
- `locationType`: 地点类型
- `locationValue`: 地点值
- `minBookingNotice`: 提前预约小时数
- `bufferTime`: 缓冲时间（分钟）
- `maxBookingsPerDay`: 每天最大预约数
- `availability`: 可约时段配置（JSON）
- `customFields`: 自定义字段（JSON）
- `questions`: 前置问题（JSON）
- `sendReminder`: 是否发送提醒
- `reminderMinutes`: 提前提醒分钟数
- `isActive`: 是否启用

### Booking（预约）
- `id`: 唯一标识
- `eventTypeId`: 预约类型 ID
- `hostId`: 被预约者 ID
- `guestEmail`: 访客邮箱
- `guestName`: 访客姓名
- `startTime`: 开始时间
- `endTime`: 结束时间
- `timezone`: 时区
- `guestPhone`: 访客电话
- `guestNotes`: 访客备注
- `customResponses`: 自定义字段响应（JSON）
- `status`: 状态
- `meetingUrl`: 会议链接
- `location`: 地点
- `reminderSent`: 提醒是否已发送

## 部署指南

### 环境变量配置

在生产环境中，需要配置以下环境变量：

```env
PORT=3001
NODE_ENV=production

# 数据库（使用 PostgreSQL 连接字符串）
DATABASE_URL="postgresql://username:password@host:5432/flowmeet?schema=public"

# JWT（必须使用强密钥）
JWT_SECRET=your-production-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d

# Google Calendar API
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback

# 前端 URL
FRONTEND_URL=https://your-domain.com

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 使用 PM2 部署

1. 安装 PM2：
```bash
npm install -g pm2
```

2. 在 backend 目录创建 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'flowmeet-api',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

3. 启动：
```bash
pm2 start ecosystem.config.js
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/FlowMeet/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 故障排除

### 数据库连接失败
1. 检查 PostgreSQL 是否运行
2. 验证 `DATABASE_URL` 配置
3. 确认数据库已创建

### Google OAuth 授权失败
1. 检查 Google Cloud Console 中的 OAuth 配置
2. 确认 `GOOGLE_REDIRECT_URI` 与控制台配置一致
3. 检查 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 是否正确

### 日历空闲时段不正确
1. 确认用户已连接日历
2. 检查可约时段配置
3. 验证时区设置

### 预约创建失败
1. 检查请求体格式
2. 验证时间是否在可约时段内
3. 确认没有超过每天最大预约数

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
