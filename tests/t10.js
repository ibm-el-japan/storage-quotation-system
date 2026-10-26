const {load, t, XLSX, ROOT, TPL_BLACK, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T10] customer-facing output stays free of source colours');
const rd = f => XLSX.read(fs.readFileSync(f), {type:'buffer', cellStyles:true, bookFiles:true});
const g = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300));
const req = g.parseQuotationRequestExcel(rd(TPL_BLACK));
g.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req)); g.checkIncomingRequestHandoff();
const bad = /txt-auto|txt-ref|txt-sys|src-badge|input-src-|c00000|8b8f98|1d4ed8|org-auto|src-pill/;
// customer-facing output (checklist-based: サービス内容/前提/除外 etc.)
g.generateCustomerOutput();
const co = g.document.getElementById('customer-output-area');
const coHtml = co ? co.innerHTML : '';
t('customer output generated with content', coHtml.length > 500 && /Ceph|Fusion|ネットワーク関連作業/.test(coHtml), coHtml.length);
t('customer output has no source colour/badge markup', !bad.test(coHtml), (coHtml.match(bad)||[])[0]);
t('customer output contains request-sheet items (confirms checklist src=auto items rendered)', /ネットワーク関連作業/.test(coHtml));
// slink: clean docs
g.handoffToSlink && (()=>{ try { g.handoffToSlink(); } catch(e){} })();
const payload = JSON.parse(g.sessionStorage.getItem('STORAGE_QUOTATION_REQUEST_DATA'));
const sl = load('slink-spec-generator.html', {STORAGE_QUOTATION_REQUEST_DATA: JSON.stringify(payload), STORAGE_QUOTATION_TOOL_STATE: JSON.stringify(payload.toolState)});
await new Promise(r=>setTimeout(r,300));
let spec = '', appx = '';
try { spec = sl.eval('generateCleanDocHtml("spec")'); } catch(e) { try { spec = sl.eval('generateCleanDocHtml(specDocData)'); } catch(e2) { spec = 'ERR ' + e2.message; } }
t('spec clean doc generated', typeof spec === 'string' && spec.length > 200 && !/^ERR/.test(spec), String(spec).slice(0,80));
t('spec clean doc has no source markup', !bad.test(spec));
const meta = sl.eval('slinkMetaList').map(m => m.val).join('\n');
t('S-LINK copy values are plain text', !bad.test(meta));
summary();
})();
