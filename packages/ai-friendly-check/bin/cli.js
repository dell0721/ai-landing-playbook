#!/usr/bin/env node
'use strict';

const { audit } = require('../index');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function help() {
  console.log(`
${C.bold}ai-friendly-check${C.reset} — 检查网页对 AI 搜索引擎的友好度

${C.bold}用法${C.reset}
  npx ai-friendly-check <url>            检查一个网页
  npx ai-friendly-check <url> --json     输出 JSON（便于接入自动化）
  npx ai-friendly-check <url> --no-color 关闭颜色

${C.bold}示例${C.reset}
  npx ai-friendly-check https://www.geofde.cn

${C.dim}8 项指标，40 分制 · 官网 https://www.geofde.cn/tools${C.reset}
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    help();
    return;
  }

  const json = args.includes('--json');
  const noColor = args.includes('--no-color') || !process.stdout.isTTY;
  const color = (code, text) => (noColor ? text : `${code}${text}${C.reset}`);

  const url = args.find((a) => !a.startsWith('-'));
  if (!url) {
    console.error('缺少网址参数。运行 npx ai-friendly-check --help 查看用法。');
    process.exitCode = 1;
    return;
  }

  let parsed;
  try {
    parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('only http/https');
  } catch {
    console.error(`网址格式不对：${url}（需要以 http:// 或 https:// 开头）`);
    process.exitCode = 1;
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  let res;
  try {
    res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'ai-friendly-check/1.0 (+https://www.geofde.cn)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch (err) {
    clearTimeout(timer);
    console.error(`抓取失败：${err.name === 'AbortError' ? '请求超时（20 秒）' : err.message}`);
    process.exitCode = 1;
    return;
  }
  clearTimeout(timer);

  if (!res.ok) {
    console.error(`抓取失败：HTTP ${res.status} ${res.statusText}`);
    process.exitCode = 1;
    return;
  }

  const html = await res.text();
  const result = audit(html, res.url || parsed.toString());

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const barLen = 20;
  const filled = Math.round((result.score / result.maxScore) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  const scoreColor = result.score >= 28 ? C.green : result.score >= 20 ? C.yellow : C.red;

  console.log('');
  console.log(`${C.bold}AI 友好度检测${C.reset}  ${C.dim}${result.url}${C.reset}`);
  console.log('');
  console.log(`  ${color(scoreColor, bar)}  ${color(scoreColor, `${result.score}/${result.maxScore}`)}  ${result.grade}`);
  console.log('');
  for (const c of result.checks) {
    const mark = c.passed ? color(C.green, '✓') : color(C.red, '✗');
    console.log(`  ${mark} ${c.name.padEnd(8, ' ')} ${C.dim}${c.detail}${C.reset}`);
  }
  if (result.suggestions.length) {
    console.log('');
    console.log(`  ${C.bold}先改这两项${C.reset}`);
    result.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}：${s.advice}`);
    });
  }
  console.log('');
  console.log(`${C.dim}  完整 40 分自测（含改进清单）：https://www.geofde.cn/tools${C.reset}`);
  console.log('');
}

main();
