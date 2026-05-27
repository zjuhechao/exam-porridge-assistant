import { db } from './localDb';
import type {
  Document,
  Question,
  PracticeSession,
  PracticeAnswer,
  WrongQuestion,
  Summary,
  Note,
  UserSettings,
  Course,
  UserCourse,
} from '../types';

// 获取当前课程ID
export function getCurrentCourseId(): string | null {
  return localStorage.getItem('current_course_id');
}

// 设置当前课程
export function setCurrentCourseId(courseId: string | null) {
  if (courseId) {
    localStorage.setItem('current_course_id', courseId);
  } else {
    localStorage.removeItem('current_course_id');
  }
}

// 检查数据隔离是否开启
export function isDataIsolationEnabled(): boolean {
  return localStorage.getItem('data_isolation') !== 'false';
}

function getActiveCourseId(): string | null {
  return isDataIsolationEnabled() ? getCurrentCourseId() : null;
}

// 用户设置 - 从localStorage读取
export async function getUserSettings(): Promise<UserSettings | null> {
  const savedConfigs = localStorage.getItem('api_configs');
  const savedFunctionApis = localStorage.getItem('function_apis');
  const savedStoragePath = localStorage.getItem('local_storage_path');
  const savedIsolation = localStorage.getItem('data_isolation');

  if (!savedConfigs) return null;

  return {
    id: 'local',
    apiConfigs: JSON.parse(savedConfigs),
    functionApis: savedFunctionApis ? JSON.parse(savedFunctionApis) : {
      chat: 'default',
      generateQuestions: 'default',
      generateSummary: 'default',
      generateNotes: 'default',
      ocr: 'default',
    },
    localStoragePath: savedStoragePath,
    dataIsolation: savedIsolation !== 'false',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function saveUserSettings(_settings: Partial<UserSettings>): Promise<boolean> {
  return true;
}

// 文档操作
export async function getDocuments(): Promise<Document[]> {
  const docs = await db.documents.orderBy('created_at').reverse().toArray();
  return docs as Document[];
}

export async function createDocument(doc: { filename: string; file_type: string; file_size: number | null; storage_path: string | null; content: string | null; chunk_count: number }): Promise<Document | null> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const courseId = getActiveCourseId();
  const record = { ...doc, id, course_id: courseId, file_blob: null, created_at: now };
  await db.documents.add(record);
  return record as Document;
}

export async function deleteDocument(id: string): Promise<boolean> {
  await db.documents.delete(id);
  await db.document_chunks.where('document_id').equals(id).delete();
  return true;
}

export async function updateDocumentContent(id: string, content: string, chunkCount: number): Promise<boolean> {
  await db.documents.update(id, { content, chunk_count: chunkCount });
  return true;
}

export async function storeFileBlob(docId: string, blob: Blob): Promise<void> {
  await db.documents.update(docId, { file_blob: blob });
}

// 文档分块
export async function createDocumentChunks(documentId: string, chunks: string[]): Promise<boolean> {
  const records = chunks.map((content, index) => ({
    id: crypto.randomUUID(),
    document_id: documentId,
    chunk_index: index,
    content,
  }));
  await db.document_chunks.bulkAdd(records);
  return true;
}

// 题目操作
export async function getQuestions(documentId?: string): Promise<Question[]> {
  if (documentId) {
    const items = await db.questions.where('document_id').equals(documentId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Question[];
  }
  return (await db.questions.orderBy('created_at').reverse().toArray()) as Question[];
}

export async function createQuestions(questions: { document_id: string | null; question_type: string; question_text: string; options: string[] | null; correct_answer: string; explanation: string | null; difficulty: number | null; knowledge_point: string | null; source?: string | null }[]): Promise<boolean> {
  const courseId = getActiveCourseId();
  const now = new Date().toISOString();
  const records = questions.map((q) => ({
    ...q,
    id: crypto.randomUUID(),
    course_id: courseId,
    source: q.source || null,
    created_at: now,
  }));
  await db.questions.bulkAdd(records);
  return true;
}

export async function deleteQuestion(id: string): Promise<boolean> {
  await db.questions.delete(id);
  await db.wrong_questions.where('question_id').equals(id).delete();
  return true;
}

// 练习记录
export async function createPracticeSession(): Promise<PracticeSession | null> {
  const id = crypto.randomUUID();
  const courseId = getActiveCourseId();
  const record = {
    id,
    course_id: courseId,
    started_at: new Date().toISOString(),
    ended_at: null,
    total_questions: null,
    correct_count: null,
    score: null,
  };
  await db.practice_sessions.add(record);
  return record as PracticeSession;
}

export async function updatePracticeSession(id: string, updates: Partial<PracticeSession>): Promise<boolean> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) clean[k] = v;
  }
  await db.practice_sessions.update(id, clean);
  return true;
}

export async function getPracticeSessions(): Promise<PracticeSession[]> {
  return (await db.practice_sessions.orderBy('started_at').reverse().toArray()) as PracticeSession[];
}

// 答题记录
export async function createPracticeAnswer(answer: Partial<PracticeAnswer>): Promise<boolean> {
  const record = {
    id: crypto.randomUUID(),
    session_id: answer.session_id || null,
    question_id: answer.question_id || null,
    user_answer: answer.user_answer || null,
    is_correct: answer.is_correct ?? null,
    answered_at: new Date().toISOString(),
  };
  await db.practice_answers.add(record);
  return true;
}

export async function getPracticeAnswers(sessionId: string): Promise<PracticeAnswer[]> {
  return (await db.practice_answers.where('session_id').equals(sessionId).toArray()) as PracticeAnswer[];
}

export async function getCorrectlyAnsweredQuestionIds(): Promise<Set<string>> {
  const answers = await db.practice_answers.toArray();
  const ids = new Set<string>();
  for (const a of answers) {
    if (a.is_correct && a.question_id) ids.add(a.question_id);
  }
  return ids;
}

export async function getQuestionSources(): Promise<string[]> {
  const questions = await db.questions.toArray();
  const sources = new Set<string>();
  for (const q of questions) {
    if (q.source) sources.add(q.source);
  }
  return Array.from(sources);
}

// 错题本
async function joinWrongQuestionsWithQuestions(wrongItems: { id: string; question_id: string | null; course_id: string | null; wrong_count: number | null; last_wrong_at: string; mastered: boolean | null }[]): Promise<WrongQuestion[]> {
  const questionIds = wrongItems.map((w) => w.question_id).filter(Boolean) as string[];
  const questions = await db.questions.where('id').anyOf(questionIds).toArray();
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  return wrongItems.map((w) => ({
    ...w,
    question: w.question_id ? (questionMap.get(w.question_id) as Question | undefined) || null : null,
  }));
}

export async function getWrongQuestions(): Promise<WrongQuestion[]> {
  const items = await db.wrong_questions.orderBy('last_wrong_at').reverse().toArray();
  return joinWrongQuestionsWithQuestions(items);
}

export async function addWrongQuestion(questionId: string, courseId?: string | null): Promise<boolean> {
  const targetCourseId = courseId || getActiveCourseId();
  const existing = await db.wrong_questions.where('question_id').equals(questionId).first();

  if (existing) {
    await db.wrong_questions.update(existing.id, {
      wrong_count: (existing.wrong_count || 0) + 1,
      last_wrong_at: new Date().toISOString(),
    });
  } else {
    await db.wrong_questions.add({
      id: crypto.randomUUID(),
      question_id: questionId,
      course_id: targetCourseId,
      wrong_count: 1,
      last_wrong_at: new Date().toISOString(),
      mastered: false,
    });
  }
  return true;
}

export async function markQuestionAsMastered(questionId: string): Promise<boolean> {
  const item = await db.wrong_questions.where('question_id').equals(questionId).first();
  if (item) {
    await db.wrong_questions.update(item.id, { mastered: true });
  }
  return true;
}

// 复习纲要
export async function getSummaries(documentId?: string): Promise<Summary[]> {
  if (documentId) {
    const items = await db.summaries.where('document_id').equals(documentId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Summary[];
  }
  return (await db.summaries.orderBy('created_at').reverse().toArray()) as Summary[];
}

export async function createSummary(summary: { document_id: string | null; title: string; content: string }): Promise<Summary | null> {
  const id = crypto.randomUUID();
  const courseId = getActiveCourseId();
  const record = { ...summary, id, course_id: courseId, created_at: new Date().toISOString() };
  await db.summaries.add(record);
  return record as Summary;
}

// 学习笔记
export async function getNotes(documentId?: string): Promise<Note[]> {
  if (documentId) {
    const items = await db.notes.where('document_id').equals(documentId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Note[];
  }
  return (await db.notes.orderBy('created_at').reverse().toArray()) as Note[];
}

export async function createNote(note: { document_id: string | null; title: string; content: string }): Promise<Note | null> {
  const id = crypto.randomUUID();
  const courseId = getActiveCourseId();
  const record = { ...note, id, course_id: courseId, created_at: new Date().toISOString() };
  await db.notes.add(record);
  return record as Note;
}

// 课程操作
export async function getCourses(): Promise<Course[]> {
  return (await db.courses.orderBy('created_at').reverse().toArray()) as Course[];
}

export async function createCourse(course: { name: string; description: string; subject_type: string; difficulty_level: number }): Promise<Course | null> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record = { ...course, id, color_theme: null, icon: null, created_at: now, updated_at: now };
  await db.courses.add(record);
  return record as unknown as Course;
}

export async function deleteCourse(id: string): Promise<boolean> {
  // 先收集关联的文档 ID
  const docIds = await db.documents.where('course_id').equals(id).primaryKeys();
  await db.courses.delete(id);
  await db.user_courses.where('course_id').equals(id).delete();
  await db.documents.where('course_id').equals(id).delete();
  await db.questions.where('course_id').equals(id).delete();
  await db.wrong_questions.where('course_id').equals(id).delete();
  await db.summaries.where('course_id').equals(id).delete();
  await db.notes.where('course_id').equals(id).delete();
  if (docIds.length > 0) {
    await db.document_chunks.where('document_id').anyOf(docIds as string[]).delete();
  }
  return true;
}

// 批量删除题目
export async function deleteQuestions(ids: string[]): Promise<boolean> {
  await db.questions.where('id').anyOf(ids).delete();
  await db.wrong_questions.where('question_id').anyOf(ids).delete();
  return true;
}

// 用户课程操作
export async function getUserCourses(userId: string): Promise<UserCourse[]> {
  const items = await db.user_courses.where('user_id').equals(userId).toArray();
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as UserCourse[];
}

export async function joinCourse(userId: string, courseId: string, isActive: boolean = false): Promise<boolean> {
  await db.user_courses.add({
    id: crypto.randomUUID(),
    user_id: userId,
    course_id: courseId,
    progress: 0,
    is_active: isActive,
    created_at: new Date().toISOString(),
  });
  return true;
}

export async function leaveCourse(userId: string, courseId: string): Promise<boolean> {
  await db.user_courses.where({ user_id: userId, course_id: courseId }).delete();
  return true;
}

export async function setActiveCourseForUser(userId: string, courseId: string): Promise<boolean> {
  await db.user_courses.where('user_id').equals(userId).modify({ is_active: false });
  await db.user_courses.where({ user_id: userId, course_id: courseId }).modify({ is_active: true });
  return true;
}

// 课程隔离查询
export async function getDocumentsByCourse(courseId?: string): Promise<Document[]> {
  const targetCourseId = courseId || getActiveCourseId();
  if (targetCourseId) {
    const items = await db.documents.where('course_id').equals(targetCourseId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Document[];
  }
  return getDocuments();
}

export async function getQuestionsByCourse(courseId?: string): Promise<Question[]> {
  const targetCourseId = courseId || getActiveCourseId();
  if (targetCourseId) {
    const items = await db.questions.where('course_id').equals(targetCourseId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Question[];
  }
  return getQuestions();
}

export async function getWrongQuestionsByCourse(courseId?: string): Promise<WrongQuestion[]> {
  const targetCourseId = courseId || getActiveCourseId();
  if (targetCourseId) {
    const items = await db.wrong_questions.where('course_id').equals(targetCourseId).toArray();
    return joinWrongQuestionsWithQuestions(items.sort((a, b) => b.last_wrong_at.localeCompare(a.last_wrong_at)));
  }
  return getWrongQuestions();
}

export async function getSummariesByCourse(courseId?: string): Promise<Summary[]> {
  const targetCourseId = courseId || getActiveCourseId();
  if (targetCourseId) {
    const items = await db.summaries.where('course_id').equals(targetCourseId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Summary[];
  }
  return getSummaries();
}

export async function getNotesByCourse(courseId?: string): Promise<Note[]> {
  const targetCourseId = courseId || getActiveCourseId();
  if (targetCourseId) {
    const items = await db.notes.where('course_id').equals(targetCourseId).toArray();
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)) as Note[];
  }
  return getNotes();
}

export async function getPracticeSessionsByCourse(courseId?: string): Promise<PracticeSession[]> {
  const targetCourseId = courseId || getActiveCourseId();
  if (targetCourseId) {
    const items = await db.practice_sessions.where('course_id').equals(targetCourseId).toArray();
    return items.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || '')) as PracticeSession[];
  }
  return getPracticeSessions();
}
