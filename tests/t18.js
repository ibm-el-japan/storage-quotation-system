const {load, t, XLSX, ROOT, summary} = require('./harness');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T18] 取込状況パネルの直接編集 (v2.5.7): edit -> fields / request data / checklist / persistence / handoff');
const q = load('quotation-generator.html'); await wait(300);
const doc = q.document;
const req0 = q.parseQuotationRequestExcel(XLSX.readFile(__dirname + '/duskin_like.xlsx'));
q.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req0));
q.checkIncomingRequestHandoff(); await wait(150);
const cov = () => doc.getElementById('cov-body');
const ta = (k, p) => Array.prototype.find.call(cov().querySelectorAll('[data-k]'), x => x.dataset.k === k && (x.dataset.p || '') === (p || ''));
const type = (el, v) => { el.value = v; el.dispatchEvent(new q.Event('input', {bubbles: true})); };
const pick = (el, v) => { el.value = v; el.dispatchEvent(new q.Event('change', {bubbles: true})); };
const R = () => q.eval('_incomingRequestData');
const fsrc = id => q.eval('_fieldSrc[' + JSON.stringify(id) + ']');
const val = id => doc.getElementById(id).value;
const sec = title => q.eval('CHECKLIST_DATA').find(s => s.title === title || s.title.includes(title));

// ---------- A. every item is an editable control ----------
const keys = ['createdDate','author','customerName','projectName','customerNo','dnsoNo','oppNoProduct','oppNoService','bpName','bpCustomerNo','salesName','tsName','elSalesName','otherMembers','offering','products','serviceSummary','startDate','endDate','workLocation','workDetail','docs','meetingFrequency','serviceExclusions','confidential','meetingInternal','meetingExternal','contractType','dealType','monthlyReport','paymentPlan'];
const noCtl = keys.filter(k => !ta(k));
t('A1 all 31 request-sheet items have an editable cell', noCtl.length === 0, noCtl);
const pcs = ['yn1','yn2','yn3','yn4','yn5','yn6','yn7','yn8','yn9','yn10','yn11','yn12'];
t('A2 all 12 pre-check rows are editable (note box)', pcs.every(id => !!ta('pc:' + id, 'note')));
t('A3 pre-check Y/N selector on yn1,yn3..yn12 (yn2 is a free-text name)', pcs.filter(id => id !== 'yn2').every(id => !!ta('pc:' + id, 'yn')) && !ta('pc:yn2', 'yn'));
t('A4 hint explains direct editing', /直接修正できます/.test(doc.getElementById('import-coverage-card').textContent));

// ---------- B. simple fields: panel -> field + request data + manual (black) ----------
type(ta('bpName'), '修正後パートナー株式会社');
t('B1 BP edit updates the basic-info field', val('ext-bp') === '修正後パートナー株式会社');
t('B2 BP edit updates request data + origin=manual', R().bpName === '修正後パートナー株式会社' && R().origin.bpName === 'manual');
t('B3 field source becomes manual', fsrc('ext-bp') === 'manual');
t('B4 row now shows black text + 手入力 badge + 手入力で修正', /txt-man/.test(ta('bpName').className) && /手入力で修正/.test(ta('bpName').closest('tr').textContent) && /src-manual/.test(ta('bpName').closest('tr').innerHTML));
t('B5 original request-sheet cell still shown as 修正済', /修正済/.test(ta('bpName').closest('tr').textContent));
type(ta('customerName'), '修正後顧客');
t('B6 customer name edit -> #customer-name', val('customer-name') === '修正後顧客' && R().customerName === '修正後顧客');
type(ta('oppNoService'), 'ABC-123456');
t('B7 Opportunity(サービス) edit -> field', val('ext-opp-svc') === 'ABC-123456' && fsrc('ext-opp-svc') === 'manual');
type(ta('meetingFrequency'), '週3回 (各1時間) @オンサイト');
t('B8 meetingFrequency edit -> field + premise checklist text', val('ext-meeting') === '週3回 (各1時間) @オンサイト' && sec('前提').items.some(i => /週3回/.test(i.text)));

// ---------- C. focus stability: re-render keeps focus + caret while typing ----------
const el0 = ta('salesName'); el0.focus(); el0.value = '営業さん'; el0.setSelectionRange(2, 2);
el0.dispatchEvent(new q.Event('input', {bubbles: true}));
const el1 = ta('salesName');
t('C1 focus stays on the edited cell after the panel re-renders', doc.activeElement === el1 && el1.value === '営業さん');
t('C2 caret position is preserved', el1.selectionStart === 2 && el1.selectionEnd === 2);
t('C3 Enter in a single-line cell does not insert a newline (handler registered once)', (cov().dataset.editWatch === '1'));

// ---------- D. combined fields ----------
type(ta('products'), 'Storage Scale System / Storage Protect');
t('D1 products edit -> request data array', JSON.stringify(R().products) === JSON.stringify(['Storage Scale System', 'Storage Protect']) && R().origin.products === 'manual');
t('D2 products edit -> #ext-offering (offering - products)', val('ext-offering').includes('Storage Scale System / Storage Protect'));
t('D3 products edit rebuilds サービス対象 checklist rows', sec('サービス対象').items.filter(i => i.tag === '対象製品').map(i => i.text).join('|') === '・Storage Scale System 支援一式|・Storage Protect 支援一式');
type(ta('offering'), 'Offering X');
t('D4 offering edit keeps products and refreshes #ext-offering', R().offering === 'Offering X' && val('ext-offering').startsWith('Offering X'));
type(ta('workLocation'), 'オンサイト / 東京都千代田区');
t('D5 location edit splits workLocation / detail and updates the field', R().workLocation === 'オンサイト' && R().workLocationDetail === '東京都千代田区' && val('ext-location') === 'オンサイト / 東京都千代田区');
t('D6 location edit re-evaluates the premise rows (on-site)', sec('前提').items.some(i => /オンサイト/.test(i.text) && i.checked));
type(ta('confidential'), '有り 秘密保持契約あり');
t('D7 confidential edit splits flag / note', R().confidential === '有り' && R().confidentialNote === '秘密保持契約あり' && val('ext-conf') === '有り 秘密保持契約あり');

// ---------- E. items without an input field ----------
type(ta('workDetail'), 'ストレージ設計支援\nバックアップ構成の導入\n運用手順書の作成');
const srv = sec('サービス内容').items.filter(i => i.tag === '要件依頼').map(i => i.text);
t('E1 workDetail edit rebuilds サービス内容 rows (1 line = 1 item)', JSON.stringify(srv) === JSON.stringify(['ストレージ設計支援', 'バックアップ構成の導入', '運用手順書の作成']), srv);
t('E2 rebuilt rows are checked and no boilerplate line is added (R4)', sec('サービス内容').items.filter(i => i.tag === '要件依頼').every(i => i.checked) && !sec('サービス内容').items.some(i => /^[・\-\s]*(設計|構築)[\s]*$/.test(i.text)));
type(ta('workDetail'), 'ストレージ設計支援');
t('E3 shrinking workDetail drops the removed rows (no stale items)', sec('サービス内容').items.filter(i => i.tag === '要件依頼').length === 1);
type(ta('docs'), '基本設計書、運用手順書');
const docs = sec('提出ドキュメント').items.filter(i => i.checked).map(i => i.text);
t('E4 docs edit re-checks matching documents + adds new row', docs.includes('基本設計書') && docs.some(d => /運用手順書/.test(d)) && val('ext-docs') === '基本設計書、運用手順書', docs);
type(ta('docs'), '基本設計書');
t('E5 removing a document unchecks it again', !sec('提出ドキュメント').items.some(i => i.checked && /運用手順書/.test(i.text)));
type(ta('serviceExclusions'), 'ネットワーク関連作業は対象外\nOS以外のミドルウェア設定');
const exc = sec('適用除外').items.filter(i => i.tag === '個別除外').map(i => i.text);
t('E6 exclusions edit -> checklist (適用除外) rows', JSON.stringify(exc) === JSON.stringify(['ネットワーク関連作業は対象外', 'OS以外のミドルウェア設定']), exc);
type(ta('serviceExclusions'), 'ネットワーク関連作業は対象外');
t('E7 exclusions shrink drops stale row', sec('適用除外').items.filter(i => i.tag === '個別除外').length === 1);
// manual rows added by the user survive a re-apply
q.eval("CHECKLIST_DATA.find(s=>s.title==='サービス内容').items.unshift({checked:true,text:'手動で追加した項目',tag:'',src:'manual'})");
type(ta('workDetail'), 'ストレージ設計支援\n追加の作業');
t('E8 a manually added checklist row survives re-apply', sec('サービス内容').items.some(i => i.text === '手動で追加した項目'));
// user un-check of a request-derived row survives re-apply
q.eval("CHECKLIST_DATA.find(s=>s.title==='サービス内容').items.find(i=>i.text==='追加の作業').checked=false");
type(ta('workDetail'), 'ストレージ設計支援\n追加の作業\nもう一つの作業');
t('E9 a row the user unchecked stays unchecked after re-apply (R3)', sec('サービス内容').items.find(i => i.text === '追加の作業').checked === false && sec('サービス内容').items.find(i => i.text === 'もう一つの作業').checked === true);
// no duplicates
const all = sec('サービス内容').items.map(i => i.text).filter(Boolean);
t('E10 no duplicated rows after repeated edits', new Set(all).size === all.length, all);

// ---------- F. dates ----------
type(ta('startDate'), '2027-04-05');
t('F1 start date edit -> #svc-start and start year/month', val('svc-start') === '2027-04-05' && val('start-year') === '2027' && val('start-month') === '4');
type(ta('endDate'), '2027-09-30');
t('F2 end date edit -> #svc-end and period months (6)', val('svc-end') === '2027-09-30' && val('period-months') === '6');
t('F3 dates are manual', fsrc('svc-start') === 'manual' && fsrc('svc-end') === 'manual' && R().origin.startDate === 'manual');
type(ta('startDate'), '2027/05/01');
t('F4 YYYY/M/D is accepted', val('svc-start') === '2027-05-01');
pick(doc.getElementById('svc-end'), '2027-10-31'); doc.getElementById('svc-end').dispatchEvent(new q.Event('change', {bubbles: true}));
t('F5 editing the date input itself refreshes the panel', ta('endDate').value === '2027-10-31' && R().endDate === '2027-10-31');

// ---------- G. pre-checks ----------
pick(ta('pc:yn1', 'yn'), 'Y');
let pc1 = R().preChecks.find(p => p.id === 'yn1');
t('G1 pre-check Y/N edit stored with origin=manual', pc1.yn === 'Y' && pc1.origin === 'manual');
type(ta('pc:yn1', 'note'), '補足メモ');
pc1 = R().preChecks.find(p => p.id === 'yn1');
t('G2 pre-check note edit stored', pc1.note === '補足メモ' && /手入力で修正/.test(ta('pc:yn1', 'note').closest('tr').textContent));
type(ta('pc:yn2', 'note'), '相談 太郎');
t('G3 相談者名 (free text) editable', R().preChecks.find(p => p.id === 'yn2').note === '相談 太郎');
type(ta('pc:yn1', 'note'), ''); pick(ta('pc:yn1', 'yn'), '');
t('G4 clearing a pre-check returns it to 未入力', /未入力/.test(ta('pc:yn1', 'note').closest('tr').textContent));

// ---------- H. payment plan (R10) ----------
type(ta('paymentPlan'), '各月');
t('H1 payment plan edit -> #ext-pay, still marked 営業確認', val('ext-pay') === '各月' && /営業確認/.test(ta('paymentPlan').closest('tr').textContent));

// ---------- I. empty field -> typed in the panel ----------
const emptyKey = keys.find(k => ['otherMembers', 'bpCustomerNo', 'elSalesName', 'dnsoNo'].includes(k) && !String(R()[k] || '').trim());
if (emptyKey) {
  const fid = q.eval('COV_KEY_FIELD')[emptyKey];
  type(ta(emptyKey), '新規入力値');
  t('I1 an empty (未入力) item can be filled from the panel (' + emptyKey + ')', val(fid) === '新規入力値' && R()[emptyKey] === '新規入力値' && fsrc(fid) === 'manual');
} else t('I1 (skipped: no empty item in fixture)', true);

// ---------- J. editing the basic-info field is mirrored into the panel ----------
const f = doc.getElementById('ext-ts'); f.value = '基本情報側で編集'; f.dispatchEvent(new q.Event('input', {bubbles: true}));
t('J1 basic-info edit -> panel shows the value (black, 手入力)', ta('tsName').value === '基本情報側で編集' && /txt-man/.test(ta('tsName').className));
t('J2 basic-info edit -> request data', R().tsName === '基本情報側で編集' && R().origin.tsName === 'manual');
const f2 = doc.getElementById('ext-offering'); f2.value = 'OfferingZ - Prod1 / Prod2'; f2.dispatchEvent(new q.Event('input', {bubbles: true}));
t('J3 combined offering field edit splits into offering + products', R().offering === 'OfferingZ' && JSON.stringify(R().products) === JSON.stringify(['Prod1', 'Prod2']));

// ---------- K. persistence ----------
const st = JSON.parse(JSON.stringify(q.collectState()));
t('K1 collectState carries the edited request data', st.incomingRequestData.bpName === '修正後パートナー株式会社' && st.incomingRequestData.origin.bpName === 'manual' && st.incomingRequestData.preChecks.find(p => p.id === 'yn2').note === '相談 太郎');
t('K2 collectState carries the field source (manual)', st.fieldSrc['ext-bp'] === 'manual');
const q2 = load('quotation-generator.html'); await wait(300);
q2.restoreState(st); await wait(100);
const d2 = q2.document;
const ta2 = (k, p) => Array.prototype.find.call(d2.getElementById('cov-body').querySelectorAll('[data-k]'), x => x.dataset.k === k && (x.dataset.p || '') === (p || ''));
t('K3 restore: panel shows the edited values', ta2('bpName').value === '修正後パートナー株式会社' && ta2('tsName').value === '基本情報側で編集' && ta2('pc:yn2', 'note').value === '相談 太郎');
t('K4 restore: edited values are still manual (black) with the 手入力 badge', /txt-man/.test(ta2('bpName').className) && /src-manual/.test(ta2('bpName').closest('tr').innerHTML));
t('K5 restore: basic-info fields hold the edited values', d2.getElementById('ext-bp').value === '修正後パートナー株式会社' && d2.getElementById('customer-name').value === '修正後顧客');
t('K6 restore: edited checklist rows are kept (no duplicates)', (() => { const c = q2.eval('CHECKLIST_DATA').find(s => s.title === 'サービス内容').items.map(i => i.text).filter(Boolean); return c.includes('追加の作業') && c.includes('手動で追加した項目') && new Set(c).size === c.length; })());
// editing after restore still works
ta2('bpName').value = '復元後に再編集'; ta2('bpName').dispatchEvent(new q2.Event('input', {bubbles: true}));
t('K7 editing after restore still propagates', d2.getElementById('ext-bp').value === '復元後に再編集' && q2.eval('_incomingRequestData').bpName === '復元後に再編集');
// state -> JSON text -> restore (file / GitHub save-load path)
const q3 = load('quotation-generator.html'); await wait(300);
q3.restoreState(JSON.parse(JSON.stringify(q2.collectState()))); await wait(100);
t('K8 second-generation save/load keeps the edit', q3.eval('_incomingRequestData').bpName === '復元後に再編集' && q3.document.getElementById('ext-bp').value === '復元後に再編集');

// ---------- L. downstream consumers ----------
const hc = q.buildCpsHandoff();
t('L1 CPS handoff carries edited values', hc.request.bpName === '修正後パートナー株式会社' && hc.request.tsName === '基本情報側で編集');
t('L2 CPS handoff: edited workDetail / products / preChecks', /追加の作業/.test(hc.request.workDetail) && hc.request.products.join('/') === 'Prod1/Prod2' && hc.request.preChecks.find(p => p.id === 'yn2').note === '相談 太郎');
t('L3 CPS handoff: origin marks edited items manual', hc.request.origin.bpName === 'manual' && hc.request.origin.workDetail === 'manual' && hc.request.origin.products === 'manual');
t('L4 CPS handoff: edited dates', hc.request.startDate === '2027-05-01' && hc.request.endDate === '2027-10-31', [hc.request.startDate, hc.request.endDate]);
// S-LINK: real end-to-end (panel edit -> handoffToSlink -> slink-spec-generator -> customer documents)
q.eval("CHECKLIST_DATA.find(s=>s.title==='サービス内容').items.find(i=>i.text==='追加の作業').checked=false");
try { q.handoffToSlink(); } catch (e) {}
const sess = {STORAGE_QUOTATION_REQUEST_DATA: q.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'), STORAGE_QUOTATION_TOOL_STATE: q.sessionStorage.getItem('STORAGE_QUOTATION_TOOL_STATE')};
const sp = JSON.parse(sess.STORAGE_QUOTATION_REQUEST_DATA);
t('L5 S-LINK handoff carries the edited request values', sp.bpName === '修正後パートナー株式会社' && sp.tsName === '基本情報側で編集', [sp.bpName, sp.tsName]);
t('L6 S-LINK handoff: edited products / dates', JSON.stringify(sp.products) === JSON.stringify(['Prod1', 'Prod2']) && /^2027-05-01/.test(sp.startDate || ''), [sp.products, sp.startDate]);
const w = load('slink-spec-generator.html', sess); await wait(500);
const spec = w.eval('specDocData'), appx = w.eval('appxDocData');
const specHtml = w.generateCleanDocHtml('spec', false), appxHtml = w.generateCleanDocHtml('appx', false);
t('M1 edited 提出ドキュメント / products reach the customer documents', /基本設計書/.test(spec.scope) && /Prod1/.test(appxHtml) && /Prod2/.test(appxHtml), spec.scope.slice(0, 200));
t('M2 R3: the unchecked edited row is not output', !/追加の作業/.test(spec.scope) && !/追加の作業/.test(specHtml));
t('M3 R3: the checked edited row IS output', /ストレージ設計支援/.test(spec.scope));
t('M4 customer documents carry no panel artefacts (cov-edit / src badge / cell chip)', !/cov-edit|src-badge|cell-ref|手入力で修正/.test(specHtml + appxHtml));
t('M5 R4: no stray boilerplate line', !/^・(設計|構築|稼動テスト|ドキュメント|Q&A)\s*$/m.test(spec.scope));
t('M6 R6: panel edits never auto-select travel office / zone', q.eval("(document.getElementById('ta-zone')||{}).value||''") === '');

summary();
})();
