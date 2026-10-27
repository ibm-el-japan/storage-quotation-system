const {load, t, summary} = require('./harness');
(async () => {
console.log('[T16] estimate logic parity with the 概算見積 Excel (v2.5.5): price formula, rounding, product profiles, PM ratio, cross-year rate difference');
const w = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300)); const doc = w.document;
const $ = id => doc.getElementById(id);

// ---- A. price formula / rounding parity (oracle = the Excel 作成 sheet formulas, re-implemented here)
const ROUND = {0: 0, 10000: -4, 50000: -5, 100000: -5, 500000: -6, 1000000: -6};   // not used directly; see excelRound
function excelRound(total, unit) {            // =ROUNDUP(total*k, d)/k  with the 丸め度 table of the Excel
  const tbl = {10000: [1, -4], 50000: [2, -5], 100000: [1, -5], 500000: [2, -6], 1000000: [1, -6]};
  if (!tbl[unit]) return Math.ceil(total);
  const [k, d] = tbl[unit];
  const f = Math.pow(10, -d);
  return Math.ceil(total * k / f) * f / k;
}
function excelTotal(h, rate, other, cont, gp, dou) {
  const labor = h * rate;
  const c = dou ? 0 : (labor + other) * cont;
  const g = dou ? 0 : (labor + other + c) / (1 - gp) - (labor + other + c);
  return labor + other + c + g;
}
const cases = [
  [1644, 17600, 5958000, 0.10, 0.36, false, 1000000],
  [458, 17600, 180000, 0.10, 0.36, false, 1000000],
  [229, 17600, 187900, 0.10, 0.36, false, 100000],
  [315, 17600, 174000, 0.10, 0.36, false, 100000],
  [1140, 17900, 900000, 0.30, 0.36, false, 1000000],
  [972, 17900, 320000, 0.10, 0.30, false, 500000],
  [160, 17900, 39900, 0.10, 0.36, false, 100000],
  [2606, 17900, 701000, 0.10, 0.36, false, 1000000],
  [800, 17900, 0, 0.10, 0.36, true, 100000]
];
let allOk = true; const diffs = [];
cases.forEach(([h, rate, other, cont, gp, dou, ru], i) => {
  $('start-year').value = 2026; $('start-month').value = 4; $('period-months').value = 12; w.rebuildKosuMonths();
  w.eval("Object.keys(kosuData).forEach(k => kosuData[k].values.fill(0))");
  w.eval("kosuData['oth1'].values[0] = " + h);
  $('labor-rate').value = rate; w.eval("setFieldSrc('labor-rate','manual')");
  $('contingency').value = cont; $('gp').value = gp; $('is-dou').value = dou ? 'true' : 'false';
  w.eval("travelRows.forEach(r => { r.unit = 0; r.cnt = 0; r.qty = 1 }); travelRows[0].unit = " + other + "; travelRows[0].cnt = 1;");
  $('rounding-unit').value = String(ru);
  w.recalcAll();
  const got = Number($('pd-rounded').textContent.replace(/[¥,]/g, ''));
  const exp = excelRound(excelTotal(h, rate, other, cont, gp, dou), ru);
  if (Math.abs(got - exp) > 0.5) { allOk = false; diffs.push([i, got, exp]); }
});
t('A1 recalcAll = Excel 作成 formulas for 9 representative cases (labor+other, contingency, GP, eDOU, rounding)', allOk, diffs);
t('A2 eDOU: contingency and GP are 0', (() => { $('is-dou').value = 'true'; w.recalcAll(); return /eDOU/.test($('pd-cont').textContent) && /eDOU/.test($('pd-gp').textContent); })());
$('is-dou').value = 'false';
t('A3 GP is applied as total/(1-GP), not total*(1+GP)', (() => {
  w.eval("Object.keys(kosuData).forEach(k => kosuData[k].values.fill(0)); kosuData['oth1'].values[0] = 100");
  $('labor-rate').value = 10000; $('contingency').value = 0; $('gp').value = 0.36; w.eval("travelRows.forEach(r => { r.unit = 0; r.cnt = 0 })"); $('rounding-unit').value = '0'; w.recalcAll();
  return Number($('pd-total').textContent.replace(/[¥,]/g, '')) === Math.round(1000000 / 0.64);
})());

// ---- B. product profiles
const P = w.eval('PRODUCT_PROFILES');
t('B1 seven product profiles defined', ['defender', 'isp', 'flash', 'scale', 'ceph', 'fusion', 'tape'].every(k => P[k] && P[k].des1 > 0 && P[k].bld2 > 0 && P[k].pm > 0), Object.keys(P));
const pick = a => { const r = w.pickProductProfile(a); return r && r.label; };
t('B2 Defender is not Protect', /Defender/.test(pick(['Storage Defender（Data Protect）'])), pick(['Storage Defender（Data Protect）']));
t('B3 Storage Protect alone -> ISP profile', /ISP/.test(pick(['Storage Protect'])), pick(['Storage Protect']));
t('B4 Ceph wins over Fusion (Fusion+Ceph combo)', /Ceph/.test(pick(['Storage Fusion', 'Storage Ceph'])), pick(['Storage Fusion', 'Storage Ceph']));
t('B5 Fusion HCI / Scale / Virtualize / Tape mapping', /Fusion/.test(pick(['IBM Fusion（HCI）'])) && /Scale/.test(pick(['Storage Scale System（製品名：SSS6000）'])) && /Virtualize/.test(pick(['Storage Virtualize系製品（製品名：FS7600）'])) && /テープ/.test(pick(['テープ製品（製品名：TS4300）'])));
t('B6 unknown product -> no profile (no guess)', pick(['SAN Switch']) === null && pick([]) === null);

// ---- C. handoff applies the profile and the PM ratio
async function handoff(products, extra) {
  const g = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
  const req = Object.assign({version: '2.5', products, origin: {products: 'sheet'}, cells: {products: ['C44']}}, extra || {});
  g.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req));
  g.checkIncomingRequestHandoff(); await new Promise(r => setTimeout(r, 300));
  return g;
}
const gd = await handoff(['Storage Defender（Data Protect）']);
const Kd = gd.eval('kosuData');
t('C1 Defender: design/build/test/doc/QA from profile', Kd.des1.values[0] === 58 && Kd.bld2.values[0] === 72 && Kd.tst3.values[0] === 24 && Kd.doc1.values[0] === 124 && Kd.qa1.values[0] === 20, [Kd.des1.values[0], Kd.bld2.values[0], Kd.tst3.values[0], Kd.doc1.values[0], Kd.qa1.values[0]]);
const baseD = 58 + 72 + 24 + 124 + 20;
t('C2 PM = ROUNDUP(other hours x 6%) (Excel uses ROUNDUP(SUM x 0.1) in many files)', Kd.pm1.values[0] === Math.ceil(baseD * 0.06), [Kd.pm1.values[0], Math.ceil(baseD * 0.06)]);
t('C3 profile hours and PM are system-decided (blue), with basis hint', ['des1', 'bld2', 'tst3', 'doc1', 'qa1', 'pm1'].every(k => Kd[k].src === 'tool') && /概算見積実績/.test(Kd.pm1.hint), Kd.pm1.hint);
t('C4 Defender does not add the ISP rows (des2/bld3)', !(Kd.des2.values[0] > 0) && !(Kd.bld3.values[0] > 0));
const gs = await handoff(['Storage Virtualize系製品（製品名：FS7600）', 'Storage Protect']);
const Ks = gs.eval('kosuData');
t('C5 Virtualize + Protect: flash profile + ISP add-on rows', Ks.des1.values[0] === 128 && Ks.bld2.values[0] === 88 && Ks.des2.values[0] === 16 && Ks.bld3.values[0] === 24, [Ks.des1.values[0], Ks.des2.values[0], Ks.bld3.values[0]]);
t('C6 hnd1 (handover) set for flash', Ks.hnd1.values[0] === 8, Ks.hnd1.values[0]);
const gx = await handoff(['SAN Switch']);
t('C7 no profile => no invented hours and no PM', !(gx.eval('kosuData').des1.values[0] > 0) && !(gx.eval('kosuData').pm1.values[0] > 0));
const gm = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
gm.eval("kosuData['pm1'].values[0] = 9; kosuData['pm1'].src = 'manual'");
gm.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify({version: '2.5', products: ['Storage Scale'], origin: {products: 'sheet'}, cells: {}}));
gm.checkIncomingRequestHandoff(); await new Promise(r => setTimeout(r, 300));
t('C8 entered PM hours are not overwritten', gm.eval("kosuData['pm1'].values[0]") === 9 && gm.eval("kosuData['pm1'].src") === 'manual');

// ---- D. cross-year rate difference
$('start-year').value = 2026; $('start-month').value = 9; $('period-months').value = 6; w.rebuildKosuMonths();
w.eval("Object.keys(kosuData).forEach(k => kosuData[k].values.fill(0)); for (let i = 0; i < 6; i++) kosuData['oth1'].values[i] = 100");
$('labor-rate').value = 17600; w.recalcAll();
const yd = w.yearDiffCalc();
t('D1 Sep start, 6 months => 2 months fall in 2027 (200h), delta = 17,900 - 17,600 = 300', yd.length === 1 && yd[0].year === 2027 && yd[0].hours === 200 && yd[0].unit === 300, yd);
t('D2 hint box shown with the estimate (¥60,000)', $('year-diff-box').style.display === 'block' && /60,000/.test($('year-diff-box').textContent), $('year-diff-box').textContent.slice(0, 120));
t('D3 hint does not change the price by itself (no auto-add)', w.eval("travelRows.every(r => !/単価差分/.test(r.type))"));
const before = Number($('pd-total').textContent.replace(/[¥,]/g, ''));
w.addYearDiffRows();
const after = Number($('pd-total').textContent.replace(/[¥,]/g, ''));
t('D4 adding the row puts 200 x 300 = ¥60,000 into その他費用', w.eval("travelRows.filter(r => /単価差分/.test(r.type)).reduce((a, r) => a + r.unit * r.qty * r.cnt, 0)") === 60000);
t('D5 total rises accordingly (GP/contingency apply to it, as in the Excel)', after > before, [before, after]);
t('D6 after adding, box says 追加済み and no second button', /追加済み/.test($('year-diff-box').textContent) && !/追加$/.test($('year-diff-box').textContent.trim()));
$('start-month').value = 1; $('period-months').value = 6; w.rebuildKosuMonths(); w.eval("for (let i = 0; i < 6; i++) kosuData['oth1'].values[i] = 100"); w.recalcAll();
t('D7 within one year => no box', $('year-diff-box').style.display === 'none');

summary();
process.exit(0);
})();
