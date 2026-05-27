import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  BookOpen,
  Loader2,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Link2,
  Globe,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Document, Summary, Note, APIConfig } from '../types';
import { getDocumentsByCourse, getSummariesByCourse, getNotesByCourse, createSummary, createNote, getCurrentCourseId, createDocument, createDocumentChunks, updateDocumentContent } from '../services/db';
import { generateSummary, generateNotes, getAPIConfigForFunction, fetchUrlContent, chunkText } from '../services/api';

export function StudyAssistant() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState('');
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [docSource, setDocSource] = useState<'library' | 'link'>('library');
  const [urlInput, setUrlInput] = useState('');
  const [urlFetchedContent, setUrlFetchedContent] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  useEffect(() => {
    // 获取对应功能的API配置
    const config = getAPIConfigForFunction(activeTab === 'summary' ? 'generateSummary' : 'generateNotes');
    setApiConfig(config);
    setCurrentCourseId(getCurrentCourseId());
  }, [activeTab]);

  const loadData = useCallback(async () => {
    try {
      const [docs, sums, noteList] = await Promise.all([
        getDocumentsByCourse(),
        getSummariesByCourse(),
        getNotesByCourse(),
      ]);
      setDocuments(docs);
      setSummaries(sums);
      setNotes(noteList);
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

  const handleGenerate = async () => {
    if (!apiConfig) {
      setError(`请先配置${activeTab === 'summary' ? '总结生成' : '笔记生成'}API，前往设置页面配置`);
      return;
    }

    let combinedContent = '';
    let combinedTitle = '';

    if (docSource === 'link') {
      if (!urlFetchedContent) {
        setError('请先输入链接并获取内容');
        return;
      }
      combinedContent = urlFetchedContent;
      combinedTitle = urlTitle || urlInput;
    } else {
      if (selectedDocs.length === 0) {
        setError('请先选择至少一个文档');
        return;
      }
      const selectedDocuments = documents.filter((d) => selectedDocs.includes(d.id));
      if (selectedDocuments.length === 0) {
        setError('所选文档内容为空');
        return;
      }
      combinedContent = selectedDocuments.map(d => `## ${d.filename}\n\n${d.content || ''}`).join('\n\n---\n\n');
      combinedTitle = selectedDocuments.length === 1 ? selectedDocuments[0].filename : `${selectedDocuments.length}个文档合集`;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedContent('');

    try {
      if (activeTab === 'summary') {
        const result = await generateSummary(combinedContent, combinedTitle, { apiConfig });
        setGeneratedContent(result.summary);
        await createSummary({
          document_id: null,
          title: `${combinedTitle} - 复习纲要`,
          content: result.summary,
        });
      } else {
        const result = await generateNotes(combinedContent, combinedTitle, { apiConfig });
        setGeneratedContent(result.notes);
        await createNote({
          document_id: null,
          title: `${combinedTitle} - 学习笔记`,
          content: result.notes,
        });
      }

      // 如果是从链接生成的，自动保存到知识库
      if (docSource === 'link') {
        try {
          const title = urlTitle || new URL(urlInput).hostname;
          const doc = await createDocument({
            filename: `[链接] ${title}`,
            file_type: '.link',
            file_size: combinedContent.length,
            storage_path: urlInput,
            content: combinedContent,
            chunk_count: 0,
          });
          if (doc) {
            const chunks = chunkText(combinedContent, 512);
            await createDocumentChunks(doc.id, chunks);
            await updateDocumentContent(doc.id, combinedContent, chunks.length);
          }
        } catch (err) {
          console.error('[考试粥助手] 自动保存链接失败：', err);
        }
      }

      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败';
      setError(msg);
      console.error('[考试粥助手] 生成失败：', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab === 'summary' ? '复习纲要' : '学习笔记'}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentList = activeTab === 'summary' ? summaries : notes;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-title mb-2">复习助手</h1>
          <p className="text-body">AI 智能生成复习纲要和学习笔记</p>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'summary'
                ? 'bg-grad-from/20 text-primary'
                : 'text-body hover-text-heading'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            复习纲要
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-grad-to/20 text-primary-2'
                : 'text-body hover-text-heading'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            学习笔记
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Document Selection */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-card">
              {/* Source selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setDocSource('library')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    docSource === 'library'
                      ? 'bg-grad-from/20 text-primary border border-grad-from/50'
                      : 'bg-elevated text-body border border-elevated hover-border-elevated'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  知识库文档
                </button>
                <button
                  onClick={() => setDocSource('link')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    docSource === 'link'
                      ? 'bg-grad-to/20 text-primary-2 border border-grad-to/50'
                      : 'bg-elevated text-body border border-elevated hover-border-elevated'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  知识链接
                </button>
              </div>

              {docSource === 'library' ? (
              <>
              <h3 className="font-medium text-title mb-4">选择文档（可多选）</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocs(prev =>
                        prev.includes(doc.id)
                          ? prev.filter(id => id !== doc.id)
                          : [...prev, doc.id]
                      );
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
                      selectedDocs.includes(doc.id)
                        ? 'bg-grad-from/20 border border-grad-from/50'
                        : 'bg-elevated-50 border border-elevated hover-bg-elevated'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedDocs.includes(doc.id) ? 'bg-grad-from border-grad-from' : 'border-slate-500'
                    }`}>
                      {selectedDocs.includes(doc.id) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-heading truncate">{doc.filename}</span>
                  </div>
                ))}
              </div>
              </>
              ) : (
              <>
              <h3 className="font-medium text-title mb-4">知识链接</h3>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="输入网页链接..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  className="flex-1 px-3 py-2 rounded-lg bg-elevated border border-elevated text-title placeholder-slate-500 focus:outline-none focus:border-grad-to/50 text-sm"
                  disabled={isFetchingUrl}
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={isFetchingUrl || !urlInput.trim()}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium text-xs disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                >
                  {isFetchingUrl ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                  获取
                </button>
              </div>
              {urlFetchedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-lg bg-elevated-50 border border-elevated"
                >
                  <p className="text-xs text-muted mb-1">
                    已获取：{urlTitle || '未命名页面'}
                  </p>
                  <p className="text-xs text-body line-clamp-2">
                    {urlFetchedContent.substring(0, 150)}...
                  </p>
                </motion.div>
              )}
              </>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || (docSource === 'library' ? selectedDocs.length === 0 : !urlFetchedContent)}
                className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    生成{activeTab === 'summary' ? '复习纲要' : '学习笔记'}
                  </>
                )}
              </button>
            </div>

            {/* History */}
            <div className="p-4 rounded-xl bg-card border border-card">
              <h3 className="font-medium text-title mb-4">历史记录</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentList.length === 0 ? (
                  <p className="text-muted text-sm">暂无记录</p>
                ) : (
                  currentList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setGeneratedContent(item.content)}
                      className="p-3 rounded-lg bg-elevated-50 hover-bg-elevated cursor-pointer transition-colors"
                    >
                      <p className="text-sm text-heading truncate">{item.title}</p>
                      <p className="text-xs text-muted mt-1">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Content Display */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-xl bg-card border border-card min-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-title">
                  {activeTab === 'summary' ? '复习纲要' : '学习笔记'}
                </h3>
                {generatedContent && (
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 rounded-lg bg-elevated text-label hover-bg-hover transition-colors flex items-center gap-1 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    导出 Markdown
                  </button>
                )}
              </div>

              {generatedContent ? (
                <div className="prose prose-invert prose-slate max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {generatedContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-muted">
                  <Sparkles className="w-16 h-16 mb-4 opacity-50" />
                  <p>选择文档并点击生成按钮</p>
                  <p className="text-sm mt-2">AI 将自动分析内容并生成{activeTab === 'summary' ? '复习纲要' : '学习笔记'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
