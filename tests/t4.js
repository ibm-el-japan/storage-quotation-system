const {load, t, XLSX, ROOT, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T4] slink-spec-generator');
// get a realistic tool state from the quotation tool
const q = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300));
const req = {customerName:'テスト株式会社', projectName:'Ceph構築', workDetail:'IBM Storage Ceph 8.x の5ノード構成における基本設計', docs:['基本設計書'], serviceExclusions:'・ネットワーク関連作業', meetingFrequency:'週1回 リモート', workLocation:'リモート', products:['Ceph'], paymentPlan:'各月（標準）'};
q.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req)); q.checkIncomingRequestHandoff();
const CL = q.eval('CHECKLIST_DATA');
CL.find(s=>s.title==='前提').items.find(i=>/土日祝日対応/.test(i.text)).checked = false;
q.eval("kosuData['des1'].values[0]=40; kosuData['bld2'].values[0]=32;"); q.recalcAll();
const state = q.collectState();
const w = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify(req), STORAGE_QUOTATION_TOOL_STATE: JSON.stringify(state)});
await new Promise(r=>setTimeout(r,300));
const spec = w.generateCleanDocHtml('spec', true);
const specText = new w.DOMParser().parseFromString('<body>'+spec+'</body>','text/html').body.innerText || new w.DOMParser().parseFromString('<body>'+spec+'</body>','text/html').body.textContent;
const lines = spec.replace(/<\/p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,'').split('\n').map(s=>s.trim());
const prem = lines.slice(lines.indexOf('２．サービスの前提条件')+1, lines.indexOf('３．サービスの適用除外')).filter(Boolean);
console.log('  前提 先頭3行:', prem.slice(0,3));
t('R9: premises numbered （1）（2）…', prem.length>3 && prem.every((l,i)=>l.startsWith('（'+(i+1)+'）')), prem.map(l=>l.slice(0,6)));
t('R3: unchecked 土日祝日 premise absent from spec', !/土日祝日対応がある場合/.test(spec));
t('R3: checked premise present', /平日標準勤務時間/.test(spec));
t('R9: spec has no <h2>/<h3>/<table>', !/<(h2|h3|table)/i.test(spec));
t('R9: spec ends with 以上', /以上<\/p>$/.test(spec));
t('R4: scope has no stray bullet-only line', !/・(設計|構築|稼動テスト|ドキュメント|Q&A)\s*\n/.test(w.eval('specDocData').scope));
t('spec scope includes custom detail from request', /5ノード構成/.test(w.eval('specDocData').scope));
const appx = w.generateCleanDocHtml('appx', true);
t('R9: appendix has no table/heading tags', !/<(h2|h3|table|th|td)/i.test(appx));
t('R10: no default lump-sum payment (placeholder shown)', /＊（営業確認後/.test(appx));
t('R10: sm20 says 要営業確認', /要営業確認/.test(w.eval('slinkMetaList').find(m=>m.id==='sm20').val));
// Word export CSS
let docHtml=null; w.Blob = function(parts){ docHtml = parts[0]; }; w.URL.createObjectURL=()=> 'blob:x'; w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click = function(){};
w.downloadSingleDoc('appx');
t('R9: Word export is 10pt, no table/heading css', /font-size: 10pt/.test(docHtml) && !/h2 \{|h3 \{|th, td/.test(docHtml) && !/10\.5pt/.test(docHtml));
t('R9: Word uses tab-stop (not table) for 製品/数量', /mso-tab-count/.test(docHtml) && !/<table/i.test(docHtml));
// CPS import with real filled sample
const cpsPath = ROOT + 'work/CostPlanSheetINF2026v1.1_MHI_BOU_KOUCHIKU_2611-2702_20260908_2.xlsm';
const wb = XLSX.read(fs.readFileSync(cpsPath), {type:'buffer', cellDates:true});
const res = w.parseCpsPaymentPlan(wb);
console.log('  CPS parsed:', JSON.stringify(res));
t('CPS: 4 payment rows', res.rows.length===4, res.rows.length);
t('CPS: amounts 12M,12M,12M,11M', res.rows.map(r=>r.amount).join()==='12000000,12000000,12000000,11000000', res.rows.map(r=>r.amount));
t('CPS: first due date 2026年12月30日', res.rows[0].date==='2026年12月30日', res.rows[0].date);
t('CPS: service price 47,000,000', res.cpsPrice===47000000, res.cpsPrice);
t('CPS: service period', res.cpsFrom==='2026年11月1日' && res.cpsTo==='2027年2月28日', [res.cpsFrom,res.cpsTo]);
// apply into appendix
const ad = w.eval('appxDocData'); ad.paymentPlan = res.rows; ad.price='¥47,000,000';
const appx2 = w.generateCleanDocHtml('appx', true).replace(/<\/p>/g,'\n').replace(/<[^>]+>/g,'');
t('appendix shows 4 CPS rows + total ¥47,000,000', /2026年12月30日/.test(appx2) && /2027年3月30日/.test(appx2) && /合 計.*¥47,000,000/.test(appx2.replace(/\s+/g,' ')), appx2.slice(appx2.indexOf('支払計画'), appx2.indexOf('支払計画')+300));
t('mismatch warning absent when equal', !/一致しません/.test(w.renderPaymentRowsHtml()));
ad.price='¥40,000,000';
t('mismatch warning present when totals differ', /一致しません/.test(w.renderPaymentRowsHtml()));
summary();
})();
