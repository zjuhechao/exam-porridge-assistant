import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  Sparkles,
  X,
  BookOpen,
} from 'lucide-react';
import type { Document, APIConfig } from '../types';
import {
  getDocumentsByCourse,
  createDocument,
  deleteDocument,
  updateDocumentContent,
  createDocumentChunks,
  storeFileBlob,
  getCurrentCourseId,
} from '../services/db';
import { extractFileContent, chunkText, ocrImage, getAPIConfigForFunction } from '../services/api';

export function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [ocrConfig, setOcrConfig] = useState<APIConfig | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{text: string; corrections: Array<{original: string; corrected: string; reason: string}>} | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [autoCorrect, setAutoCorrect] = useState(true);
  const [currentCourseId, setCurrentCourseIdState] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocumentsByCourse();
      setDocuments(docs);
    } catch (err) {
      setError('加载文档失败');
      console.error('[考试粥助手] 加载文档失败：', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    const config = getAPIConfigForFunction('ocr');
    setOcrConfig(config);
    setCurrentCourseIdState(getCurrentCourseId());
  }, [loadDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedExtensions = [
      '.pdf', '.docx', '.pptx', '.txt', '.md', '.doc', '.ppt',
      '.xlsx', '.xls', '.csv', '.html', '.htm', '.json', '.xml', '.epub',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'
    ];

    const invalidFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return !allowedExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} 个文件格式不支持`);
      return;
    }

    const oversizedFiles = files.filter(file => file.size > 500 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} 个文件超过 500MB 限制`);
      return;
    }

    const imageFiles = files.filter(file =>
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)
    );

    if (imageFiles.length > 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImage(ev.target?.result as string);
        setShowOCRModal(true);
      };
      reader.readAsDataURL(file);
      setPendingImageFile(file);
    }

    const nonImageFiles = files.filter(file =>
      !file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)
    );

    if (nonImageFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(`准备上传 ${nonImageFiles.length} 个文件...`);
    setError('');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < nonImageFiles.length; i++) {
      const file = nonImageFiles[i];
      setUploadProgress(`正在处理 (${i + 1}/${nonImageFiles.length}): ${file.name}`);

      try {
        setUploadProgress(`正在解析 (${i + 1}/${nonImageFiles.length}): ${file.name}`);
        const content = await extractFileContent(file);

        const doc = await createDocument({
          filename: file.name,
          file_type: file.name.toLowerCase().substring(file.name.lastIndexOf('.')),
          file_size: file.size,
          storage_path: null,
          content: content,
          chunk_count: 0,
        });

        if (doc) {
          await storeFileBlob(doc.id, file);
          const chunks = chunkText(content, 512);
          await createDocumentChunks(doc.id, chunks);
          await updateDocumentContent(doc.id, content, chunks.length);
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`处理失败: ${file.name}`, err);
        failCount++;
      }
    }

    setUploadProgress(`完成: ${successCount} 个成功, ${failCount} 个失败`);
    await loadDocuments();

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress('');
    }, 2000);

    e.target.value = '';
  };

  const handleOCR = async () => {
    if (!pendingImageFile) {
      setError('请先选择图片文件');
      return;
    }
    if (!ocrConfig) {
      setError('请先配置 OCR API，前往设置页面配置');
      return;
    }

    setIsProcessingOCR(true);
    setError('');

    try {
      const result = await ocrImage(pendingImageFile, { apiConfig: ocrConfig, autoCorrect });
      setOcrResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR识别失败';
      setError(msg);
      console.error('[考试粥助手] OCR识别失败：', err);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSaveOCRResult = async () => {
    if (!ocrResult?.text || !pendingImageFile) return;

    setIsUploading(true);
    setUploadProgress('正在保存...');

    try {
      const doc = await createDocument({
        filename: pendingImageFile.name,
        file_type: pendingImageFile.name.substring(pendingImageFile.name.lastIndexOf('.')).toLowerCase(),
        file_size: pendingImageFile.size,
        storage_path: null,
        content: ocrResult.text,
        chunk_count: 0,
      });

      if (doc) {
        await storeFileBlob(doc.id, pendingImageFile);
        const chunks = chunkText(ocrResult.text, 512);
        await createDocumentChunks(doc.id, chunks);
        await updateDocumentContent(doc.id, ocrResult.text, chunks.length);
        await loadDocuments();
      }

      setShowOCRModal(false);
      setSelectedImage(null);
      setOcrResult(null);
      setPendingImageFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
      console.error('[考试粥助手] 保存失败：', err);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch (err) {
      setError('删除失败');
      console.error('[考试粥助手] 删除文档失败：', err);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-title mb-2">知识库管理</h1>
              <p className="text-body">上传学习资料，构建你的个人知识库</p>
            </div>
            {currentCourseId && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-grad-from/10 border border-grad-from/20 text-primary">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">当前课程模式</span>
              </div>
            )}
          </div>
          {!currentCourseId && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>未选择课程，文档将保存到公共知识库。建议先选择课程以启用数据隔离。</span>
            </div>
          )}
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

        <div className="mb-8">
          <label
            className={`relative block p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
              isUploading
                ? 'border-grad-from/50 bg-grad-from/5'
                : 'border-elevated hover:border-grad-from/50 hover-bg-elevated-50'
            }`}
          >
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.docx,.pptx,.txt,.md,.doc,.ppt,.xlsx,.xls,.csv,.html,.htm,.json,.xml,.epub,.jpg,.jpeg,.png,.gif,.webp,.bmp"
              multiple
            />
            <div className="text-center">
              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-primary font-medium">{uploadProgress}</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-label font-medium mb-2">点击或拖拽上传文件（支持多选）</p>
                  <p className="text-muted text-sm">
                    支持 PDF、DOCX、TXT、MD、CSV、HTML、JSON、图片等格式，单个文件最大 500MB
                  </p>
                  <p className="text-body text-xs mt-1">
                    PDF 和 DOCX 支持自动文本提取，图片支持 OCR 文字识别
                  </p>
                </>
              )}
            </div>
          </label>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="搜索文档..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-elevated text-title placeholder-slate-500 focus:outline-none focus:border-grad-from/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-foot mx-auto mb-4" />
            <p className="text-body">
              {searchQuery ? '没有找到匹配的文档' : '暂无文档，请上传学习资料'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-card border border-card hover-border-elevated transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    doc.file_type.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                      : 'bg-gradient-to-br from-grad-from/20 to-grad-to/20'
                  }`}>
                    {doc.file_type.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/) ? (
                      <ImageIcon className="w-5 h-5 text-purple-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-title truncate" title={doc.filename}>
                      {doc.filename}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted">
                      <span>{doc.file_type.toUpperCase()}</span>
                      <span>·</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                      {doc.chunk_count && doc.chunk_count > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <CheckCircle className="w-3 h-3" />
                          已分块 ({doc.chunk_count})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showOCRModal && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          >
            <div className="w-full max-w-4xl max-h-[90vh] bg-card rounded-2xl border border-elevated overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-card">
                <h3 className="text-lg font-semibold text-title flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  图片OCR识别
                </h3>
                <button
                  onClick={() => {
                    setShowOCRModal(false);
                    setSelectedImage(null);
                    setOcrResult(null);
                    setPendingImageFile(null);
                  }}
                  className="p-2 rounded-lg text-body hover-text-heading hover-bg-elevated"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <p className="text-sm text-body mb-2">图片预览</p>
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full rounded-lg border border-elevated"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-body">识别结果</p>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-body cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoCorrect}
                          onChange={(e) => setAutoCorrect(e.target.checked)}
                          className="rounded border-slate-600"
                        />
                        自动纠错
                      </label>
                    </div>
                  </div>

                  {ocrResult ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-elevated border border-elevated">
                        <p className="text-heading whitespace-pre-wrap text-sm">{ocrResult.text}</p>
                      </div>

                      {ocrResult.corrections && ocrResult.corrections.length > 0 && (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="text-sm text-purple-400 mb-2 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            自动纠错 ({ocrResult.corrections.length}处)
                          </p>
                          <div className="space-y-1 text-xs">
                            {ocrResult.corrections.slice(0, 5).map((c, i) => (
                              <div key={i} className="flex items-center gap-2 text-body">
                                <span className="text-red-400">{c.original}</span>
                                <span>→</span>
                                <span className="text-green-400">{c.corrected}</span>
                              </div>
                            ))}
                            {ocrResult.corrections.length > 5 && (
                              <p className="text-muted">...还有{ocrResult.corrections.length - 5}处</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 rounded-lg bg-elevated border border-elevated text-center">
                      <Eye className="w-12 h-12 text-foot mx-auto mb-3" />
                      <p className="text-body text-sm">点击识别按钮开始OCR</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-card">
                {!ocrResult ? (
                  <button
                    onClick={handleOCR}
                    disabled={isProcessingOCR || !ocrConfig}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessingOCR ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        识别中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {ocrConfig ? '开始识别' : '请先配置OCR API'}
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setOcrResult(null)}
                      className="px-4 py-2 rounded-lg bg-elevated text-label font-medium hover-bg-hover"
                    >
                      重新识别
                    </button>
                    <button
                      onClick={handleSaveOCRResult}
                      disabled={isUploading}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-grad-from to-grad-to text-white font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          保存到知识库
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
