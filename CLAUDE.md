# 考试粥助手

AI 驱动的学习助手，支持知识库管理、智能出题、错题本、复习纲要和学习笔记生成。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Webpack 5 + Babel
- **样式**: Tailwind CSS 3
- **路由**: React Router 6 (HashRouter)
- **动画**: Framer Motion
- **存储**: Dexie (IndexedDB) + localStorage
- **AI**: 直连 AI API（OpenAI 兼容格式）

## 目录结构

```
src/
├── components/layout/   # 布局组件（导航栏）
├── pages/               # 页面组件
│   ├── Home.tsx         # 首页
│   ├── Courses.tsx      # 课程管理
│   ├── KnowledgeBase.tsx # 知识库（文档上传/管理）
│   ├── StudyAssistant.tsx # 复习助手（生成纲要/笔记）
│   ├── Quiz.tsx         # 智能答题
│   ├── WrongQuestions.tsx # 错题本
│   ├── Profile.tsx      # 个人中心
│   └── Settings.tsx     # 设置（API配置）
├── services/
│   ├── api.ts           # AI API 调用（直连 fetch）
│   ├── db.ts            # 数据库操作封装
│   ├── localDb.ts       # Dexie 数据库定义
│   ├── fileParser.ts    # 文档解析（pdf/docx/txt）
│   └── prompts.ts       # 提示词工程（按学科定制）
├── types/index.ts       # 类型定义
└── styles/index.css     # 全局样式
```

## 开发命令

```bash
npm run dev        # 启动开发服务器 (localhost:3015)
npm run build      # 生产构建到 dist/
npm run typecheck  # TypeScript 类型检查
```

## 架构要点

### 数据存储
全部在浏览器端，**无后端服务器**：
- **IndexedDB** (Dexie): 文档、题目、错题、练习记录、总结/笔记
- **localStorage**: API 配置、当前课程、数据隔离开关

### API 调用
所有 AI 功能通过浏览器直连 API（`src/services/api.ts`）：
- 支持多 API 配置，可在设置中添加多个 API Key
- 每个功能（聊天/生成题目/生成总结/生成笔记/OCR）可分配不同的 API 配置
- 使用 OpenAI 兼容格式，支持 DeepSeek / OpenAI / Claude / 兼容服务
- 流式调用: `chatWithAI()` — 用于 AI 聊天
- 非流式调用: `callAI()` — 用于生成题目、总结、笔记

### API URL 拼接逻辑 (`api.ts:buildApiUrl`)
```
baseUrl 以 /chat/completions 结尾 → 直接使用
baseUrl 以 /v1 结尾             → 追加 /chat/completions
其他情况                        → 追加 /v1/chat/completions
```

### 课程数据隔离
可选功能，开启后每个课程的知识库、错题、笔记完全隔离。

### 提示词系统 (`prompts.ts`)
按学科（数学/物理/化学/生物/历史/文学/计算机/通用）定制提示词，包括 system prompt、总结 prompt、笔记 prompt、出题 prompt。

## 已知注意事项

### "Failed to fetch" 错误
生成复习纲要/学习笔记/题目时如果出现该错误：
1. 检查 API Base URL、API Key、模型名是否配置正确
2. 按 F12 看控制台具体错误类型（CORS/网络不通/插件拦截）
3. 自定义中转服务需要返回正确的 CORS 头
4. 先测试 AI 聊天功能是否正常，判断是配置问题还是网络问题

### 文档解析
支持 txt / pdf (pdfjs-dist) / docx (mammoth)，文件内容存入 IndexedDB。

### 路由模式
使用 HashRouter，所有路由以 `#/` 开头，适合静态部署。
