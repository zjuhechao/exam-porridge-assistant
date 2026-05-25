import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  CheckCircle,
  AlertCircle,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  Landmark,
  BookOpen as BookOpenIcon,
  Code,
} from 'lucide-react';
import type { Course, UserCourse } from '../types';
import { getCourses, createCourse, getUserCourses, joinCourse, leaveCourse, setActiveCourseForUser } from '../services/db';

const subjectIcons: Record<string, React.ElementType> = {
  math: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  history: Landmark,
  literature: BookOpenIcon,
  computer: Code,
  general: BookOpen,
};

const subjectColors: Record<string, string> = {
  math: 'from-blue-500 to-cyan-500',
  physics: 'from-purple-500 to-pink-500',
  chemistry: 'from-green-500 to-emerald-500',
  biology: 'from-emerald-500 to-teal-500',
  history: 'from-orange-500 to-amber-500',
  literature: 'from-pink-500 to-rose-500',
  computer: 'from-cyan-500 to-blue-500',
  general: 'from-slate-500 to-gray-500',
};

const subjectLabels: Record<string, string> = {
  math: '数学',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  history: '历史',
  literature: '文学',
  computer: '计算机',
  general: '通用',
};

export function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject_type: 'general',
    difficulty_level: 2,
  });

  useEffect(() => {
    const id = localStorage.getItem('user_id') || `user_${Date.now()}`;
    localStorage.setItem('user_id', id);
    setUserId(id);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [allCourses, myCourses] = await Promise.all([
        getCourses(),
        getUserCourses(userId),
      ]);
      setCourses(allCourses);
      setUserCourses(myCourses);
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadData();
  }, [loadData, userId]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('请输入课程名称');
      return;
    }

    try {
      const course = await createCourse({
        name: formData.name,
        description: formData.description,
        subject_type: formData.subject_type,
        difficulty_level: formData.difficulty_level,
      });

      if (course) {
        await joinCourse(userId, course.id);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', subject_type: 'general', difficulty_level: 2 });
        await loadData();
      }
    } catch (err) {
      setError('创建课程失败');
    }
  };

  const handleJoin = async (courseId: string) => {
    try {
      await joinCourse(userId, courseId);
      await loadData();
    } catch (err) {
      setError('加入课程失败');
    }
  };

  const handleLeave = async (courseId: string) => {
    try {
      await leaveCourse(userId, courseId);
      await loadData();
    } catch (err) {
      setError('退出课程失败');
    }
  };

  const isJoined = (courseId: string) => {
    return userCourses.some((uc) => uc.course_id === courseId);
  };

  const getActiveCourse = () => {
    return userCourses.find((uc) => uc.is_active);
  };

  const handleSetActiveCourse = async (courseId: string) => {
    try {
      await setActiveCourseForUser(userId, courseId);
      localStorage.setItem('current_course_id', courseId);
      await loadData();
    } catch (err) {
      setError('切换课程失败');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">课程管理</h1>
          <p className="text-slate-400">选择或创建课程，所有学习内容将按课程分类管理</p>
        </div>

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

        {getActiveCourse() && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-400 mb-1">当前学习课程</p>
                <h2 className="text-2xl font-bold text-slate-100">
                  {courses.find((c) => c.id === getActiveCourse()?.course_id)?.name}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {courses.find((c) => c.id === getActiveCourse()?.course_id)?.description}
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-100">我的课程</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建课程
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => {
              const Icon = subjectIcons[course.subject_type] || BookOpen;
              const joined = isJoined(course.id);
              const isActive = getActiveCourse()?.course_id === course.id;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-500/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subjectColors[course.subject_type]} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">{course.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{subjectLabels[course.subject_type]}</p>
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2">{course.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-slate-500">
                          难度: {'★'.repeat(course.difficulty_level || 1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                    {joined ? (
                      <>
                        <button
                          onClick={() => handleSetActiveCourse(course.id)}
                          className={`text-sm font-medium ${
                            isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isActive ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              学习中
                            </span>
                          ) : '设为当前'}
                        </button>
                        <button
                          onClick={() => handleLeave(course.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          退出
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleJoin(course.id)}
                        className="w-full py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
                      >
                        加入课程
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          >
            <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-slate-100 mb-4">创建新课程</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">课程名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                    placeholder="例如：高等数学"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">学科类型</label>
                  <select
                    value={formData.subject_type}
                    onChange={(e) => setFormData({ ...formData, subject_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    {Object.entries(subjectLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">难度等级</label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    <option value={1}>★ 入门</option>
                    <option value={2}>★★ 基础</option>
                    <option value={3}>★★★ 进阶</option>
                    <option value={4}>★★★★ 高级</option>
                    <option value={5}>★★★★★ 专家</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">课程描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 h-20 resize-none"
                    placeholder="简要描述课程内容..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium"
                >
                  创建
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
