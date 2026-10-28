const {load, t, XLSX, ROOT, summary} = require('./harness');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
console.log('[T17] request sheet -> CPS input: every request-sheet item is carried (v2.5.6)');
const q = load('quotation-generator.html'); await wait(300);
const req = q.parseQuotationRequestExcel(XLSX.readFile(__dirname + '/duskin_like.xlsx'));
q.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req));
q.checkIncomingRequestHandoff(); await wait(150);
q.eval("kosuData['des1'].values[0]=40; kosuData['bld2'].values[1]=32;"); q.recalcAll();
const h = q.buildCpsHandoff();
t('handoff carries request object', !!h.request && typeof h.request === 'object');
// 1. every key the parser emits (except internal bookkeeping) is present in the handoff request
const internal = ['cells', 'tplCells', 'origin', 'greyKeys', 'greyCellCount', 'colorDetect', 'version', 'preCheckLabels', 'workload'];
const miss = Object.keys(req).filter(k => !internal.includes(k) && !(k in h.request));
t('all parser keys present in handoff.request', miss.length === 0, miss);
t('origin/cells/tplCells/preChecks/preCheckLabels carried', !!h.request.origin && !!h.request.cells && !!h.request.tplCells && h.request.preChecks.length === 12 && Object.keys(h.request.preCheckLabels).length === 12);
t('values equal to the parsed sheet', h.request.customerName === req.customerName && h.request.bpName === req.bpName && h.request.dealType === req.dealType && JSON.stringify(h.request.docs) === JSON.stringify(req.docs));
t('Opp No: service side only, never falls back to product side (v2.5.10)', h.oppNo === (req.oppNoService || '') && (req.oppNoService ? true : h.oppNo === ''), h.oppNo);
// 2. screen edits win over imported values
q.eval("document.getElementById('ext-bp').value='編集後BP'; document.getElementById('ext-sales').value='編集後営業';");
const h2 = q.buildCpsHandoff();
t('edited fields override imported values', h2.request.bpName === '編集後BP' && h2.request.salesName === '編集後営業');
// 3. CPS page
const w = load('cps-input.html', {STORAGE_QUOTATION_CPS_INPUT: JSON.stringify(h2)}); await wait(400);
const S = () => w.eval('S');
t('CPS page stores request', !!S().request && S().request.bpName === '編集後BP');
const covered = w.eval('REQ_COVERED');
const parserKeys = Object.keys(req).filter(k => !internal.includes(k));
const unmapped = parserKeys.filter(k => !covered.includes(k));
t('every parser key has a CPS destination (REQ_COVERED)', unmapped.length === 0, unmapped);
const html = w.eval('stepBasic()');
t('basic-info step shows the request→CPS table', /見積もり依頼記入シートの内容 → CPS 反映/.test(html) && /依頼シートのセル/.test(html) && /CPS 反映先/.test(html));
const labels = ['記入日','記入者','お客様名','サービス名（案件名）','お客様番号','DNSO #','Opportunity No（HW/SW製品）','Opportunity No（サービス）','ビジネス・パートナー様名','BP お客様番号','担当営業名','担当テクニカル・セールス名','Expert Labs担当営業名','その他案件関係者名','Offering','サービス対象製品','サービス内容（概要）','サービス期間 開始','サービス期間 終了','サービス提供場所','サービス内容（詳細）','提出ドキュメント','打合せ回数','サービス除外事項','機密情報取扱い','社内関係者との打ち合わせの調整','社外関係者との打ち合わせの調整','ご提供形態','契約形態','支払い計画','月次作業報告書提出の必要性'];
const absent = labels.filter(l => !html.includes(l));
t('table lists all ' + labels.length + ' request-sheet items', absent.length === 0, absent);
t('12 pre-check rows shown', (html.match(/SOセールス|相談者名|SAレビュー|提案前チェック|パフォーマンス|キャパシティー|サポート条件|制限\/前提|例外承認|保守契約|運用支援サービス/g) || []).length >= 12);
t('values shown (customer, BP edited, location)', html.includes(req.customerName) && html.includes('編集後BP'));
t('source colour classes used (sheet=red / system=blue)', /class="s-auto"/.test(html) && /s-tool|s-auto/.test(html));
t('source cell addresses shown (e.g. C9)', /<td>C9<\/td>/.test(html));
t('OO hint: no auto-fill of OO/PPTL/PJTL', S().basic.oo === '' && S().basic.pptl === '' && S().basic.pjtl === '' && /OO（Opportunity Owner の Notes ID）の候補/.test(html));
// 4. memo + JSON
const memo = w.eval('buildMemo()');
t('memo: 3 lines (案件情報 / サービス内容 / 契約情報)', memo.length === 3 && /^【案件情報】/.test(memo[0]) && /^【サービス内容】/.test(memo[1]) && /^【契約情報】/.test(memo[2]), memo);
t('memo carries items without a dedicated CPS cell', /ビジネス・パートナー様名: 編集後BP/.test(memo[0]) && /担当営業名: 編集後営業/.test(memo[0]) && /提出ドキュメント: /.test(memo[1]) && /ご提供形態: /.test(memo[2]) && /契約形態: /.test(memo[2]) && /月次作業報告書提出の必要性/.test(memo[2]));
t('memo carries pre-check Y/N', /【事前確認事項】/.test(memo[2]));
t('memo flags unconfirmed payment plan (R10)', /要営業確認/.test(memo[2]));
t('memo has no newline (single-line cells)', memo.every(l => !/[\r\n]/.test(l)));
w.eval("S.payment.confirmed=true");
const j = w.buildJson();
t('JSON has request + main.memo + ooCandidate', !!j.request && Array.isArray(j.main.memo) && j.main.memo.length === 3 && 'ooCandidate' in j.main);
t('JSON keeps schema cps-input/1 + v2.5.12', j.schema === 'cps-input/1' && /v2\.5\.12/.test(j.generatedBy));
// 5. round trip via importJson
const w2 = load('cps-input.html'); await wait(300);
const f = {files: [new w2.File([JSON.stringify(j)], 'x.json')]};
w2.importJson({files: f.files, value: ''}); await wait(300);
t('importJson restores request & table', !!w2.eval('S.request') && w2.eval('S.request.bpName') === '編集後BP' && /見積もり依頼記入シートの内容 → CPS 反映/.test(w2.eval('stepBasic()')));
// 6. no handoff: nothing breaks
const w3 = load('cps-input.html'); await wait(300);
t('no handoff: no request panel, no memo, JSON request=null', w3.eval('requestPanel()') === '' && w3.eval('buildMemo().length') === 0 && w3.eval('S.request') === null);
// 7. one-time warning
w.eval("S.request.paymentPlan='支払い一回'"); 
t('支払い一回 with >3 months warns', /3ヶ月以内のみ選択可/.test(w.eval('oneTimeOnlyWarn()')) === (w.eval('months().length') > 3));
w.eval("S.request.paymentPlan='各月（標準）'");
t('各月 does not warn', w.eval('oneTimeOnlyWarn()') === '');
summary();
})();
