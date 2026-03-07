// 求职知识库 - RAG 检索数据源
export const JOB_HUNTING_KNOWLEDGE = [
  {
    id: 'jd-basics',
    category: 'JD分析',
    content: `JD（职位描述）关键要素：
1. 岗位职责：核心工作内容，了解日常工作
2. 任职要求：硬性条件（学历、专业、技能）和加分项
3. 公司简介：了解公司业务和文化
4. 薪酬范围：判断岗位级别和竞争程度
5. 发展路径：是否有清晰的晋升通道`,
  },
  {
    id: 'jd-keywords',
    category: 'JD分析',
    content: `JD关键词解读：
- "负责" = 核心工作，需重点准备
- "参与" = 辅助角色，可适当了解
- "精通" = 硬性要求，必须掌握
- "熟悉" = 常用技术，需要了解
- "优先" = 加分项，有则更好
- "抗压" = 加班多，压力大的暗示`,
  },
  {
    id: 'resume-match',
    category: '简历优化',
    content: `简历与JD匹配技巧：
1. 提取JD中的关键词（技术栈、软技能）
2. 在简历中突出相关经验
3. 使用JD原话描述项目经历
4. 量化成果：用了什么技术、解决什么问题、产出了什么结果
5. 项目经历按相关度排序，匹配度高的放前面`,
  },
  {
    id: 'interview-prep',
    category: '面试准备',
    content: `技术面试准备清单：
1. 自我介绍：1-3分钟，突出优势和岗位匹配度
2. 项目深挖：STAR法则（背景、任务、行动、结果）
3. 技术问题：岗位相关技术栈、算法题
4. 反问环节：问团队、技术栈、成长空间
5. 行为问题：优缺点、职业规划、离职原因`,
  },
  {
    id: 'interview-questions',
    category: '面试准备',
    content: `高频面试问题回答技巧：
1. "自我介绍"：突出优势+岗位匹配+职业规划
2. "为什么离职"：正向表述（发展、成长、挑战）
3. "你的缺点"：真实但可改进的缺点+改进措施
4. "期望薪资"：基于市场行情+个人能力+发展空间
5. "还有什么要问的"：团队技术栈、成长空间、业务挑战`,
  },
  {
    id: 'salary-negotiation',
    category: '薪资谈判',
    content: `薪资谈判策略：
1. 了解市场行情：看准薪、牛客等平台数据
2. 合理定价：基于当前薪资+涨幅30-50%+
3. 谈总包：不仅看月薪，还有奖金、期权、福利
4. 掌握节奏：先让对方出价，不急着答应
5. 留有余地：给双方留谈判空间，不要把话说死`,
  },
  {
    id: 'company-research',
    category: '公司选择',
    content: `公司调研维度：
1. 业务方向：是否感兴趣、是否有前景
2. 团队规模：核心业务还是边缘业务
3. 技术栈：是否匹配、能否学到东西
4. 融资阶段：天使/A/B/C轮，上市
5. 文化氛围：996还是WLB，看脉脉/看准评价
6. 成长空间：是否有导师、晋升机制`,
  },
  {
    id: 'offer-compare',
    category: 'Offer选择',
    content: `Offer选择决策树：
1. 钱多事少离家近 → 直接选
2. 钱多但事多 → 看能否承受
3. 钱少但平台大 → 看成长空间
4. 创业公司 → 看赛道、团队、期权
5. 犹豫时：列SWOT对比表，量化打分
6. 最重要：这份工作能否让你变更强？`,
  },
  {
    id: 'career-planning',
    category: '职业规划',
    content: `职业规划建议：
1. 0-2年：打基础，学技能，找好导师
2. 2-5年：深耕领域，成为专家，建立影响力
3. 5年+：带团队，做决策，资源整合
4. 每半年复盘：学到了什么？还需要什么？
5. 保持学习：技术更新快，持续输入很重要`,
  },
  {
    id: 'interview-experience',
    category: '面经分享',
    content: `面经收集与利用：
1. 牛客网：互联网公司面经最全
2. 脉脉：社招面经较多
3. offershow：薪资信息
4. 整理高频问题：每场面试后记录被问到的题
5. 模拟面试：找人演练，克服紧张
6. 复盘反思：回答不好的问题要深入准备`,
  },
];

// 简单的向量检索（基于关键词匹配）
export function retrieveRelevantKnowledge(query: string, topK: number = 3): string[] {
  const queryLower = query.toLowerCase();

  // 计算每个文档的相关度分数
  const scored = JOB_HUNTING_KNOWLEDGE.map(doc => {
    const contentLower = doc.content.toLowerCase();
    const categoryLower = doc.category.toLowerCase();

    // 简单关键词匹配
    const queryWords = queryLower.split(/[\s,，、]+/).filter(w => w.length > 1);
    let score = 0;

    queryWords.forEach(word => {
      if (contentLower.includes(word) || categoryLower.includes(word)) {
        score += 1;
      }
    });

    // 类别匹配加权
    if (categoryLower.includes(queryLower)) {
      score += 2;
    }

    return { doc, score };
  });

  // 按分数排序，返回topK
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.doc.content);
}

// 获取所有类别
export function getCategories(): string[] {
  return [...new Set(JOB_HUNTING_KNOWLEDGE.map(d => d.category))];
}
