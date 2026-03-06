import { describe, it, expect } from 'vitest'
import { categorize } from '../utils/categorize'

describe('categorize', () => {

  // ── 半导体/芯片 ──────────────────────────────────────────────
  describe('半导体/芯片', () => {
    it('中文全称', () => {
      expect(categorize('德州仪器')).toBe('半导体/芯片')
      expect(categorize('意法半导体')).toBe('半导体/芯片')
      expect(categorize('英飞凌科技')).toBe('半导体/芯片')
    })

    it('英文缩写大小写不敏感', () => {
      expect(categorize('TI')).toBe('半导体/芯片')
      expect(categorize('ti')).toBe('半导体/芯片')
      expect(categorize('Ti')).toBe('半导体/芯片')
      expect(categorize('INTEL')).toBe('半导体/芯片')
      expect(categorize('Qualcomm')).toBe('半导体/芯片')
      expect(categorize('AMD')).toBe('半导体/芯片')
      expect(categorize('NXP')).toBe('半导体/芯片')
    })

    it('公司名含地名前缀仍能识别', () => {
      expect(categorize('德州仪器（上海）')).toBe('半导体/芯片')
      expect(categorize('英飞凌半导体(成都)有限公司')).toBe('半导体/芯片')
      expect(categorize('英特尔亚太研发有限公司')).toBe('半导体/芯片')
    })

    it('测试设备厂商', () => {
      expect(categorize('是德科技')).toBe('半导体/芯片')
      expect(categorize('Keysight Technologies')).toBe('半导体/芯片')
      expect(categorize('泰克仪器')).toBe('半导体/芯片')
    })

    it('芯片制造', () => {
      expect(categorize('中芯国际')).toBe('半导体/芯片')
      expect(categorize('台积电')).toBe('半导体/芯片')
    })
  })

  // ── 能源科技 ──────────────────────────────────────────────────
  describe('能源科技', () => {
    it('识别主流能源公司', () => {
      expect(categorize('华为数字能源')).toBe('能源科技')
      expect(categorize('协鑫集团')).toBe('能源科技')
      expect(categorize('宁德时代')).toBe('能源科技')
      expect(categorize('CATL')).toBe('能源科技')
      expect(categorize('比亚迪')).toBe('能源科技')
    })

    it('新能源光伏', () => {
      expect(categorize('隆基绿能')).toBe('能源科技')
      expect(categorize('阳光电源')).toBe('能源科技')
    })

    it('电网类', () => {
      expect(categorize('国家电网有限公司')).toBe('能源科技')
      expect(categorize('南方电网')).toBe('能源科技')
    })
  })

  // ── 互联网/大厂 ───────────────────────────────────────────────
  describe('互联网/大厂', () => {
    it('国内大厂', () => {
      expect(categorize('字节跳动')).toBe('互联网/大厂')
      expect(categorize('腾讯')).toBe('互联网/大厂')
      expect(categorize('阿里巴巴')).toBe('互联网/大厂')
      expect(categorize('百度')).toBe('互联网/大厂')
      expect(categorize('美团')).toBe('互联网/大厂')
      expect(categorize('大疆创新')).toBe('互联网/大厂')
    })

    it('国际科技公司', () => {
      expect(categorize('Google')).toBe('互联网/大厂')
      expect(categorize('Microsoft')).toBe('互联网/大厂')
      expect(categorize('Meta Platforms')).toBe('互联网/大厂')
      expect(categorize('Amazon')).toBe('互联网/大厂')
    })

    it('华为（不带"数字能源"后缀时归大厂）', () => {
      // 纯"华为"无能源关键词 → 互联网/大厂
      expect(categorize('华为技术有限公司')).toBe('互联网/大厂')
    })
  })

  // ── 汽车/工业 ─────────────────────────────────────────────────
  describe('汽车/工业', () => {
    it('传统车企', () => {
      expect(categorize('特斯拉')).toBe('汽车/工业')
      expect(categorize('宝马')).toBe('汽车/工业')
      expect(categorize('博世')).toBe('汽车/工业')
    })

    it('工业自动化', () => {
      expect(categorize('西门子')).toBe('汽车/工业')
      expect(categorize('霍尼韦尔')).toBe('汽车/工业')
    })

    it('新势力车企', () => {
      expect(categorize('理想汽车')).toBe('汽车/工业')
      expect(categorize('蔚来')).toBe('汽车/工业')
      expect(categorize('小鹏汽车')).toBe('汽车/工业')
    })
  })

  // ── 咨询 ──────────────────────────────────────────────────────
  describe('咨询', () => {
    it('MBB 三大咨询', () => {
      expect(categorize('McKinsey & Company')).toBe('咨询')
      expect(categorize('麦肯锡')).toBe('咨询')
      expect(categorize('BCG')).toBe('咨询')
      expect(categorize('Boston Consulting Group')).toBe('咨询')
      expect(categorize('Bain & Company')).toBe('咨询')
      expect(categorize('贝恩咨询')).toBe('咨询')
    })

    it('四大会计师事务所', () => {
      expect(categorize('Deloitte')).toBe('咨询')
      expect(categorize('德勤')).toBe('咨询')
      expect(categorize('PwC')).toBe('咨询')
      expect(categorize('普华永道')).toBe('咨询')
      expect(categorize('KPMG')).toBe('咨询')
      expect(categorize('毕马威')).toBe('咨询')
      expect(categorize('EY')).toBe('咨询')
      expect(categorize('安永')).toBe('咨询')
    })

    it('Accenture / EY', () => {
      expect(categorize('Accenture')).toBe('咨询')
      expect(categorize('埃森哲')).toBe('咨询')
      expect(categorize('Ernst & Young')).toBe('咨询')
      expect(categorize('安永会计师事务所')).toBe('咨询')
    })
  })

  // ── 金融/数据 ─────────────────────────────────────────────────
  describe('金融/数据', () => {
    it('数据终端', () => {
      expect(categorize('Bloomberg')).toBe('金融/数据')
      expect(categorize('彭博')).toBe('金融/数据')
      expect(categorize('Wind万得')).toBe('金融/数据')
    })

    it('投行', () => {
      expect(categorize('Goldman Sachs')).toBe('金融/数据')
      expect(categorize('高盛')).toBe('金融/数据')
      expect(categorize('Morgan Stanley')).toBe('金融/数据')
    })

    it('国内证券', () => {
      expect(categorize('中金公司')).toBe('金融/数据')
      expect(categorize('中信证券')).toBe('金融/数据')
      expect(categorize('华泰证券')).toBe('金融/数据')
    })
  })

  // ── 边界用例 ──────────────────────────────────────────────────
  describe('边界用例', () => {
    it('完全未知公司 → 其他', () => {
      expect(categorize('未知公司XYZ')).toBe('其他')
      expect(categorize('abc')).toBe('其他')
      expect(categorize('某某科技有限公司')).toBe('其他')
    })

    it('空字符串 → 其他', () => {
      expect(categorize('')).toBe('其他')
    })

    it('仅空格 → 其他', () => {
      expect(categorize('   ')).toBe('其他')
    })

    it('包含特殊字符', () => {
      expect(categorize('德州仪器（中国）有限公司')).toBe('半导体/芯片')
      expect(categorize('Boston Consulting Group')).toBe('咨询')
    })

    it('数字开头公司名', () => {
      expect(categorize('3M公司')).toBe('其他')
    })

    it('混合语言', () => {
      expect(categorize('TI德州仪器')).toBe('半导体/芯片')
      expect(categorize('Infineon英飞凌')).toBe('半导体/芯片')
    })

    it('规则优先级：靠前的规则先匹配', () => {
      // 半导体关键词在列表最前 → 应归半导体
      expect(categorize('华为数字能源半导体部门')).toBe('能源科技')
      // 能源关键词在半导体后 → 先命中能源（华为数字能源）
    })
  })

})
