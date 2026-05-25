// 类型定义

export interface Course {
  id: string;
  name: string;
  description: string | null;
  subject_type: string;
  difficulty_level: number | null;
  color_theme: string | null;
  icon: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  progress: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number | null;
  storage_path: string | null;
  content: string | null;
  chunk_count: number | null;
  course_id: string | null;
  created_at: string | null;
}

export interface Question {
  id: string;
  document_id: string | null;
  course_id: string | null;
  question_type: string;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  difficulty: number | null;
  knowledge_point: string | null;
  source: string | null;
  created_at: string | null;
}

export interface PracticeSession {
  id: string;
  course_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  total_questions: number | null;
  correct_count: number | null;
  score: number | null;
}

export interface PracticeAnswer {
  id: string;
  session_id: string | null;
  question_id: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  answered_at: string | null;
}

export interface WrongQuestion {
  id: string;
  question_id: string | null;
  course_id: string | null;
  question?: Question | null;
  wrong_count: number | null;
  last_wrong_at: string | null;
  mastered: boolean | null;
}

export interface Summary {
  id: string;
  document_id: string | null;
  course_id: string | null;
  title: string;
  content: string;
  created_at: string | null;
}

export interface Note {
  id: string;
  document_id: string | null;
  course_id: string | null;
  title: string;
  content: string;
  created_at: string | null;
}

// API配置类型
export interface APIConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

// 功能对应的API映射
export interface FunctionAPIConfig {
  chat: string; // API配置ID
  generateQuestions: string;
  generateSummary: string;
  generateNotes: string;
  ocr: string;
}

export interface UserSettings {
  id: string;
  // 多API配置
  apiConfigs: APIConfig[];
  // 功能API映射
  functionApis: FunctionAPIConfig;
  // 本地存储路径
  localStoragePath: string | null;
  // 数据隔离设置
  dataIsolation: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeneratedQuestion {
  question_type: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  difficulty: number;
  knowledge_point: string;
}
