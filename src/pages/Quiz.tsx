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
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image,
  Trash2,
  Link2,
  Globe,
  Zap,
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
  createDocument,
  createDocumentChunks,
  updateDocumentContent,
} from '../services/db';
import { generateQuestions, getAPIConfigForFunction, chatWithAI, parseQuestionsFromFile, parseQuestionsFromImages, fileToBase64, extractFileContent, fetchUrlContent, chunkText } from '../services/api';
import { parseQuestionsLocally, isStructuredContent } from '../services/questionParser';
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
  const [docSource, setDocSource] = useState<'library' | 'link'>('library');
  const [urlInput, setUrlInput] = useState('');
  const [urlFetchedContent, setUrlFetchedContent] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [importMode, setImportMode] = useState<'ai' | 'pure'>('pure');
  const [localParsedQuestions, setLocalParsedQuestions] = useState<GeneratedQuestion[] | null>(null);

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
      console.error('[考试粥助手] 加载数据失败：', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      setError('请输入链接地址');
      return;
    }

    setIsFetchingUrl(true);
    setError('');
    setUrlFetchedContent('');

    try {
      const result = await fetchUrlContent(urlInput.trim());
      setUrlTitle(result.title);
      setUrlFetchedContent(result.content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取内容失败';
      setError(msg);
      console.error('[考试粥助手] 获取链接内容失败：', err);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!apiConfig) {
      setError('请先配置题目生成API，前往设置页面配置');
      return;
    }

    let content = '';
    let sourceLabel = '';
    let docId: string | null = null;

    if (docSource === 'link') {
      if (!urlFetchedContent) {
        setError('请先输入链接并获取内容');
        return;
      }
      content = urlFetchedContent;
      sourceLabel = urlTitle || urlInput;
    } else {
      if (!selectedDoc) {
        setError('请先选择文档');
        return;
      }
      const doc = documents.find((d) => d.id === selectedDoc);
      if (!doc || !doc.content) {
        setError('文档内容为空');
        return;
      }
      content = doc.content;
      sourceLabel = doc.filename;
      docId = doc.id;
    }

    setIsGenerating(true);
    setError('');

    try {
      const result = await generateQuestions(content, {
        apiConfig,
        questionTypes: config.types,
        count: config.count,
        difficulty: config.difficulty,
        courseId: currentCourseId || undefined,
      });

      if (result.questions && result.questions.length > 0) {
        const newQuestions = result.questions.map((q: GeneratedQuestion) => ({
          document_id: docId,
          course_id: currentCourseId,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options || null,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          knowledge_point: q.knowledge_point,
          source: `AI生成 · ${sourceLabel} · 难度${config.difficulty}`,
        }));

        await createQuestions(newQuestions);

        // 如果是从链接生成的，自动保存到知识库
        if (docSource === 'link') {
          try {
            const title = urlTitle || new URL(urlInput).hostname;
            const doc = await createDocument({
              filename: `[链接] ${title}`,
              file_type: '.link',
              file_size: content.length,
              storage_path: urlInput,
              content: content,
              chunk_count: 0,
            });
            if (doc) {
              const chunks = chunkText(content, 512);
              await createDocumentChunks(doc.id, chunks);
              await updateDocumentContent(doc.id, content, chunks.length);
            }
          } catch (err) {
            console.error('[考试粥助手] 自动保存链接失败：', err);
          }
        }

        await loadData();
      } else {
        setError('未能生成题目，请重试');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成题目失败';
      setError(msg);
      console.error('[考试粥助手] 生成题目失败：', err);
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
        setLocalParsedQuestions(null);
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
        setLocalParsedQuestions(null);
        setError('');
      } else {
        setUploadedContent(content);
        setUploadedFile(null);
        setUploadedFileName(file.name);
        setImportResult(null);
        setError('');

        // 纯享版：自动本地解析
        if (importMode === 'pure' && isStructuredContent(content)) {
          const parsed = parseQuestionsLocally(content);
          setLocalParsedQuestions(parsed);
        } else {
          setLocalParsedQuestions(null);
        }
      }
    } catch (err) {
      setError('文件读取失败');
      console.error('[考试粥助手] 文件读取失败：', err);
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

    if (importMode === 'ai' && !apiConfig) {
      setError('请先配置题目生成API，前往设置页面配置');
      return;
    }

    setIsImporting(true);
    setError('');
    setImportResult(null);

    try {
      let resultQuestions: GeneratedQuestion[];

      if (importMode === 'pure' && localParsedQuestions) {
        // 纯享版：使用本地解析的结果
        resultQuestions = localParsedQuestions;
      } else if (useMultimodal && uploadedFile) {
        // AI 视觉识别图片/PDF
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
        const result = await parseQuestionsFromImages(images);
        resultQuestions = result.questions;
      } else {
        // AI 解析文本
        const result = await parseQuestionsFromFile(content!, { apiConfig: apiConfig! });
        resultQuestions = result.questions;
      }

      if (!resultQuestions || resultQuestions.length === 0) {
        setError('未能从内容中识别出题目，请检查文件内容格式');
        setIsImporting(false);
        return;
      }

      const newQuestions = resultQuestions.map((q) => ({
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
      resultQuestions.forEach((q) => {
        types[q.question_type] = (types[q.question_type] || 0) + 1;
      });

      setImportResult({ total: resultQuestions.length, types });
      setLocalParsedQuestions(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '识别题目失败';
      setError(msg);
      console.error('[考试粥助手] 识别题目失败：', err);
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
          <h1 className="text-3xl font-bold text-title mb-2">智能答题</h1>
          <p className="text-body">AI 生成练习题，智能判卷，追踪学习进度</p>
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
                    ? 'bg-grad-from/20 text-primary'
                    : 'text-body hover-text-heading'
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                AI生成
              </button>
              <button
                onClick={() => setQuizMode('quiz_bank')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  quizMode === 'quiz_bank'
                    ? 'bg-grad-to/20 text-primary-2'
                    : 'text-body hover-text-heading'
                }`}
              >
                <FileUp className="w-4 h-4 inline mr-2" />
                刷题器
              </button>
            </div>

            {quizMode === 'generate' ? (
            /* AI Generate Questions Section */
            <div className="p-6 rounded-xl bg-card border border-card mb-6">
              <h3 className="font-medium text-title mb-4">生成新题目</h3>

              {/* Source selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setDocSource('library')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    docSource === 'library'
                      ? 'bg-grad-from/20 text-primary border border-grad-from/50'
                      : 'bg-elevated text-body border border-elevated hover-border-elevated'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  知识库文档
                </button>
                <button
                  onClick={() => setDocSource('link')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    docSource === 'link'
                      ? 'bg-grad-to/20 text-primary-2 border border-grad-to/50'
                      : 'bg-elevated text-body border border-elevated hover-border-elevated'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  知识链接
                </button>
              </div>

              {/* Document selector or URL input */}
              {docSource === 'library' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-body mb-2">选择文档</label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-elevated border border-elevated text-title"
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
                  <label className="block text-sm text-body mb-2">题目数量</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={config.count}
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-elevated border border-elevated text-title"
                  />
                </div>
                <div>
                  <label className="block text-sm text-body mb-2">难度 (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={config.difficulty}
                    onChange={(e) => setConfig({ ...config, difficulty: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-elevated border border-elevated text-title"
                  />
                </div>
              </div>
              ) : (
              <div className="mb-4">
                <label className="block text-sm text-body mb-2">知识链接</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="输入网页链接，例如 https://example.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                    className="flex-1 px-3 py-2 rounded-lg bg-elevated border border-elevated text-title placeholder-slate-500 focus:outline-none focus:border-grad-to/50"
                    disabled={isFetchingUrl}
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={isFetchingUrl || !urlInput.trim()}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium text-sm disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                  >
                    {isFetchingUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    获取内容
                  </button>
                </div>
                {urlFetchedContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg bg-elevated-50 border border-elevated"
                  >
                    <p className="text-xs text-muted mb-1">
                      已获取：{urlTitle || '未命名页面'}（{urlFetchedContent.length} 字符）
                    </p>
                    <p className="text-xs text-body line-clamp-3">
                      {urlFetchedContent.substring(0, 200)}...
                    </p>
                  </motion.div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <label className="text-sm text-body">题目数量</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={config.count}
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                    className="w-20 px-2 py-1 rounded bg-elevated border border-elevated text-title text-sm"
                  />
                  <label className="text-sm text-body ml-2">难度 (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={config.difficulty}
                    onChange={(e) => setConfig({ ...config, difficulty: parseInt(e.target.value) })}
                    className="w-16 px-2 py-1 rounded bg-elevated border border-elevated text-title text-sm"
                  />
                </div>
              </div>
              )}

              {/* Type presets - shown for both modes */}
              <div className="mb-4">
                <label className="block text-sm text-body mb-2">题型</label>
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
                          ? 'bg-grad-from/20 text-primary border border-grad-from/50'
                          : 'bg-elevated text-body border border-elevated hover-border-elevated'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating || (docSource === 'library' ? !selectedDoc : !urlFetchedContent)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium disabled:opacity-50 flex items-center gap-2"
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
            <div className="p-6 rounded-xl bg-card border border-card mb-6">
              <h3 className="font-medium text-title mb-4">导入题库</h3>

              {/* 模式切换：纯享版 / AI版 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setImportMode('pure');
                    setLocalParsedQuestions(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    importMode === 'pure'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-elevated text-body border border-elevated hover-border-elevated'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  纯享版（本地解析）
                </button>
                <button
                  onClick={() => {
                    setImportMode('ai');
                    setLocalParsedQuestions(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    importMode === 'ai'
                      ? 'bg-grad-from/20 text-primary border border-grad-from/50'
                      : 'bg-elevated text-body border border-elevated hover-border-elevated'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI版（智能识别）
                </button>
              </div>

              {importMode === 'pure' ? (
                <p className="text-green-400/80 text-sm mb-4 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  纯本地解析，无需 AI。上传结构化格式的题目，自动识别题型、选项和答案
                </p>
              ) : (
                <p className="text-muted text-sm mb-4">
                  上传包含题目的文件（含图片），AI 自动识别题目结构，补全缺失的答案和解析
                </p>
              )}

              {/* Format Example Toggle */}
              <button
                onClick={() => setShowFormatExample(!showFormatExample)}
                className="text-sm text-primary hover:text-primary mb-4 flex items-center gap-1"
              >
                {showFormatExample ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                查看推荐格式
              </button>
              {showFormatExample && (
                <div className="mb-4 p-4 rounded-lg bg-elevated-50 border border-elevated text-xs text-body overflow-x-auto">
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

纯享版：格式不限，只要有序号+答案标记即可自动识别
AI版：格式灵活，支持截图/照片，AI自动识别`}</pre>
                </div>
              )}

              {/* Source toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setQuizBankSource('upload')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    quizBankSource === 'upload'
                      ? 'bg-hover-bg text-title'
                      : 'text-body hover-text-heading'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                  上传文件
                </button>
                <button
                  onClick={() => setQuizBankSource('existing')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    quizBankSource === 'existing'
                      ? 'bg-hover-bg text-title'
                      : 'text-body hover-text-heading'
                  }`}
                >
                  选择已有文档
                </button>
              </div>

              {quizBankSource === 'upload' ? (
                <div className="mb-4">
                  <label className="block w-full p-6 rounded-lg border-2 border-dashed border-elevated hover-border-elevated cursor-pointer transition-colors text-center">
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
                          <FileUp className="w-8 h-8 text-primary-2 mx-auto mb-2" />
                        )}
                        <p className="text-heading font-medium">{uploadedFileName}</p>
                        {uploadedFile && !uploadedContent && (
                          <p className="text-orange-400 text-xs mt-1">将使用多模态AI识别</p>
                        )}
                        {importMode === 'pure' && localParsedQuestions && (
                          <p className="text-green-400 text-xs mt-1">
                            已本地解析：{localParsedQuestions.length} 道题目
                          </p>
                        )}
                        <p className="text-muted text-sm mt-1">点击重新选择文件</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
                        <p className="text-body">点击上传题目文件</p>
                        <p className="text-foot text-xs mt-1">支持 .txt, .pdf, .docx, .md, .jpg, .png 等格式</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm text-body mb-2">选择文档</label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-elevated border border-elevated text-title"
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

              {/* 纯享版：本地解析结果预览 */}
              {importMode === 'pure' && localParsedQuestions && localParsedQuestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium text-sm">
                      本地解析完成：共 {localParsedQuestions.length} 道题目
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(() => {
                      const types: Record<string, number> = {};
                      localParsedQuestions.forEach(q => { types[q.question_type] = (types[q.question_type] || 0) + 1; });
                      return Object.entries(types).map(([type, count]) => (
                        <span key={type} className={`px-2 py-0.5 rounded text-xs ${
                          type === 'choice' ? 'bg-blue-500/10 text-blue-400' :
                          type === 'judgment' ? 'bg-green-500/10 text-green-400' :
                          type === 'fill_blank' ? 'bg-purple-500/10 text-primary-2' :
                          'bg-orange-500/10 text-orange-400'
                        }`}>
                          {type === 'choice' ? '选择题' : type === 'judgment' ? '判断题' : type === 'fill_blank' ? '填空题' : '简答题'} {count}
                        </span>
                      ));
                    })()}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {localParsedQuestions.slice(0, 20).map((q, i) => (
                      <div key={i} className="p-2 rounded bg-elevated-50 text-xs text-body">
                        <span className="text-muted mr-2">#{i + 1}</span>
                        <span className={`px-1 py-0.5 rounded text-xs mr-2 ${
                          q.question_type === 'choice' ? 'text-blue-400' :
                          q.question_type === 'judgment' ? 'text-green-400' :
                          q.question_type === 'fill_blank' ? 'text-primary-2' :
                          'text-orange-400'
                        }`}>
                          [{q.question_type === 'choice' ? '选择' : q.question_type === 'judgment' ? '判断' : q.question_type === 'fill_blank' ? '填空' : '简答'}]
                        </span>
                        {q.question_text.substring(0, 60)}{q.question_text.length > 60 ? '...' : ''}
                        {q.correct_answer && <span className="text-green-400 ml-2">答案：{q.correct_answer}</span>}
                      </div>
                    ))}
                    {localParsedQuestions.length > 20 && (
                      <p className="text-xs text-muted text-center">...还有 {localParsedQuestions.length - 20} 道</p>
                    )}
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleImportQuestions}
                disabled={isImporting || (importMode === 'pure' ? !localParsedQuestions : (quizBankSource === 'upload' ? (!uploadedContent && !uploadedFile) : !selectedDoc))}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadedFile && !uploadedContent ? 'OCR识别中，请耐心等待...' : '识别中，请耐心等待...'}
                  </>
                ) : (
                  <>
                    {importMode === 'pure' ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {importMode === 'pure' ? '直接导入题库' : '识别并导入题目'}
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
                  <div className="flex flex-wrap gap-3 text-sm text-body">
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
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-primary-2">
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
            <div className="p-6 rounded-xl bg-card border border-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-title mb-1">开始练习</h3>
                  <p className="text-body text-sm">
                    已完成 {completedCount} 道 / 共 {availableQuestions.length} 道
                    {filteredQuestions.length !== availableQuestions.length && (
                      <span className="text-primary ml-2">（筛选后 {filteredQuestions.length} 道）</span>
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
                    <label className="block text-xs text-muted mb-1">题目来源</label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-elevated border border-elevated text-heading text-sm"
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
                    className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-grad-from bg-elevated"
                  />
                  <span className="text-sm text-label">只做未完成的题目</span>
                </label>
              </div>
            </div>
          </>
        ) : (
          /* Practice Mode */
          <div className="flex gap-4">
            {/* Question Board - Left Panel */}
            <div className="w-52 flex-shrink-0 hidden md:block">
              <div className="p-4 rounded-xl bg-card border border-card sticky top-8">
                <h4 className="text-sm font-medium text-label mb-3">答题卡</h4>
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
                            ? 'bg-elevated-50 text-muted line-through'
                            : isCurrent
                            ? 'ring-2 ring-grad-from bg-grad-from/20 text-primary'
                            : isCorrectAnswer
                            ? 'bg-green-500/20 text-green-400'
                            : isWrongAnswer
                            ? 'bg-red-500/20 text-red-400'
                            : isPriorCorrect
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-elevated text-body hover-bg-hover'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                    正确 {Object.values(results).filter(Boolean).length}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                    错误 {Object.values(results).filter((v) => v === false).length}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-elevated border border-elevated" />
                    未答 {filteredQuestions.length - Object.keys(results).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Question Area */}
            <div className="flex-1 min-w-0">
              <div className="p-6 rounded-xl bg-card border border-card">
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-body">
                <Clock className="w-4 h-4" />
                <span>题目 {currentQuestionIndex + 1} / {filteredQuestions.length}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-body">
                  正确: {Object.values(results).filter(Boolean).length}
                </span>
                <button
                  onClick={finishPractice}
                  className="text-body hover-text-heading"
                >
                  结束练习
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-elevated rounded-full mb-6">
              <div
                className="h-full bg-gradient-to-r from-grad-from to-grad-to rounded-full transition-all"
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
                      currentQuestion.question_type === 'fill_blank' ? 'bg-grad-to/20 text-primary-2' :
                      currentQuestion.question_type === 'judgment' ? 'bg-green-500/20 text-green-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {currentQuestion.question_type === 'choice' ? '选择题' :
                       currentQuestion.question_type === 'fill_blank' ? '填空题' :
                       currentQuestion.question_type === 'judgment' ? '判断题' : '简答题'}
                    </span>
                    {currentQuestion.knowledge_point && (
                      <span className="text-xs text-muted">
                        {currentQuestion.knowledge_point}
                      </span>
                    )}
                    {currentQuestion.source && (
                      <span className="px-2 py-0.5 rounded text-xs bg-elevated text-muted">
                        {currentQuestion.source}
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-title mb-4">{currentQuestion.question_text}</p>

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
                                ? 'border-grad-from bg-grad-from/10'
                                : 'border-elevated hover-border-elevated'
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
                              ? 'border-grad-from bg-grad-from/10 text-primary'
                              : 'border-elevated hover-border-elevated text-label'
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
                      className="w-full px-4 py-3 rounded-lg bg-elevated border border-elevated text-title disabled:opacity-50"
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
                      <p className="text-label mb-2">
                        正确答案: <span className="text-green-400">{currentQuestion.correct_answer}</span>
                      </p>
                    )}
                    {currentQuestion.explanation && (
                      <p className="text-body text-sm">{currentQuestion.explanation}</p>
                    )}
                    <div className="mt-3 pt-3 border-t border-elevated-50">
                      {deletedIds.has(currentQuestion.id) ? (
                        <span className="text-sm text-foot flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> 已从题库删除
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteQuestion(currentQuestion.id)}
                          className="text-sm text-muted hover:text-red-400 transition-colors flex items-center gap-1"
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
                    className="px-4 py-2 rounded-lg border border-elevated text-label font-medium disabled:opacity-30 flex items-center gap-1 hover-border-elevated"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一题
                  </button>
                  <div className="flex gap-2">
                  {!showResult ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswer}
                      className="px-6 py-2 rounded-lg bg-grad-from text-white font-medium disabled:opacity-50"
                    >
                      提交答案
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium flex items-center gap-2"
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
