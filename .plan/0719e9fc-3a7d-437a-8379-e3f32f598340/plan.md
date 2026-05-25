# 个人学习助手 - 项目规划

## 项目概述

开发一个名为"个人学习助手"的AI应用平台，提供智能对话、个人知识库构建、复习纲要生成、智能出题与答题、错题本管理等功能。

**参考网站**: https://zjumicrobiologytests.netlify.app/

## 技术栈

- **前端**: React 18 + TypeScript + TailwindCSS + Webpack
- **后端**: Meoo Cloud Edge Functions (TypeScript)
- **数据库**: PostgreSQL with pgvector (向量存储)
- **文件存储**: Meoo Cloud Storage
- **AI服务**: DeepSeek API (用户自行配置API Key)
- **UI风格**: 深色背景 + 霓虹蓝/紫色点缀，科技感设计

## 核心功能模块

### 1. 大语言模型API调用
- 用户配置自己的DeepSeek API Key
- 支持参数配置（temperature、max_tokens等）
- 实现流式响应（streaming）
- API错误处理（超时、配额不足、网络错误等）

### 2. 个人知识库构建
- 支持上传PPT(.ppt/.pptx)、PDF、Word(.doc/.docx)、Markdown等格式
- 后端解析文件内容（使用相应库）
- 文本分块（chunk size: 512 tokens）
- 向量嵌入存储到pgvector
- 语义检索支持

### 3. 复习纲要和笔记生成
- 选择知识库文档生成结构化复习纲要
- 自动生成学习笔记
- 支持导出为Markdown/PDF

### 4. 智能出题与答题
- 根据知识库内容自动生成多种题型（选择、填空、判断、简答）
- 在线答题页面
- 自动判卷与解析
- 记录练习时间和答题情况

### 5. 错题本与针对性训练
- 自动收集错题
- 错题重练功能
- 根据错题知识点生成补充练习
- 错题统计分析

## 数据库设计

### 表结构

```sql
-- 用户配置表
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT,
  api_base_url TEXT DEFAULT 'https://api.deepseek.com',
  model_name TEXT DEFAULT 'deepseek-chat',
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 知识库文档表
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT,
  content TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文档分块表（用于向量检索）
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成的复习纲要表
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成的学习笔记表
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 题目表
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL, -- 'choice', 'fill_blank', 'judgment', 'short_answer'
  question_text TEXT NOT NULL,
  options JSONB, -- 选择题选项
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty INTEGER DEFAULT 1,
  knowledge_point TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 练习记录表
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  score FLOAT
);

-- 答题记录表
CREATE TABLE practice_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 错题本表
CREATE TABLE wrong_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  wrong_count INTEGER DEFAULT 1,
  last_wrong_at TIMESTAMPTZ DEFAULT NOW(),
  mastered BOOLEAN DEFAULT FALSE
);
```

## Edge Functions API设计

### 1. AI对话接口
- **路径**: `/functions/v1/ai-chat`
- **方法**: POST
- **功能**: 调用DeepSeek API进行智能对话
- **参数**: messages, apiKey, temperature, maxTokens, stream

### 2. 文件上传接口
- **路径**: `/functions/v1/upload`
- **方法**: POST
- **功能**: 上传文件到Storage并解析内容
- **支持格式**: PDF, DOCX, PPTX, MD, TXT

### 3. 知识库检索接口
- **路径**: `/functions/v1/knowledge/search`
- **方法**: POST
- **功能**: 语义检索知识库内容
- **参数**: query, topK

### 4. 生成复习纲要接口
- **路径**: `/functions/v1/summary/generate`
- **方法**: POST
- **功能**: 调用LLM生成复习纲要
- **参数**: documentId, apiKey

### 5. 生成学习笔记接口
- **路径**: `/functions/v1/notes/generate`
- **方法**: POST
- **功能**: 调用LLM生成学习笔记
- **参数**: documentId, apiKey

### 6. 智能出题接口
- **路径**: `/functions/v1/questions/generate`
- **方法**: POST
- **功能**: 根据知识库内容生成题目
- **参数**: documentId, questionTypes, count, difficulty, apiKey

### 7. 判卷接口
- **路径**: `/functions/v1/questions/submit`
- **方法**: POST
- **功能**: 提交答案并判卷
- **参数**: sessionId, answers

### 8. 错题针对性训练接口
- **路径**: `/functions/v1/wrong-questions/practice`
- **方法**: POST
- **功能**: 根据错题知识点生成补充练习
- **参数**: knowledgePoints, apiKey

## 前端页面结构

```
/src
  /components          # 通用组件
    /ui               # UI基础组件
    /layout           # 布局组件
  /pages              # 页面组件
    Home.tsx          # 首页
    KnowledgeBase.tsx # 知识库管理
    StudyAssistant.tsx# 复习助手
    Quiz.tsx          # 智能答题
    WrongQuestions.tsx# 错题本
    Settings.tsx      # 设置（API配置）
  /hooks              # 自定义Hooks
  /services           # API服务
  /types              # TypeScript类型
  /utils              # 工具函数
  App.tsx
  index.tsx
```

## 页面路由

- `/` - 首页（功能导航）
- `/knowledge` - 知识库管理
- `/assistant` - 复习助手
- `/quiz` - 智能答题
- `/wrong` - 错题本
- `/settings` - 设置

## 实现步骤

### 第一阶段：项目初始化
1. 初始化Meoo Cloud服务
2. 创建数据库表结构
3. 配置Edge Functions基础框架

### 第二阶段：核心功能开发
1. 实现AI对话功能（DeepSeek API集成）
2. 实现文件上传和解析
3. 实现向量存储和检索

### 第三阶段：知识库功能
1. 知识库管理页面
2. 文档上传和列表
3. 语义检索功能

### 第四阶段：学习辅助功能
1. 复习纲要生成
2. 学习笔记生成
3. 导出功能

### 第五阶段：答题功能
1. 智能出题
2. 答题页面
3. 自动判卷

### 第六阶段：错题本功能
1. 错题收集
2. 错题重练
3. 针对性训练
4. 统计分析

### 第七阶段：UI优化
1. 深色主题实现
2. 霓虹蓝/紫色点缀
3. 动画和过渡效果
4. 响应式适配

## 依赖项

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@supabase/supabase-js": "^2.38.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.294.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "pdf-lib": "^1.17.1",
    "mammoth": "^1.6.0",
    "pptx-parser": "^1.0.0"
  }
}
```

## 安全注意事项

1. API Key存储：用户API Key仅存储在浏览器localStorage，不发送到服务器
2. 文件上传：限制文件类型和大小（≤50MB）
3. 输入过滤：对用户输入进行XSS过滤
4. 内容过滤：对LLM生成内容进行敏感词检查

## 潜在风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| DeepSeek API调用失败 | 提供友好的错误提示，支持重试机制 |
| 大文件解析超时 | 分块处理，显示进度条 |
| 向量检索性能 | 添加索引，限制返回数量 |
| 浏览器存储限制 | 定期清理，重要数据存云端 |

## UI设计参考

- **主色调**: 深色背景 (#0f172a) + 霓虹蓝 (#3b82f6) / 紫色 (#8b5cf6)
- **字体**: Inter / system-ui
- **圆角**: 8px-16px
- **阴影**: 霓虹光晕效果
- **动画**: Framer Motion实现平滑过渡
