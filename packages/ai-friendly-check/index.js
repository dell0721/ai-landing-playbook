'use strict';

/**
 * ai-friendly-check — 检查网页对 AI 搜索引擎（GEO）的友好度
 * 8 项指标，40 分制。
 *
 * 官网：https://www.geofde.cn/tools
 * 许可：MIT
 */

const MAX_SCORE = 40;

function parseAttrs(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(tag))) {
    attrs[m[1].toLowerCase()] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  }
  return attrs;
}

function findMeta(html, name) {
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const a = parseAttrs(m[0]);
    const key = (a.name || a.property || '').toLowerCase();
    if (key === name.toLowerCase()) return (a.content || '').trim();
  }
  return '';
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function textSize(text) {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + words;
}

/**
 * 审计一段 HTML。
 * @param {string} html 页面 HTML
 * @param {string} [url] 页面地址（可选，仅用于回显）
 * @returns {object} 审计结果
 */
function audit(html, url = '') {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const source = html;

  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
  const description = findMeta(source, 'description');
  const h1Count = (source.match(/<h1\b[^>]*>/gi) || []).length;
  const hasJsonLd = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>/i.test(source);
  const hasFaqSchema = /FAQPage|"@type"\s*:\s*"Question"/i.test(source);
  const hasFaqHeadings = /<h[23][^>]*>[^<]{0,80}[?？]\s*<\/h[23]>/i.test(source);
  const semanticTags = ['main', 'article', 'nav', 'header', 'footer'].filter((t) =>
    new RegExp(`<${t}\\b`, 'i').test(source)
  );
  const text = extractText(source);
  const size = textSize(text);
  const robots = findMeta(source, 'robots');
  const noindex = /noindex/i.test(robots);
  const hasCanonical = /<link\b[^>]*rel\s*=\s*["']canonical["']/i.test(source);

  const checks = [
    {
      id: 'title',
      name: '页面标题',
      points: 5,
      passed: title.length >= 8 && title.length <= 60,
      detail: title ? `长度 ${title.length} 字：${title.slice(0, 40)}${title.length > 40 ? '…' : ''}` : '未找到 <title>',
      advice: '标题控制在 8–60 字，写清「做什么 + 给谁 + 在哪」，避免纯关键词堆砌。',
    },
    {
      id: 'description',
      name: '页面描述',
      points: 5,
      passed: description.length >= 40 && description.length <= 160,
      detail: description ? `长度 ${description.length} 字` : '未找到 meta description',
      advice: '补一段 40–160 字的 meta description，用完整句子说清「你是谁、解决什么问题」。',
    },
    {
      id: 'h1',
      name: 'H1 结构',
      points: 5,
      passed: h1Count === 1,
      detail: `检测到 ${h1Count} 个 H1`,
      advice: '每页只保留一个 H1，用一句话概括页面主题，其余层级用 H2/H3。',
    },
    {
      id: 'jsonld',
      name: '结构化数据',
      points: 5,
      passed: hasJsonLd,
      detail: hasJsonLd ? '检测到 JSON-LD' : '未检测到 JSON-LD',
      advice: '用 JSON-LD 标注 Organization、Product、FAQPage 等实体，AI 更容易准确引用你。',
    },
    {
      id: 'faq',
      name: '问答结构',
      points: 5,
      passed: hasFaqSchema || hasFaqHeadings,
      detail: hasFaqSchema ? '检测到 FAQ 结构化标记' : hasFaqHeadings ? '检测到问答式标题' : '未检测到问答内容',
      advice: '把客户最常问的 5–10 个问题做成「问题 + 简明回答」，并加 FAQPage 标记。',
    },
    {
      id: 'semantic',
      name: '语义化标签',
      points: 5,
      passed: semanticTags.length >= 2,
      detail: semanticTags.length ? `检测到：${semanticTags.join(', ')}` : '未检测到语义化标签',
      advice: '用 main / article / nav / header 等标签划分页面结构，帮助 AI 判断内容主次。',
    },
    {
      id: 'content',
      name: '正文信息量',
      points: 5,
      passed: size >= 500,
      detail: `正文约 ${size} 字`,
      advice: '正文至少 500 字有效内容，围绕真实业务问题展开，而不是口号式短句。',
    },
    {
      id: 'indexable',
      name: '可索引性',
      points: 5,
      passed: !noindex && hasCanonical,
      detail: noindex ? '检测到 noindex' : hasCanonical ? '可索引，已声明 canonical' : '可索引，但缺少 canonical',
      advice: '移除 noindex，并声明 canonical 指向规范地址，避免同一内容多个 URL 分散权重。',
    },
  ];

  const score = checks.reduce((sum, c) => sum + (c.passed ? c.points : 0), 0);
  const failed = checks.filter((c) => !c.passed);
  const grade =
    score >= 36 ? '优秀' : score >= 28 ? '良好' : score >= 20 ? '及格' : '待改进';

  return {
    url,
    score,
    maxScore: MAX_SCORE,
    grade,
    checks,
    suggestions: failed.slice(0, 2).map((c) => ({ id: c.id, name: c.name, advice: c.advice })),
  };
}

module.exports = { audit, MAX_SCORE };
