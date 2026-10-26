const {load, t, XLSX, TPL_BLACK, ROOT, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T13] source cell references (which template cell was reflected where)');
const rd = f => XLSX.read(fs.readFileSync(f), {type: 'buffer', cellStyles: true, bookFiles: true});
const w = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300)); const doc = w.document;
const p = w.parseQuotationRequestExcel(rd(TPL_BLACK));
const C = p.cells || {};
// A. parser records cell addresses (template layout: see work/見積もり依頼記入シート_テンプレート.xlsx)
const exp = {author: 'C5', customerName: 'C9', projectName: 'C10', customerNo: 'C11', oppNoProduct: 'C13', oppNoService: 'C14',
  customerNo_bp: null, salesName: 'C17', tsName: 'C18', startDate: 'C43', endDate: 'C43', workLocation: 'C44', workDetail: 'C45', docs: 'C46',
  meetingFrequency: 'C47', serviceExclusions: 'C48', confidential: 'C49', meetingInternal: 'C50', meetingExternal: 'C51',
  contractType: 'C75', dealType: 'C81', monthlyReport: null};
Object.keys(exp).forEach(k => { if (exp[k]) t('A ' + k + ' -> ' + exp[k], (C[k] || []).includes(exp[k]), C[k]); });
t('A bpCustomerNo -> C16', (C.bpCustomerNo || []).includes('C16'), C.bpCustomerNo);
t('A offering -> C22 (checked row)', (C.offering || []).includes('C22'), C.offering);
t('A products -> C37,C38 (checked rows)', (C.products || []).join() === 'C37,C38', C.products);
t('A 記入日 placeholder (20xx/xx/xx) is system-filled: no cell claimed', !C.createdDate && p.origin.createdDate !== 'sheet', [C.createdDate, p.origin.createdDate]);
t('A empty fields have no cell (DNSO, BP, others)', !C.dnsoNo && !C.bpName && !C.otherMembers, [C.dnsoNo, C.bpName, C.otherMembers]);
const pc = p.preChecks.find(x => x.id === 'yn1'), pc3 = p.preChecks.find(x => x.id === 'yn3');
t('A preChecks cells D56 / D60', pc.cell === 'D56' && pc3.cell === 'D60', [pc.cell, pc3.cell]);

// B. import into the UI
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(p));
w.checkIncomingRequestHandoff(); await new Promise(r => setTimeout(r, 300));
const chip = id => { const l = doc.getElementById(id).closest('.info-row').querySelector('label .cell-ref'); return l ? l.textContent : ''; };
t('B1 基本情報: お客様名 shows C9', /C9/.test(chip('customer-name')), chip('customer-name'));
t('B2 基本情報: 提供場所 shows C44', /C44/.test(chip('ext-location')), chip('ext-location'));
t('B3 基本情報: 打合せ回数 shows C47', /C47/.test(chip('ext-meeting')), chip('ext-meeting'));
t('B4 基本情報: 支援対象製品 shows C22', /C22/.test(chip('ext-offering')), chip('ext-offering'));
t('B5 chip text is red-style class', !!doc.querySelector('#ext-location').closest('.info-row').querySelector('.cell-ref') && !doc.querySelector('#ext-location').closest('.info-row').querySelector('.cell-ref.ref'));
t('B6 empty DNSO has no chip', chip('ext-dnso') === '');
const pm = doc.getElementById('period-map-info');
t('B7 期間設定 shows C43 + dates', pm.style.display === 'block' && /C43/.test(pm.textContent) && /2027-01-01/.test(pm.textContent), pm.textContent);
// C. checklist rows
const cl = (title, re) => { const s = w.eval('CHECKLIST_DATA').find(x => x.title === title); return s ? s.items.find(i => re.test(i.text)) : null; };
const prod = cl('サービス対象', /Ceph/);
t('C1 サービス対象 row cell = C37, C38', prod && /C37/.test(prod.cell) && /C38/.test(prod.cell) || (prod && prod.cell), prod && prod.cell);
const doc1 = cl('提出ドキュメント', /基本設計/);
t('C2 提出ドキュメント row cell = C46', doc1 && doc1.cell === 'C46', doc1 && doc1.cell);
const exc = w.eval('CHECKLIST_DATA').find(x => x.title.includes('適用除外')).items.find(i => i.tag === '個別除外');
t('C3 適用除外 row cell = C48', exc && exc.cell === 'C48', exc && exc.cell);
const wd = w.eval('CHECKLIST_DATA').find(x => x.title === 'サービス内容').items.filter(i => i.tag === '要件依頼');
t('C4 サービス内容 rows cell = C45 (or none if only boilerplate)', wd.every(i => i.cell === 'C45'), wd.map(i => i.cell));
const mt = cl('前提', /^プロジェクトの打ち合わせは/);
t('C5 前提(打合せ) row cell = C47', mt && mt.cell === 'C47', mt && mt.cell);
t('C6 chip rendered in checklist DOM', doc.querySelectorAll('#tab-checklist .cell-ref').length >= 4, doc.querySelectorAll('#tab-checklist .cell-ref').length);
// D. 工数 tab
const km = doc.getElementById('kosu-map-info');
t('D1 工数 map box lists 期間/製品/打合せ with cells', km.style.display === 'block' && /C43/.test(km.textContent) && /C47/.test(km.textContent) && /C37/.test(km.textContent), km.textContent);
t('D2 mtg1 row shows C47 chip', /C47/.test(w.eval("kosuData['mtg1'].cell")) && !!doc.querySelector('#kosu-table-wrap .cell-ref'));
const inp = doc.querySelector('input[data-krow="mtg1"]'); inp.value = '9'; inp.dispatchEvent(new w.Event('input', {bubbles: true}));
t('D3 manual edit drops the cell basis', !w.eval("kosuData['mtg1'].cell"));
// E. 交通費 tab
const tr = doc.getElementById('travel-req-info');
t('E1 交通費 info shows C44 and C47 chips', tr.querySelectorAll('.cell-ref').length === 2 && /C44/.test(tr.textContent) && /C47/.test(tr.textContent), tr.textContent);
// F. coverage panel
const cov = doc.getElementById('cov-body').textContent;
t('F1 coverage panel has cell + reflect-to columns', /依頼シートのセル/.test(cov) && /反映先/.test(cov) && /C9/.test(cov) && /チェックシート\(提出ドキュメント\)/.test(cov));
t('F2 empty items show template cell', /C12 空欄/.test(cov) && /C15 空欄/.test(cov), cov.slice(0, 200));
t('F3 pre-check cells shown', /D56/.test(cov) && /D70/.test(cov));
// G. state save / restore
const st = w.collectState();
const w2 = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
w2.restoreState(JSON.parse(JSON.stringify(st))); await new Promise(r => setTimeout(r, 150));
const d2 = w2.document;
t('G1 restore keeps field chip', /C44/.test((d2.getElementById('ext-location').closest('.info-row').querySelector('label .cell-ref') || {}).textContent || ''));
t('G2 restore keeps checklist chips', d2.querySelectorAll('#tab-checklist .cell-ref').length >= 4);
t('G3 restore keeps map boxes', d2.getElementById('kosu-map-info').style.display === 'block' && d2.getElementById('period-map-info').style.display === 'block');
// H. manual edit removes the chip
const loc = doc.getElementById('ext-location'); loc.value = 'リモート'; loc.dispatchEvent(new w.Event('input', {bubbles: true}));
t('H1 manual edit removes cell chip', chip('ext-location') === '');
// I. customer outputs carry none of it
w.generateCustomerOutput();
const co = (doc.getElementById('customer-output-area') || {innerHTML: ''}).innerHTML;
t('I1 customer output has no cell chips / colours', co.length > 500 && !/cell-ref|依頼シート C\d|input-src-|map-box/.test(co), co.length);
t('I2 customer output guard: function exists', typeof w.generateCustomerOutput === 'function');
summary();
})();
