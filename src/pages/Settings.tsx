import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Server,
  Thermometer,
  Hash,
  Save,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Settings2,
  MessageSquare,
  FileQuestion,
  FileText,
  StickyNote,
  ScanLine,
  Database,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { APIConfig, FunctionAPIConfig } from '../types';

const DEFAULT_API_CONFIG: APIConfig = {
  id: '',
  name: '',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  modelName: '',
  temperature: 0.7,
  maxTokens: 2048,
};

const FUNCTION_LABELS: Record<keyof FunctionAPIConfig, { label: string; icon: React.ReactNode; desc: string }> = {
  chat: { label: 'AI 聊天', icon: <MessageSquare className="w-4 h-4" />, desc: '考试粥助手对话功能' },
  generateQuestions: { label: '生成题目', icon: <FileQuestion className="w-4 h-4" />, desc: '智能出题和错题生成' },
  generateSummary: { label: '生成总结', icon: <FileText className="w-4 h-4" />, desc: '文档内容梳理总结' },
  generateNotes: { label: '生成笔记', icon: <StickyNote className="w-4 h-4" />, desc: '学习笔记整理' },
  ocr: { label: 'OCR 识别', icon: <ScanLine className="w-4 h-4" />, desc: '图片文字识别（需多模态模型）' },
};

export function Settings() {
  // API配置列表
  const [apiConfigs, setApiConfigs] = useState<APIConfig[]>([]);
  // 功能API映射
  const [functionApis, setFunctionApis] = useState<FunctionAPIConfig>({
    chat: 'default',
    generateQuestions: 'default',
    generateSummary: 'default',
    generateNotes: 'default',
    ocr: 'default',
  });
  // 编辑状态
  const [editingConfig, setEditingConfig] = useState<APIConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    apis: true,
    functions: true,
    storage: false,
    security: false,
  });
  // 数据隔离
  const [dataIsolation, setDataIsolation] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 从 localStorage 加载设置
    const savedConfigs = localStorage.getItem('api_configs');
    const savedFunctionApis = localStorage.getItem('function_apis');
    const savedIsolation = localStorage.getItem('data_isolation');

    if (savedConfigs) {
      setApiConfigs(JSON.parse(savedConfigs));
    } else {
      // 初始化默认配置
      const defaultConfig: APIConfig = {
        id: 'default',
        name: '默认配置',
        apiKey: localStorage.getItem('deepseek_api_key') || '',
        baseUrl: localStorage.getItem('deepseek_api_base_url') || 'https://api.deepseek.com',
        modelName: localStorage.getItem('deepseek_model') || '',
        temperature: parseFloat(localStorage.getItem('deepseek_temperature') || '0.7'),
        maxTokens: parseInt(localStorage.getItem('deepseek_max_tokens') || '2048'),
      };
      setApiConfigs([defaultConfig]);
    }

    if (savedFunctionApis) {
      setFunctionApis(JSON.parse(savedFunctionApis));
    }

    if (savedIsolation !== null) {
      setDataIsolation(savedIsolation === 'true');
    }
  }, []);

  const handleSave = () => {
    // 验证至少有一个API配置
    if (apiConfigs.length === 0) {
      setError('请至少配置一个 API');
      return;
    }

    // 验证所有配置完整性
    for (const config of apiConfigs) {
      if (!config.name.trim() || !config.apiKey.trim() || !config.baseUrl.trim() || !config.modelName.trim()) {
        setError(`API配置 "${config.name || '未命名'}" 信息不完整`);
        return;
      }
    }

    // 保存到 localStorage
    localStorage.setItem('api_configs', JSON.stringify(apiConfigs));
    localStorage.setItem('function_apis', JSON.stringify(functionApis));
    localStorage.setItem('data_isolation', dataIsolation.toString());

    // 兼容旧版本
    const defaultConfig = apiConfigs.find(c => c.id === 'default') || apiConfigs[0];
    if (defaultConfig) {
      localStorage.setItem('deepseek_api_key', defaultConfig.apiKey);
      localStorage.setItem('deepseek_api_base_url', defaultConfig.baseUrl);
      localStorage.setItem('deepseek_model', defaultConfig.modelName);
      localStorage.setItem('deepseek_temperature', defaultConfig.temperature.toString());
      localStorage.setItem('deepseek_max_tokens', defaultConfig.maxTokens.toString());
    }

    setIsSaved(true);
    setError('');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem('api_configs');
    localStorage.removeItem('function_apis');
    localStorage.removeItem('data_isolation');
    localStorage.removeItem('deepseek_api_key');
    localStorage.removeItem('deepseek_api_base_url');
    localStorage.removeItem('deepseek_model');
    localStorage.removeItem('deepseek_temperature');
    localStorage.removeItem('deepseek_max_tokens');

    setApiConfigs([]);
    setFunctionApis({
      chat: 'default',
      generateQuestions: 'default',
      generateSummary: 'default',
      generateNotes: 'default',
      ocr: 'default',
    });
    setDataIsolation(true);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const addApiConfig = () => {
    const newConfig: APIConfig = {
      ...DEFAULT_API_CONFIG,
      id: `api_${Date.now()}`,
      name: `API配置 ${apiConfigs.length + 1}`,
    };
    setEditingConfig(newConfig);
    setIsEditing(true);
  };

  const editApiConfig = (config: APIConfig) => {
    setEditingConfig({ ...config });
    setIsEditing(true);
  };

  const saveApiConfig = () => {
    if (!editingConfig) return;
    
    if (!editingConfig.name.trim() || !editingConfig.apiKey.trim() || !editingConfig.baseUrl.trim()) {
      setError('请填写完整的 API 信息');
      return;
    }

    setApiConfigs(prev => {
      const exists = prev.find(c => c.id === editingConfig.id);
      if (exists) {
        return prev.map(c => c.id === editingConfig.id ? editingConfig : c);
      }
      return [...prev, editingConfig];
    });

    setIsEditing(false);
    setEditingConfig(null);
    setError('');
  };

  const deleteApiConfig = (id: string) => {
    setApiConfigs(prev => prev.filter(c => c.id !== id));
    // 更新功能映射
    setFunctionApis(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key as keyof FunctionAPIConfig] === id) {
          updated[key as keyof FunctionAPIConfig] = apiConfigs.find(c => c.id !== id)?.id || '';
        }
      });
      return updated;
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">设置</h1>
          <p className="text-slate-400">配置 AI API 参数和数据存储</p>
        </div>

        {/* Success Message */}
        {isSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            设置已保存
          </motion.div>
        )}

        {/* Error Message */}
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

        {/* API Configurations Section */}
        <div className="mb-6 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('apis')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-cyan-400" />
              <span className="font-medium text-slate-100">API 配置</span>
              <span className="text-xs text-slate-500">({apiConfigs.length} 个配置)</span>
            </div>
            {expandedSections.apis ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {expandedSections.apis && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-t border-slate-800"
              >
                <div className="p-6 space-y-4">
                  {/* API List */}
                  {apiConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200">{config.name}</span>
                          {config.id === 'default' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">默认</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {config.baseUrl} · {config.modelName || '未设置模型'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editApiConfig(config)}
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        {config.id !== 'default' && (
                          <button
                            onClick={() => deleteApiConfig(config.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Button */}
                  <button
                    onClick={addApiConfig}
                    className="w-full py-3 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加 API 配置
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Function API Mapping Section */}
        <div className="mb-6 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('functions')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-slate-100">功能 API 分配</span>
            </div>
            {expandedSections.functions ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {expandedSections.functions && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-t border-slate-800"
              >
                <div className="p-6 space-y-4">
                  {Object.entries(FUNCTION_LABELS).map(([key, { label, icon, desc }]) => (
                    <div key={key} className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-200">{label}</span>
                          <span className="text-xs text-slate-500">{desc}</span>
                        </div>
                        <select
                          value={functionApis[key as keyof FunctionAPIConfig]}
                          onChange={(e) => setFunctionApis(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          {apiConfigs.map(config => (
                            <option key={config.id} value={config.id}>{config.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Local Storage Info Section */}
        <div className="mb-6 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('storage')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-green-400" />
              <span className="font-medium text-slate-100">本地数据存储</span>
            </div>
            {expandedSections.storage ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          <AnimatePresence>
            {expandedSections.storage && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-t border-slate-800"
              >
                <div className="p-6 space-y-4">
                  <div className="text-sm text-slate-400">
                    所有学习数据存储在浏览器的 IndexedDB 中，完全本地化，无需云端服务器。
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400">存储方式</span>
                      <span className="text-slate-200">IndexedDB (浏览器本地)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400">API Key 存储</span>
                      <span className="text-slate-200">localStorage (仅本机)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                      <span className="text-slate-400">数据库名称</span>
                      <span className="text-slate-200">StudyAssistantDB</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    提示：清除浏览器数据会删除所有学习记录。建议定期使用浏览器的数据备份功能。
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security Section */}
        <div className="mb-6 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <button
            onClick={() => toggleSection('security')}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <span className="font-medium text-slate-100">数据隔离与安全</span>
            </div>
            {expandedSections.security ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {expandedSections.security && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="border-t border-slate-800"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <div className="font-medium text-slate-200">课程数据隔离</div>
                      <div className="text-sm text-slate-500">开启后，每个课程的知识库、错题等数据将完全隔离</div>
                    </div>
                    <button
                      onClick={() => setDataIsolation(!dataIsolation)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${dataIsolation ? 'bg-cyan-500' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${dataIsolation ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  <div className="text-sm text-slate-400 space-y-2">
                    <p>数据隔离机制说明：</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-500">
                      <li>每个课程拥有独立的知识库文档</li>
                      <li>错题本按课程分离，避免混淆</li>
                      <li>学习记录和统计按课程独立计算</li>
                      <li>AI 生成内容（总结、笔记）关联到具体课程</li>
                      <li>切换课程时，只显示当前课程的相关数据</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Save className="w-5 h-5" />
            保存设置
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium flex items-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            清除
          </button>
        </div>

        {/* Edit Modal */}
        {isEditing && editingConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
            >
              <h3 className="text-lg font-medium text-slate-100">
                {apiConfigs.find(c => c.id === editingConfig.id) ? '编辑 API 配置' : '添加 API 配置'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Hash className="w-4 h-4" />
                    配置名称
                  </label>
                  <input
                    type="text"
                    value={editingConfig.name}
                    onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                    placeholder="例如：DeepSeek 主账号"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Key className="w-4 h-4" />
                    API Key
                  </label>
                  <input
                    type="password"
                    value={editingConfig.apiKey}
                    onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Server className="w-4 h-4" />
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={editingConfig.baseUrl}
                    onChange={(e) => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Hash className="w-4 h-4" />
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={editingConfig.modelName}
                    onChange={(e) => setEditingConfig({ ...editingConfig, modelName: e.target.value })}
                    placeholder="例如：deepseek-chat、gpt-4、claude-3-opus..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    填写官方文档中的模型名称，如 deepseek-chat、gpt-4、claude-3-opus-20240229 等
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Thermometer className="w-4 h-4" />
                    Temperature
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={editingConfig.temperature}
                      onChange={(e) => setEditingConfig({ ...editingConfig, temperature: parseFloat(e.target.value) })}
                      className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="w-12 text-right text-slate-300">{editingConfig.temperature}</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Hash className="w-4 h-4" />
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="32000"
                    value={editingConfig.maxTokens}
                    onChange={(e) => setEditingConfig({ ...editingConfig, maxTokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveApiConfig}
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditingConfig(null); setError(''); }}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
