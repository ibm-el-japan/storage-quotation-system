const {load, t, XLSX, ROOT, summary} = require('./harness');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const JSZip = require('jszip');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T20] CPS input -> filled CostPlanSheet .xlsm (v2.5.12)');
const T2 = ROOT + '（2年_26-27）CostPlanSheetINF2026v1.1.xlsm', T3 = ROOT + '（3年_26-28）CostPlanSheetINF2026v1.1.xlsm';
const have = fs.existsSync(T2) && fs.existsSync(T3);   // 雛形は非公開 (公開リポジトリには無い)
const w = load('cps-input.html'); await wait(300);
const html = w.eval('stepSummary()');
t('output step offers xlsm export + template picker + JSON', /exportXlsm\(\)/.test(html) && /pickTemplate\(this\)/.test(html) && /exportJson\(\)/.test(html) && /accept="\.xlsm"/.test(html));
t('page loads JSZip + version v2.5.12', /jszip/.test(fs.readFileSync(ROOT + 'cps-input.html', 'utf8')) && /v2\.5\.12/.test(w.eval('buildJson().generatedBy')));
t('no template chosen: info says 未選択', /未選択/.test(w.eval('tplInfo()')));
const fake = await new JSZip().file('xl/workbook.xml', '<workbook/>').generateAsync({type: 'base64'});
t('non-CPS file rejected', await w.eval(`(async()=>{try{const z=await JSZip.loadAsync('${fake}',{base64:true});await detectLayout(z);return false}catch(e){return /雛形/.test(e.message)}})()`) === true);
if (!have) { console.log('  SKIP template-based checks (CostPlanSheet .xlsm templates are local-only)'); summary(); return; }

function setup(w, start, end) {
  w.eval(`S.basic.customerName='テスト商事';S.basic.projectName='案件A & B';S.basic.oppNo='006gR0000099xyz';S.basic.start='${start}';S.basic.end='${end}';S.basic.gp=30;S.basic.risk=3;S.price=9876543;S.priceSrc='manual';`);
  w.eval(`KEYS.forEach(k=>S[k]=[]);
    const n=months().length, mk=(k,o)=>{const r=emptyRow(k);Object.assign(r,o);S[k].push(r);return r};
    mk('telIn',{name:'田中 (PM)',band:'Band 8',hourly:18600,hours:Array.from({length:n},(_,i)=>10+i)});
    mk('telIn',{name:'鈴木',band:'Band 6',hourly:13100,hours:Array.from({length:n},(_,i)=>5)});
    mk('telOut',{name:'IBM Consulting <A>',hourly:20000,hours:Array.from({length:n},(_,i)=>i%2?8:0)});
    mk('other',{name:'交通費',amounts:Array.from({length:n},(_,i)=>i===1?150000:0)});
    mk('sso',{name:'NI+C',monthly:900000,units:Array.from({length:n},(_,i)=>i%2?0.5:1)});
    mk('sub',{name:'エクサ',monthly:0,units:Array.from({length:n},()=>0.25)});
    mk('h2',{name:'ISC-J',band:'',hourly:15000,hours:Array.from({length:n},()=>4)});
    mk('h2o',{name:'ISE 経費',amounts:Array.from({length:n},()=>1000)});
    S.payment.confirmed=true; genPayment();`);
}
const cell = (wb, sh, a) => { const c = wb.Sheets[sh][a]; return c ? c.v : undefined; };
const rd = u8 => XLSX.read(Buffer.from(u8), {type: 'buffer', cellDates: false});
const dser = s => Math.round((Date.UTC(...s.split('-').map((v, i) => i === 1 ? v - 1 : +v)) - Date.UTC(1899, 11, 30)) / 86400000);

// ---------- 2年版: 2026-11 .. 2027-02 (年またぎ)
setup(w, '2026-11-01', '2027-02-28');
const buf2 = fs.readFileSync(T2);
const j = w.buildJson();
const R = await w.fillCps(j, buf2.buffer.slice(buf2.byteOffset, buf2.byteOffset + buf2.length));
t('2y: layout detected', R.layout === '2y');
const wb = rd(R.data);
t('main: customer / project (escaped &) / Opp No', cell(wb, 'メイン', 'C5') === 'テスト商事' && cell(wb, 'メイン', 'C6') === '案件A & B' && cell(wb, 'メイン', 'C7') === '006gR0000099xyz');
t('main: OO/PPTL/PJTL blank -> template XXX kept (R5/R6)', cell(wb, 'メイン', 'C8') === 'XXX' && cell(wb, 'メイン', 'C9') === 'XXX' && cell(wb, 'メイン', 'C10') === 'XXX');
t('main: period serials, GP, risk, price(O22)', cell(wb, 'メイン', 'C11') === dser('2026-11-01') && cell(wb, 'メイン', 'E11') === dser('2027-02-28') && Math.abs(cell(wb, 'メイン', 'C12') - 0.3) < 1e-9 && cell(wb, 'メイン', 'C13') === 3 && cell(wb, 'メイン', 'O22') === 9876543);
t('main: memo 3 lines written (C34:C36)', ['C34', 'C35', 'C36'].every(a => /【/.test(cell(wb, 'メイン', a) || '')) || (j.main.memo.length === 0));
const d1 = '見積詳細1年目', d2 = '見積詳細2年目';
t('TEL内: name/band label/hourly override', cell(wb, d1, 'B8') === '田中 (PM)' && cell(wb, d1, 'B9') === 'SLS-Bnd8' && cell(wb, d1, 'C9') === 18600 && cell(wb, d1, 'B11') === '鈴木' && cell(wb, d1, 'B12') === 'SLS-Bnd6' && cell(wb, d1, 'C12') === 13100);
t('TEL内: Nov/Dec 2026 -> 1年目 O/P; Jan/Feb 2027 -> 2年目 E/F', cell(wb, d1, 'O8') === 10 && cell(wb, d1, 'P8') === 11 && cell(wb, d2, 'E8') === 12 && cell(wb, d2, 'F8') === 13 && cell(wb, d1, 'E8') === 0);
t('year-2 sheet gets the same member names', cell(wb, d2, 'B8') === '田中 (PM)' && cell(wb, d2, 'C9') === 18600);
t('TEL外: name (escaped <>), hourly C42, hours', cell(wb, d1, 'B41') === 'IBM Consulting <A>' && cell(wb, d1, 'C42') === 20000 && cell(wb, d1, 'O41') === 0 && cell(wb, d1, 'P41') === 8 && cell(wb, d2, 'F41') === 8);
t('Other Cost: 2026 months as-is, 2027 months inflated x1.03', cell(wb, d1, 'B85') === '交通費' && cell(wb, d1, 'P85') === 150000 && cell(wb, d2, 'E85') === 0);
t('SSO: name B99, units row 99, Monthly C100, amount row 100 (inflation applied in 2027)', cell(wb, d1, 'B99') === 'NI+C' && cell(wb, d1, 'O99') === 1 && cell(wb, d1, 'C100') === 900000 && cell(wb, d1, 'O100') === 900000 && Math.abs(cell(wb, d2, 'E100') - 1 * 900000 * 1.03) < 0.01 && Math.abs(cell(wb, d2, 'F100') - 0.5 * 900000 * 1.03) < 0.01, [cell(wb, d2, 'E100'), cell(wb, d2, 'F100')]);
t('連結子会社: rows 123/124', cell(wb, d1, 'B123') === 'エクサ' && cell(wb, d1, 'O123') === 0.25 && cell(wb, d1, 'C124') === 0);
t('Harmony-2: name B147, hourly C148 (formula row untouched), hours row 147', cell(wb, d1, 'B147') === 'ISC-J' && cell(wb, d1, 'C148') === 15000 && cell(wb, d1, 'O147') === 4 && cell(wb, d2, 'F147') === 4);
t('H-2 Other Cost: B181, inflated 2027', cell(wb, d1, 'B181') === 'ISE 経費' && cell(wb, d1, 'P181') === 1000 && Math.abs(cell(wb, d2, 'E181') - 1030) < 0.01);
const pay = w.eval('S.payment.rows');
t('支払計画: due date + amount per row; 請求日 formula kept (due-30)', pay.length === 4 && cell(wb, '支払計画', 'D5') === dser(pay[0].due) && cell(wb, '支払計画', 'E5') === pay[0].amount && cell(wb, '支払計画', 'E8') === pay[3].amount && /<c r="C5"[^>]*><f t="shared" ref="C5:C69"/.test(await (await JSZip.loadAsync(R.data)).file('xl/worksheets/sheet7.xml').async('string')));
t('payment total equals price', pay.reduce((a, r) => a + r.amount, 0) === 9876543);

// ---------- 構造: マクロ・図形・数式を壊していない
const zi = await JSZip.loadAsync(buf2), zo = await JSZip.loadAsync(R.data);
const same = [], changed = [];
for (const n of Object.keys(zi.files)) { if (zi.files[n].dir) continue; if (!zo.file(n)) { changed.push('removed:' + n); continue; } const a = await zi.file(n).async('uint8array'), b = await zo.file(n).async('uint8array'); (Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0 ? same : changed).push(n); }
t('vbaProject.bin byte-identical', same.includes('xl/vbaProject.bin'));
t('drawings / ctrlProps / vml / styles / sharedStrings / parameter sheet byte-identical', same.filter(n => /drawings|ctrlProps|styles\.xml|sharedStrings|sheet6\.xml/.test(n)).length === Object.keys(zi.files).filter(n => /drawings|ctrlProps|styles\.xml|sharedStrings|sheet6\.xml/.test(n) && !zi.files[n].dir).length);
const allowed = ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet4.xml', 'xl/worksheets/sheet5.xml', 'xl/worksheets/sheet7.xml', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', '[Content_Types].xml', 'removed:xl/calcChain.xml'];
t('only the expected parts changed', changed.every(n => allowed.includes(n)), changed);
t('fullCalcOnLoad set + calcChain removed (parts, rels, content types)', /fullCalcOnLoad="1"/.test(await zo.file('xl/workbook.xml').async('string')) && !zo.file('xl/calcChain.xml') && !/calcChain/.test(await zo.file('xl/_rels/workbook.xml.rels').async('string')) && !/calcChain/.test(await zo.file('[Content_Types].xml').async('string')));
const cntF = async (z, p) => (((await z.file(p).async('string')).match(/<f[ >]/g)) || []).length;
// 数式の数を厳密に: 見積詳細は使った行のバンド参照のみ (TEL内2人 x 使用シート)
const bandLost = {}; for (const p of ['xl/worksheets/sheet4.xml', 'xl/worksheets/sheet5.xml']) bandLost[p] = (await cntF(zi, p)) - (await cntF(zo, p));
t('formula loss = number of TEL内 members written (2 per used sheet)', bandLost['xl/worksheets/sheet4.xml'] === 2 && bandLost['xl/worksheets/sheet5.xml'] === 2, bandLost);
// 入力セルが半端に書かれていない (E..P の使用月以外は0のまま)
t('unused months stay 0 (TEL内 row 8, 2026 Jan..Oct)', 'EFGHIJKLMN'.split('').every(c => cell(wb, d1, c + '8') === 0));

// ---------- 範囲外・上限
const wl = load('cps-input.html'); await wait(300);
setup(wl, '2026-11-01', '2028-02-28');
const jl = wl.buildJson(); let msg = '';
try { await wl.fillCps(jl, buf2.buffer.slice(buf2.byteOffset, buf2.byteOffset + buf2.length)); } catch (e) { msg = e.message; }
t('2y template: 3-calendar-year period refused before writing', /対応範囲/.test(msg), msg);


// ---------- 請求日が既定(支払期日-30日)と違う行: 共有数式を壊さない
const w5 = load('cps-input.html'); await wait(300);
setup(w5, '2026-04-01', '2026-06-30');
w5.eval("S.payment.rows[1].bill='2026-05-20'");   // due は据え置き -> 差が30日でなくなる
const R5 = await w5.fillCps(w5.buildJson(), buf2.buffer.slice(buf2.byteOffset, buf2.byteOffset + buf2.length));
const p7 = await (await JSZip.loadAsync(R5.data)).file('xl/worksheets/sheet7.xml').async('string');
const orphan = (p7.match(/<f t="shared" si="(\d+)"\/>/g) || []).filter(m => { const si = /si="(\d+)"/.exec(m)[1]; return !new RegExp('<f t="shared" ref="[^"]*" si="' + si + '">').test(p7); });
t('billing override: no orphaned shared-formula children', orphan.length === 0, orphan.slice(0, 3));
t('billing override: C6 holds the explicit date; other rows keep a per-row formula', /<c r="C6"[^>]*><v>\d+<\/v><\/c>/.test(p7) && /<c r="C5"[^>]*><f>[^<]*D5[^<]*<\/f>/.test(p7) && /<c r="C7"[^>]*><f>[^<]*D7[^<]*<\/f>/.test(p7) && !/D5\b[^<]*<\/f><v\/><\/c><c r="C7"/.test(p7));

// ---------- 3年版 (1年内)
const buf3 = fs.readFileSync(T3), a3 = buf3.buffer.slice(buf3.byteOffset, buf3.byteOffset + buf3.length);
const w3 = load('cps-input.html'); await wait(300);
setup(w3, '2026-04-01', '2026-09-30');
const R3 = await w3.fillCps(w3.buildJson(), a3);
const wb3 = rd(R3.data);
t('3y: layout detected + main price at O21', R3.layout === '3y' && cell(wb3, 'メイン', 'O21') === 9876543 && cell(wb3, 'メイン', 'C11') === dser('2026-04-01'));
t('3y: TEL内 on 見積詳細 (Apr..Sep -> H..M), SSO/H-2/Other present', cell(wb3, '見積詳細', 'B8') === '田中 (PM)' && cell(wb3, '見積詳細', 'H8') === 10 && cell(wb3, '見積詳細', 'M8') === 15 && cell(wb3, '見積詳細', 'B99') === 'NI+C' && cell(wb3, '見積詳細', 'B147') === 'ISC-J' && cell(wb3, '見積詳細', 'I85') === 150000);
const w3b = load('cps-input.html'); await wait(300);
setup(w3b, '2026-11-01', '2027-02-28'); let m3 = '';
try { await w3b.fillCps(w3b.buildJson(), a3); } catch (e) { m3 = e.message; }
t('3y template: year-crossing period refused with guidance', /年をまたぐ/.test(m3), m3);

// ---------- 既存 apply_cps.py と一致 (メイン / TEL内 / 支払計画)
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 't20-'));
const w4 = load('cps-input.html'); await wait(300);
setup(w4, '2026-01-01', '2026-06-30');
const j4 = w4.buildJson(); fs.writeFileSync(tmp + '/in.json', JSON.stringify(j4));
const tool = ROOT + 'cps-results/apply_cps.py', tool2 = ROOT + 'tools/apply_cps.py', py = fs.existsSync(tool) ? tool : (fs.existsSync(tool2) ? tool2 : null);
if (py) {
  cp.execFileSync('python3', [py, tmp + '/in.json', T2, tmp + '/py.xlsm', '2y'], {stdio: 'pipe'});
  const R4 = await w4.fillCps(j4, buf2.buffer.slice(buf2.byteOffset, buf2.byteOffset + buf2.length));
  const a = XLSX.readFile(tmp + '/py.xlsm'), b = rd(R4.data);
  const cmp = (sh, refs) => refs.filter(r => cell(a, sh, r) !== cell(b, sh, r)).map(r => [sh, r, cell(a, sh, r), cell(b, sh, r)]);
  const refs = ['C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'E11', 'C12', 'C13', 'O22', 'C34', 'C35', 'C36'];
  const tel = []; for (let i = 0; i < 10; i++) for (const c of ['B', 'C', ...'EFGHIJKLMNOP']) tel.push(c + (8 + 3 * i), c + (9 + 3 * i));
  const pr = []; for (let i = 0; i < 12; i++) pr.push('D' + (5 + i), 'E' + (5 + i));
  const diff = [...cmp('メイン', refs), ...cmp('見積詳細1年目', tel), ...cmp('支払計画', pr)];
  t('cells identical to tools/apply_cps.py (メイン + TEL内 + 支払計画)', diff.length === 0, diff.slice(0, 5));
} else console.log('  SKIP apply_cps.py cross-check (tool not present)');
summary();
})();
