// AI API 客户端 - 使用 Claude API (通过 MiniMax)
import { retrieveRelevantKnowledge } from './knowledge';

const CLAUDE_API_URL = 'https://api.minimaxi.com/v1/chat/completions';
const CLAUDE_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

// 评估 JD 质量的提示词
const JD_EVALUATION_PROMPT = `你是一个专业的HR招聘专家。请分析以下JD（职位描述）的质量：

 JD内容：
---
{content}
---

请从以下维度评估（1-10分）：
1. 描述清晰度
2. 职责明确性
3. 要求合理性
4. 薪酬竞争力（如果有）

请返回JSON格式：
{
  "score": 总分(1-10),
  "clarity": 清晰度分数,
  "responsibility": 职责明确度分数,
  "requirement": 要求合理性分数,
  "salary": 薪酬竞争力分数(如果没有信息则返回null),
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"]
}`;

// 生成求职建议的提示词
const JOB_ADVICE_PROMPT = `你是一个专业的求职顾问。请基于以下信息生成求职建议：

用户求职方向：{direction}
用户背景：{background}
目标岗位：{targetJob}
相关投递记录：{jobRecords}

检索到的求职知识：
{knowledge}

请生成结构化的求职建议，包含：
1. 竞争力分析
2. 需要重点准备的技能
3. 推荐投递的公司类型
4. 面试准备重点
5. 注意事项

请用Markdown格式输出，条理清晰。`;

// 调用 Claude API
async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  // 如果没有 API Key，使用模拟响应
  if (!CLAUDE_API_KEY) {
    return generateMockResponse(prompt, systemPrompt);
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLAUDE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '生成失败';
  } catch (error) {
    console.error('Claude API error:', error);
    return generateMockResponse(prompt, systemPrompt);
  }
}

// 生成模拟响应（当没有 API Key 时）
function generateMockResponse(prompt: string, _systemPrompt?: string): string {
  if (prompt.includes('JD质量')) {
    return JSON.stringify({
      score: 7,
      clarity: 8,
      responsibility: 7,
      requirement: 6,
      salary: null,
      issues: ['任职要求描述较为笼统', '未明确薪酬范围'],
      suggestions: ['建议明确加分项的具体要求', '补充薪酬范围增加竞争力']
    }, null, 2);
  }

  if (prompt.includes('求职建议')) {
    return `## 求职建议

### 1. 竞争力分析
你目前的投递方向匹配度较高，建议继续深耕。

### 2. 需要重点准备的技能
- 深入了解目标公司的业务和技术栈
- 准备好项目经验的详细描述（STAR法则）
- 练习算法题（尤其是动态规划和图论）

### 3. 推荐投递的公司类型
- 首选：与你经验匹配的行业中大型公司
- 次选：发展快速的独角兽公司
- 备选：创业公司（积累全面经验）

### 4. 面试准备重点
- 技术面：深入理解项目中的技术选型和解决过的难题
- HR面：准备好职业规划和离职原因的标准答案

### 5. 注意事项
- 投递后3-7天没有回复可以跟进
- 面试后可以主动询问反馈
- 保持好心态，求职是一个双向选择的过程`;
  }

  return '请提供更多详细信息以便生成更准确的建议。';
}

// 评估 JD 质量
export async function evaluateJD(jdContent: string): Promise<{
  score: number;
  clarity: number;
  responsibility: number;
  requirement: number;
  salary: number | null;
  issues: string[];
  suggestions: string[];
}> {
  const prompt = JD_EVALUATION_PROMPT.replace('{content}', jdContent);
  const response = await callClaude(prompt);

  try {
    // 尝试提取JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found');
  } catch {
    // 解析失败返回默认值
    return {
      score: 5,
      clarity: 5,
      responsibility: 5,
      requirement: 5,
      salary: null,
      issues: ['无法解析JD'],
      suggestions: ['请手动评估JD质量']
    };
  }
}

// 生成求职建议（使用 RAG + Claude）
export async function generateJobAdvice(
  direction: string,
  background: string,
  targetJob: string,
  jobs: { company: string; position: string; status: string }[]
): Promise<string> {
  // 1. RAG 检索相关知识
  const knowledge = retrieveRelevantKnowledge(`${direction} ${targetJob}`, 3);

  // 2. 构建提示词
  const prompt = JOB_ADVICE_PROMPT
    .replace('{direction}', direction)
    .replace('{background}', background)
    .replace('{targetJob}', targetJob)
    .replace('{jobRecords}', jobs.map(j => `${j.company} - ${j.position} (${j.status})`).join('\n'))
    .replace('{knowledge}', knowledge.join('\n\n'));

  // 3. 调用 Claude 生成建议
  return await callClaude(prompt);
}

// 生成面试问题建议
export async function generateInterviewQuestions(
  company: string,
  position: string,
  jobDescription?: string
): Promise<string[]> {
  const knowledge = retrieveRelevantKnowledge(`${position} 面试`, 2);

  const prompt = `你是一个面试辅导专家。请根据以下信息生成可能被问到的高频面试问题：

目标公司：{company}
目标岗位：{position}
岗位描述：{jobDescription}

相关知识：
{knowledge}

请生成8-12个高频面试问题，按以下分类：
- 技术问题（与岗位技能相关）
- 项目问题（与简历项目相关）
- 行为问题（与软技能、职业规划相关）

请以JSON数组格式返回问题列表。`.replace('{company}', company).replace('{position}', position).replace('{jobDescription}', jobDescription || '无').replace('{knowledge}', knowledge.join('\n'));

  const response = await callClaude(prompt);

  try {
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch {}

  return [
    '请自我介绍',
    '请介绍一个你最有成就感的项目',
    '遇到最大的技术挑战是什么？怎么解决的？',
    '为什么离职？',
    '你的职业规划是什么？',
    '你对这个岗位有什么优势？',
    '期望薪资是多少？',
    '有什么问题要问我？'
  ];
}
