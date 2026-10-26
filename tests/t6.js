const {load, t, XLSX, ROOT, summary} = require('./harness');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T6] 概算見積: slide-4 fields / service dates / CPS handoff');
const w = load('quotation-generator.html'); await wait(300);
const req = w.parseQuotationRequestExcel(XLSX.readFile(ROOT + 'Quotation Request Form.xlsx'));
req.startDate = '2026-11-15'; req.endDate = '2027-03-31'; req.otherMembers = 'SA 山田'; req.confidential = '有り'; req.confidentialNote = 'NDA済';
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req));
w.checkIncomingRequestHandoff(); await wait(100);
const v = id => w.document.getElementById(id).value;
t('label renamed サービス名', /サービス名/.test(w.document.querySelector('#project-name').closest('.info-row').querySelector('label').textContent));
t('start date keeps day (2026-11-15)', v('svc-start') === '2026-11-15', v('svc-start'));
t('end date 2027-03-31', v('svc-end') === '2027-03-31', v('svc-end'));
t('period months = 5', v('period-months') === '5', v('period-months'));
t('その他案件関係者名 imported', v('ext-others') === 'SA 山田', v('ext-others'));
t('契約形態/提供形態/月次報告 imported', !!v('ext-contract') && !!v('ext-deal') && v('ext-report') !== undefined);
t('機密情報取り扱い merged', /有り/.test(v('ext-conf')) && /NDA/.test(v('ext-conf')), v('ext-conf'));
t('除外条件 imported', /ネットワーク/.test(v('ext-excl')));
// edit dates
w.document.getElementById('svc-end').value = '2027-06-30'; w.applySvcDates();
t('end date edit → period 8 months', v('period-months') === '8', v('period-months'));
// change year -> sync
w.document.getElementById('period-months').value = '3'; w.rebuildKosuMonths();
t('period change → end date resynced (2027-01-31)', v('svc-end') === '2027-01-31', v('svc-end'));
// state round trip
const st = w.collectState();
t('state has startDate/endDate/otherMembers', st.basic.startDate === '2026-11-15' && st.basic.endDate === '2027-01-31' && st.basic.otherMembers === 'SA 山田', st.basic);
w.document.getElementById('ext-others').value = ''; w.restoreState(st);
t('restore round-trip others', v('ext-others') === 'SA 山田');
// CPS handoff
w.document.getElementById('period-months').value = '5'; w.rebuildKosuMonths();
w.eval("kosuData['des1'].values[0]=40; kosuData['bld2'].values[1]=32; kosuData['bld2'].values[4]=8; travelRows[0].unit=30000; travelRows[0].cnt=2; travelRows[0].qty=1;");
w.recalcAll();
const h = w.buildCpsHandoff();
console.log('  handoff:', JSON.stringify({s:h.start,e:h.end,gp:h.gp,c:h.contingency,p:h.price,hrs:h.monthlyHours,oc:h.otherCosts}));
t('handoff period', h.start === '2026-11-15' && h.end === '2027-03-31', [h.start, h.end]);
const sumAll = w.eval("(()=>{let g=0;const n=getMonthLabels().length;KOSU_SECTIONS.forEach(s=>s.rows.forEach(r=>g+=sumRow(r.id,n)));return g})()");
t('handoff monthly hours: m2=32, m5=8, total = grand total', h.monthlyHours[1] === 32 && h.monthlyHours[4] === 8 && h.monthlyHours[0] >= 40 && h.monthlyHours.reduce((a,b)=>a+b,0) === sumAll, [h.monthlyHours, sumAll]);
t('handoff other cost allocated sums to 60000', h.otherCosts.length === 1 && h.otherCosts[0].amounts.reduce((a,b)=>a+b,0) === 60000, h.otherCosts);
t('handoff price > 0 and matches sum-total', h.price === parseInt(w.document.getElementById('sum-total').textContent.replace(/[^\d]/g,''),10) && h.price > 0, h.price);
// S-LINK handoff payload
let stored; const orig = w.sessionStorage.setItem.bind(w.sessionStorage);
try { w.handoffToSlink(); } catch(e) {}
const pl = JSON.parse(w.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'));
t('S-LINK payload carries dates/others/contract', pl.startDate === '2026-11-15' && pl.endDate === '2027-03-31' && pl.otherMembers === 'SA 山田' && !!pl.contractType, {s:pl.startDate,e:pl.endDate});
t('S-LINK payload confidential 有り / note', pl.confidential === '有り' && /NDA/.test(pl.confidentialNote), [pl.confidential, pl.confidentialNote]);
summary();
})();
