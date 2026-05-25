import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCcw,
  TrendingUp,
  BookOpen,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import type { WrongQuestion, Question, APIConfig } from '../types';
import {
  getWrongQuestionsByCourse,
  markQuestionAsMastered,
  getQuestionsByCourse,
  createQuestions,
  getCurrentCourseId,
} from '../services/db';
import { generateQuestions, getAPIConfigForFunction } from '../services/api';

function stripOptionPrefix(option: string): string {
  return option.replace(/^[A-Da-d][.、．]\s*/, '');
}

export function WrongQuestions() {
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  useEffect(() => {
    // 获取题目生成API配置
    const config = getAPIConfigForFunction('generateQuestions');
    setApiConfig(config);
    setCurrentCourseId(getCurrentCourseId());
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [wrongQs, allQs] = await Promise.all([
        getWrongQuestionsByCourse(),
        getQuestionsByCourse(),
      ]);
      setWrongQuestions(wrongQs.filter((wq) => !wq.mastered));
      setAllQuestions(allQs);
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkMastered = async (questionId: string) => {
    try {
      await markQuestionAsMastered(questionId);
      await loadData();
    } catch (err) {
      setError('操作失败');
    }
  };

  const startWrongPractice = () => {
    const questions = wrongQuestions
      .filter((wq) => !wq.mastered && wq.question)
      .map((wq) => wq.question!);

    if (questions.length === 0) {
      setError('没有可练习的错题');
      return;
    }

    setPracticeQuestions(questions);
    setIsPracticing(true);
    setCurrentIndex(0);
    setSelectedAnswer('');
    setShowResult(false);
  };

  const handleSubmitAnswer = () => {
    const question = practiceQuestions[currentIndex];
    const correct = selectedAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      markQuestionAsMastered(question.id);
    }
  };

  const handleNext = () => {
    if (currentIndex < practiceQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      setIsPracticing(false);
      loadData();
    }
  };

  const generateTargetedPractice = async () => {
    if (!apiConfig) {
      setError('请先配置题目生成API，前往设置页面配置');
      return;
    }

    const knowledgePoints = wrongQuestions
      .filter((wq) => !wq.mastered && wq.question?.knowledge_point)
      .map((wq) => wq.question!.knowledge_point!);

    if (knowledgePoints.length === 0) {
      setError('没有可分析的知识点');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const content = `请针对以下知识点生成练习题：\n${knowledgePoints.join('\n')}`;
      const result = await generateQuestions(content, {
        apiConfig,
        questionTypes: ['choice'],
        count: 5,
        difficulty: 2,
        courseId: currentCourseId || undefined,
      });

      if (result.questions && result.questions.length > 0) {
        const newQuestions = result.questions.map((q) => ({
          document_id: null,
          course_id: currentCourseId,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options || null,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          knowledge_point: q.knowledge_point,
          source: `错题专项训练 · ${knowledgePoints.slice(0, 3).join('、')}`,
        }));

        await createQuestions(newQuestions);
        const updatedQuestions = await getQuestionsByCourse();
        setAllQuestions(updatedQuestions);
        setError('已生成针对性练习题');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = {
    total: wrongQuestions.length,
    unmastered: wrongQuestions.filter((wq) => !wq.mastered).length,
    mastered: wrongQuestions.filter((wq) => wq.mastered).length,
    highFrequency: wrongQuestions.filter((wq) => (wq.wrong_count || 0) >= 3).length,
  };

  const currentQuestion = isPracticing ? practiceQuestions[currentIndex] : null;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">错题本</h1>
          <p className="text-slate-400">追踪错题，针对性训练，提升学习效果</p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
              error.includes('已生成') || error.includes('成功')
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {error.includes('已生成') || error.includes('成功') ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {error}
          </motion.div>
        )}

        {!isPracticing ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
                <div className="text-sm text-slate-500">总错题数</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-2xl font-bold text-orange-400">{stats.unmastered}</div>
                <div className="text-sm text-slate-500">待掌握</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-2xl font-bold text-green-400">{stats.mastered}</div>
                <div className="text-sm text-slate-500">已掌握</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-2xl font-bold text-red-400">{stats.highFrequency}</div>
                <div className="text-sm text-slate-500">高频错题</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={startWrongPractice}
                disabled={stats.unmastered === 0}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCcw className="w-5 h-5" />
                错题重练 ({stats.unmastered})
              </button>
              <button
                onClick={generateTargetedPractice}
                disabled={isGenerating || stats.unmastered === 0}
                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-200 font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-slate-700"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <TrendingUp className="w-5 h-5" />
                )}
                针对性训练
              </button>
            </div>

            {/* Wrong Questions List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : stats.unmastered === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-slate-400">太棒了！没有待掌握的错题</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wrongQuestions
                  .filter((wq) => !wq.mastered)
                  .map((wq, index) => (
                    <motion.div
                      key={wq.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-slate-500">
                              错误 {wq.wrong_count || 0} 次
                            </span>
                            {wq.question?.knowledge_point && (
                              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                                {wq.question.knowledge_point}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-200 mb-2">{wq.question?.question_text}</p>
                          <p className="text-sm text-slate-500">
                            正确答案: <span className="text-green-400">{wq.question?.correct_answer}</span>
                          </p>
                        </div>
                    <button
                      onClick={() => wq.question_id && handleMarkMastered(wq.question_id)}
                      className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-sm flex items-center gap-1"
                    >
                          <CheckCircle className="w-4 h-4" />
                          已掌握
                        </button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </>
        ) : (
          /* Practice Mode */
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-slate-400">
                题目 {currentIndex + 1} / {practiceQuestions.length}
              </span>
              <button
                onClick={() => setIsPracticing(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full mb-6">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / practiceQuestions.length) * 100}%` }}
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
                  </div>
                  <p className="text-lg text-slate-100 mb-4">{currentQuestion.question_text}</p>

                  {/* Options */}
                  {currentQuestion.question_type === 'choice' && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option: string, idx: number) => {
                        const optionLetter = String.fromCharCode(65 + idx);
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

                  {/* Input */}
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
                      isCorrect
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">回答正确</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">回答错误</span>
                        </>
                      )}
                    </div>
                    {!isCorrect && (
                      <p className="text-slate-300">
                        正确答案: <span className="text-green-400">{currentQuestion.correct_answer}</span>
                      </p>
                    )}
                    {currentQuestion.explanation && (
                      <p className="text-slate-400 text-sm mt-2">{currentQuestion.explanation}</p>
                    )}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end">
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
                      {currentIndex < practiceQuestions.length - 1 ? '下一题' : '完成'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
