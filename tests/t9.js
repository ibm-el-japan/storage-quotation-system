const {load, t, XLSX, ROOT, TPL_BLACK, summary} = require('./harness');
const fs = require('fs');
const TPL = ROOT + 'work/見積もり依頼記入シート_テンプレート.xlsx';
const rd = f => XLSX.read(fs.readFileSync(f), {type:'buffer', cellStyles:true, bookFiles:true});
(async () => {
console.log('[T9] template coverage / grey-vs-black / source colours');
const w = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); const doc = w.document;
const P = wb => w.parseQuotationRequestExcel(wb);

// ---- A. template (grey = reference examples)
const g = P(rd(TPL));
t('A1 colour detection available', g.colorDetect === true && g.greyCellCount > 30, g.greyCellCount);
t('A2 grey inputs flagged reference', ['customerName','projectName','customerNo','salesName','tsName','startDate','workDetail','docs','products','offering','meetingFrequency','serviceExclusions'].every(k => g.origin[k] === 'reference'), g.origin);
t('A3 empty template cells flagged empty', g.origin.dnsoNo==='empty' && g.origin.bpName==='empty' && g.origin.otherMembers==='empty' && g.origin.createdDate==='empty');
t('A4 black contract section => sheet', g.origin.contractType==='sheet' && g.origin.dealType==='sheet', [g.origin.contractType,g.origin.dealType]);
t('A5 unchecked => system default', g.origin.paymentPlan==='default' && g.origin.monthlyReport==='default', [g.origin.paymentPlan,g.origin.monthlyReport]);
t('A6 oppNoService is from sheet (not derived) when present', g.origin.oppNoService==='reference');
t('A7 createdDate not silently today', g.createdDate==='');
t('A8 dealType trailing （例）text stripped', g.dealType==='直販（サブコン）', g.dealType);
t('A9 contractType', g.contractType==='支援契約（Expert Labsの単独契約）');
t('A10 on-site location detected from 北海道千歳市', g.workLocation==='お客様先（オンサイト）' && /千歳/.test(g.workLocationDetail), g.workLocation);
t('A11 products ceph + fusion', g.products.length===2 && g.products.includes('Storage Ceph') && g.products.includes('Fusion HCI'), g.products);
t('A12 period', g.startDate==='2027-01-01' && g.endDate==='2027-12-25');
t('A13 12 pre-checks, yn1=N, others Y', g.preChecks.length===12 && g.preChecks[0].yn==='N' && g.preChecks.slice(2).every(p=>p.yn==='Y'));
t('A14 pre-check Y/N cells are black in template => sheet', g.preChecks.filter(p=>p.yn).every(p=>p.origin==='sheet'), g.preChecks.map(p=>p.origin));
t('A15 confidential 無し / meeting 調整 from marks', g.confidential==='無し' && g.meetingInternal==='調整します' && g.meetingExternal==='調整します');
t('A16 docs 4', g.docs.length===4);
t('A17 workDetail keeps example text incl. products', /Fusion HCI/.test(g.workDetail) && /Ceph/.test(g.workDetail));
t('A18 greyKeys exposed', Array.isArray(g.greyKeys) && g.greyKeys.includes('customerName'));

// ---- B. same template, all text black (= a real filled request)
const b = P(rd(TPL_BLACK));
t('B1 black variant: nothing is reference', b.greyKeys.length === 0 && b.greyCellCount === 0, b.greyKeys);
t('B2 black variant: values identical to template', b.customerName===g.customerName && b.dealType===g.dealType && b.docs.length===g.docs.length && b.products.join()===g.products.join());
t('B3 black variant: filled fields are sheet', ['customerName','salesName','startDate','workDetail','docs','products'].every(k => b.origin[k]==='sheet'));
t('B4 black variant: pre-checks sheet', b.preChecks.filter(p=>p.yn).every(p=>p.origin==='sheet'));
// ---- C. mixed: old request form (some cells grey, others black)
const m = P(rd(ROOT + 'Quotation Request Form.xlsx'));
t('C1 mixed: grey customer + black others', m.origin.customerName==='reference' && m.origin.workDetail==='sheet', [m.origin.customerName, m.origin.workDetail]);
// ---- D. no style info (plain read): everything treated as sheet
const plain = P(XLSX.read(fs.readFileSync(TPL), {type:'buffer'}));
t('D1 no colour info => colorDetect false, nothing reference', plain.colorDetect===false && plain.greyKeys.length===0);
t('D2 no colour info => values still parsed', plain.customerName==='HAL（株）様' && plain.origin.customerName==='sheet');
// ---- E. D14 note: service Opp No falls back to product Opp No
const wb2 = rd(TPL_BLACK); delete wb2.Sheets[wb2.SheetNames[0]]['C14'];
const e = P(wb2);
t('E1 Opp(service) blank => system default from product', e.oppNoService===e.oppNoProduct && e.origin.oppNoService==='default', e.origin.oppNoService);

// ---- F. quotation-generator: field colours
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(g)); w.checkIncomingRequestHandoff();
const cls = id => doc.getElementById(id).className;
t('F1 grey-sourced field => input-src-ref', /input-src-ref/.test(cls('customer-name')) && /input-src-ref/.test(cls('ext-sales')), cls('customer-name'));
t('F2 system-default => input-src-tool', /input-src-tool/.test(cls('ext-pay')) && /input-src-tool/.test(cls('ext-report')), cls('ext-pay'));
t('F3 black contract info => input-src-auto', /input-src-auto/.test(cls('ext-contract')) && /input-src-auto/.test(cls('ext-deal')), cls('ext-contract'));
t('F4 empty template fields stay empty', doc.getElementById('ext-dnso').value==='' && doc.getElementById('ext-bp').value==='' && doc.getElementById('ext-others').value==='');
t('F5 author imported but createdDate empty', doc.getElementById('ext-author').value==='松村北斗' && doc.getElementById('ext-created').value==='');
t('F6 社内/社外 meeting adjust fields', doc.getElementById('ext-mtg-int').value==='調整します' && doc.getElementById('ext-mtg-ext').value==='調整します');
const sb = id => doc.getElementById(id).closest('.info-row').querySelector('.src-badge');
t('F7 badges text', /参考例/.test(sb('customer-name').textContent) && /システム/.test(sb('ext-pay').textContent) && /依頼シート/.test(sb('ext-contract').textContent), [sb('customer-name').textContent, sb('ext-pay').textContent]);
const cov = doc.getElementById('cov-body').innerHTML;
t('F8 coverage lists every template item', ['記入日','記入者','DNSO','その他案件関係者','サービス内容（概要）','社内関係者','社外関係者','相談者名','ご提供形態','月次作業報告書','支払い計画','Opportunity No（サービス）'].every(k => cov.includes(k)));
t('F9 coverage lists all 12 pre-checks', doc.querySelectorAll('#cov-body tr').length >= 40, doc.querySelectorAll('#cov-body tr').length);
t('F10 coverage has grey-reference note + classes', /参考記入例/.test(cov) && /txt-ref/.test(cov) && /txt-sys/.test(cov) && /txt-auto/.test(cov));
t('F11 checklist items from grey sheet => src ref', w.eval('CHECKLIST_DATA').some(s => s.items.some(i => i.tag==='対象製品' && i.src==='ref')));
// manual edit => manual (black)
const el = doc.getElementById('ext-sales'); el.value = '佐藤'; el.dispatchEvent(new w.Event('input'));
t('F12 edit grey value => manual', /input-src-manual/.test(cls('ext-sales')) && /手入力/.test(sb('ext-sales').textContent));
t('F13 legend describes the colours', /赤文字/.test(doc.querySelector('.cov-legend').textContent) && /青文字/.test(doc.querySelector('.cov-legend').textContent));

// ---- G. black request => red (auto) fields & checklist
const w2 = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); const d2 = w2.document;
w2.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(b)); w2.checkIncomingRequestHandoff();
const c2 = id => d2.getElementById(id).className;
t('G1 black sheet => red (input-src-auto)', ['customer-name','ext-sales','ext-docs','ext-location','svc-start'].every(id => /input-src-auto/.test(c2(id))), c2('customer-name'));
t('G2 unchecked defaults still system (blue)', /input-src-tool/.test(c2('ext-pay')));
t('G3 checklist rows red', w2.eval('CHECKLIST_DATA').some(s => s.items.some(i => i.tag==='個別除外' && i.src==='auto')));
t('G4 no grey banner when none grey', !/参考記入例/.test(d2.getElementById('cov-body').innerHTML));
// persistence
const st = JSON.parse(JSON.stringify(w2.collectState()));
t('G5 state keeps new fields', st.basic.author==='松村北斗' && st.basic.meetingInternal==='調整します');
const w3 = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); w3.restoreState(st);
t('G6 restore keeps colours', /input-src-auto/.test(w3.document.getElementById('ext-sales').className) && /input-src-tool/.test(w3.document.getElementById('ext-pay').className));

// ---- H. handoff -> slink
try { w2.handoffToSlink(); } catch(e) {}
const payload = JSON.parse(w2.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'));
t('H1 payload carries origin map', payload.origin && payload.origin.salesName==='sheet' && payload.origin.paymentPlan==='default', payload.origin);
const sl = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify(payload), STORAGE_QUOTATION_TOOL_STATE: JSON.stringify(payload.toolState)});
await new Promise(r=>setTimeout(r,300));
const sdoc = sl.document; const metas = sl.eval('slinkMetaList');
const ms = id => (metas.find(x=>x.id===id)||{}).src;
t('H2 S-LINK: request values red, computed values blue', ms('sm22')==='auto' && ms('sm18')==='auto' && ms('sm5')==='sys' && ms('sm1')==='sys' && ms('sm19')==='sys', metas.map(x=>x.id+':'+x.src).join());
t('H3 S-LINK: payment plan is system (not confirmed)', ms('sm20')==='sys');
t('H4 S-LINK inputs carry colour classes', sdoc.querySelectorAll('#slink-meta-grid input.src-auto').length>=5 && sdoc.querySelectorAll('#slink-meta-grid input.src-sys').length>=5);
t('H5 S-LINK legend rendered', /赤文字/.test(sdoc.getElementById('slink-meta-grid').textContent));
const first = sdoc.querySelector('#slink-meta-grid input.src-auto'); first.value = first.value + 'x'; first.dispatchEvent(new sl.Event('input'));
t('H6 S-LINK edit => manual (black)', first.className==='src-man');

// ---- I. request-form page
const rf = load('request-form.html'); await new Promise(r=>setTimeout(r,300)); const rd2 = rf.document;
rf.restoreFormData(g);
const row = id => rd2.getElementById(id).closest('.form-row');
t('I1 request-form: grey => org-ref', row('f-customer').classList.contains('org-ref') && row('f-sales').classList.contains('org-ref'));
t('I2 request-form: contract black => org-auto, defaults => org-sys', rd2.querySelector('input[name="deal-type"]').closest('.form-row').classList.contains('org-auto') && rd2.querySelector('input[name="report"]').closest('.form-row').classList.contains('org-sys'));
t('I3 request-form: summary field exists', !!rd2.getElementById('f-summary'));
t('I4 request-form: legend shown + grey note', rd2.getElementById('org-legend').classList.contains('show') && /参考記入例/.test(rd2.getElementById('org-note').textContent));
const inp = rd2.getElementById('f-customer'); inp.value='X'; inp.dispatchEvent(new rf.Event('input', {bubbles:true}));
t('I5 request-form: edit => org-man', row('f-customer').classList.contains('org-man') && !row('f-customer').classList.contains('org-ref'));
const pay = rf.getFormDataObject();
t('I6 request-form payload keeps origin + preChecks origin', pay.origin && pay.origin.salesName==='reference' && pay.origin.customerName==='manual' && pay.preChecks.some(p=>p.origin==='sheet'), pay.origin);
const rf2 = load('request-form.html'); await new Promise(r=>setTimeout(r,300));
rf2.restoreFormData(b);
t('I7 request-form: black sheet => org-auto', rf2.document.getElementById('f-customer').closest('.form-row').classList.contains('org-auto'));
t('I8 request-form: black sheet has no grey note', rf2.document.getElementById('org-note').style.display==='none');
summary();
})();
