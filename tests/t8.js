const {load, t, XLSX, ROOT, summary} = require('./harness');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T8] CPS入力 (cps-input.html)');
const q = load('quotation-generator.html'); await wait(300);
const req = q.parseQuotationRequestExcel(XLSX.readFile(ROOT + 'Quotation Request Form.xlsx'));
req.startDate = '2026-11-01'; req.endDate = '2027-03-31';
q.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req));
q.checkIncomingRequestHandoff(); await wait(100);
q.eval("kosuData['des1'].values[0]=40; kosuData['bld2'].values[1]=32; kosuData['bld2'].values[4]=8; travelRows[0].unit=30000; travelRows[0].cnt=2;");
q.recalcAll();
const h = q.buildCpsHandoff();
const w = load('cps-input.html', {STORAGE_QUOTATION_CPS_INPUT: JSON.stringify(h)}); await wait(400);
const S = () => w.eval('S');
t('handoff loaded: period/GP/price', S().basic.start === '2026-11-01' && S().basic.end === '2027-03-31' && S().price === h.price && S().basic.fromEstimate, S().basic);
t('Contingency 10% → closest Risk Level 4 (9%)... check', [4,5].includes(+S().basic.risk), S().basic.risk);
t('TEL内 row from estimate (Tool badge)', S().telIn.length === 1 && S().telIn[0].src === 'tool' && S().telIn[0].hours.length === 5, S().telIn[0]);
t('Band 8 hourly = 18,600 (TPS2026v1)', S().telIn[0].hourly === 18600);
t('Other cost row carried (Tool)', S().other.length === 1 && S().other[0].amounts.reduce((a,b)=>a+b,0) === 60000);
t('months() = 5 across 2 years', w.eval('months().length') === 5 && new Set(w.eval('months()').map(m=>m.y)).size === 2);
// numbers: hours (168,32,0,0,8)@18600; 2026 months Nov,Dec (factor1), 2027 months (factor 1.03)
const f = 1.03;
const expTel = 18600*(h.monthlyHours[0]+h.monthlyHours[1]) + 18600*f*(h.monthlyHours[2]+h.monthlyHours[3]+h.monthlyHours[4]);
const tot = w.eval('totals()');
t('TEL内コスト = Σ rate×h×inflation (2027 ×1.03)', Math.abs(tot.telIn - expTel) < 1, [tot.telIn, expTel]);
const expOther = h.otherCosts[0].amounts[0]+h.otherCosts[0].amounts[1] + f*(h.otherCosts[0].amounts[2]+h.otherCosts[0].amounts[3]+h.otherCosts[0].amounts[4]);
t('Other Cost inflated for 2027', Math.abs(tot.other - expOther) < 1, [tot.other, expOther]);
t('コスト合計 = 社内+Other', Math.abs(tot.cost - (tot.telIn + tot.other)) < 1e-6);
const cr = w.eval('contRate()');
t('Contingency額 = コスト × 率', Math.abs(tot.cont - tot.cost * cr) < 1e-6 && cr > 0);
t('サービスGP% = 1 − コスト/提示額 (Cont含まない)', Math.abs(tot.gpPct - (1 - tot.cost / tot.price)) < 1e-9);
t('承認GP% = 1 − コスト(Cont含)/提示額', Math.abs(tot.apprGp - (1 - tot.costCont / tot.price)) < 1e-9 && tot.apprGp < tot.gpPct);
// risk table vs xlsm
const wb = XLSX.readFile(ROOT + 'CostPlanSheetTPS2026v1.xlsm'); const P = wb.Sheets['パラメーター'];
const risk = w.eval('RISK'); const bands = w.eval('BANDS');
t('RISK table == パラメーター G6:H14', risk.every(([lv, rate], i) => P['G' + (6 + i)].v === lv && Math.abs(P['H' + (6 + i)].v - rate) < 1e-9));
t('Band rates == パラメーター C5:C10', bands.every(([n, r], i) => P['B' + (5 + i)].v === n && P['C' + (5 + i)].v === r));
t('C_INF == パラメーター!C20', w.eval('C_INF') === P['C20'].v);
// payment plan default
const pay = S().payment.rows;
console.log('  payment:', JSON.stringify(pay));
t('default payment: 5 monthly rows, sum == price', pay.length === 5 && pay.reduce((a,r)=>a+r.amount,0) === S().price, pay);
t('billing = month end, due = +30d (Nov: 2026-11-30 → 2026-12-30)', pay[0].bill === '2026-11-30' && pay[0].due === '2026-12-30', pay[0]);
t('Feb non-leap: bill 2027-02-28 → due 2027-03-30', pay[3].bill === '2027-02-28' && pay[3].due === '2027-03-30', pay[3]);
t('payment not confirmed by default (R10)', S().payment.confirmed === false);
// "once" mode
w.eval("S.payment.mode='once'; genPayment();");
t('once-mode: single row = price at last month', S().payment.rows.length === 1 && S().payment.rows[0].amount === S().price && S().payment.rows[0].bill === '2027-03-31');
// manual edit un-confirms
w.eval("S.payment.mode='monthly'; genPayment(); S.payment.confirmed=true; go(8);"); 
w.setPayRow(0, 'amount', '1', true);
t('editing payment resets 営業確認 flag', S().payment.confirmed === false);
w.eval("genPayment()");
// JSON export
w.eval("S.payment.confirmed=true");
const j = w.buildJson();
t('JSON schema/template', j.schema === 'cps-input/1' && j.template === 'CostPlanSheetTPS2026v1');
t('JSON main fields', j.main.servicePeriod.start === '2026-11-01' && j.main.servicePrice === h.price && j.main.costInflation === 1.03 && j.main.inflationBaseYear === 2026);
t('JSON months & sections', j.months.length === 5 && j.sections.telIn[0].hours.length === 5 && j.sections.other[0].amounts.length === 5);
t('JSON paymentPlan flagged tool-default + confirmed', j.paymentPlan.source === 'tool-default' && j.paymentPlan.confirmedBySales === true && j.paymentPlan.rows.length === 5);
t('JSON totals match', Math.abs(j.totals.cost - tot.cost) < 0.01);
// round trip
const text = JSON.stringify(j);
w.eval("S = defaultState();");
const blob = {files: [new w.File([text], 'x.json')], value: ''};
await new Promise(res => { const rd = w.FileReader.prototype.readAsText; w.importJson(blob); setTimeout(res, 200); });
t('JSON round-trip restores rows & price', S().telIn.length === 1 && S().price === h.price && S().payment.rows.length === 5 && S().basic.end === '2027-03-31', S());
// UI render for each step
let ok = true; for (let i = 0; i <= 8; i++) { try { w.go(i); if (!w.document.getElementById('main').innerHTML) ok = false; } catch (e) { ok = false; console.log('  step', i, e.message); } }
t('all 9 steps render without error', ok);
t('sidebar shows 0-8 steps + progress', (w.document.getElementById('side').textContent.match(/進捗: \d\/8/) || []).length === 1 && w.document.querySelectorAll('.st').length === 9);
// no handoff -> manual
const w2 = load('cps-input.html'); await wait(300);
t('no handoff: page renders with guidance', /引継ぎデータがありません/.test(w2.document.getElementById('main').textContent));
summary();
})();
