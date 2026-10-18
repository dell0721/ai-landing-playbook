# ai-friendly-check

检查一个网页对 **AI 搜索引擎**（DeepSeek、豆包、元宝、ChatGPT 等）的友好度。

8 项指标，40 分制，一行命令出报告。

> 由 [落地派](https://www.geofde.cn) 维护 · 企业搞 AI，就找落地派

## 快速开始

```bash
npx ai-friendly-check https://example.com
```

输出示例：

```
AI 友好度检测  https://example.com

  ████████████████░░░░  32/40  良好

  ✓ 页面标题   长度 24 字：企业官网建设与 AI 搜索优化
  ✓ 页面描述   长度 86 字
  ✓ H1 结构    检测到 1 个 H1
  ✓ 结构化数据 检测到 JSON-LD
  ✗ 问答结构   未检测到问答内容
  ✓ 语义化标签 检测到：main, nav, header
  ✓ 正文信息量 正文约 1200 字
  ✗ 可索引性   可索引，但缺少 canonical

  先改这两项
  1. 问答结构：把客户最常问的 5–10 个问题做成「问题 + 简明回答」，并加 FAQPage 标记。
  2. 可索引性：移除 noindex，并声明 canonical 指向规范地址，避免同一内容多个 URL 分散权重。

  完整 40 分自测（含改进清单）：https://www.geofde.cn/tools
```

## 8 项指标

| # | 指标 | 检查内容 | 分值 |
| --- | --- | --- | --- |
| 1 | 页面标题 | `<title>` 长度 8–60 字 | 5 |
| 2 | 页面描述 | `meta description` 长度 40–160 字 | 5 |
| 3 | H1 结构 | 恰好一个 `<h1>` | 5 |
| 4 | 结构化数据 | 存在 JSON-LD | 5 |
| 5 | 问答结构 | FAQPage 标记或问答式标题 | 5 |
| 6 | 语义化标签 | main/article/nav/header 等 ≥ 2 种 | 5 |
| 7 | 正文信息量 | 有效正文 ≥ 500 字 | 5 |
| 8 | 可索引性 | 无 noindex 且声明 canonical | 5 |

## 作为库使用

```js
const { audit } = require('ai-friendly-check');

const result = audit('<html>...</html>', 'https://example.com');
console.log(result.score);      // 0–40
console.log(result.grade);      // 优秀 / 良好 / 及格 / 待改进
console.log(result.checks);     // 每项检测详情
console.log(result.suggestions);// 优先改进建议（最多 2 条）
```

也支持 CLI 输出 JSON，便于接入 CI 或批量检测：

```bash
npx ai-friendly-check https://example.com --json
```

## 为什么做这个

客户已经开始在 AI 里找供应商了。如果 AI 回答「XX 找哪家好」时从没提到你，生意就在悄悄流走。

让 AI 愿意推荐你，第一步是让它**读得懂你的网站**：有结构、有出处、有明确的问答。`ai-friendly-check` 把这套检查做成了一行命令。

想系统做这件事（内容建设、实体标注、按月效果对比），可以看看落地派的做法：
**[https://www.geofde.cn](https://www.geofde.cn)** · 免费自测：[https://www.geofde.cn/tools](https://www.geofde.cn/tools)

## License

[MIT](LICENSE) © 2026 落地派
