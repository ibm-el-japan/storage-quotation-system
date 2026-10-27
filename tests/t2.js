const {load, t, XLSX, ROOT, summary} = require('./harness');
(async () => {
const w = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
const doc = w.document;
console.log('[T2] customer output: R3 unchecked excluded / hint not leaked / custom work detail');
const req = {customerName:'テスト株式会社', projectName:'Ceph構築', workDetail:'以下の製品の支援\n① Ceph x 5台\n　・設計\n　・構築\nIBM Storage Ceph 8.x の5ノード構成における基本設計とRGW構成\nクラスタ初期構築とS3疎通確認', docs:['基本設計書'], serviceExclusions:'・ネットワーク関連作業', meetingFrequency:'週1回 リモート', workLocation:'リモート', products:['Ceph']};
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req));
w.checkIncomingRequestHandoff();
const CL = w.eval('CHECKLIST_DATA');
const svc = CL.find(s=>s.title==='サービス内容').items.filter(i=>i.text.trim());
t('custom detail lines imported', svc.some(i=>/5ノード構成/.test(i.text)) && svc.some(i=>/S3疎通/.test(i.text)), svc.map(i=>i.text));
t('v2.2.0 kept: generic defaults replaced when request has real detail', !svc.some(i=>/^1\. 設計作業/.test(i.text)), svc.map(i=>i.text));
t('header/boilerplate not imported', !svc.some(i=>/以下の製品|^設計$|^構築$|^①/.test(i.text)));
// uncheck a template premise and an exclusion; add known marker text
const prem = CL.find(s=>s.title==='前提'); prem.items.find(i=>/土日祝日対応/.test(i.text)).checked = false;
const unchecked = CL.find(s=>/適用除外 — テスト/.test(s.title)); unchecked.items[0].checked = false;
const markerTest = unchecked.items[0].text;
// give hours so quote rows appear
const K = w.eval('kosuData'); K['des1'].values[0]=40; K['bld2'].values[0]=32;
w.generateCustomerOutput();
const out = doc.getElementById('customer-output-area').textContent;
t('R3: unchecked premise (土日祝日対応) absent', !/土日祝日対応がある場合/.test(out));
t('R3: unchecked exclusion absent', !out.includes(markerTest));
t('R3: checked premise present', /平日標準勤務時間/.test(out));
t('R3: unchecked docs (導入手順書) absent', !/導入手順書/.test(out));
t('hint leak: internal policy text absent', !/社内検証作業は含めない|ドキュメントに含める|作業人数を確認すること|Contingencyで対応/.test(out));
t('quote table still has rows (基本機能設計 / 基本構築)', /基本機能設計/.test(out) && /基本構築/.test(out));
// R4 in output: stray one-liner
t('R4: no stray bullet-only line in output', !/(^|\n)\s*[・]?\s*(設計|構築|稼動テスト|ドキュメント|Q&A)\s*(\n|$)/.test(out));
summary();
})();
