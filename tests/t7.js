const {load, t, XLSX, ROOT, summary} = require('./harness');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T7] S-LINK/仕様書/別紙: slide-4 items');
// build payload via estimate tool (end-to-end)
const q = load('quotation-generator.html'); await wait(300);
const req = q.parseQuotationRequestExcel(XLSX.readFile(ROOT + 'Quotation Request Form.xlsx'));
req.startDate = '2026-11-15'; req.endDate = '2027-03-31'; req.otherMembers = 'SA 山田';
req.products = ['IBM Storage Ceph', 'IBM Storage Scale System'];
q.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req));
q.checkIncomingRequestHandoff(); await wait(100);
try { q.handoffToSlink(); } catch (e) {}
const sess = {STORAGE_QUOTATION_REQUEST_DATA: q.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'), STORAGE_QUOTATION_TOOL_STATE: q.sessionStorage.getItem('STORAGE_QUOTATION_TOOL_STATE')};
const w = load('slink-spec-generator.html', sess); await wait(400);
const meta = w.eval('slinkMetaList'); const m = id => (meta.find(x => x.id === id) || {}).val;
const appx = w.eval('appxDocData'), spec = w.eval('specDocData');
t('S-LINK 契約期間 has full dates', /2026年11月15日 ～ 2027年3月31日/.test(m('sm9')), m('sm9'));
t('別紙 period = 開始～終了年月日', /2026年11月15日 より 2027年3月31日 まで/.test(appx.period), appx.period);
t('S-LINK has OO / 契約名 / チームメンバー', !!m('sm22') && !!m('sm23') && /山田/.test(m('sm24') || ''), [m('sm22'), m('sm23'), m('sm24')]);
t('S-LINK items = 24', meta.length === 24, meta.length);
t('別紙 productRows per product', appx.productRows.length === 2 && appx.productRows[0].qty === '1式', appx.productRows);
w.document.querySelectorAll('#prod-rows input'); 
const html = w.generateCleanDocHtml('appx', false);
t('別紙 output lists each product + 数量', /IBM Storage Ceph/.test(html) && /IBM Storage Scale System/.test(html));
t('別紙 output still has 支払計画 placeholder (R10)', /営業確認後、CPSの支払計画から反映/.test(html));
const sp = w.generateCleanDocHtml('spec', false);
console.log('  scope:', JSON.stringify(spec.scope.slice(0, 260)));
t('仕様書 scope groups 【設計作業】【構築作業】', /【設計作業】/.test(spec.scope) && /【構築作業】/.test(spec.scope), spec.scope.slice(0,200));
t('仕様書 scope has 【QA作業】 & 【提出ドキュメント】', /【QA作業】/.test(spec.scope) && /【提出ドキュメント】/.test(spec.scope));
t('R4: no stray "・設計" line', !/^・(設計|構築|稼動テスト|ドキュメント|Q&A)\s*$/m.test(spec.scope));
// uncheck QA -> not output (R3)
const cl = q.eval('CHECKLIST_DATA'); cl.find(s => s.title === 'サービス内容').items.forEach(i => { if (i.tag === 'QA') i.checked = false; });
const st = JSON.parse(q.sessionStorage.getItem('STORAGE_QUOTATION_TOOL_STATE')); st.checklist = cl;
const w2 = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: sess.STORAGE_QUOTATION_REQUEST_DATA, STORAGE_QUOTATION_TOOL_STATE: JSON.stringify(st)}); await wait(400);
t('R3: unchecked QA item not in 仕様書', !/【QA作業】/.test(w2.eval('specDocData').scope), w2.eval('specDocData').scope.slice(0, 300));
summary();
})();
