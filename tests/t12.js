const {load, t, XLSX, TPL_BLACK, ROOT, summary} = require('./harness');
const fs = require('fs');
(async () => {
console.log('[T12] workload / travel tabs: source colours and request-sheet derived values');
const w = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300)); const doc = w.document;
// A. meeting text -> hours per month
const H = s => w.meetingHoursPerMonth(s);
t('A1 週２回（各1時間）２名 = 17.5h/月', H('週２回　（各1時間）　２名　出席　＠リモート') === 17.5, H('週２回　（各1時間）　２名　出席　＠リモート'));
t('A2 月1回 2時間 = 2h', H('月1回（2時間）') === 2, H('月1回（2時間）'));
t('A3 unparsable => null (no guess)', H('適宜') === null && H('') === null);
// B. import black template
const wb = XLSX.read(fs.readFileSync(TPL_BLACK), {type: 'buffer', cellStyles: true, bookFiles: true});
const p = w.parseQuotationRequestExcel(wb);
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(p));
w.checkIncomingRequestHandoff(); await new Promise(r => setTimeout(r, 300));
const K = w.eval('kosuData');
const allZero = Object.keys(K).every(k => K[k].values.every(v => v === 0));
t('B1 v2.5.8: 工数 stays at the initial value 0 after import (no 打合せ回数 auto-fill)', allZero && K.mtg1.values[0] === 0 && K.mtg1.values[11] === 0);
t('B2 no row is marked system-decided (blue) and no row carries a request-sheet basis', Object.keys(K).every(k => !K[k].src && !K[k].cell));
t('B3 every hour input is an editable number box starting at 0', Array.from(doc.querySelectorAll('input[data-krow]')).every(i => i.type === 'number' && !i.readOnly && i.value === '0'));
t('B4 the 工数 map box says hours are not auto-filled', /自動反映しません/.test(doc.getElementById('kosu-map-info').textContent) && !/月17\.5h/.test(doc.getElementById('kosu-map-info').textContent), doc.getElementById('kosu-map-info').textContent);
t('B5 no basis memo is written to the hint column', !/打合せ回数/.test(K.mtg1.hint));
// C. manual edit -> manual (black)
const inp = doc.querySelector('input[data-krow="des1"]'); inp.value = '55'; inp.dispatchEvent(new w.Event('input', {bubbles: true}));
t('C1 edit => manual (black)', w.eval("kosuData['des1'].src") === 'manual' && doc.querySelector('input[data-krow="des1"]').className === 'input-src-manual');
t('C2 value kept', w.eval("kosuData['des1'].values[0]") === 55);
const inp2 = doc.querySelector('input[data-krow="mtg1"]'); inp2.value = '12.5'; inp2.dispatchEvent(new w.Event('input', {bubbles: true}));
t('C3 any number can be typed and changed again (定例打ち合わせ 12.5 -> 8)', (() => { const e = doc.querySelector('input[data-krow="mtg1"]'); const a = w.eval("kosuData['mtg1'].values[0]") === 12.5; e.value = '8'; e.dispatchEvent(new w.Event('input', {bubbles: true})); return a && w.eval("kosuData['mtg1'].values[0]") === 8; })());
// D. entered hours are not overwritten by a re-import
w.eval("kosuData['mtg1'].values[0]=3; kosuData['mtg1'].src='manual'");
w.sessionStorage.setItem('STORAGE_QUOTATION_REQUEST_DATA', JSON.stringify(p)); w.checkIncomingRequestHandoff(); await new Promise(r => setTimeout(r, 300));
t('D1 re-import does not overwrite entered mtg1', w.eval("kosuData['mtg1'].values[0]") === 3);
// E. travel tab shows request-sheet info in red, distance not decided
const box = doc.getElementById('travel-req-info');
t('E1 travel info visible with location + meeting', box.style.display === 'block' && /千歳/.test(box.textContent) && /週２回/.test(box.textContent), box.textContent);
t('E2 request values use request colour', box.querySelectorAll('.input-src-auto').length === 2, box.innerHTML.slice(0, 200));
t('E3 distance zone not auto-decided', doc.getElementById('ta-zone').value === '');
// F. state save / restore keeps src
const st = w.collectState();
t('F1 state keeps kosu src and the entered hours', st.kosuData.des1.src === 'manual' && st.kosuData.des1.values[0] === 55 && !st.kosuData.bld2.src);
const w2 = load('quotation-generator.html'); await new Promise(r => setTimeout(r, 300));
w2.restoreState(JSON.parse(JSON.stringify(st))); await new Promise(r => setTimeout(r, 100));
t('F2 restore keeps kosu src + class + hours', w2.eval("kosuData['des1'].src") === 'manual' && w2.eval("kosuData['des1'].values[0]") === 55 && w2.document.querySelector('input[data-krow="des1"]').className === 'input-src-manual');
// G. customer outputs carry no colours/badges
const cs = String(w.buildKosuSheet ? w.buildKosuSheet() : '');
t('G2 kosu sheet output has no source classes', !/input-src-|kosu-badge/.test(cs));
w.generateCustomerOutput();
const coHtml = (w.document.getElementById('customer-output-area') || {innerHTML: ''}).innerHTML;
t('G3 customer output generated and does not leak the basis memo', coHtml.length > 500 && !/から月17\.5hを算出|kosu-badge|input-src-/.test(coHtml), coHtml.length);
t('G4 output functions exist (guard against vacuous pass)', typeof w.generateCustomerOutput === 'function' && typeof w.buildKosuSheet === 'function');
summary();
})();
