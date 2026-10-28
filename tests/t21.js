const {load, t, XLSX, ROOT, summary} = require('./harness');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T21] shared request parser: common/request-parser.js is the only copy (v2.5.13)');
const PAGES = ['index.html', 'request-form.html', 'quotation-generator.html', 'slink-spec-generator.html'];
const common = fs.readFileSync(ROOT + 'common/request-parser.js', 'utf8');
t('common file defines readSheetColors / parseQuotationRequestExcel / inlineRequestParser', /function readSheetColors\(/.test(common) && /function parseQuotationRequestExcel\(/.test(common) && /function inlineRequestParser\(/.test(common));
for (const p of PAGES) {
  const h = fs.readFileSync(ROOT + p, 'utf8');
  t(p + ': loads common/request-parser.js after SheetJS', h.indexOf('xlsx.full.min.js') > -1 && h.indexOf('xlsx.full.min.js') < h.indexOf('<script src="common/request-parser.js"></script>'));
  t(p + ': no local copy of the parser or colour reader', !/function (parseQuotationRequestExcel|readSheetColors)\(/.test(h));
}
// 4ページとも同じ関数が使える (読込み順: common は各ページ本体より前)
const rows = [];
const dupFree = PAGES.every(p => fs.readFileSync(ROOT + p, 'utf8').split('\n').filter(l => /^function (parseQuotationRequestExcel|readSheetColors)\b/.test(l)).length === 0);
t('exactly one definition of each across the repo pages', dupFree);
const wb = XLSX.readFile(__dirname + '/duskin_like.xlsx', {cellStyles: true, bookFiles: true});
const out = {};
for (const p of PAGES) {
  const w = load(p); await wait(250);
  t(p + ': parser function available', typeof w.parseQuotationRequestExcel === 'function' && typeof w.readSheetColors === 'function');
  const r = w.parseQuotationRequestExcel(wb);
  out[p] = JSON.stringify(r);
}
const uniq = new Set(Object.values(out));
t('all 4 pages parse the same sheet to identical results', uniq.size === 1 && [...uniq][0].length > 2000, [...uniq].map(x => x.length));

// ---- 単体HTML保存: <script src=common> が自分自身のコードに置き換わり、保存物だけで動く
const w = load('quotation-generator.html'); await wait(250);
const saved = w.inlineRequestParser(fs.readFileSync(ROOT + 'quotation-generator.html', 'utf8'));
t('inlineRequestParser removes the external reference', !/<script src="common\/request-parser\.js"><\/script>/.test(saved));
t('inlined copy carries all 3 functions exactly once', ['readSheetColors', 'parseQuotationRequestExcel', 'inlineRequestParser'].every(n => (saved.match(new RegExp('function ' + n + '\\(', 'g')) || []).length === 1));
t('inlined script does not contain a stray </script>', (saved.match(/<\/script>/g) || []).length === (fs.readFileSync(ROOT + 'quotation-generator.html', 'utf8').match(/<\/script>/g) || []).length);
// 保存物を、common を読めない場所で開いても取込みが動く (ハーネスの common 読込みを使わず、保存HTMLそのものを実行)
const {JSDOM} = require('jsdom');
const dom = new JSDOM(saved.replace(/<script src="https?:[^>]*><\/script>/g, ''), {url: 'http://localhost/saved.html', runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(win) { win.XLSX = XLSX; win.alert = () => {}; win.print = () => {}; win.HTMLElement.prototype.scrollIntoView = () => {}; }});
await wait(350);
const win = dom.window;
t('saved standalone HTML parses the request sheet by itself', typeof win.parseQuotationRequestExcel === 'function' && JSON.stringify(win.parseQuotationRequestExcel(wb)) === [...uniq][0]);
// 保存物をもう一度保存しても壊れない (二重保存)
const saved2 = win.inlineRequestParser(saved);
t('re-saving a saved file keeps exactly one copy (idempotent)', (saved2.match(/function parseQuotationRequestExcel\(/g) || []).length === 1 && saved2 === saved);

// ---- request-form の「案件別HTMLを直接保存」も同様 (fetch は quotation-generator.html をそのまま返す)
const rf = load('request-form.html'); await wait(250);
t('request-form can inline the parser into the fetched tool HTML', !/<script src="common\/request-parser\.js"><\/script>/.test(rf.inlineRequestParser(fs.readFileSync(ROOT + 'quotation-generator.html', 'utf8'))));
const rfSrc = fs.readFileSync(ROOT + 'request-form.html', 'utf8');
t('downloadStandaloneToolHtml calls inlineRequestParser', /html = inlineRequestParser\(html\);/.test(rfSrc));
const qgSrc = fs.readFileSync(ROOT + 'quotation-generator.html', 'utf8');
t('all 3 quotation-generator save paths call inlineRequestParser', (qgSrc.match(/src = inlineRequestParser\(src\);/g) || []).length === 3);
// 削除前のコピー(バイト列)と共通ファイルの本体は同一 (リファクタで挙動を変えていない)
const git = require('child_process');
let before = null; try { before = git.execFileSync('git', ['show', 'HEAD:storage-quotation-system/quotation-generator.html'], {cwd: ROOT, maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore']}).toString(); } catch (e) {}
if (before && /function parseQuotationRequestExcel\(/.test(before)) {
  const a = before.indexOf('function readSheetColors'), b = before.indexOf('function parseQuotationRequestExcel'), e = before.indexOf('\n}\n', b) + 3;
  const old = before.slice(a, e).replace('(v2.5.2)', '(v2.5.3)');
  t('moved code is byte-identical to the previous in-page copy', common.includes(old));
} else console.log('  (skip byte comparison: previous commit unavailable or already refactored)');
summary();
})();
