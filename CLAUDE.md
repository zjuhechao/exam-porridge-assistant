# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 考试粥助手

AI 驱动的学习助手，支持知识库管理、智能出题、错题本、复习纲要和学习笔记生成。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Webpack 5 + Babel（React automatic runtime，JSX 无需手动 `import React`）
- **样式**: Tailwind CSS 3 + CSS 自定义属性（RGB 主题变量系统，支持 opacity 叠加）
- **路由**: React Router 6 (HashRouter，路由以 `#/` 开头)
- **动画**: Framer Motion
- **Markdown 渲染**: react-markdown + remark-gfm + rehype-katex（支持数学公式）
- **数学公式**: KaTeX
- **存储**: Dexie v4 (IndexedDB) + localStorage
- **AI**: 浏览器直连 AI API（OpenAI 兼容格式），支持流式 / 非流式调用

## 目录结构

```
src/
├── components/layout/   # 布局组件（含底部导航栏和移动端汉堡菜单）
├── contexts/            # React Context（ThemeContext — 主题系统）
├── pages/               # 页面组件
│   ├── Home.tsx         # 首页（仪表盘）
│   ├── Courses.tsx      # 课程管理（CRUD + 默认 8 门课程）
│   ├── KnowledgeBase.tsx # 知识库（文档上传/URL 抓取/OCR 识别）
│   ├── StudyAssistant.tsx # 复习助手（AI 生成纲要/笔记）
│   ├── Quiz.tsx         # 智能答题（含题目导入、历史记录删除）
│   ├── WrongQuestions.tsx # 错题本（支持标记已掌握）
│   ├── Profile.tsx      # 个人中心
│   └── Settings.tsx     # 设置（多 API 配置、功能分配、数据隔离开关）
├── services/
│   ├── api.ts           # AI API + URL 抓取 + 图片题目解析 + 文本分块
│   ├── db.ts            # 数据库 CRUD 操作封装（含课程隔离查询变体）
│   ├── localDb.ts       # Dexie 数据库定义（10 表，含 v1→v2 迁移）
│   ├── fileParser.ts    # 文档解析（pdf/docx/txt，PDF 可渲染为图片供多模态识别）
│   ├── prompts.ts       # 提示词工程（8 学科定制 prompt）
│   └── questionParser.ts # 纯本地题目解析器（正则匹配，不依赖 AI）
├── types/index.ts       # 完整 TypeScript 类型定义
└── styles/index.css     # 全局样式 + 6 套主题 + 浅色/深色模式 + prose 样式
```

## 开发命令

```bash
npm run dev          # 启动 Webpack 开发服务器 (localhost:3015, host 0.0.0.0)
npm run build        # 生产构建到 dist/ (bundle.js)
npm run typecheck    # TypeScript 类型检查 (tsc --noEmit)

# Electron 开发 & 打包
npm run electron:dev   # 开发模式：启动 dev server + Electron 窗口（热更新）
npm run electron:pack  # 测试打包（仅打包不安装，输出到 release/）
npm run electron:build # 生产打包（生成安装程序 .exe / .dmg / .AppImage）
npx electron .         # 直接运行 Electron（使用已构建的 dist/，无需 dev server）
```

### Electron 模式检测逻辑

```
electron:dev  → NODE_ENV=development → 加载 http://localhost:3015（热更新）
electron:build → app.isPackaged=true  → 加载 dist/index.html
npx electron . → 都不是              → 加载 dist/index.html（需先 npm run build）
```

## 架构要点

### 数据存储

全部在浏览器端，**无后端服务器**：

- **IndexedDB** (Dexie, 数据库名 `StudyAssistantDB`): 10 张表
  - `courses` — 课程（首次启动自动创建 8 门默认课程）
  - `user_courses` — 用户课程关联（复合索引 `[user_id+course_id]`）
  - `documents` — 文档（含 `file_blob` 字段存储原始文件）
  - `document_chunks` — 文档分块
  - `questions` — 题目（v2 新增 `source` 索引）
  - `practice_sessions` — 练习会话
  - `practice_answers` — 答题记录
  - `wrong_questions` — 错题本
  - `summaries` — 复习纲要
  - `notes` — 学习笔记
- **localStorage**: API 配置、当前课程 ID、数据隔离开关、主题偏好、背景模式

关键 localStorage 键名：
- `api_configs` — 多 API 配置数组 (JSON)
- `function_apis` — 功能→API 映射 (JSON)
- `current_course_id` — 当前选中课程
- `data_isolation` — 数据隔离开关
- `app_theme` / `app_theme_custom` / `app_bg_mode` — 主题设置

### IndexedDB 版本迁移 (`localDb.ts`)

- **v1**: 初始 schema，10 个表的索引定义
- **v2**: questions 表新增 `source` 索引（用于题目来源分组/筛选）

### API 调用 (`api.ts`)

所有 AI 功能通过浏览器 `fetch` 直连 API。支持每个功能使用不同的 API 配置：

| 函数 | 方式 | 用途 | 功能键 |
|------|------|------|--------|
| `chatWithAI()` | 流式 (SSE) | AI 对话 | `chat` |
| `generateQuestions()` | 非流式 | 从内容生成题目 | `generateQuestions` |
| `generateSummary()` | 非流式 | 生成复习纲要 | `generateSummary` |
| `generateNotes()` | 非流式 | 生成学习笔记 | `generateNotes` |
| `parseQuestionsFromFile()` | 非流式 | 从文件内容解析题目（大文件自动分块、去重） | `generateQuestions` |
| `parseQuestionsFromImages()` | 非流式 | 多模态图片→题目 | `ocr` |
| `ocrImage()` | 非流式 | 图片文字识别（支持校正） | `ocr` |
| `fetchUrlContent()` | 非流式 | 抓取网页正文（直连 + CORS 代理回退） | — |

#### API URL 拼接逻辑 (`api.ts:buildApiUrl`)

```
baseUrl 以 /chat/completions 结尾 → 直接使用
baseUrl 以 /v1 结尾             → 追加 /chat/completions
其他情况                        → 追加 /v1/chat/completions
```

#### URL 内容抓取 (`fetchUrlContent`)

用于从公开网页抓取内容加入知识库。抓取策略：
1. 直接 `fetch`（8 秒超时）
2. 回退到 CORS 代理（codetabs.com → corsproxy.io）
3. HTML→纯文本提取（移除 script/style/nav/footer，解码 HTML 实体）
4. 已知限制：百度百科、知乎等有反爬机制的网站不支持

### 课程数据隔离

通过 `getActiveCourseId()` 函数实现：当 `data_isolation` 为 `true` 时返回当前课程 ID，所有数据操作自动按课程过滤。db.ts 提供 `*ByCourse()` 系列函数（如 `getDocumentsByCourse`、`getQuestionsByCourse`）支持显式课程过滤。

### 提示词系统 (`prompts.ts`)

8 个学科特定配置（`math` / `physics` / `chemistry` / `biology` / `history` / `literature` / `computer` / `general`），每个包含：
- `systemPrompt` — 角色设定
- `summaryPrompt` — 复习纲要生成指令
- `notesPrompt` — 学习笔记生成指令
- `questionPrompt` — 题目生成指令

AI 生成题目时要求返回严格 JSON 格式，`generateQuestions()` 和 `parseQuestionsFromFile()` 会调用 `parseQuestionsResponse()` 做多层 JSON 提取容错（直接解析 → 嵌套对象提取 → 正则数组提取）。

### 本地题目解析 (`questionParser.ts`)

**不依赖 AI 的纯客户端解析器**，用于识别和提取结构化题目文本：
- `isStructuredContent()` — 检测文本是否为结构化题目（题型标题 + 题号 + 答案标记）
- `parseQuestionsLocally()` — 三步管道：分区（题型标题识别）→ 拆题（分隔符 `---===***___` 或题号正则）→ 解析（答案行/解析行/选项行/题型推断）
- 支持中文题型标题（一、二、三... 选择题/判断题/填空题/简答题）
- 判断题自动标准化答案（对/错/T/F/√/× → 正确/错误）

### 主题系统 (`ThemeContext`)

6 套预设主题 + 自定义颜色：
- `ocean` (极夜蓝) · `forest` (翡翠绿) · `sunset` (日落橙) · `starry` (星空紫) · `sakura` (樱花粉) · `amber` (琥珀金)
- 支持 `dark` / `light` 背景模式切换（CSS 变量覆盖）
- 颜色通过 `--c-a1` `--c-g1` 等 RGB 分量 CSS 变量传递，配合 Tailwind 的 `rgb()` + opacity 语法使用
- 自定义主题支持 4 色配置（主强调色 + 辅助强调色 + 渐变起止色）

### 多 API 配置

设置页面支持添加多个 API 配置（APIConfig），每个包含 id / name / apiKey / baseUrl / modelName / temperature / maxTokens。5 个功能（chat / generateQuestions / generateSummary / generateNotes / ocr）可分别分配不同的 API 配置。

### 路由表 (`App.tsx`)

| 路径 | 页面 | 说明 |
|------|------|------|
| `#/` | Home | 首页（Layout 嵌套路由） |
| `#/courses` | Courses | 课程管理 |
| `#/knowledge` | KnowledgeBase | 知识库 |
| `#/assistant` | StudyAssistant | 复习助手 |
| `#/quiz` | Quiz | 智能答题 |
| `#/wrong` | WrongQuestions | 错题本 |
| `#/profile` | Profile | 个人中心 |
| `#/settings` | Settings | 设置 |
| `#/*` | 404 | 未匹配路由 |

## 已知注意事项

### "Failed to fetch" 错误

生成复习纲要/学习笔记/题目时如果出现该错误：
1. 检查 API Base URL、API Key、模型名是否配置正确
2. 按 F12 看控制台具体错误类型（CORS/网络不通/插件拦截）
3. 自定义中转服务需要返回正确的 CORS 头
4. 先测试 AI 聊天功能是否正常，判断是配置问题还是网络问题

### 文档解析

支持 txt / pdf (pdfjs-dist) / docx (mammoth)，文件内容和原始 blob 均存入 IndexedDB。PDF 可通过 `renderPdfPagesToBase64()` 渲染为图片供多模态 AI 识别（用于扫描件题目导入）。

### 路由模式

使用 HashRouter，所有路由以 `#/` 开头，适合静态部署。webpack devServer 配置了 `historyApiFallback`。

### Electron 桌面应用 (`electron/`)

**`main.js`** — 主进程：创建 BrowserWindow，根据 `NODE_ENV` 决定加载 dev server 还是 dist/ 文件。配置 `contextIsolation: true` + `nodeIntegration: false`。

**`preload.js`** — 预加载脚本：通过 `contextBridge` 向渲染进程暴露 `window.electronAPI`（平台信息、窗口控制）。初期最小化，后续可按需扩展原生功能。

**关键适配点**：
- `pdfjs-dist` Worker 设为 `false`（主线程运行），避免 Electron 离线时 CDN Worker 不可用
- TypeScript 全局声明 `window.electronAPI` 已添加（`src/types/index.ts`）
- `webpack.config.js` 的 `publicPath: 'auto'` 兼容 `file://` 协议
- `electron-builder` 配置在 `package.json` 的 `build` 字段中，支持 Windows (NSIS) / macOS (DMG) / Linux (AppImage)

**添加应用图标**：创建 `src/assets/icon.png`（256x256 或更大），然后取消 `main.js` 和 `electron-builder` 中 icon 路径的注释。
