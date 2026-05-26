import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Upload,
  FileUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image,
  Trash2,
} from 'lucide-react';
import type { Document, Question, PracticeSession, GeneratedQuestion, APIConfig } from '../types';
import {
  getDocumentsByCourse,
  getQuestionsByCourse,
  createQuestions,
  createPracticeSession,
  updatePracticeSession,
  createPracticeAnswer,
  addWrongQuestion,
  deleteQuestion,
  getCurrentCourseId,
  getCorrectlyAnsweredQuestionIds,
} from '../services/db';
import { generateQuestions, getAPIConfigForFunction, chatWithAI, parseQuestionsFromFile, parseQuestionsFromImages, fileToBase64, extractFileContent } from '../services/api';
import { isImageFile, renderPdfPagesToBase64 } from '../services/fileParser';

function stripOptionPrefix(option: string): string {
  return option.replace(/^[A-Da-d][.、．]\s*/, '');
}

export function Quiz() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [config, setConfig] = useState({
    count: 10,
    difficulty: 2,
    types: ['choice', 'fill_blank', 'judgment'],
  });
  const [typePreset, setTypePreset] = useState<string>('mixed');
  const typePresets: Record<string, { label: string; types: string[] }> = {
    mixed: { label: '混合题型（选择+填空+判断）', types: ['choice', 'fill_blank', 'judgment'] },
    choice_only: { label: '仅选择题', types: ['choice'] },
    choice_judgment: { label: '选择题+判断题', types: ['choice', 'judgment'] },
  };
  const [quizMode, setQuizMode] = useState<'generate' | 'quiz_bank'>('generate');
  const [quizBankSource, setQuizBankSource] = useState<'upload' | 'existing'>('upload');
  const [uploadedContent, setUploadedContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    types: Record<string, number>;
  } | null>(null);
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [correctQuestionIds, setCorrectQuestionIds] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showFormatExample, setShowFormatExample] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 获取题目生成API配置
    const config = getAPIConfigForFunction('generateQuestions');
    setApiConfig(config);
    setCurrentCourseId(getCurrentCourseId());
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [docs, qs, correctIds] = await Promise.all([
        getDocumentsByCourse(),
        getQuestionsByCourse(),
        getCorrectlyAnsweredQuestionIds(),
      ]);
      setDocuments(docs);
      setQuestions(qs);
      setCorrectQuestionIds(correctIds);
      const sources = new Set<string>();
      for (const q of qs) {
        if (q.source) sources.add(q.source);
      }
      setAvailableSources(Array.from(sources));
    } catch (err) {
      setError('加载数据失败');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateQuestions = async () => {
    if (!selectedDoc) {
      setError('请先选择文档');
      return;
    }
    if (!apiConfig) {
      setError('请先配置题目生成API，前往设置页面配置');
      return;
    }

    const doc = documents.find((d) => d.id === selectedDoc);
    if (!doc || !doc.content) {
      setError('文档内容为空');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const result = await generateQuestions(doc.content, {
        apiConfig,
        questionTypes: config.types,
        count: config.count,
        difficulty: config.difficulty,
        courseId: currentCourseId || undefined,
      });

      if (result.questions && result.questions.length > 0) {
        const newQuestions = result.questions.map((q: GeneratedQuestion) => ({
          document_id: doc.id,
          course_id: currentCourseId,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options || null,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          knowledge_point: q.knowledge_point,
          source: `AI生成 · ${doc.filename} · 难度${config.difficulty}`,
        }));

        await createQuestions(newQuestions);
        await loadData();
      } else {
        setError('未能生成题目，请重试');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成题目失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUploadForQuizBank = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (isImageFile(file)) {
        setUploadedFile(file);
        setUploadedContent(null);
        setUploadedFileName(file.name);
        setImportResult(null);
        setError('');
        e.target.value = '';
        return;
      }

      const content = await extractFileContent(file);
      if (!content || content.length < 50 || content.startsWith('[')) {
        setUploadedFile(file);
        setUploadedContent(null);
        setUploadedFileName(file.name);
        setImportResult(null);
        setError('');
      } else {
        setUploadedContent(content);
        setUploadedFile(null);
        setUploadedFileName(file.name);
        setImportResult(null);
        setError('');
      }
    } catch (err) {
      setError('文件读取失败');
    }
    e.target.value = '';
  };

  const handleImportQuestions = async () => {
    const useMultimodal = uploadedFile && !uploadedContent;
    let content: string | null = null;
    let docId: string | null = null;

    if (!useMultimodal) {
      if (quizBankSource === 'upload') {
        content = uploadedContent;
        if (!content) {
          setError('请先上传题目文件');
          return;
        }
      } else {
        if (!selectedDoc) {
          setError('请先选择文档');
          return;
        }
        const doc = documents.find((d) => d.id === selectedDoc);
        if (!doc?.content) {
          setError('文档内容为空');
          return;
        }
        content = doc.content;
        docId = doc.id;
      }
    }

    if (!apiConfig) {
      setError('请先配置题目生成API，前往设置页面配置');
      return;
    }

    setIsImporting(true);
    setError('');
    setImportResult(null);

    try {
      let result: { questions: GeneratedQuestion[]; raw?: string };

      if (useMultimodal && uploadedFile) {
        let images: { base64: string; mimeType: string }[];
        if (isImageFile(uploadedFile)) {
          const b64 = await fileToBase64(uploadedFile);
          images = [{ base64: b64, mimeType: uploadedFile.type || 'image/jpeg' }];
        } else if (uploadedFile.name.toLowerCase().endsWith('.pdf')) {
          images = await renderPdfPagesToBase64(uploadedFile);
        } else {
          setError('该文件格式暂不支持OCR识别');
          setIsImporting(false);
          return;
        }
        result = await parseQuestionsFromImages(images);
      } else {
        result = await parseQuestionsFromFile(content!, { apiConfig });
      }

      if (!result.questions || result.questions.length === 0) {
        setError('未能从内容中识别出题目，请检查文件内容格式');
        setIsImporting(false);
        return;
      }

      const newQuestions = result.questions.map((q) => ({
        document_id: docId,
        course_id: currentCourseId,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options || null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        knowledge_point: q.knowledge_point,
        source: `刷题器导入 · ${uploadedFileName || documents.find(d => d.id === docId)?.filename || '未知文件'}`,
      }));

      await createQuestions(newQuestions);
      await loadData();

      const types: Record<string, number> = {};
      result.questions.forEach((q) => {
        types[q.question_type] = (types[q.question_type] || 0) + 1;
      });

      setImportResult({ total: result.questions.length, types });
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别题目失败');
    } finally {
      setIsImporting(false);
    }
  };

  const startPractice = async () => {
    if (filteredQuestions.length === 0) {
      setError('没有可用的题目');
      return;
    }

    const session = await createPracticeSession();
    if (!session) {
      setError('创建练习失败');
      return;
    }

    setCurrentSession(session);
    setIsPracticing(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShowResult(false);
    setAnswers({});
    setResults({});
  };

  const handleSubmitAnswer = async () => {
    if (!currentSession) return;

    const question = filteredQuestions[currentQuestionIndex];

    let isCorrect = false;

    // 选择题和判断题使用精确匹配
    if (question.question_type === 'choice' || question.question_type === 'judgment') {
      isCorrect = selectedAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    } else {
      // 填空题和简答题使用AI判断
      isCorrect = await judgeAnswerWithAI(question.question_text, selectedAnswer, question.correct_answer);
    }

    await createPracticeAnswer({
      session_id: currentSession.id,
      question_id: question.id,
      user_answer: selectedAnswer,
      is_correct: isCorrect,
    });

    setAnswers({ ...answers, [question.id]: selectedAnswer });
    setResults({ ...results, [question.id]: isCorrect });
    setShowResult(true);

    if (!isCorrect) {
      await addWrongQuestion(question.id);
    }
  };

  // AI判断答案是否正确
  const judgeAnswerWithAI = async (question: string, userAnswer: string, correctAnswer: string): Promise<boolean> => {
    try {
      const config = getAPIConfigForFunction('chat');
      if (!config) return false;

      const messages = [
        {
          role: 'system' as const,
          content: '你是一个教育评估助手。请判断学生的答案是否正确。只需要回答 "正确" 或 "错误"。考虑答案的语义等价性，不要求文字完全一致。'
        },
        {
          role: 'user' as const,
          content: `题目：${question}\n标准答案：${correctAnswer}\n学生答案：${userAnswer}\n\n请判断学生答案是否正确（回答"正确"或"错误"）：`
        }
      ];

      let result = '';
      await chatWithAI(messages, (chunk: string) => { result += chunk; }, { apiConfig: config });

      return result.includes('正确') && !result.includes('错误');
    } catch (err) {
      console.error('AI判断失败:', err);
      // AI判断失败时回退到简单匹配
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    } else {
      finishPractice();
    }
  };

  const navigateToQuestion = (index: number) => {
    if (index < 0 || index >= filteredQuestions.length) return;
    const question = filteredQuestions[index];
    setCurrentQuestionIndex(index);
    if (answers[question.id] !== undefined) {
      setSelectedAnswer(answers[question.id]);
      setShowResult(true);
    } else {
      setSelectedAnswer('');
      setShowResult(false);
    }
  };

  const finishPractice = async () => {
    if (!currentSession) return;

    const correctCount = Object.values(results).filter(Boolean).length;
    const totalQuestions = Object.keys(results).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    await updatePracticeSession(currentSession.id, {
      ended_at: new Date().toISOString(),
      total_questions: totalQuestions,
      correct_count: correctCount,
      score,
    });

    setIsPracticing(false);
    setCurrentSession(null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      setDeletedIds(new Set([...deletedIds, questionId]));
    } catch {}
  };

  const availableQuestions = selectedDoc
    ? questions.filter((q) => q.document_id === selectedDoc)
    : questions;

  const filteredQuestions = availableQuestions.filter((q) => {
    if (sourceFilter !== 'all' && (q.source || '') !== sourceFilter) return false;
    if (onlyUnanswered && correctQuestionIds.has(q.id)) return false;
    return true;
  });

  const completedCount = availableQuestions.filter((q) => correctQuestionIds.has(q.id)).length;

  const currentQuestion = isPracticing ? filteredQuestions[currentQuestionIndex] : null;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className={`${isPracticing ? 'max-w-6xl' : 'max-w-4xl'} mx-auto`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">智能答题</h1>
          <p className="text-slate-400">AI 生成练习题，智能判卷，追踪学习进度</p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {!isPracticing ? (
          <>
            {/* Mode Toggle Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setQuizMode('generate')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  quizMode === 'generate'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                AI生成
              </button>
              <button
                onClick={() => setQuizMode('quiz_bank')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  quizMode === 'quiz_bank'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileUp className="w-4 h-4 inline mr-2" />
                刷题器
              </button>
            </div>

            {quizMode === 'generate' ? (
            /* AI Generate Questions Section */
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 mb-6">
              <h3 className="font-medium text-slate-100 mb-4">生成新题目</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">选择文档</label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    <option value="">全部文档</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">题目数量</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={config.count}
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">难度 (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={config.difficulty}
                    onChange={(e) => setConfig({ ...config, difficulty: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">题型</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(typePresets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTypePreset(key);
                        setConfig({ ...config, types: preset.types });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        typePreset === key
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    生成题目
                  </>
                )}
              </button>
            </div>
            ) : (
            /* Quiz Bank Import Section */
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 mb-6">
              <h3 className="font-medium text-slate-100 mb-4">导入题库</h3>
              <p className="text-slate-500 text-sm mb-4">
                上传包含题目的文件（含图片），AI 自动识别题目结构，补全缺失的答案和解析
              </p>

              {/* Format Example Toggle */}
              <button
                onClick={() => setShowFormatExample(!showFormatExample)}
                className="text-sm text-cyan-500 hover:text-cyan-400 mb-4 flex items-center gap-1"
              >
                {showFormatExample ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                查看推荐格式
              </button>
              {showFormatExample && (
                <div className="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{`一、选择题
1. 以下哪个是正确的？
A. 选项一
B. 选项二
C. 选项三
D. 选项四
答案：B
解析：选项二是正确的，因为...

二、判断题
1. 地球是平的。（  ）
答案：错误
解析：地球是近似球体。

三、填空题
1. 中国的首都是____。
答案：北京

四、简答题
1. 简述牛顿第一定律。
答案：一切物体在不受外力作用时...
解析：也称惯性定律...

提示：格式灵活，AI 会自动识别题型和结构。
也可直接上传试卷截图/照片，自动OCR识别。`}</pre>
                </div>
              )}

              {/* Source toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setQuizBankSource('upload')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    quizBankSource === 'upload'
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                  上传文件
                </button>
                <button
                  onClick={() => setQuizBankSource('existing')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    quizBankSource === 'existing'
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  选择已有文档
                </button>
              </div>

              {quizBankSource === 'upload' ? (
                <div className="mb-4">
                  <label className="block w-full p-6 rounded-lg border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer transition-colors text-center">
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx,.md,.doc,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                      onChange={handleFileUploadForQuizBank}
                      className="hidden"
                    />
                    {uploadedFileName ? (
                      <div>
                        {uploadedFile && !uploadedContent ? (
                          <Image className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                        ) : (
                          <FileUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                        )}
                        <p className="text-slate-200 font-medium">{uploadedFileName}</p>
                        {uploadedFile && !uploadedContent && (
                          <p className="text-orange-400 text-xs mt-1">将使用多模态AI识别</p>
                        )}
                        <p className="text-slate-500 text-sm mt-1">点击重新选择文件</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400">点击上传题目文件</p>
                        <p className="text-slate-600 text-xs mt-1">支持 .txt, .pdf, .docx, .md, .jpg, .png 等格式</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">选择文档</label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    <option value="">请选择文档</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleImportQuestions}
                disabled={isImporting || (quizBankSource === 'upload' ? (!uploadedContent && !uploadedFile) : !selectedDoc)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadedFile && !uploadedContent ? 'OCR识别中，请耐心等待...' : '识别中，请耐心等待...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    识别并导入题目
                  </>
                )}
              </button>

              {/* Import Result */}
              {importResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">
                      成功导入 {importResult.total} 道题目
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                    {importResult.types.choice && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        选择题 {importResult.types.choice}
                      </span>
                    )}
                    {importResult.types.judgment && (
                      <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400">
                        判断题 {importResult.types.judgment}
                      </span>
                    )}
                    {importResult.types.fill_blank && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        填空题 {importResult.types.fill_blank}
                      </span>
                    )}
                    {importResult.types.short_answer && (
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">
                        简答题 {importResult.types.short_answer}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            )}

            {/* Start Practice Section */}
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-slate-100 mb-1">开始练习</h3>
                  <p className="text-slate-400 text-sm">
                    已完成 {completedCount} 道 / 共 {availableQuestions.length} 道
                    {filteredQuestions.length !== availableQuestions.length && (
                      <span className="text-cyan-400 ml-2">（筛选后 {filteredQuestions.length} 道）</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={startPractice}
                  disabled={filteredQuestions.length === 0}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  开始练习
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {availableSources.length > 0 && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">题目来源</label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm"
                    >
                      <option value="all">全部来源</option>
                      {availableSources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none mt-4">
                  <input
                    type="checkbox"
                    checked={onlyUnanswered}
                    onChange={(e) => setOnlyUnanswered(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                  />
                  <span className="text-sm text-slate-300">只做未完成的题目</span>
                </label>
              </div>
            </div>
          </>
        ) : (
          /* Practice Mode */
          <div className="flex gap-4">
            {/* Question Board - Left Panel */}
            <div className="w-52 flex-shrink-0 hidden md:block">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 sticky top-8">
                <h4 className="text-sm font-medium text-slate-300 mb-3">答题卡</h4>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {filteredQuestions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isCorrectAnswer = results[q.id] === true;
                    const isWrongAnswer = results[q.id] === false;
                    const isPriorCorrect = !isAnswered && correctQuestionIds.has(q.id);
                    const isDeleted = deletedIds.has(q.id);
                    const isCurrent = idx === currentQuestionIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => navigateToQuestion(idx)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          isDeleted
                            ? 'bg-slate-800/50 text-slate-700 line-through'
                            : isCurrent
                            ? 'ring-2 ring-cyan-500 bg-cyan-500/20 text-cyan-300'
                            : isCorrectAnswer
                            ? 'bg-green-500/20 text-green-400'
                            : isWrongAnswer
                            ? 'bg-red-500/20 text-red-400'
                            : isPriorCorrect
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                    正确 {Object.values(results).filter(Boolean).length}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                    错误 {Object.values(results).filter((v) => v === false).length}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                    未答 {filteredQuestions.length - Object.keys(results).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Question Area */}
            <div className="flex-1 min-w-0">
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>题目 {currentQuestionIndex + 1} / {filteredQuestions.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  正确: {Object.values(results).filter(Boolean).length}
                </span>
                <button
                  onClick={finishPractice}
                  className="text-slate-400 hover:text-slate-200"
                >
                  结束练习
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full mb-6">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(Object.keys(results).length / filteredQuestions.length) * 100}%` }}
              />
            </div>

            {currentQuestion && (
              <>
                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      currentQuestion.question_type === 'choice' ? 'bg-blue-500/20 text-blue-400' :
                      currentQuestion.question_type === 'fill_blank' ? 'bg-purple-500/20 text-purple-400' :
                      currentQuestion.question_type === 'judgment' ? 'bg-green-500/20 text-green-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {currentQuestion.question_type === 'choice' ? '选择题' :
                       currentQuestion.question_type === 'fill_blank' ? '填空题' :
                       currentQuestion.question_type === 'judgment' ? '判断题' : '简答题'}
                    </span>
                    {currentQuestion.knowledge_point && (
                      <span className="text-xs text-slate-500">
                        {currentQuestion.knowledge_point}
                      </span>
                    )}
                    {currentQuestion.source && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-500">
                        {currentQuestion.source}
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-slate-100 mb-4">{currentQuestion.question_text}</p>

                  {/* Options for choice questions */}
                  {currentQuestion.question_type === 'choice' && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option: string, idx: number) => {
                        const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D...
                        return (
                          <button
                            key={idx}
                            onClick={() => !showResult && setSelectedAnswer(optionLetter)}
                            disabled={showResult}
                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                              selectedAnswer === optionLetter
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-slate-700 hover:border-slate-600'
                            } ${showResult && optionLetter === currentQuestion.correct_answer ? 'border-green-500 bg-green-500/10' : ''}`}
                          >
                            {optionLetter}. {stripOptionPrefix(option)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Buttons for judgment questions */}
                  {currentQuestion.question_type === 'judgment' && (
                    <div className="flex gap-4">
                      {['正确', '错误'].map((label) => (
                        <button
                          key={label}
                          onClick={() => !showResult && setSelectedAnswer(label)}
                          disabled={showResult}
                          className={`flex-1 p-3 rounded-lg border text-center transition-colors font-medium ${
                            selectedAnswer === label
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                              : 'border-slate-700 hover:border-slate-600 text-slate-300'
                          } ${showResult && label === currentQuestion.correct_answer ? 'border-green-500 bg-green-500/10 text-green-400' : ''}
                          ${showResult && label !== currentQuestion.correct_answer && selectedAnswer === label ? 'border-red-500 bg-red-500/10 text-red-400' : ''}`}
                        >
                          {label === '正确' ? <CheckCircle className="w-5 h-5 inline mr-2" /> : <XCircle className="w-5 h-5 inline mr-2" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input for other question types */}
                  {currentQuestion.question_type !== 'choice' && currentQuestion.question_type !== 'judgment' && (
                    <input
                      type="text"
                      value={selectedAnswer}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={showResult}
                      placeholder="请输入答案..."
                      className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 disabled:opacity-50"
                    />
                  )}
                </div>

                {/* Result */}
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg mb-4 ${
                      results[currentQuestion.id]
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {results[currentQuestion.id] ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">回答正确</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">回答错误</span>
                        </>
                      )}
                    </div>
                    {!results[currentQuestion.id] && (
                      <p className="text-slate-300 mb-2">
                        正确答案: <span className="text-green-400">{currentQuestion.correct_answer}</span>
                      </p>
                    )}
                    {currentQuestion.explanation && (
                      <p className="text-slate-400 text-sm">{currentQuestion.explanation}</p>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      {deletedIds.has(currentQuestion.id) ? (
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> 已从题库删除
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteQuestion(currentQuestion.id)}
                          className="text-sm text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          这题么麻达
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-between">
                  <button
                    onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-medium disabled:opacity-30 flex items-center gap-1 hover:border-slate-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一题
                  </button>
                  <div className="flex gap-2">
                  {!showResult ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswer}
                      className="px-6 py-2 rounded-lg bg-cyan-500 text-white font-medium disabled:opacity-50"
                    >
                      提交答案
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium flex items-center gap-2"
                    >
                      {currentQuestionIndex < filteredQuestions.length - 1 ? '下一题' : '完成'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  </div>
                </div>
              </>
            )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
