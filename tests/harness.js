const {JSDOM} = require('jsdom');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');
const ROOT = path.resolve(__dirname, '..') + '/';
const TPL_BLACK = path.join(__dirname, 'tpl_black.xlsx');   // make_black_template.py で生成
function load(file, session) {
  let html = fs.readFileSync(ROOT + file, 'utf8').replace(/<script src="https?:[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, {url: 'http://localhost/' + file, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.XLSX = XLSX; w.alert = m => { w.__alerts = (w.__alerts || []).concat(m); };
      w.print = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      if (session) Object.entries(session).forEach(([k, v]) => w.sessionStorage.setItem(k, v));
    }});
  return dom.window;
}
let pass = 0, fail = 0;
function t(name, cond, extra) { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name, extra !== undefined ? '=> ' + JSON.stringify(extra) : ''); } }
module.exports = {load, t, XLSX, ROOT, TPL_BLACK, summary: () => { console.log(`\nRESULT pass=${pass} fail=${fail}`); process.exit(fail ? 1 : 0); }};
