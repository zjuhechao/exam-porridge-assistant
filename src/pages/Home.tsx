import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  HelpCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    title: '知识库管理',
    description: '上传学习资料，构建个人知识库，支持PDF、Word、PPT等多种格式',
    icon: BookOpen,
    path: '/knowledge',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: '复习助手',
    description: 'AI智能生成复习纲要和学习笔记，高效整理知识点',
    icon: Brain,
    path: '/assistant',
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: '智能答题',
    description: '根据知识库自动生成练习题，支持多种题型，智能判卷',
    icon: HelpCircle,
    path: '/quiz',
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: '错题本',
    description: '自动收集错题，针对性训练，追踪学习进度',
    icon: AlertCircle,
    path: '/wrong',
    color: 'from-orange-500 to-red-500',
  },
];

export function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-grad-from/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-grad-from/10 border border-grad-from/20 text-primary text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              <span>AI 驱动的考试粥助手</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-primary-2 to-primary-2 bg-clip-text text-transparent">
                让学习更高效
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-body mb-8 max-w-2xl mx-auto">
              上传学习资料，AI 自动整理知识、生成题目、追踪错题，打造你的专属学习系统
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/knowledge"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-grad-from to-grad-to text-white font-medium hover:opacity-90 transition-opacity"
              >
                开始使用
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-elevated text-heading font-medium hover-bg-hover transition-colors"
              >
                配置 API
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link
                  to={feature.path}
                  className="group block p-6 rounded-2xl bg-card-50 border border-card hover-border-elevated transition-all duration-300 hover:shadow-lg hover:shadow-grad-from/10"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-title group-hover:text-primary transition-colors mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-body text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-5 h-5 text-foot group-hover:text-primary transition-colors flex-shrink-0"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-card">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: '支持格式', value: 'PDF/DOCX/PPTX' },
              { label: 'AI 模型', value: 'DeepSeek' },
              { label: '题型支持', value: '4 种题型' },
              { label: '数据存储', value: '本地存储' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
