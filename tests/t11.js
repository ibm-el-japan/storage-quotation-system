const {load, t, XLSX, ROOT, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T11] Labor rate table (B8 baseline, by service start year)');
const EXP = {
  2026: {B6:12400,B7:15500,B8:17600,B9:20000,B10:22900},
  2027: {B6:12600,B7:15800,B8:17900,B9:20400,B10:23300},
  2028: {B6:12800,B7:16100,B8:18200,B9:20800,B10:23700},
  2029: {B6:13000,B7:16400,B8:18500,B9:21200,B10:24100}
};
const mk = async () => { const w = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); return w; };
const w = await mk(); const d = w.document;
const rate = () => d.getElementById('labor-rate').value;
const setYear = y => { const e = d.getElementById('start-year'); e.value = y; e.dispatchEvent(new w.Event('input')); };

// A. table + presets
t('A1 LABOR_RATES equals the supplied table', JSON.stringify(w.eval('LABOR_RATES')) === JSON.stringify(EXP), w.eval('LABOR_RATES'));
const opts = [...d.querySelectorAll('#labor-rate-preset option')].filter(o => o.value);
t('A2 20 preset options (4 years x 5 bands)', opts.length === 20, opts.length);
t('A3 every preset label/value matches the table', Object.keys(EXP).every(y => Object.keys(EXP[y]).every(b => opts.some(o => o.textContent.startsWith(y + ' ' + b) && +o.value === EXP[y][b]))));
t('A4 B8 marked as baseline', opts.filter(o => /基準/.test(o.textContent)).length === 4 && opts.filter(o => /基準/.test(o.textContent)).every(o => /B8/.test(o.textContent)));
t('A5 old 2025 / wrong values gone', !opts.some(o => /2025/.test(o.textContent)) && !opts.some(o => ['17900','12600'].includes(o.value) && /2026/.test(o.textContent)));

// B. default follows start-year B8
t('B1 default (2026) = B8 17,600', rate() === '17600', rate());
for (const y of [2027, 2028, 2029]) { setYear(y); t('B' + (y-2025) + ' start-year ' + y + ' => B8 ' + EXP[y].B8, rate() === String(EXP[y].B8), rate()); }
setYear(2031); t('B5 beyond table (2031) => nearest year (2029) B8', rate() === '18500' && /範囲外/.test(d.getElementById('labor-rate-hint').textContent), d.getElementById('labor-rate-hint').textContent);
setYear(2024); t('B6 before table (2024) => 2026 B8', rate() === '17600');
setYear(2026);
t('B7 source badge = system (blue)', /input-src-tool/.test(d.getElementById('labor-rate').className));

// C. manual choice wins
const sel = d.getElementById('labor-rate-preset'); sel.value = '20400'; sel.dispatchEvent(new w.Event('change'));
t('C1 preset B9 2027 applied', rate() === '20400');
t('C2 marked manual', /input-src-manual/.test(d.getElementById('labor-rate').className));
setYear(2028); t('C3 year change does not overwrite manual choice', rate() === '20400', rate());
t('C4 hint tells B8 of the year', /18,200/.test(d.getElementById('labor-rate-hint').textContent), d.getElementById('labor-rate-hint').textContent);
const lr = d.getElementById('labor-rate'); lr.value = '19000'; lr.dispatchEvent(new w.Event('input'));
t('C5 typed value kept', rate() === '19000');

// D. estimate uses the rate (B8 17,900 for 2027 x 10h)
const w2 = await mk(); const d2 = w2.document;
const y2 = d2.getElementById('start-year'); y2.value = 2027; y2.dispatchEvent(new w2.Event('input'));
w2.eval("kosuData[Object.keys(kosuData)[0]].values[0] = 10"); w2.recalcAll();
const labor = parseInt(d2.getElementById('sum-labor').textContent.replace(/[^\d]/g, ''), 10);
t('D1 Labor cost = hours x 2027 B8', labor === 10 * 17900, labor);

// E. save / restore
const st = JSON.parse(JSON.stringify(w2.collectState()));
t('E1 state stores rate + source', st.basic.laborRate == 17900 && st.fieldSrc['labor-rate'] === 'tool', [st.basic.laborRate, st.fieldSrc['labor-rate']]);
const w3 = await mk(); w3.restoreState(st);
t('E2 restore keeps rate', w3.document.getElementById('labor-rate').value === '17900');
const stM = JSON.parse(JSON.stringify(st)); stM.basic.laborRate = '20400'; stM.fieldSrc['labor-rate'] = 'manual';
const w4 = await mk(); w4.restoreState(stM); w4.recalcAll();
t('E3 restored manual rate is not reset', w4.document.getElementById('labor-rate').value === '20400');
// legacy save (no source info): equal to year B8 -> follows year; different -> manual
const stOld = JSON.parse(JSON.stringify(st)); delete stOld.fieldSrc['labor-rate']; stOld.basic.laborRate = '17400'; stOld.basic.startYear = '2026';
const w5 = await mk(); w5.restoreState(stOld); w5.recalcAll();
t('E4 legacy save with custom rate stays as saved', w5.document.getElementById('labor-rate').value === '17400', w5.document.getElementById('labor-rate').value);
const stOld2 = JSON.parse(JSON.stringify(st)); delete stOld2.fieldSrc['labor-rate']; stOld2.basic.laborRate = '17600'; stOld2.basic.startYear = '2026';
const w6 = await mk(); w6.restoreState(stOld2); const y6 = w6.document.getElementById('start-year'); y6.value = 2028; y6.dispatchEvent(new w6.Event('input'));
t('E5 legacy save equal to B8 follows the year afterwards', w6.document.getElementById('labor-rate').value === '18200', w6.document.getElementById('labor-rate').value);

// F. request sheet import (template starts 2027-01-01) => 2027 B8
const w7 = await mk();
const req = w7.parseQuotationRequestExcel(XLSX.read(fs.readFileSync(ROOT + 'work/見積もり依頼記入シート_テンプレート.xlsx'), {type:'buffer', cellStyles:true, bookFiles:true}));
w7.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req)); w7.checkIncomingRequestHandoff();
t('F1 import with 2027 start => 17,900', w7.document.getElementById('labor-rate').value === '17900', w7.document.getElementById('labor-rate').value);

// G. handoff to S-LINK carries the rate
try { w7.handoffToSlink(); } catch (e) {}
const p = JSON.parse(w7.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'));
t('G1 handoff payload laborRate = 17900', String(p.laborRate) === '17900', p.laborRate);

// H. S-LINK standalone path (request data only) uses the start-year B8
for (const [sd, exp] of [['2026-04-01', 17600], ['2027-01-01', 17900], ['2029-06-01', 18500]]) {
  const sl = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify({customerName:'X', projectName:'Y', startDate: sd, endDate: sd.slice(0,4) + '-12-25'})});
  await new Promise(r=>setTimeout(r,300));
  t('H ' + sd + ' => laborRate ' + exp, +sl.eval('stateData.basic.laborRate') === exp, sl.eval('stateData.basic.laborRate'));
}
summary();
})();
