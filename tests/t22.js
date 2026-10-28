const {t, ROOT, summary} = require('./harness');
const fs = require('fs');
const path = require('path');
const rd = p => fs.readFileSync(ROOT + p, 'utf8');
console.log('[T22] docs / version consistency (v2.5.14)');

// --- version strings agree: CHANGELOG top entry == quotation-generator (4 places) == index badge ---
const cl = rd('CHANGELOG.md');
const top = (cl.match(/^## (v\d+\.\d+\.\d+)\b/m) || [])[1];
t('CHANGELOG.md has a newest entry', !!top);
const qg = rd('quotation-generator.html');
t('APP_VERSION == CHANGELOG top (' + top + ')', (qg.match(/const APP_VERSION = '(v[\d.]+)'/) || [])[1] === top);
t('ver-badge == CHANGELOG top', (qg.match(/id="ver-badge">(v[\d.]+)</) || [])[1] === top);
t('Release Version row == CHANGELOG top', (qg.match(/Release Version<\/td><td[^>]*><strong>(v[\d.]+)/) || [])[1] === top);
t('change-history table first row == CHANGELOG top', (qg.match(/<tbody>\s*<tr>\s*<td><strong>(v[\d.]+)<\/strong>/) || [])[1] === top);
t('index.html badge == CHANGELOG top', (rd('index.html').match(/<span class="badge">(v[\d.]+)<\/span>/) || [])[1] === top);

// --- CHANGELOG: versions are unique and strictly descending ---
const vers = [...cl.matchAll(/^## v(\d+)\.(\d+)\.(\d+)\b/gm)].map(m => [+m[1], +m[2], +m[3]]);
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
t('CHANGELOG versions strictly descending (no duplicates)', vers.length > 10 && vers.every((v, i) => i === 0 || cmp(vers[i - 1], v) > 0));

// --- every local link in README / CHANGELOG / MAINTENANCE resolves ---
for (const [doc, base] of [['README.md', ''], ['CHANGELOG.md', ''], ['docs/MAINTENANCE.md', 'docs/']]) {
  const s = rd(doc);
  const links = [...s.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map(m => m[1]).filter(l => !/^[a-z]+:/i.test(l));
  const missing = links.filter(l => !fs.existsSync(path.join(ROOT, base, l)));
  t(doc + ': local links resolve (' + links.length + ')', missing.length === 0 && links.length > 0);
  if (missing.length) console.log('   missing: ' + missing.join(', '));
}

// --- the pointers inside the code reference files that exist ---
t('admin-password comment points to docs/MAINTENANCE.md', qg.includes('docs/MAINTENANCE.md「管理者パスワード」') && fs.existsSync(ROOT + 'docs/MAINTENANCE.md'));
t('MAINTENANCE.md has the 管理者パスワード heading', /^### 管理者パスワード/m.test(rd('docs/MAINTENANCE.md')));
t('no stale reference to removed docs (PROJECT_CONTEXT / public WORK_LOG link)',
  !/PROJECT_CONTEXT/.test(qg + rd('index.html') + rd('README.md') + rd('docs/MAINTENANCE.md')) &&
  !/blob\/main\/WORK_LOG\.md/.test(rd('index.html')));
t('GH_WORKLOG_URL still targets the private work repo WORK_LOG.md', /GH_WORKLOG_URL = `[^`]*\/edit\/main\/WORK_LOG\.md`/.test(qg));

// --- docs never contain the admin password or tokens ---
const all = [cl, rd('README.md'), rd('docs/MAINTENANCE.md'), rd('tests/README.md')].join('\n');
t('docs contain no GitHub token', !/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(all));

// --- tests/README lists every suite file ---
const readme = rd('tests/README.md');
const files = fs.readdirSync(ROOT + 'tests').filter(f => /^t\d+\.js$/.test(f)).map(f => +f.slice(1, -3));
const rows = new Set();
for (const m of readme.matchAll(/^\|\s*t(\d+)(?:\s*[–-]\s*t?(\d+))?\s*\|/gm)) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) rows.add(i);
const covered = n => rows.has(n);
t('tests/README.md mentions every suite (t1–t' + Math.max(...files) + ')', files.every(covered));
t('tools/check.sh exists and is executable', fs.existsSync(ROOT + 'tools/check.sh') && (fs.statSync(ROOT + 'tools/check.sh').mode & 0o111) !== 0);
t('tools/apply_cps.py exists', fs.existsSync(ROOT + 'tools/apply_cps.py'));
summary();
