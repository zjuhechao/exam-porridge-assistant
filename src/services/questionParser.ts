import type { GeneratedQuestion } from '../types';

// 纯本地解析，不依赖 AI
export function parseQuestionsLocally(content: string): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  // 1. 按题型分区
  const sections = splitIntoSections(content);

  for (const { type, body } of sections) {
    // 2. 按题号拆题
    const blocks = splitIntoQuestions(body);
    for (const block of blocks) {
      const q = parseOneQuestion(block, type);
      if (q) questions.push(q);
    }
  }

  return questions;
}

// 检测是否为结构化题目内容
export function isStructuredContent(content: string): boolean {
  // 检查分隔符格式
  const hasDelimiter = /^[-=*_]{3,}$/m.test(content);
  // 检查是否有题型标题 + 题号 + 答案标记
  const hasSection = /[一二三四五六七八九十]+[、.．)]\s*(选择题|判断题|填空题|简答题|问答题)/.test(content);
  const hasNumber = /\d+[、.．)）]\s*\S+/.test(content);
  const hasAnswer = /(答案|正确答案|参考答案)[：:]\s*\S/.test(content);
  return hasDelimiter || hasSection || (hasNumber && hasAnswer);
}

interface Section {
  type: string;
  body: string;
}

// 分区
function splitIntoSections(content: string): Section[] {
  // 匹配题型标题行
  const sectionPatterns = [
    /^[一二三四五六七八九十]+[、.．)）]\s*(选择题|判断题|填空题|简答题|问答题)[：:：]?\s*$/m,
    /^[(（]?[1-4][)）]\s*(选择题|判断题|填空题|简答题|问答题)[：:：]?\s*$/m,
    /^【(选择题|判断题|填空题|简答题|问答题)】\s*$/m,
    /^\[(选择题|判断题|填空题|简答题|问答题)\]\s*$/m,
    /^(选择题|判断题|填空题|简答题|问答题)[：:：]?\s*$/m,
  ];

  const typeMap: Record<string, string> = {
    '选择题': 'choice',
    '判断题': 'judgment',
    '填空题': 'fill_blank',
    '简答题': 'short_answer',
    '问答题': 'short_answer',
  };

  // 尝试找到所有区段起始位置
  interface SectionStart {
    index: number;
    label: string;
    type: string;
  }
  const starts: SectionStart[] = [];

  for (const pattern of sectionPatterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, 'gm');
    while ((match = re.exec(content)) !== null) {
      const label = match[1] || match[0].replace(/[【\][]/g, '').trim();
      const type = typeMap[label] || 'general';
      starts.push({ index: match.index, label, type });
    }
  }

  if (starts.length === 0) {
    // 没有分区，整体作为一个区，尝试推断类型
    return [{ type: 'general', body: content }];
  }

  // 按位置排序
  starts.sort((a, b) => a.index - b.index);

  const sections: Section[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : content.length;
    const body = content.substring(start.index + start.label.length + 2, end).trim();
    sections.push({ type: start.type, body });
  }

  return sections;
}

// 分隔符检测：--- === ___ *** 单独一行
const DELIMITER_RE = /^[-=*_]{3,}$/;

// 按题号或分隔符拆分为独立的题块
function splitIntoQuestions(body: string): string[] {
  const lines = body.split('\n');

  // 检查是否有分隔符
  const hasDelimiter = lines.some(l => DELIMITER_RE.test(l.trim()));

  if (hasDelimiter) {
    // 按分隔符分割
    const blocks: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      if (DELIMITER_RE.test(line.trim())) {
        if (current.length > 0) {
          blocks.push(current.join('\n').trim());
          current = [];
        }
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) blocks.push(current.join('\n').trim());
    return blocks.filter(b => b.length > 0);
  }

  // 无分隔符 → 按题号分割（修复原版跨题 bug）
  const blocks: string[] = [];
  const questionStart = /^\d+[、.．)）]\s/;
  let currentBlock: string[] = [];
  let foundFirst = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isQuestionStart = questionStart.test(trimmed);

    if (isQuestionStart) {
      if (foundFirst && currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n').trim());
        currentBlock = [];
      }
      foundFirst = true;
    }
    currentBlock.push(line);
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n').trim());
  }

  // 如果还是没拆开（无双题号），用空行分段
  if (blocks.length <= 1 && !foundFirst) {
    return body.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }

  return blocks.filter(b => b.length > 0);
}

// 解析单个题目块
function parseOneQuestion(block: string, sectionType: string): GeneratedQuestion | null {
  // 去掉开头的题号
  const cleaned = block.replace(/^\s*\d+[、.．)）]\s*/, '').trim();
  if (!cleaned) return null;

  let questionText = '';
  let answer = '';
  let explanation = '';
  const options: string[] = [];

  // 按行解析
  const lines = cleaned.split('\n');
  let mode: 'question' | 'options' | 'answer' | 'explanation' = 'question';
  let optionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检测答案行
    const answerMatch = trimmed.match(/^(答案|正确答案|参考答案)[：:]\s*(.*)/);
    if (answerMatch) {
      mode = 'answer';
      answer = answerMatch[2].trim();
      continue;
    }

    // 检测解析行
    const explMatch = trimmed.match(/^(解析|讲解|分析|解释)[：:]\s*(.*)/);
    if (explMatch) {
      mode = 'explanation';
      explanation = explMatch[2].trim();
      continue;
    }

    // 检测选项行
    const optMatch = trimmed.match(/^([A-Da-d])[、.．)）]\s*(.*)/);
    if (optMatch) {
      mode = 'options';
      options.push(optMatch[2].trim());
      continue;
    }

    // 根据当前模式追加内容
    if (mode === 'question') {
      questionText += (questionText ? '\n' : '') + trimmed;
    } else if (mode === 'answer') {
      answer += '\n' + trimmed;
    } else if (mode === 'explanation') {
      explanation += '\n' + trimmed;
    }
  }

  questionText = questionText.trim();
  answer = answer.trim();
  explanation = explanation.trim();

  if (!questionText) return null;

  // 推断题型
  let questionType = sectionType;
  if (questionType === 'general') {
    if (options.length >= 2) questionType = 'choice';
    else if (answer === '正确' || answer === '错误' || answer === '对' || answer === '错') questionType = 'judgment';
    else if (questionText.includes('____') || questionText.includes('___') || questionText.includes('（）') || questionText.includes('( )')) questionType = 'fill_blank';
    else questionType = 'short_answer';
  }

  // 如果没解析到选项但题型是 choice，且答案匹配 A/B/C/D，生成占位选项
  if (questionType === 'choice' && options.length === 0 && /^[A-D]$/i.test(answer)) {
    // 尝试从题干中提取带编号的内容作为选项
    for (let i = 0; i < 4; i++) {
      options.push(String.fromCharCode(65 + i) + '. （选项未明确）');
    }
  }

  // 判断题标准化答案
  if (questionType === 'judgment') {
    if (answer === '对' || answer === 'T' || answer === '正确' || answer === '√') answer = '正确';
    else if (answer === '错' || answer === 'F' || answer === '错误' || answer === '×') answer = '错误';
  }

  return {
    question_type: questionType,
    question_text: questionText,
    options: options.length > 0 ? options : undefined,
    correct_answer: answer || '（未提取到答案）',
    explanation: explanation || '',
    difficulty: 2,
    knowledge_point: '',
  };
}
