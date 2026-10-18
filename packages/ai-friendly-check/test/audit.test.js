'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { audit, MAX_SCORE } = require('../index');

const GOOD = `<!doctype html>
<html lang="zh-CN">
<head>
  <title>企业 AI 落地实战手册与交付指南</title>
  <meta name="description" content="面向企业负责人的 AI 落地实战手册：找场景、拆需求、选方案、做交付，附可复用模板与验收标准。">
  <link rel="canonical" href="https://example.com/playbook">
  <script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"AI 落地先做什么？"}]}</script>
</head>
<body>
  <header>导航</header>
  <main>
    <h1>企业 AI 落地实战手册</h1>
    <article>
      <h2>先找场景还是先买工具？</h2>
      <p>${'这是一段用于测试正文长度的示例内容。'.repeat(40)}</p>
    </article>
  </main>
  <footer>版权</footer>
</body>
</html>`;

const BAD = `<!doctype html><html><head><title>首页</title><meta name="robots" content="noindex"></head><body><div>欢迎</div></body></html>`;

test('完整的页面拿到高分', () => {
  const r = audit(GOOD, 'https://example.com');
  assert.strictEqual(r.maxScore, MAX_SCORE);
  assert.ok(r.score >= 35, `expected >= 35, got ${r.score}`);
  assert.ok(['优秀', '良好'].includes(r.grade));
  assert.strictEqual(r.suggestions.length <= 2, true);
});

test('简陋页面拿到低分', () => {
  const r = audit(BAD, 'https://example.com');
  assert.ok(r.score <= 10, `expected <= 10, got ${r.score}`);
  assert.strictEqual(r.grade, '待改进');
  assert.ok(r.suggestions.length >= 1);
});

test('缺失 title 不报错', () => {
  const r = audit('<html><body>hi</body></html>');
  assert.strictEqual(r.checks.find((c) => c.id === 'title').passed, false);
  assert.strictEqual(typeof r.score, 'number');
});

test('属性顺序颠倒也能识别 meta description', () => {
  const r = audit('<meta content="' + 'a'.repeat(50) + '" name="description"><title>这是一个足够长的页面标题示例</title>');
  assert.strictEqual(r.checks.find((c) => c.id === 'description').passed, true);
});

test('noindex 判定为不可索引', () => {
  const r = audit('<meta name="robots" content="noindex"><link rel="canonical" href="https://x.com">');
  assert.strictEqual(r.checks.find((c) => c.id === 'indexable').passed, false);
});
