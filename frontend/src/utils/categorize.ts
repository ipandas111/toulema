export type IndustryCategory =
  | '半导体/芯片'
  | '能源科技'
  | '互联网/大厂'
  | '汽车/工业'
  | '咨询'
  | '金融/数据'
  | '其他'

export const INDUSTRY_COLORS: Record<IndustryCategory, string> = {
  '半导体/芯片': '#0071E3',
  '能源科技':    '#1D9E5F',
  '互联网/大厂': '#FF9F0A',
  '汽车/工业':   '#AF52DE',
  '咨询':        '#5E5CE6',
  '金融/数据':   '#FF453A',
  '其他':        '#636366',
}

interface Rule {
  category: IndustryCategory
  /** substring match — keyword must appear anywhere in company name */
  keywords: string[]
  /** whole-word match — keyword must not be surrounded by letters (for short abbreviations) */
  words?: string[]
}

const RULES: Rule[] = [
  {
    category: '半导体/芯片',
    keywords: [
      'texas instruments', 'texas', '德州仪器', '英飞凌', 'infineon',
      '意法半导体', 'st micro', 'stmicro',
      '英特尔', 'intel', '高通', 'qualcomm',
      'nxp semiconductor', '瑞萨', 'renesas', '安森美', 'onsemi',
      '博通', 'broadcom', '美光', 'micron', '西部数据', 'western digital',
      'kla', 'lam research', 'applied materials',
      '泰克', 'tektronix', '是德', 'keysight',
      '华润微', '韦尔半导体', 'will semi', '兆易', 'giga device',
      '卓胜微', '圣邦', '思瑞浦', '天德钰', 'analog devices',
      'amd', 'microchip', '瑞芯微', '全志', '晶晨', '联发科', 'mediatek',
      '海思', 'hisilicon', '紫光展锐', 'unisoc',
      '中芯', 'smic', '台积电', 'tsmc',
    ],
    words: ['ti', 'nxp', 'adi', 'amat'],
  },
  {
    category: '能源科技',
    keywords: [
      '华为数字能源', '协鑫', '宁德时代', 'catl', '比亚迪',
      '阳光电源', '正泰', '隆基', '通威',
      '远景', '金风', '维斯塔斯', 'vestas', 'ge renewable',
      '施耐德', 'schneider', 'abb',
      '国家电网', '南方电网', '国电', '华能', '大唐',
    ],
  },
  {
    category: '互联网/大厂',
    keywords: [
      '字节跳动', 'bytedance', '腾讯', 'tencent',
      '阿里', 'alibaba', '百度', 'baidu',
      '网易', 'netease', '美团', 'meituan',
      '京东', 'jd.com', '拼多多', '滴滴',
      '小米', 'xiaomi', 'oppo', 'vivo', '华为',
      '大疆', 'dji', '商汤', '旷视',
      'google', 'microsoft', '微软', 'apple', '苹果',
      'meta', 'amazon', 'netflix',
    ],
  },
  {
    category: '汽车/工业',
    keywords: [
      '特斯拉', 'tesla', '宝马', 'bmw', '奔驰', 'mercedes',
      '大众', 'volkswagen', '丰田', 'toyota', '博世', 'bosch',
      '西门子', 'siemens', '霍尼韦尔', 'honeywell',
      '艾默生', 'emerson', '罗克韦尔', 'rockwell',
      '福特', 'ford', '理想', '蔚来', '小鹏',
    ],
    words: ['gm'],
  },
  {
    category: '咨询',
    keywords: [
      'mckinsey', '麦肯锡', 'bcg', 'boston consulting',
      'bain', '贝恩', 'deloitte', '德勤',
      'pwc', '普华永道', 'kpmg', '毕马威',
      'ernst & young', '安永', 'accenture', '埃森哲',
      'oliver wyman', 'roland berger', 'at kearney',
    ],
    words: ['ey'],
  },
  {
    category: '金融/数据',
    keywords: [
      'bloomberg', '彭博', '万得', 'wind',
      'goldman', '高盛', 'morgan stanley', '摩根斯坦利',
      'jp morgan', 'blackrock', 'citadel',
      '中金', '中信证券', '招商证券', '华泰证券',
    ],
  },
]

/** Match a word boundary: kw not immediately preceded or followed by a letter */
function matchesWord(lower: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i').test(lower)
}

export function categorize(company: string): IndustryCategory {
  const lower = company.toLowerCase().trim()
  for (const rule of RULES) {
    if (rule.keywords.some(kw => lower.includes(kw.toLowerCase()))) return rule.category
    if (rule.words?.some(kw => matchesWord(lower, kw))) return rule.category
  }
  return '其他'
}
