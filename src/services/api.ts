import type { ChatMessage, GeneratedQuestion, APIConfig, FunctionAPIConfig } from '../types';
import { getCurrentCourseId, isDataIsolationEnabled } from './db';
import { buildSummaryPrompt, buildNotesPrompt, buildQuestionsPrompt, buildQuestionParsePrompt, getSubjectPrompts } from './prompts';
export { extractFileContent } from './fileParser';

// API配置读取
export function getAPIConfigs(): APIConfig[] {
  const saved = localStorage.getItem('api_configs');
  if (saved) {
    return JSON.parse(saved);
  }
  const apiKey = localStorage.getItem('deepseek_api_key');
  if (apiKey) {
    return [{
      id: 'default',
      name: '默认配置',
      apiKey,
      baseUrl: localStorage.getItem('deepseek_api_base_url') || 'https://api.deepseek.com',
      modelName: localStorage.getItem('deepseek_model') || 'deepseek-chat',
      temperature: parseFloat(localStorage.getItem('deepseek_temperature') || '0.7'),
      maxTokens: parseInt(localStorage.getItem('deepseek_max_tokens') || '8192'),
    }];
  }
  return [];
}

export function getFunctionAPIConfig(): FunctionAPIConfig {
  const saved = localStorage.getItem('function_apis');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    chat: 'default',
    generateQuestions: 'default',
    generateSummary: 'default',
    generateNotes: 'default',
    ocr: 'default',
  };
}

export function getAPIConfigForFunction(functionName: keyof FunctionAPIConfig): APIConfig | null {
  const configs = getAPIConfigs();
  const functionConfig = getFunctionAPIConfig();
  const configId = functionConfig[functionName];
  return configs.find(c => c.id === configId) || configs[0] || null;
}

function buildApiUrl(baseUrl: string): string {
  const url = baseUrl.replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/v1')) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

// AI 对话 - 直连流式
export async function chatWithAI(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: {
    apiConfig?: APIConfig;
    signal?: AbortSignal;
  }
): Promise<string> {
  const config = options?.apiConfig || getAPIConfigForFunction('chat');
  if (!config) {
    throw new Error('未配置 AI API，请先在设置中配置');
  }

  const host = extractHost(config.baseUrl);

  const response = await fetch(buildApiUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const err = await response.json(); msg = err.error?.message || err.error || msg; } catch {}
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${host} 返回 ${response.status}：API Key 无效或权限不足（${msg}）`);
    }
    if (response.status === 429) {
      throw new Error(`${host} 返回 ${response.status}：请求频率超限，请稍后重试`);
    }
    if (response.status >= 500) {
      throw new Error(`${host} 服务器错误 ${response.status}（${msg}），请检查 API 服务状态`);
    }
    throw new Error(`${host} 请求失败（${response.status}）：${msg}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return fullText;

        try {
          const json = JSON.parse(payload);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {}
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return fullText;
    throw err;
  }

  return fullText;
}

function extractHost(baseUrl: string): string {
  try { return new URL(baseUrl).hostname; } catch { return baseUrl; }
}

async function callAI(config: APIConfig, messages: ChatMessage[], options?: { maxTokens?: number }): Promise<string> {
  const apiUrl = buildApiUrl(config.baseUrl);
  const host = extractHost(config.baseUrl);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      temperature: config.temperature,
      max_tokens: options?.maxTokens || config.maxTokens,
    }),
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      msg = err.error?.message || err.error || msg;
    } catch {}
    // 区分常见错误类型，帮助用户快速定位
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${host} 返回 ${response.status}：API Key 无效或权限不足（${msg}）`);
    }
    if (response.status === 429) {
      throw new Error(`${host} 返回 ${response.status}：请求频率超限，请稍后重试`);
    }
    if (response.status >= 500) {
      throw new Error(`${host} 服务器错误 ${response.status}（${msg}），请检查 API 服务状态`);
    }
    throw new Error(`${host} 请求失败（${response.status}）：${msg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 生成题目 - 直连AI
export async function generateQuestions(
  content: string,
  options?: {
    apiConfig?: APIConfig;
    questionTypes?: string[];
    count?: number;
    difficulty?: number;
    courseId?: string;
    subjectType?: string;
  }
): Promise<{ questions: GeneratedQuestion[]; raw?: string }> {
  const config = options?.apiConfig || getAPIConfigForFunction('generateQuestions');
  if (!config) {
    throw new Error('未配置题目生成 API，请先在设置中配置');
  }

  const subjectType = options?.subjectType || 'general';
  const prompt = buildQuestionsPrompt(content, subjectType, {
    questionTypes: options?.questionTypes,
    count: options?.count,
    difficulty: options?.difficulty,
  });

  const subjectPrompts = getSubjectPrompts(subjectType);
  const raw = await callAI(config, [
    { role: 'system', content: subjectPrompts.systemPrompt },
    { role: 'user', content: prompt },
  ]);

  const questions = parseQuestionsResponse(raw);
  return { questions, raw };
}

function parseQuestionsResponse(text: string): GeneratedQuestion[] {
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {}

  const jsonMatch = cleaned.match(/\{[\s\S]*"questions"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]).questions;
    } catch {}
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  console.warn('[考试粥助手] AI 返回内容未能解析为题目格式，原始内容：', text.slice(0, 500));
  return [];
}

// 生成复习纲要 - 直连AI
export async function generateSummary(
  content: string,
  title: string,
  options?: {
    apiConfig?: APIConfig;
    courseId?: string;
    subjectType?: string;
  }
): Promise<{ summary: string }> {
  const config = options?.apiConfig || getAPIConfigForFunction('generateSummary');
  if (!config) {
    throw new Error('未配置总结生成 API，请先在设置中配置');
  }

  const subjectType = options?.subjectType || 'general';
  const prompt = buildSummaryPrompt(content, title, subjectType);
  const subjectPromptsConfig = getSubjectPrompts(subjectType);

  const summary = await callAI(config, [
    { role: 'system', content: subjectPromptsConfig.systemPrompt },
    { role: 'user', content: prompt },
  ], { maxTokens: Math.max(config.maxTokens, 8192) });

  return { summary };
}

// 生成学习笔记 - 直连AI
export async function generateNotes(
  content: string,
  title: string,
  options?: {
    apiConfig?: APIConfig;
    courseId?: string;
    subjectType?: string;
  }
): Promise<{ notes: string }> {
  const config = options?.apiConfig || getAPIConfigForFunction('generateNotes');
  if (!config) {
    throw new Error('未配置笔记生成 API，请先在设置中配置');
  }

  const subjectType = options?.subjectType || 'general';
  const prompt = buildNotesPrompt(content, title, subjectType);
  const subjectPromptsConfig = getSubjectPrompts(subjectType);

  const notes = await callAI(config, [
    { role: 'system', content: subjectPromptsConfig.systemPrompt },
    { role: 'user', content: prompt },
  ], { maxTokens: Math.max(config.maxTokens, 8192) });

  return { notes };
}

// OCR图片识别 - 直连AI
export async function ocrImage(
  imageFile: File,
  options?: {
    apiConfig?: APIConfig;
    autoCorrect?: boolean;
  }
): Promise<{ text: string; corrections: Array<{original: string; corrected: string; reason: string}>; raw: string }> {
  const config = options?.apiConfig || getAPIConfigForFunction('ocr');
  if (!config) {
    throw new Error('未配置 OCR API，请先在设置中配置');
  }

  const base64 = await fileToBase64(imageFile);
  const autoCorrect = options?.autoCorrect ?? true;

  const systemPrompt = autoCorrect
    ? '你是一个专业的OCR文字识别助手。请识别图片中的所有文字内容，并对识别结果进行校正。返回JSON格式：{"text": "识别的完整文本", "corrections": [{"original": "原始识别", "corrected": "校正后", "reason": "原因"}]}'
    : '你是一个专业的OCR文字识别助手。请识别图片中的所有文字内容。返回JSON格式：{"text": "识别的完整文本", "corrections": []}';

  const response = await fetch(buildApiUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64}` } },
            { type: 'text', text: '请识别这张图片中的所有文字内容。' },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const err = await response.json(); msg = err.error?.message || err.error || msg; } catch {}
    const host = extractHost(config.baseUrl);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${host} OCR 认证失败（${response.status}）：API Key 无效或权限不足`);
    }
    if (response.status === 429) {
      throw new Error(`${host} OCR 请求频率超限，请稍后重试`);
    }
    throw new Error(`${host} OCR 识别失败（${response.status}）：${msg}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';

  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { text: parsed.text || raw, corrections: parsed.corrections || [], raw };
  } catch {
    return { text: raw, corrections: [], raw };
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

// 从题目文件中解析题目
export async function parseQuestionsFromFile(
  content: string,
  options?: { apiConfig?: APIConfig }
): Promise<{ questions: GeneratedQuestion[]; raw?: string }> {
  const config = options?.apiConfig || getAPIConfigForFunction('generateQuestions');
  if (!config) {
    throw new Error('未配置题目生成 API，请先在设置中配置');
  }

  const systemPrompt = getSubjectPrompts('general').systemPrompt;
  const chunks = splitContentForParsing(content, 30000);
  const allQuestions: GeneratedQuestion[] = [];
  let lastRaw = '';

  for (const chunk of chunks) {
    const prompt = buildQuestionParsePrompt(chunk);
    const raw = await callAI(config, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], { maxTokens: Math.max(config.maxTokens, 8192) });
    lastRaw = raw;

    const questions = parseQuestionsResponse(raw);
    allQuestions.push(...questions);
  }

  const seen = new Set<string>();
  const deduplicated = allQuestions.filter((q) => {
    if (!q.question_text || !q.correct_answer) return false;
    const key = q.question_text.replace(/\s+/g, '').substring(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { questions: deduplicated, raw: lastRaw };
}

function splitContentForParsing(content: string, maxChunkSize: number): string[] {
  if (content.length <= maxChunkSize) return [content];

  const paragraphs = content.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// 从图片中多模态解析题目
export async function parseQuestionsFromImages(
  images: { base64: string; mimeType: string }[],
  options?: { apiConfig?: APIConfig }
): Promise<{ questions: GeneratedQuestion[]; raw?: string }> {
  const config = options?.apiConfig || getAPIConfigForFunction('ocr');
  if (!config) {
    throw new Error('未配置 OCR API（需要多模态模型），请先在设置中配置');
  }

  const prompt = buildQuestionParsePrompt('请从图片中识别并提取所有题目。');
  const systemPrompt = getSubjectPrompts('general').systemPrompt;
  const allQuestions: GeneratedQuestion[] = [];
  let lastRaw = '';

  for (const img of images) {
    const response = await fetch(buildApiUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try { const err = await response.json(); msg = err.error?.message || err.error || msg; } catch {}
      const host = extractHost(config.baseUrl);
      if (response.status === 401 || response.status === 403) {
        throw new Error(`${host} 图片识别认证失败（${response.status}）：API Key 无效或权限不足`);
      }
      if (response.status === 429) {
        throw new Error(`${host} 图片识别请求频率超限，请稍后重试`);
      }
      throw new Error(`${host} 图片识别失败（${response.status}）：${msg}`);
    }

    const data = await response.json();
    lastRaw = data.choices?.[0]?.message?.content || '';
    const questions = parseQuestionsResponse(lastRaw);
    allQuestions.push(...questions);
  }

  const seen = new Set<string>();
  const deduplicated = allQuestions.filter((q) => {
    if (!q.question_text || !q.correct_answer) return false;
    const key = q.question_text.replace(/\s+/g, '').substring(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { questions: deduplicated, raw: lastRaw };
}

// CORS 代理列表（按优先级）
const CORS_PROXIES = [
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

// 从 HTML 中提取正文文本
function extractTextFromHTML(html: string): { title: string; content: string } {
  // 提取标题
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 提取 meta description
  const descMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // 移除非内容标签
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ')
    // 替换块级标签为换行
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|section|article|table|ul|ol)[^>]*>/gi, '\n')
    // 移除所有剩余标签
    .replace(/<[^>]+>/g, ' ')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    // 清理空白
    .replace(/\n\s*\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

  // 如果内容太少，尝试从 description 补充
  let content = text;
  if (content.length < 50 && description) {
    content = description + '\n\n' + content;
  }

  return { title: title || '未命名页面', content };
}

// 从 URL 抓取内容
export async function fetchUrlContent(url: string): Promise<{ title: string; content: string }> {
  // 验证 URL
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('仅支持 HTTP/HTTPS 链接');
    }
  } catch (e) {
    throw new Error('请输入有效的链接地址（以 http:// 或 https:// 开头）');
  }

  const errors: string[] = [];

  // 1. 尝试直接 fetch
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)' },
    });
    if (response.ok) {
      const html = await response.text();
      if (html.length > 100) {
        return extractTextFromHTML(html);
      }
    }
    errors.push(`直接访问失败 (HTTP ${response.status})`);
  } catch (e) {
    errors.push(`直接访问失败 (${(e as Error).name})`);
  }

  // 2. 尝试 CORS 代理
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const text = await response.text();
        // 检测代理返回的错误页面
        if (text.includes('522: Connection timed out') || text.includes('520: Web server is returning')) {
          errors.push(`${new URL(proxyUrl).hostname}: 代理无法连接到目标服务器`);
          continue;
        }
        if (text.includes('百度安全验证') || text.includes('安全验证')) {
          throw new Error('该网站（百度百科等）有安全验证机制，禁止自动化访问。\n建议：手动复制网页内容后粘贴到知识库中。');
        }
        if (text.length > 100) {
          return extractTextFromHTML(text);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误';
      const proxyHost = new URL(proxy(url)).hostname;
      errors.push(`${proxyHost}: ${msg}`);
      continue;
    }
  }

  throw new Error(
    `无法访问该链接。\n\n${errors.join('\n')}\n\n` +
    '常见原因：\n' +
    '1. ⚠️ 百度百科等网站有安全验证，无法自动抓取\n' +
    '2. 链接地址不正确或已失效\n' +
    '3. 需要登录才能查看内容\n' +
    '4. 网站服务器暂时不可用\n\n' +
    '建议：尝试以下网址\n' +
    '  - ✅ 维基百科 (zh.wikipedia.org) — 支持\n' +
    '  - ✅ MDN文档 (developer.mozilla.org) — 支持\n' +
    '  - ✅ 任何公开技术博客 — 支持\n' +
    '  - ❌ 百度百科、知乎等有反爬机制 — 不支持\n\n' +
    '对于不支持的网站，请手动复制内容后粘贴到知识库中。'
  );
}

// 文本分块
export function chunkText(text: string, chunkSize: number = 512): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[。！？.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
