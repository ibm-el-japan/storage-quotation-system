const {load, t, ROOT, summary} = require('./harness');
const fs = require('fs'), crypto = require('crypto');
(async () => {
console.log('[T14] case-file repo target + admin password hash');
const src = fs.readFileSync(ROOT + 'quotation-generator.html', 'utf8');
const w = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
// jsdom has no WebCrypto: supply Node's (browsers on https/localhost have crypto.subtle natively)
Object.defineProperty(w, 'crypto', {value: crypto.webcrypto, configurable: true}); w.TextEncoder = TextEncoder;
// A. GitHub target = private work repo
t('A1 owner/repo = ibmkevin/storage-quotation-work', w.eval('GH_REPO_OWNER') === 'ibmkevin' && w.eval('GH_REPO_NAME') === 'storage-quotation-work');
t('A2 work path = work', w.eval('GH_WORK_PATH') === 'work');
t('A3 upload / worklog links go to the private repo', /ibmkevin\/storage-quotation-work\/upload\/main\/work/.test(w.eval('GH_UPLOAD_URL')) && /ibmkevin\/storage-quotation-work\/edit/.test(w.eval('GH_WORKLOG_URL')));
t('A4 no GitHub API / upload / settings link targets the public repo', !/github\.com\/ibm-el-japan\/storage-quotation-system\/(settings|commits|upload|edit|contents)/.test(src) && !/repos\/ibm-el-japan/.test(src));
t('A5 app Pages URL kept for the portal link', w.eval('GH_APP_PAGES') === 'https://ibm-el-japan.github.io/storage-quotation-system/');
// B. admin password: no plaintext, hash-based check
t('B1 no ADMIN_PASSWORD constant / plaintext "admin" comparison', !/ADMIN_PASSWORD\b/.test(src) && !/pw === ['"]admin['"]/.test(src));
t('B2 hash constant is 64 hex', /^[0-9a-f]{64}$/.test(w.eval('ADMIN_PW_SHA256')));
t('B3 old default "admin" does not match', (await w.eval("sha256Hex(ADMIN_PW_SALT + 'admin')")) !== w.eval('ADMIN_PW_SHA256'));
const h = x => crypto.createHash('sha256').update(x).digest('hex');
t('B4 sha256Hex matches node crypto', (await w.eval("sha256Hex('abc')")) === h('abc'));
// C. login flow (prompt stubbed); reads password from env only when provided
const pw = process.env.SQS_ADMIN_PW;
if (pw) {
  w.prompt = () => pw; await w.promptAdminLogin();
  t('C1 correct password unlocks admin', w.eval('_isAdmin') === true);
  await w.promptAdminLogin();
  t('C2 second click logs out', w.eval('_isAdmin') === false);
} else { console.log('  (C skipped: set SQS_ADMIN_PW to test the real password)'); }
w.prompt = () => 'wrong'; await w.promptAdminLogin();
t('C3 wrong password stays locked', w.eval('_isAdmin') === false);
w.prompt = () => null; await w.promptAdminLogin();
t('C4 cancel stays locked', w.eval('_isAdmin') === false);
// D. file list requires a PAT (private repo)
w.eval("sessionStorage.removeItem('gh_pat')"); w.openGhLoadModal();
const before = w.document.getElementById('gh-file-list').innerHTML;
await w.loadGhFileList();
t('D1 list without PAT is refused (no API call, list unchanged)', w.document.getElementById('gh-file-list').innerHTML === before);
t('D2 modal states the private repo', /ibmkevin\/storage-quotation-work/.test(w.document.getElementById('gh-modal-body').textContent) && /非公開/.test(w.document.getElementById('gh-modal-body').textContent));
summary();
})();
