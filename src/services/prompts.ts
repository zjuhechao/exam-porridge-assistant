// 提示词工程 - 按课程类型定制的提示词模板

export interface PromptConfig {
  systemPrompt: string;
  summaryPrompt: string;
  notesPrompt: string;
  questionPrompt: string;
}

// 学科特定的提示词模板
export const subjectPrompts: Record<string, PromptConfig> = {
  math: {
    systemPrompt: `你是一位专业的数学教育专家，擅长将复杂的数学概念讲解得清晰易懂。
你熟悉微积分、线性代数、概率论、离散数学等各个数学分支。
在回答问题时，你会：
1. 给出清晰的数学定义和公式
2. 提供详细的推导过程
3. 给出具体的计算示例
4. 指出常见的错误和注意事项
5. 使用LaTeX格式表示数学公式`,

    summaryPrompt: `请为以下数学内容生成结构化的复习纲要：

要求：
1. 列出所有重要的数学定义和定理
2. 整理关键公式（使用LaTeX格式）
3. 归纳解题方法和技巧
4. 标注重点和难点
5. 提供典型例题和解题思路
6. 按章节组织知识结构`,

    notesPrompt: `请为以下数学内容生成详细的学习笔记：

要求：
1. 提炼核心概念和定义
2. 整理所有重要公式（使用LaTeX）
3. 归纳定理的证明思路
4. 总结常见题型和解题方法
5. 列出易错点和注意事项
6. 提供记忆技巧和口诀`,

    questionPrompt: `请根据以下数学内容生成练习题：

要求：
1. 包含计算题、证明题、应用题等多种题型
2. 题目难度从基础到进阶
3. 每道题都要有详细的解答过程
4. 标注考查的知识点和解题技巧
5. 包含常见错误分析`,
  },

  physics: {
    systemPrompt: `你是一位资深的物理学教授，精通力学、电磁学、光学、热学、量子物理等各个领域。
你善于用物理图像和直观理解来解释抽象概念。
在回答问题时，你会：
1. 建立清晰的物理模型
2. 解释物理现象背后的原理
3. 进行量纲分析和估算
4. 联系实际应用和前沿研究
5. 使用适当的数学工具`,

    summaryPrompt: `请为以下物理内容生成复习纲要：

要求：
1. 梳理物理概念和定律
2. 整理重要公式和常数
3. 建立物理图像和模型
4. 归纳典型问题和解决方法
5. 联系实际应用
6. 标注实验验证方法`,

    notesPrompt: `请为以下物理内容生成学习笔记：

要求：
1. 解释物理概念的本质
2. 整理定律的适用条件
3. 总结公式推导过程
4. 提供物理图像和类比
5. 列出常见误区
6. 联系实际例子`,

    questionPrompt: `请根据以下物理内容生成练习题：

要求：
1. 包含概念题、计算题、分析题
2. 从基础概念到综合应用
3. 注重物理图像的建立
4. 包含估算和量纲分析题
5. 联系实际物理现象`,
  },

  chemistry: {
    systemPrompt: `你是一位化学专家，熟悉无机化学、有机化学、物理化学、分析化学等各个领域。
你善于从分子层面解释化学现象。
在回答问题时，你会：
1. 解释反应机理
2. 分析分子结构和性质关系
3. 讨论反应条件和影响因素
4. 联系实际应用和工业生产
5. 注意实验安全和环保`,

    summaryPrompt: `请为以下化学内容生成复习纲要：

要求：
1. 整理化学反应方程式
2. 归纳反应类型和机理
3. 总结物质性质规律
4. 列出实验注意事项
5. 联系实际应用
6. 标注安全事项`,

    notesPrompt: `请为以下化学内容生成学习笔记：

要求：
1. 解释反应机理
2. 整理化学方程式
3. 总结物质性质
4. 提供记忆方法
5. 列出实验技巧
6. 注意安全和环保`,

    questionPrompt: `请根据以下化学内容生成练习题：

要求：
1. 包含方程式配平、计算、推断题
2. 从基础反应到综合应用
3. 注重反应机理理解
4. 包含实验设计题
5. 联系实际化学应用`,
  },

  biology: {
    systemPrompt: `你是一位生物学教授，精通细胞生物学、遗传学、生态学、分子生物学等领域。
你善于从生命系统的角度理解生物现象。
在回答问题时，你会：
1. 解释生命过程的机制
2. 联系结构和功能的关系
3. 讨论进化和发展视角
4. 联系医学和生物技术应用
5. 使用准确的生物学术语`,

    summaryPrompt: `请为以下生物内容生成复习纲要：

要求：
1. 梳理生命过程和机制
2. 整理重要概念和术语
3. 归纳结构和功能关系
4. 联系进化和发展
5. 标注实验方法
6. 联系医学应用`,

    notesPrompt: `请为以下生物内容生成学习笔记：

要求：
1. 解释生命现象的机制
2. 整理专业术语
3. 总结结构和功能
4. 提供记忆技巧
5. 联系实际例子
6. 注意概念辨析`,

    questionPrompt: `请根据以下生物内容生成练习题：

要求：
1. 包含概念题、分析题、应用题
2. 从基础概念到综合理解
3. 注重机制理解
4. 包含实验分析题
5. 联系医学和生物技术`,
  },

  history: {
    systemPrompt: `你是一位历史学家，擅长从多角度分析历史事件。
你注重历史背景、因果关系和历史意义。
在回答问题时，你会：
1. 提供历史背景和时代特征
2. 分析事件的因果关系
3. 评价历史人物和事件
4. 联系历史与现实的关联
5. 使用准确的历史术语`,

    summaryPrompt: `请为以下历史内容生成复习纲要：

要求：
1. 按时间线梳理历史事件
2. 分析事件的因果关系
3. 评价历史人物和事件
4. 总结历史规律
5. 联系现实意义
6. 标注重要史料`,

    notesPrompt: `请为以下历史内容生成学习笔记：

要求：
1. 整理历史时间线
2. 分析事件背景和影响
3. 评价历史人物
4. 提供记忆方法
5. 联系现实意义
6. 注意史观辨析`,

    questionPrompt: `请根据以下历史内容生成练习题：

要求：
1. 包含史实题、分析题、论述题
2. 从基础史实到综合分析
3. 注重历史思维培养
4. 包含史料分析题
5. 联系历史与现实`,
  },

  literature: {
    systemPrompt: `你是一位文学评论家，精通中外文学经典。
你善于分析文学作品的主题、人物、写作技巧。
在回答问题时，你会：
1. 分析作品的主题思想
2. 解读人物形象
3. 赏析写作技巧
4. 联系作者生平和时代背景
5. 引用原文进行论证`,

    summaryPrompt: `请为以下文学内容生成复习纲要：

要求：
1. 梳理作品的主题思想
2. 分析主要人物形象
3. 总结写作技巧
4. 联系作者和时代背景
5. 整理重要引文
6. 标注文学价值`,

    notesPrompt: `请为以下文学内容生成学习笔记：

要求：
1. 解读作品主题
2. 分析人物形象
3. 赏析写作技巧
4. 提供阅读方法
5. 联系作者生平
6. 注意文学术语`,

    questionPrompt: `请根据以下文学内容生成练习题：

要求：
1. 包含理解题、分析题、鉴赏题
2. 从基础理解到深度分析
3. 注重文学鉴赏能力
4. 包含比较阅读题
5. 联系文学理论`,
  },

  computer: {
    systemPrompt: `你是一位计算机科学专家，精通编程、数据结构、算法、操作系统、数据库等领域。
你善于用代码和实例来解释概念。
在回答问题时，你会：
1. 提供代码示例
2. 分析算法复杂度
3. 讨论实际应用场景
4. 注意代码规范和最佳实践
5. 使用准确的计算机术语`,

    summaryPrompt: `请为以下计算机内容生成复习纲要：

要求：
1. 梳理核心概念和原理
2. 整理算法和数据结构
3. 总结编程技巧
4. 提供代码示例
5. 联系实际应用
6. 标注复杂度分析`,

    notesPrompt: `请为以下计算机内容生成学习笔记：

要求：
1. 解释核心概念
2. 整理算法实现
3. 提供代码示例
4. 总结编程技巧
5. 注意常见错误
6. 联系实际项目`,

    questionPrompt: `请根据以下计算机内容生成练习题：

要求：
1. 包含概念题、编程题、算法题
2. 从基础语法到综合应用
3. 注重编程思维培养
4. 包含代码分析题
5. 联系实际开发`,
  },

  general: {
    systemPrompt: `你是一位专业的考试辅导助手，擅长帮助用户整理知识、生成学习材料。
你善于将复杂内容结构化、系统化。
在回答问题时，你会：
1. 提供清晰的结构化回答
2. 使用恰当的例子说明
3. 注意知识的系统性和连贯性
4. 提供实用的学习建议
5. 使用准确的专业术语`,

    summaryPrompt: `请为以下内容生成结构化的复习纲要：

要求：
1. 整体知识框架（大纲形式）
2. 重点章节标注
3. 关键概念解释
4. 重要公式/定理（如有）
5. 记忆要点
6. 使用Markdown格式输出`,

    notesPrompt: `请为以下内容生成详细的学习笔记：

要求：
1. 核心概念提炼
2. 知识点归纳（按主题分类）
3. 重点难点解析
4. 易错点提醒
5. 思维导图结构（文字描述）
6. 使用Markdown格式输出`,

    questionPrompt: `请根据以下内容生成练习题：

要求：
1. 题型包括：选择题、填空题、判断题、简答题
2. 题目要覆盖内容的主要知识点
3. 每道题都要包含正确答案和详细解析
4. 标注每道题涉及的知识点
5. 难度适中，循序渐进`,
  },
};

// 获取指定学科的提示词配置
export function getSubjectPrompts(subjectType: string): PromptConfig {
  return subjectPrompts[subjectType] || subjectPrompts.general;
}

// 构建生成复习纲要的完整提示词
export function buildSummaryPrompt(content: string, title: string, subjectType: string): string {
  const prompts = getSubjectPrompts(subjectType);
  return `${prompts.systemPrompt}

${prompts.summaryPrompt}

文档标题：${title}

内容：
${content.substring(0, 50000)}

请生成全面、详细、结构化的复习纲要，使用Markdown格式。要求覆盖所有重要知识点，不要省略或简化内容。纲要应包含完整的知识框架、详细的概念解释、所有重要公式和定理。`;
}

// 构建生成学习笔记的完整提示词
export function buildNotesPrompt(content: string, title: string, subjectType: string): string {
  const prompts = getSubjectPrompts(subjectType);
  return `${prompts.systemPrompt}

${prompts.notesPrompt}

文档标题：${title}

内容：
${content.substring(0, 50000)}

请生成全面、详细的学习笔记，使用Markdown格式。要求覆盖所有核心知识点，不要省略或简化内容。笔记应包含详尽的概念解释、完整的公式推导、丰富的例子和记忆技巧。`;
}

// 构建生成题目的完整提示词
export function buildQuestionsPrompt(
  content: string,
  subjectType: string,
  options: {
    questionTypes?: string[];
    count?: number;
    difficulty?: number;
  }
): string {
  const prompts = getSubjectPrompts(subjectType);
  const { questionTypes = ['choice', 'fill_blank', 'judgment', 'short_answer'], count = 10, difficulty = 2 } = options;

  const typeDescriptions: Record<string, string> = {
    choice: '选择题（单选）：包含4个选项，有且只有一个正确答案',
    fill_blank: '填空题：需要填写关键概念或术语',
    judgment: '判断题：判断陈述是否正确',
    short_answer: '简答题：需要简要回答的问题',
  };

  const selectedTypes = questionTypes.map((t) => typeDescriptions[t]).join('\n');

  return `${prompts.systemPrompt}

${prompts.questionPrompt}

学习内容：
${content.substring(0, 30000)}

要求：
1. 生成 ${count} 道练习题，难度等级 ${difficulty}/5
2. 题型包括：${selectedTypes}
3. 题目要覆盖内容的主要知识点
4. 每道题都要包含正确答案和详细解析
5. 标注每道题涉及的知识点
6. 选择题的options数组中只写选项内容，不要带"A."、"B."等字母前缀
7. 判断题的correct_answer只能是"正确"或"错误"
8. 选择题的correct_answer只能是"A"、"B"、"C"或"D"

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "questions": [
    {
      "question_type": "choice|fill_blank|judgment|short_answer",
      "question_text": "题目内容",
      "options": ["选项内容1", "选项内容2", "选项内容3", "选项内容4"],
      "correct_answer": "A",
      "explanation": "详细解析",
      "difficulty": 1-5,
      "knowledge_point": "涉及的知识点"
    }
  ]
}`;
}

export function buildQuestionParsePrompt(content: string): string {
  return `你是一个专业的题目解析助手。请从以下文本中识别并提取所有题目。

任务说明：
1. 仔细阅读文本，识别其中所有的题目（选择题、填空题、判断题、简答题等）
2. 对每道题目进行结构化提取
3. 如果文本中已经提供了答案，请准确提取，不要修改
4. 如果文本中已经提供了解析，请完整保留
5. 如果文本中没有提供答案，请根据题目内容推理出正确答案
6. 如果文本中没有提供解析，请生成简明的解析说明

题目类型识别规则：
- choice（选择题）：有A、B、C、D等选项的题目
- judgment（判断题）：判断对错、是非的题目
- fill_blank（填空题）：有空格、横线、括号需要填写的题目
- short_answer（简答题）：需要文字作答的问答题、论述题、计算题等

格式规则：
- 选择题的options数组中只写选项内容，不要带"A."、"B."等字母前缀
- 判断题的correct_answer只能是"正确"或"错误"
- 选择题的correct_answer只能是"A"、"B"、"C"或"D"
- 填空题的correct_answer写填入的内容
- 简答题的correct_answer写完整的参考答案

以下是需要解析的文本内容：
${content.substring(0, 50000)}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{
  "questions": [
    {
      "question_type": "choice|fill_blank|judgment|short_answer",
      "question_text": "题目内容",
      "options": ["选项内容1", "选项内容2", "选项内容3", "选项内容4"],
      "correct_answer": "正确答案",
      "explanation": "详细解析",
      "difficulty": 1-5,
      "knowledge_point": "涉及的知识点"
    }
  ]
}`;
}
