const {load, t, XLSX, ROOT, summary} = require('./harness');
const fs = require('fs');
const {execSync} = require('child_process');
(async () => {
console.log('[T15] new request-sheet layout (A1:F85, label/section-driven parser) -- every field reaches the UI');
const FIX = __dirname + '/duskin_like.xlsx';
if (!fs.existsSync(FIX)) execSync('python3 ' + __dirname + '/make_duskin_like.py', {stdio: 'inherit'});
const rd = f => XLSX.read(fs.readFileSync(f), {type: 'buffer', cellStyles: true, bookFiles: true});
const w = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300)); const doc = w.document;
const p = w.parseQuotationRequestExcel(rd(FIX));
const C = p.cells || {};
const J = o => JSON.stringify(o);

// A. parser: value + source cell
t('A1 記入日 (Excel date cell) -> 2026-10-26 @C4', p.createdDate === '2026-10-26' && C.createdDate[0] === 'C4', [p.createdDate, C.createdDate]);
t('A2 記入者 @C5', p.author === '記入 太郎(Kinyu Taro)' && C.author[0] === 'C5');
t('A3 お客様名/案件名 @C9/@C10', p.customerName === 'サンプル商事様' && p.projectName === 'バックアップ基盤構築' && C.customerName[0] === 'C9' && C.projectName[0] === 'C10');
t('A4 Opp(HW/SW) trimmed @C12', p.oppNoProduct === '006xx0000000001AAA' && C.oppNoProduct[0] === 'C12', p.oppNoProduct);
t('A5 v2.5.10 Opp(サービス) empty -> stays empty (not copied from product), origin=empty', p.oppNoService === '' && p.oppNoService !== p.oppNoProduct && p.origin.oppNoService === 'empty', [p.oppNoService, p.origin.oppNoService, C.oppNoService]);
t('A6 BP @C14', p.bpName === 'ダミーBP株式会社' && C.bpName[0] === 'C14');
t('A7 ストレージ担当営業名 @C15 (not confused with Expert Labs)', p.salesName === '営業 一郎(Eigyo Ichiro)' && C.salesName[0] === 'C15', p.salesName);
t('A8 ストレージ担当TS名 @C16', p.tsName === '技術 二郎(Gijutsu Jiro)' && C.tsName[0] === 'C16', p.tsName);
t('A9 Expert Labs担当営業名 empty, template cell C17 known', p.elSalesName === '' && p.tplCells.elSalesName === 'C17', [p.elSalesName, p.tplCells.elSalesName]);
t('A10 customerNo / bpCustomerNo not in sheet -> empty (not mis-filled)', p.customerNo === '' && p.bpCustomerNo === '');
t('A11 Offering = checked row only @C21', /^Storage Expert Labs（Product Code：30C9J/.test(p.offering) && C.offering.join() === 'C21', p.offering);
t('A12 products = checked sub-option only', J(p.products) === J(['Storage Defender（Data Protect）']) && C.products.join() === 'C38', p.products);
t('A13 period start has no day -> 1st + note; end day kept', p.startDate === '2027-09-01' && p.endDate === '2027-11-30' && /1日で補完/.test(p.periodNote) && C.startDate[0] === 'C41', [p.startDate, p.endDate, p.periodNote]);
t('A14 場所 大阪 -> onsite, detail kept @C42', p.workLocation === 'お客様先（オンサイト）' && p.workLocationDetail === '大阪' && C.workLocation[0] === 'C42', [p.workLocation, p.workLocationDetail]);
t('A15 提出ドキュメント split out of 支援内容 (3 items)', J(p.docs) === J(['基本設計書', '詳細設計書（パラメーターシート）', 'テスト計画書兼報告書']) && C.docs[0] === 'C43', p.docs);
t('A16 支援内容 keeps only work lines, no doc bullets/tabs', p.workDetail === 'HW製品構築、SW製品導入構築\nQA支援', p.workDetail);
t('A17 機密 無し @C44 / 社内 調整します @C45', p.confidential === '無し' && p.meetingInternal === '調整します' && C.confidential[0] === 'C44' && C.meetingInternal[0] === 'C45');
t('A18 社外 調整します + free-text note kept @C46', p.meetingExternal === '調整します' && /概算だけお願いします/.test(p.meetingExternalNote) && C.meetingExternalNote[0] === 'C46', p.meetingExternalNote);
const y1 = p.preChecks.find(x => x.id === 'yn1');
t('A19 事前確認 yn1 = N / 備考 / D51 (outside old fixed range)', y1.yn === 'N' && y1.note === 'SO案件ではない' && y1.cell === 'D51', y1);
t('A20 事前確認 other rows empty, template cells shifted (yn3=D55, yn12=D65)', p.preChecks.filter(x => x.id !== 'yn1').every(x => !x.yn) && p.preChecks.find(x => x.id === 'yn3').tplCell === 'D55' && p.preChecks.find(x => x.id === 'yn12').tplCell === 'D65');
t('A21 ご提供形態 = 単独契約 @C70 (not サブコン)', p.contractType === '支援契約（Expert Labsの単独契約）' && C.contractType[0] === 'C70', p.contractType);
t('A22 契約形態 = 直販（サブコン） @C76 (example text stripped)', p.dealType === '直販（サブコン）' && C.dealType[0] === 'C76', p.dealType);
t('A23 支払い計画 各月（標準） @C80', p.paymentPlan === '各月（標準）' && C.paymentPlan[0] === 'C80');
t('A24 月次報告書 無 @C83', p.monthlyReport === '無' && C.monthlyReport[0] === 'C83');
t('A25 all non-empty sheet fields have origin=sheet (red)', ['createdDate', 'author', 'customerName', 'projectName', 'oppNoProduct', 'bpName', 'salesName', 'tsName', 'offering', 'products', 'startDate', 'workLocation', 'workDetail', 'docs', 'meetingExternalNote', 'contractType', 'dealType', 'paymentPlan', 'monthlyReport'].every(k => p.origin[k] === 'sheet'), p.origin);

// A+. ストレージ担当営業 と Expert Labs担当営業 は別人: 両方入力されていても取り違えない / OO(sm22) はストレージ担当営業のまま
{
  const wb2 = rd(FIX); wb2.Sheets[wb2.SheetNames[0]]['C17'] = {t: 's', v: 'EL営業 花子(EL Hanako)'};
  const p2 = w.parseQuotationRequestExcel(wb2);
  t('A26 both sales names filled: salesName=C15, elSalesName=C17 (distinct people)', p2.salesName === '営業 一郎(Eigyo Ichiro)' && p2.elSalesName === 'EL営業 花子(EL Hanako)' && p2.cells.salesName[0] === 'C15' && p2.cells.elSalesName[0] === 'C17', [p2.salesName, p2.elSalesName]);
  const sl2 = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify(p2)}); await new Promise(r => setTimeout(r, 300));
  const mm = sl2.eval('slinkMetaList');
  t('A27 S-LINK OO(sm22) stays ストレージ担当営業; Expert Labs営業 is a separate team member in sm24', mm.find(m => m.id === 'sm22').val === p2.salesName && /EL営業 花子/.test(mm.find(m => m.id === 'sm24').val) && !/EL営業/.test(mm.find(m => m.id === 'sm22').val), [mm.find(m => m.id === 'sm22').val, mm.find(m => m.id === 'sm24').val]);
}

// B. import into the UI
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(p));
w.checkIncomingRequestHandoff(); await new Promise(r => setTimeout(r, 300));
const v = id => doc.getElementById(id).value;
t('B1 基本情報 text fields', v('customer-name') === 'サンプル商事様' && v('project-name') === 'バックアップ基盤構築' && v('ext-created') === '2026-10-26' && v('ext-author') === p.author, [v('customer-name'), v('ext-created')]);
t('B2 基本情報 Opp / BP / 営業 / TS', v('ext-opp-hw') === p.oppNoProduct && v('ext-opp-svc') === '' && v('ext-opp-svc') !== v('ext-opp-hw') && v('ext-bp') === p.bpName && v('ext-sales') === p.salesName && v('ext-ts') === p.tsName);
t('B3 基本情報 Expert Labs営業 field exists and is empty', doc.getElementById('ext-el-sales') && v('ext-el-sales') === '');
t('B4 基本情報 Offering/製品 line', /Storage Defender（Data Protect）/.test(v('ext-offering')) && !/Sentinel|DRS/.test(v('ext-offering')), v('ext-offering'));
t('B5 基本情報 提供場所 = onsite / 大阪', /お客様先（オンサイト） \/ 大阪/.test(v('ext-location')), v('ext-location'));
t('B6 基本情報 提出ドキュメント 3件', /基本設計書/.test(v('ext-docs')) && /テスト計画書兼報告書/.test(v('ext-docs')), v('ext-docs'));
t('B7 基本情報 社外調整の補足 shown', /概算だけお願いします/.test(v('ext-mtg-ext-note')) && v('ext-mtg-int-note') === '', v('ext-mtg-ext-note'));
t('B8 基本情報 契約系', v('ext-contract') === p.contractType && v('ext-deal') === '直販（サブコン）' && v('ext-pay') === '各月（標準）' && v('ext-report') === '無' && v('ext-conf') === '無し');
t('B9 期間: start-year/month = 2027/9, months = 3, svc dates', v('start-year') === '2027' && v('start-month') === '9' && v('period-months') === '3' && v('svc-start') === '2027-09-01' && v('svc-end') === '2027-11-30', [v('start-year'), v('start-month'), v('period-months'), v('svc-start'), v('svc-end')]);
const pm = doc.getElementById('period-map-info');
t('B10 期間カード: C41 + 補完注記', pm.style.display === 'block' && /C41/.test(pm.textContent) && /1日で補完/.test(pm.textContent), pm.textContent);
const labs = w.eval('getMonthLabels()');
t('B11 工数: 月ラベル 3か月 (9〜11月)', labs.length === 3 && labs[0].label === '2027/09' && labs[2].label === '2027/11', labs);
const kh = [...doc.querySelectorAll('#tab-kosu table thead th')].map(e => e.textContent.replace(/\s+/g,' ').trim());
t('B11b v2.5.11 工数表の月見出しが取込期間(2027/09〜11, 3列)に作り直される', kh.filter(x => /^\d{4}\/\d{2}/.test(x)).length === 3 && /^2027\/09/.test(kh.find(x => /^\d{4}\//.test(x))), kh);
const chip = id => { const l = doc.getElementById(id).closest('.info-row').querySelector('label .cell-ref'); return l ? l.textContent : ''; };
t('B12 chips: C9 / C15 / C42 / C21', /C9\b/.test(chip('customer-name')) && /C15/.test(chip('ext-sales')) && /C42/.test(chip('ext-location')) && /C21/.test(chip('ext-offering')), [chip('customer-name'), chip('ext-sales'), chip('ext-location'), chip('ext-offering')]);
t('B13 v2.5.10 blank Opp(サービス) is not derived from product: field empty, no source cell shown, Opp(HW/SW) still @C12', v('ext-opp-svc') === '' && /Opportunity No（HW\/SW製品）[\s\S]*C12/.test(doc.getElementById('cov-body').textContent) && !/製品側の番号で補完/.test(doc.getElementById('cov-body').textContent));
t('B14 empty fields have no chip (DNSO, Expert Labs営業)', chip('ext-dnso') === '' && chip('ext-el-sales') === '');

// C. checklist (checked items only, doc/work split)
const sec = title => w.eval('CHECKLIST_DATA').find(x => x.title === title);
const texts = title => (sec(title) ? sec(title).items.filter(i => i.checked && i.text.trim()).map(i => i.text) : []);
t('C1 サービス対象: Defender（Data Protect）only', texts('サービス対象').length === 1 && /Storage Defender（Data Protect）/.test(texts('サービス対象')[0]), texts('サービス対象'));
t('C2 サービス内容: sheet work line + 「QA支援」 (default QA row kept, checked, @C43); no doc bullets', texts('サービス内容').some(x => /HW製品構築、SW製品導入構築/.test(x)) && texts('サービス内容').some(x => /Q&A/.test(x)) && !texts('サービス内容').some(x => /基本設計書|提出ドキュメント/.test(x)) && !texts('サービス内容').some(x => /^1\. 設計作業|^3\. 稼動テスト/.test(x)), texts('サービス内容'));
t('C2b QA row attributed to the sheet cell (red, C43)', (() => { const r = sec('サービス内容').items.find(i => i.tag === 'QA'); return r && r.src === 'auto' && r.cell === 'C43'; })());
t('C3 提出ドキュメント: 3 sheet docs checked @C43', ['基本設計書', '詳細設計書', 'テスト計画書'].every(k => texts('提出ドキュメント').some(x => x.includes(k))), texts('提出ドキュメント'));
const docRow = sec('提出ドキュメント').items.find(i => /基本設計書/.test(i.text) && i.checked);
t('C4 提出ドキュメント row src=auto, cell=C43', docRow && docRow.src === 'auto' && docRow.cell === 'C43', docRow && [docRow.src, docRow.cell]);
t('C5 前提: onsite 大阪 line checked', texts('前提').some(x => /大阪/.test(x)), texts('前提'));
t('C6 前提: remote-support line unchecked', !texts('前提').some(x => /^サービスはリモートサポートとなります/.test(x)));

// D. 交通費 tab: destination shown in red with cell chip; base office / distance zone are NOT auto-decided
const tb = doc.getElementById('travel-req-info');
t('D1 交通費: 依頼シート場所 大阪 + C42 shown', tb.style.display === 'block' && /大阪/.test(tb.textContent) && /C42/.test(tb.textContent), tb.textContent);
t('D2 交通費: base office / zone left for the user', v('ta-office') === '' && v('ta-zone') === '');

// E. coverage panel
const cov = doc.getElementById('cov-body').textContent;
t('E1 取込状況: Expert Labs担当営業名 row listed (空欄 C17)', /Expert Labs担当営業名/.test(cov) && /C17 空欄/.test(cov), cov.slice(0, 200));
t('E2 取込状況: 社外調整の補足 row', /社外打ち合わせ調整の補足/.test(cov));
t('E3 取込状況: 事前確認 yn1 = D51 N', /D51/.test(cov) && /SO案件ではない/.test(cov));
t('E4 取込状況: empty pre-check shows shifted template cell D55', /D55 空欄/.test(cov));
t('E5 取込状況: 支払い計画 chip C80 + 営業確認', /C80/.test(cov) && /営業確認/.test(cov));
t('E6 v2.5.10 取込状況: no 補完 note for Opp(サービス); shows 空欄', !/製品側の番号で補完/.test(cov));

// F. state round-trip
const st = w.collectState();
t('F1 collectState carries new fields', st.basic.elSalesName === '' && /概算/.test(st.basic.meetingExternalNote) && st.basic.workLocation.includes('大阪'), [st.basic.meetingExternalNote]);
doc.getElementById('ext-el-sales').value = '管理 三郎'; doc.getElementById('ext-mtg-int-note').value = 'メモ';
const st2 = w.collectState();
t('F2 collectState picks up edited Expert Labs営業 / 補足', st2.basic.elSalesName === '管理 三郎' && st2.basic.meetingInternalNote === 'メモ');
doc.getElementById('ext-el-sales').value = ''; doc.getElementById('ext-mtg-int-note').value = '';
w.restoreState(st2);
t('F3 restoreState re-populates them', v('ext-el-sales') === '管理 三郎' && v('ext-mtg-int-note') === 'メモ', [v('ext-el-sales')]);

// G. the 4 parser copies agree
const same = [];
for (const f of ['request-form.html', 'index.html', 'slink-spec-generator.html']) {
  const w2 = load(f); await new Promise(r => setTimeout(r, 300));
  const q = w2.parseQuotationRequestExcel(rd(FIX));
  same.push(f + ':' + (J(q) === J(p)));
}
t('G1 same parse result in request-form / index / slink-spec-generator', same.every(x => /true$/.test(x)), same);

// H. request-form: restore the parsed data into the form, then read it back
const wf = load('request-form.html'); await new Promise(r => setTimeout(r, 300));
wf.restoreFormData(p);
const d2 = wf.getFormDataObject();
t('H1 request-form: Expert Labs営業 input exists', !!wf.document.getElementById('f-el-sales'));
t('H2 request-form: 製品 Storage Defender checked (not Protect)', d2.products.includes('Storage Defender') && !d2.products.includes('Storage Protect'), d2.products);
t('H3 request-form: period / 場所 / 補足 round-trip', d2.startDate === '2027-09-01' && d2.endDate === '2027-11-30' && d2.workLocation === 'お客様先（オンサイト）' && d2.workLocationDetail === '大阪' && /概算/.test(d2.meetingExternalNote), [d2.startDate, d2.workLocation, d2.meetingExternalNote]);
t('H4 request-form: period note shown', /1日で補完/.test(wf.document.getElementById('period-note').textContent) && d2.periodNote === p.periodNote, d2.periodNote);
t('H5 request-form: docs 3 checked / workDetail', ['基本設計書', '詳細設計書（パラメーターシート）', 'テスト計画書兼報告書'].every(x => d2.docs.join(',').includes(x)) && d2.workDetail === p.workDetail, d2.docs);
t('H6 request-form: 事前確認 yn1 = N restored', (d2.preChecks.find(x => /SOセールス/.test(x.label)) || {}).yn === 'N', d2.preChecks.slice(0, 1));

// I. customer-facing output / S-LINK stay free of source colours, chips and badges (R3 checked-only)
const bad = /txt-auto|txt-ref|txt-sys|src-badge|input-src-|c00000|8b8f98|1d4ed8|org-auto|src-pill|cell-ref/;
w.generateCustomerOutput();
const coHtml = (doc.getElementById('customer-output-area') || {innerHTML: ''}).innerHTML;
t('I1 customer output generated and carries sheet items', coHtml.length > 500 && /HW製品構築/.test(coHtml) && /Storage Defender（Data Protect）/.test(coHtml), coHtml.length);
t('I2 customer output has no source markup / cell chips', !bad.test(coHtml), (coHtml.match(bad) || [])[0]);
t('I3 customer output has no unchecked product (Sentinel / DRS) and no 提出ドキュメント stray line', !/Sentinel|DRS\/DMS/.test(coHtml));
w.handoffToSlink && (() => { try { w.handoffToSlink(); } catch (e) {} })();
const payload = JSON.parse(w.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'));
t('I4 S-LINK payload carries elSalesName / notes / periodNote', 'elSalesName' in payload && /概算/.test(payload.meetingExternalNote) && /1日で補完/.test(payload.periodNote), [payload.elSalesName, payload.meetingExternalNote]);
const sl = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify(payload), STORAGE_QUOTATION_TOOL_STATE: JSON.stringify(payload.toolState)});
await new Promise(r => setTimeout(r, 300));
const meta = sl.eval('slinkMetaList');
const m24 = meta.find(m => m.id === 'sm24');
t('I5 S-LINK sm24 team members include 営業 + TS', m24 && /営業 一郎/.test(m24.val) && /技術 二郎/.test(m24.val), m24 && m24.val);
t('I6 S-LINK copy values are plain text', !bad.test(meta.map(m => m.val).join('\n')));
t('I7 S-LINK 提供形態/契約形態/支払い from sheet', meta.find(m => m.id === 'sm11').val.includes('単独契約') && meta.find(m => m.id === 'sm12').val.includes('サブコン') && /各月/.test(meta.find(m => m.id === 'sm20').val));
summary();
})();
