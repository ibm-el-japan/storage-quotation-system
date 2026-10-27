const {load, t, summary} = require('./harness');
(async()=>{
const w = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); const doc = w.document; const $ = id => doc.getElementById(id);
console.log('[T3] travel assistant');
const K = w.eval('kosuData');
t('v2.5.9 宿泊費 円/泊 initial value is 0 (editable number)', $('ta-lodge').value === '0' && $('ta-lodge').type === 'number', $('ta-lodge').value);
K['bld2'].values[0]=120; K['tst3'].values[0]=80;          // 200h onsite (構築+テスト)
K['bld6'].values[0]=50;                                    // 移動時間 row must be excluded
w.recalcAll();
t('onsite hours auto = 200 (travel-time rows excluded)', $('ta-hours').value === '200', $('ta-hours').value);
// scenario: memo example 200h / 40h per week = 5 weeks, 5 round trips (+20%)
$('ta-zone').value='long'; $('ta-zone').dispatchEvent(new w.Event('change'));
t('long distance -> default 宿泊', $('ta-mode').value==='stay');
$('ta-people').value='2'; $('ta-fare').value='28000'; $('ta-lodge').value='15000'; $('ta-travelh').value='3';
$('ta-people').dispatchEvent(new w.Event('input'));
const r = w.taCalc();
t('weeks = 200/40 = 5, with 20% => 6 trips', r.baseTrips===5 && r.trips===6, r);
t('nights = 5*4=20 +20% = 24', r.baseNights===20 && r.nights===24, r);
t('lodge has no cap (v2.5.8): 15,000 is used as entered', r.lodge===15000);
t('overnight allowance uses meal rule (default 4,000) x nights', r.allowUnit===4000 && r.allowCnt===24, r);
t('PC rental required for long', r.pc===true);
t('travel-time hours = 3*2*6*0.5 = 18', r.extraH===18, r.extraH);
t('total = fare*2*6 + 15000*2*24 + 4000*2*24', r.total === 28000*2*6 + 15000*2*24 + 4000*2*24, r.total);
t('v2.5.8 宿泊費 label has no cap wording; label shown without cap',  !/上限/.test($('ta-lodge').closest('.info-row').textContent) && /宿泊費 円\/泊/.test($('ta-lodge').closest('.info-row').textContent));
t('v2.5.8 場所 is a free-text input (not a fixed list), label no longer 基点事業所', $('ta-office').tagName==='INPUT' && $('ta-office').type==='text' && /場所/.test($('ta-office').closest('.info-row').querySelector('label').textContent) && !/基点事業所/.test($('ta-office').closest('.info-row').textContent));
// day trip mid
$('ta-zone').value='mid'; $('ta-mode').value='day'; $('ta-mode').dispatchEvent(new w.Event('change'));
const d = w.taCalc();
t('day trip: 200h/8h=25 days +20% = 30 trips', d.baseTrips===25 && d.trips===30, d);
t('day trip: no nights, mid allowance 1,500 x trips', d.nights===0 && d.allowUnit===1500 && d.allowCnt===30, d);
$('ta-zone').value='short'; const s = w.taCalc();
t('short: no allowance, no PC rental', s.allowUnit===0 && s.pc===false, s);
// apply to table
$('ta-zone').value='long'; $('ta-mode').value='stay'; $('ta-office').value='仙台市青葉区';
w.taApply();
const rows = w.eval('travelRows');
t('apply: tr0 trips=6 qty=2 src=tool', rows[0].cnt===6 && rows[0].qty===2 && rows[0].src==='tool', rows[0]);
t('apply: tr1 nights=24', rows[1].cnt===24);
t('apply: free-text 場所 reaches the table (+距離区分)', rows[0].place==='仙台市青葉区・遠距離' && rows[1].place==='仙台市青葉区・遠距離', [rows[0].place, rows[1].place]);
$('ta-office').value='東京（本社）'; w.taApply();
t('apply: text typed in parentheses is kept as entered', w.eval('travelRows')[0].place==='東京（本社）・遠距離', w.eval('travelRows')[0].place);
t('apply: tr2 allowance cnt=24 unit=4000', rows[2].cnt===24 && rows[2].unit===4000);
t('apply: counts editable (not readonly)', !doc.querySelector('#trow-tr0 td:nth-child(5) input').readOnly);
t('apply: Tool badge shown', /システム/.test(doc.querySelector('#trow-tr0 .src-badge').textContent));
t('apply: totals flow to estimate (sum-other>0)', /[1-9]/.test($('sum-other').textContent), $('sum-other').textContent);
// manual edit flips badge
const inp = doc.querySelector('#trow-tr0 td:nth-child(5) input'); inp.value='7'; inp.dispatchEvent(new w.Event('input'));
t('manual edit -> src manual + badge', rows[0].src==='manual' && /手入力/.test(doc.querySelector('#trow-tr0 .src-badge').textContent));
// manual hours override sticks
$('ta-hours').value='80'; $('ta-hours').dispatchEvent(new w.Event('input')); K['bld2'].values[0]=10; w.recalcAll();
t('manual hours override is not overwritten', $('ta-hours').value==='80');
// save/restore keeps src
const st = w.collectState();
t('state keeps travel src', st.travelRows[0].src==='manual');
summary();
})();
