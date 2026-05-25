import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Award,
  BookOpen,
  Target,
  Clock,
  Edit2,
  Save,
  X,
  TrendingUp,
  Brain,
  CheckCircle,
  Camera,
} from 'lucide-react';
import { getPracticeSessions, getDocuments, getQuestions, getWrongQuestions } from '../services/db';

interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  avatar: string;
  joinDate: string;
  totalStudyTime: number;
  totalQuestions: number;
  correctRate: number;
  streakDays: number;
  level: number;
  exp: number;
}

export function Profile() {
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    nickname: '学习者',
    email: '',
    avatar: '',
    joinDate: '',
    totalStudyTime: 0,
    totalQuestions: 0,
    correctRate: 0,
    streakDays: 0,
    level: 1,
    exp: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: '', email: '' });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({
    documents: 0,
    questions: 0,
    sessions: 0,
    wrongQuestions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Array<{ date: string; action: string; detail: string }>>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    // 从localStorage获取用户信息
    const userId = localStorage.getItem('user_id') || `user_${Date.now()}`;
    const nickname = localStorage.getItem('user_nickname') || '学习者';
    const email = localStorage.getItem('user_email') || '';
    const joinDate = localStorage.getItem('user_join_date') || new Date().toISOString();

    // 加载统计数据
    const [sessions, documents, questions, wrongQs] = await Promise.all([
      getPracticeSessions(),
      getDocuments(),
      getQuestions(),
      getWrongQuestions(),
    ]);

    // 计算正确率
    const totalAnswered = sessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + (s.correct_count || 0), 0);
    const correctRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    const totalStudyTime = sessions.reduce((sum, s) => {
      if (s.started_at && s.ended_at) {
        return sum + Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      }
      return sum + Math.round((s.total_questions || 5) * 1.5);
    }, 0);

    // 计算等级和经验
    const exp = totalCorrect * 10 + documents.length * 50;
    const level = Math.floor(exp / 100) + 1;

    setProfile({
      id: userId,
      nickname,
      email,
      avatar: localStorage.getItem('user_avatar') || '',
      joinDate,
      totalStudyTime,
      totalQuestions: totalAnswered,
      correctRate,
      streakDays: calculateStreak(sessions),
      level,
      exp,
    });

    setStats({
      documents: documents.length,
      questions: questions.length,
      sessions: sessions.length,
      wrongQuestions: wrongQs.filter((wq) => !wq.mastered).length,
    });

    // 生成最近活动
    setRecentActivity(generateRecentActivity(sessions, documents));
  };

  const calculateStreak = (sessions: any[]) => {
    if (sessions.length === 0) return 0;
    const dates = new Set(
      sessions.map((s) => new Date(s.started_at).toISOString().slice(0, 10))
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (dates.has(d.toISOString().slice(0, 10))) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const generateRecentActivity = (sessions: any[], documents: any[]) => {
    const activities: { date: string; action: string; detail: string }[] = [];
    
    sessions.slice(0, 5).forEach((s) => {
      activities.push({
        date: new Date(s.started_at).toLocaleDateString(),
        action: '完成练习',
        detail: `答对 ${s.correct_count}/${s.total_questions} 题`,
      });
    });

    documents.slice(0, 3).forEach((d) => {
      activities.push({
        date: new Date(d.created_at).toLocaleDateString(),
        action: '上传资料',
        detail: d.filename,
      });
    });

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  };

  const handleSave = () => {
    localStorage.setItem('user_nickname', editForm.nickname);
    localStorage.setItem('user_email', editForm.email);
    setProfile({ ...profile, nickname: editForm.nickname, email: editForm.email });
    setIsEditing(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 128, 128);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        localStorage.setItem('user_avatar', base64);
        setProfile({ ...profile, avatar: base64 });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getLevelTitle = (level: number) => {
    if (level >= 20) return '学霸';
    if (level >= 15) return '专家';
    if (level >= 10) return '高手';
    if (level >= 5) return '进阶者';
    return '初学者';
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">个人中心</h1>
          <p className="text-slate-400">管理你的学习档案和查看学习统计</p>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                    placeholder="昵称"
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                    placeholder="邮箱"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm"
                    >
                      <Save className="w-4 h-4 inline mr-1" />
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm"
                    >
                      <X className="w-4 h-4 inline mr-1" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-100">{profile.nickname}</h2>
                    <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
                      {getLevelTitle(profile.level)}
                    </span>
                    <button
                      onClick={() => {
                        setEditForm({ nickname: profile.nickname, email: profile.email });
                        setIsEditing(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">{profile.email || '未设置邮箱'}</p>

                  {/* Level Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-400">等级 {profile.level}</span>
                      <span className="text-slate-500">{profile.exp % 100}/100 EXP</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                        style={{ width: `${(profile.exp % 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      加入 {new Date(profile.joinDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-400" />
                      连续学习 {profile.streakDays} 天
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              学习时长
            </div>
            <div className="text-2xl font-bold text-slate-100">{profile.totalStudyTime}</div>
            <div className="text-xs text-slate-500">分钟</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Target className="w-4 h-4" />
              答题数
            </div>
            <div className="text-2xl font-bold text-slate-100">{profile.totalQuestions}</div>
            <div className="text-xs text-slate-500">道</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              正确率
            </div>
            <div className="text-2xl font-bold text-green-400">{profile.correctRate}%</div>
            <div className="text-xs text-slate-500">平均</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <BookOpen className="w-4 h-4" />
              资料数
            </div>
            <div className="text-2xl font-bold text-slate-100">{stats.documents}</div>
            <div className="text-xs text-slate-500">个</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning Stats */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              学习统计
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">练习次数</span>
                <span className="text-slate-100 font-medium">{stats.sessions} 次</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">题目总数</span>
                <span className="text-slate-100 font-medium">{stats.questions} 道</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">待掌握错题</span>
                <span className="text-red-400 font-medium">{stats.wrongQuestions} 道</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">知识库资料</span>
                <span className="text-slate-100 font-medium">{stats.documents} 个</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              最近活动
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-slate-500 text-sm">暂无活动记录</p>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2" />
                    <div>
                      <p className="text-slate-200 text-sm">{activity.action}</p>
                      <p className="text-slate-500 text-xs">{activity.detail}</p>
                      <p className="text-slate-600 text-xs">{activity.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Author Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-sm text-slate-600">
          <p>
            作者：阿刀 |{' '}
            <a href="https://zjuhechao.github.io/" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-500">个人空间</a> |{' '}
            GitHub: <a href="https://github.com/zjuhechao" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-500">zjuhechao</a> |{' '}
            <a href="mailto:3230101238@zju.edu.cn" className="text-cyan-600 hover:text-cyan-500">3230101238@zju.edu.cn</a>
          </p>
        </div>
      </div>
    </div>
  );
}
