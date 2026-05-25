import Dexie, { type Table } from 'dexie';

export interface DbCourse {
  id: string;
  name: string;
  description: string | null;
  subject_type: string;
  difficulty_level: number | null;
  color_theme: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DbUserCourse {
  id: string;
  user_id: string;
  course_id: string;
  progress: number | null;
  is_active: boolean | null;
  created_at: string;
}

export interface DbDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number | null;
  storage_path: string | null;
  content: string | null;
  chunk_count: number | null;
  course_id: string | null;
  file_blob: Blob | null;
  created_at: string;
}

export interface DbDocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
}

export interface DbQuestion {
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
  created_at: string;
}

export interface DbPracticeSession {
  id: string;
  course_id: string | null;
  started_at: string;
  ended_at: string | null;
  total_questions: number | null;
  correct_count: number | null;
  score: number | null;
}

export interface DbPracticeAnswer {
  id: string;
  session_id: string | null;
  question_id: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  answered_at: string;
}

export interface DbWrongQuestion {
  id: string;
  question_id: string | null;
  course_id: string | null;
  wrong_count: number | null;
  last_wrong_at: string;
  mastered: boolean | null;
}

export interface DbSummary {
  id: string;
  document_id: string | null;
  course_id: string | null;
  title: string;
  content: string;
  created_at: string;
}

export interface DbNote {
  id: string;
  document_id: string | null;
  course_id: string | null;
  title: string;
  content: string;
  created_at: string;
}

class StudyDatabase extends Dexie {
  courses!: Table<DbCourse, string>;
  user_courses!: Table<DbUserCourse, string>;
  documents!: Table<DbDocument, string>;
  document_chunks!: Table<DbDocumentChunk, string>;
  questions!: Table<DbQuestion, string>;
  practice_sessions!: Table<DbPracticeSession, string>;
  practice_answers!: Table<DbPracticeAnswer, string>;
  wrong_questions!: Table<DbWrongQuestion, string>;
  summaries!: Table<DbSummary, string>;
  notes!: Table<DbNote, string>;

  constructor() {
    super('StudyAssistantDB');

    this.version(1).stores({
      courses: 'id, name, subject_type, created_at',
      user_courses: 'id, user_id, course_id, is_active, [user_id+course_id]',
      documents: 'id, course_id, file_type, created_at',
      document_chunks: 'id, document_id, chunk_index',
      questions: 'id, document_id, course_id, question_type, created_at',
      practice_sessions: 'id, course_id, started_at',
      practice_answers: 'id, session_id, question_id',
      wrong_questions: 'id, question_id, course_id, mastered, last_wrong_at',
      summaries: 'id, document_id, course_id, created_at',
      notes: 'id, document_id, course_id, created_at',
    });

    this.version(2).stores({
      questions: 'id, document_id, course_id, question_type, source, created_at',
    });
  }
}

export const db = new StudyDatabase();

const DEFAULT_COURSES: Omit<DbCourse, 'id' | 'created_at' | 'updated_at'>[] = [
  { name: '高等数学', description: '微积分、线性代数、概率论等', subject_type: 'math', difficulty_level: 3, color_theme: '#3b82f6', icon: null },
  { name: '大学物理', description: '力学、电磁学、光学、热学等', subject_type: 'physics', difficulty_level: 3, color_theme: '#8b5cf6', icon: null },
  { name: '有机化学', description: '有机化合物的结构、性质和反应', subject_type: 'chemistry', difficulty_level: 3, color_theme: '#10b981', icon: null },
  { name: '生物学', description: '细胞生物学、遗传学、生态学等', subject_type: 'biology', difficulty_level: 2, color_theme: '#f59e0b', icon: null },
  { name: '中国历史', description: '中国古代史、近代史、现代史', subject_type: 'history', difficulty_level: 2, color_theme: '#ef4444', icon: null },
  { name: '英语文学', description: '英美文学经典作品赏析', subject_type: 'literature', difficulty_level: 2, color_theme: '#ec4899', icon: null },
  { name: '计算机科学', description: '编程、数据结构、算法、操作系统等', subject_type: 'computer', difficulty_level: 3, color_theme: '#06b6d4', icon: null },
  { name: '通用学科', description: '适用于各种学习内容', subject_type: 'general', difficulty_level: 2, color_theme: '#6b7280', icon: null },
];

export async function initDefaultCourses(): Promise<void> {
  const count = await db.courses.count();
  if (count === 0) {
    const now = new Date().toISOString();
    const courses: DbCourse[] = DEFAULT_COURSES.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }));
    await db.courses.bulkAdd(courses);
  }
}

initDefaultCourses();
