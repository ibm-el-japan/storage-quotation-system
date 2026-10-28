const {load, t, XLSX, TPL_BLACK, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T23] お客様提出用印刷: 出力形式 PDF / Microsoft Excel (v2.5.15)');
const rd = f => XLSX.read(fs.readFileSync(f), {type:'buffer', cellStyles:true, bookFiles:true});
const g = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
const doc = g.document;

// --- UI ---
const html = fs.readFileSync(__dirname + '/../quotation-generator.html', 'utf8');
const btnLabels = [...doc.querySelectorAll('button')].map(b => b.textContent.trim());
t('button label is 「お客様提出用印刷」 (both buttons; old 「お客様提出用 印刷/PDF」 / 「印刷 / PDF 出力」 gone)',
  doc.querySelectorAll('button[onclick="printCustomerOutput()"]').length === 1 && btnLabels.includes('🖨️ お客様提出用印刷') && !btnLabels.some(x => /お客様提出用 印刷\/PDF|印刷 \/ PDF 出力/.test(x)) && /🖨️ お客様提出用印刷<\/button>';/.test(html.slice(html.indexOf('coMenuBar.innerHTML'), html.indexOf('coArea.appendChild(coMenuBar)'))), btnLabels.filter(x => /印刷/.test(x)));
const sel = doc.getElementById('co-format');
t('format selector offers PDF and Microsoft Excel only', !!sel && [...sel.options].map(o => o.value + ':' + o.textContent.trim()).join('|') === 'pdf:PDF|xlsx:Microsoft Excel');
t('default format is PDF', sel.value === 'pdf');

// --- data: request sheet -> customer output ---
const req = g.parseQuotationRequestExcel(rd(TPL_BLACK));
g.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(req)); g.checkIncomingRequestHandoff();
g.eval("document.getElementById('customer-name').value='テスト株式会社'; document.getElementById('project-name').value='Ceph/増設:支援'");
g.eval("kosuData['des1'].values[0]=10; kosuData['des1'].values[1]=6; kosuData['bld2'].values[0]=24; kosuData['des1'].customerNote='基本設計'");
g.eval('recalcAll()');

// --- before generation: nothing happens, no file ---
let printed = 0, wrote = [];
g.print = () => { printed++; };
g.XLSX = Object.assign({}, XLSX, {writeFile: (wb, name) => wrote.push({wb, name})});
sel.value = 'xlsx'; g.printCustomerOutput();
t('Excel format without generated output: no file, no print', wrote.length === 0 && printed === 0);

g.generateCustomerOutput();
const area = doc.getElementById('customer-output-area');
t('customer output generated', !!area && area.children.length > 1);

// --- PDF path is unchanged ---
sel.value = 'pdf'; g.printCustomerOutput();
t('PDF format -> window.print(), no xlsx written', printed === 1 && wrote.length === 0);
t('PDF print restores the on-screen output', !!doc.getElementById('customer-output-area') && doc.getElementById('customer-output-area').children.length > 1 && !doc.getElementById('co-print-wrap') && !doc.body.classList.contains('print-customer'));

// --- Excel path ---
sel.value = 'xlsx'; g.printCustomerOutput();
t('Excel format -> one xlsx written, print() not called', wrote.length === 1 && printed === 1);
const name = wrote[0] && wrote[0].name;
t('file name: 概算見積_<顧客>_<案件>_YYYYMMDD.xlsx, no forbidden characters', /^概算見積_テスト株式会社_Ceph_増設_支援_\d{8}\.xlsx$/.test(name), name);
const wb = wrote[0].wb;
t('sheets: 前提シート / 見積もりシート', JSON.stringify(wb.SheetNames) === JSON.stringify(['前提シート', '見積もりシート']), wb.SheetNames);

// round-trip through a real .xlsx
const back = XLSX.read(XLSX.write(wb, {type: 'buffer', bookType: 'xlsx'}), {type: 'buffer'});
const aoa = n => XLSX.utils.sheet_to_json(back.Sheets[n], {header: 1, defval: ''});
const p = aoa('前提シート'), q = aoa('見積もりシート');
t('前提: title row has customer + project', /テスト株式会社 Ceph\/増設:支援 概算見積もり/.test(p[0][0]), p[0]);
const screenItems = [...area.querySelectorAll('.co-premise-dummy, .sheet-block:not(.co-quote-sheet) .co-item')].map(e => e.textContent.trim());
const xlItems = p.map(r => r[0]);
const lost = screenItems.filter(x => !xlItems.includes(x));
t('前提: every on-screen item is in the sheet', screenItems.length > 0 && lost.length === 0, lost.slice(0, 3));
const money = /^¥\s*[\d,]+$/;
const pf = p.find(r => r[0] === '参考見積額');
const total = g.eval("(function(){var t=0;travelRows.forEach(function(r){t+=(+r.unit||0)*(+r.qty||0)*(+r.cnt||0)});return t})()");
t('前提: 参考見積額 row has a numeric amount', !!pf && typeof pf[1] === 'number' && pf[1] > 0, pf);
t('見積もり: disclaimer, header and totals present', q[0][0].includes('概算レベル') && q[1][0].includes('QA Review') && q.some(r => r[0] === '作業項目' && r[1] === '工数' && r[2] === '作業内容'));
const tot = q.find(r => /^合計工数/.test(String(r[0])));
t('見積もり: 合計行 has the same numeric amount as 前提', !!tot && typeof tot[2] === 'number' && tot[2] === pf[1], tot);
t('見積もり: 工数 rows keep the "h" values from the screen', q.some(r => /^\d+(\.\d)?h$/.test(String(r[1]))));
const wsQ = wb.Sheets['見積もりシート'];
t('numeric cells carry a yen number format', Object.values(wsQ).some(c => c && c.t === 'n' && /¥/.test(c.z || '')));

// --- clean: no UI/source markup leaks into cells ---
const all = [...p, ...q].flat().join('\n');
t('no buttons / source colours / badges / cell chips in the workbook', !/✕|区分削除|このシートを削除|行を追加|txt-auto|src-badge|依頼シート [A-Z]+\d+|c00000|1d4ed8/.test(all));

// --- edits on screen are exported (delete a row + edit a cell) ---
const rowsBefore = q.length;
const subRow = area.querySelector('.co-quote-tbl tbody tr:not(.co-total-row) td.co-quote-sub');
const victim = subRow && subRow.textContent.replace('✕', '').trim();
if (subRow) subRow.closest('tr').remove();
const note = area.querySelector('.co-note'); note.textContent = '編集済みの注記';
wrote.length = 0; g.printCustomerOutput();
const q2 = XLSX.utils.sheet_to_json(XLSX.read(XLSX.write(wrote[0].wb, {type: 'buffer', bookType: 'xlsx'}), {type: 'buffer'}).Sheets['見積もりシート'], {header: 1, defval: ''});
t('on-screen row deletion is reflected', q2.length === rowsBefore - 1 && !q2.some(r => r[0] === victim), [q2.length, rowsBefore, victim]);
t('on-screen text edit is reflected', q2.some(r => r[0] === '編集済みの注記'));

// --- remove a whole sheet on screen -> exported file follows ---
area.querySelector('.sheet-block:not(.co-quote-sheet)').remove();
wrote.length = 0; g.printCustomerOutput();
t('deleted sheet is not exported', JSON.stringify(wrote[0].wb.SheetNames) === JSON.stringify(['見積もりシート']), wrote[0].wb.SheetNames);

// --- the real writeFile (not the stub) works in the page's XLSX build ---
const wb3 = g.buildCustomerWorkbook();
t('real XLSX.write of the workbook produces a valid zip (PK)', !!wb3 && XLSX.write(wb3, {type: 'buffer', bookType: 'xlsx'}).slice(0, 2).toString() === 'PK');
summary();
})();
