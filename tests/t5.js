const {load, t, XLSX, ROOT, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T5] save/restore round trip, handoff, regression');
const w = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); const doc = w.document;
const req = w.parseQuotationRequestExcel(XLSX.readFile(ROOT+'Quotation Request Form.xlsx'));
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req)); w.checkIncomingRequestHandoff();
doc.getElementById('cov-reviewed').checked = true; doc.getElementById('cov-reviewed').dispatchEvent(new w.Event('change'));
const m = doc.getElementById('ext-meeting'); m.value='週1回'; m.dispatchEvent(new w.Event('input'));
const st = JSON.parse(JSON.stringify(w.collectState()));
// fresh page, restore
const w2 = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); const d2 = w2.document;
w2.restoreState(st);
t('restore: ext-docs value', d2.getElementById('ext-docs').value.includes('基本設計書'), d2.getElementById('ext-docs').value);
t('restore: ext-meeting keeps manual edit', d2.getElementById('ext-meeting').value==='週1回');
t('restore: meeting badge Manual', /手入力/.test(d2.getElementById('ext-meeting').closest('.info-row').querySelector('.src-badge').textContent));
t('restore: docs badge Auto', /依頼シート/.test(d2.getElementById('ext-docs').closest('.info-row').querySelector('.src-badge').textContent));
t('restore: reviewed flag', d2.getElementById('cov-reviewed').checked===true && d2.getElementById('cov-warn').textContent==='');
t('restore: coverage table', d2.querySelectorAll('#cov-body tr').length>=10);
t('restore: checklist src=auto kept', w2.eval('CHECKLIST_DATA').some(s=>s.items.some(i=>i.src==='auto')));
// handoff to slink
let href=null; w.handoffToSlink = w.handoffToSlink; 
const loc = Object.getOwnPropertyDescriptor(w, 'location');
try { w.handoffToSlink(); } catch(e) {}
const payload = JSON.parse(w.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'));
t('handoff payload has toolState.checklist', Array.isArray(payload.toolState.checklist) && payload.toolState.fieldSrc);
const sl = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify(payload), STORAGE_QUOTATION_TOOL_STATE: JSON.stringify(payload.toolState)});
await new Promise(r=>setTimeout(r,300));
const sp = sl.eval('specDocData');
t('slink: prerequisites reflect request meeting (週)', /週/.test(sp.prerequisites));
t('slink: outOfScope has request exclusions', /ネットワーク関連作業/.test(sp.outOfScope) && /性能テスト/.test(sp.outOfScope));
t('slink: scope has 提出ドキュメント 詳細設計書', /詳細設計書/.test(sp.scope));
t('slink editor renders (payment importer present)', !!sl.document.querySelector('#appx-editor-container input[type=file]'));
// 2-year & 3-year blank CPS: no payment rows -> friendly error
for (const f of ['（2年_26-27）CostPlanSheetINF2026v1.1.xlsm','（3年_26-28）CostPlanSheetINF2026v1.1.xlsm']) {
  const wb = XLSX.read(fs.readFileSync(ROOT+f), {type:'buffer', cellDates:true});
  const r = sl.parseCpsPaymentPlan(wb);
  t('blank CPS '+f.slice(0,6)+': parses, 0 payment rows', Array.isArray(r.rows) && r.rows.length===0, r.rows);
}
// request-form unaffected: loads w/o JS errors
const errs=[]; const rf = load('request-form.html'); rf.addEventListener('error', e=>errs.push(e.message)); await new Promise(r=>setTimeout(r,300));
t('request-form loads', !!rf.document.getElementById('f-detail') && errs.length===0, errs);
summary();
})();
