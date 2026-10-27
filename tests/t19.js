const {load, t, summary} = require('./harness');
(async()=>{
const w = load('quotation-generator.html'); await new Promise(r=>setTimeout(r,300)); const doc = w.document; const $ = id => doc.getElementById(id);
console.log('[T19] 交通費等: 距離区分の定義と宿泊費(円/泊)の自動算出');
const L = f => w.taLodgeFromFare(f);
// A. 宿泊費 = 2名分の往復運賃 × 1.3 を 5,000円単位で切上げ
t('A1 新幹線 28,000 -> 2名×1.3=72,800 -> 75,000', L(28000) === 75000, L(28000));
t('A2 ちょうど5,000円単位 25,000 -> 65,000 (余計に切り上げない)', L(25000) === 65000, L(25000));
t('A3 10,000 -> 26,000 -> 30,000', L(10000) === 30000, L(10000));
t('A4 航空機 40,000 -> 104,000 -> 105,000', L(40000) === 105000, L(40000));
t('A5 1円超過 19,231 -> 50,000.6 -> 55,000 / 19,230 -> 49,998 -> 50,000', L(19231) === 55000 && L(19230) === 50000, [L(19231), L(19230)]);
t('A6 0・空欄・負数は 0', L(0) === 0 && L('') === 0 && L(-5) === 0 && L(undefined) === 0);
t('A7 浮動小数の誤差が出ない (運賃 1..60000 の全件が5,000の倍数かつ 2.6倍以上・5,000未満の超過)',
  (() => { for (let f = 1; f <= 60000; f++) { const r = L(f); if (r % 5000 !== 0 || r < f * 2.6 - 1e-6 || r - f * 2.6 >= 5000 + 1e-6) return f; } return true; })());
t('A8 TA_RULE の定数: 2名・30%・5,000円', w.eval('TA_RULE.lodgePersons') === 2 && w.eval('TA_RULE.lodgeUpliftPct') === 30 && w.eval('TA_RULE.lodgeUnit') === 5000);
// B. 画面での連動
t('B1 初期値 0・往復交通費は空欄・バッジ=システム', $('ta-lodge').value === '0' && $('ta-fare').value === '' && $('ta-lodge-badge').textContent === 'システム');
$('ta-fare').value = '28000'; $('ta-fare').dispatchEvent(new w.Event('input'));
t('B2 往復交通費を入力 -> 宿泊費が自動算出 75000', $('ta-lodge').value === '75000', $('ta-lodge').value);
t('B3 算出根拠が表示される', /2名/.test($('ta-lodge-note').textContent) && /75,000/.test($('ta-lodge-note').textContent), $('ta-lodge-note').textContent);
$('ta-trans').value = 'air'; $('ta-fare').value = '40000'; $('ta-fare').dispatchEvent(new w.Event('input'));
t('B4 航空機 40,000 -> 105000、根拠に「航空機」', $('ta-lodge').value === '105000' && /航空機/.test($('ta-lodge-note').textContent), [$('ta-lodge').value, $('ta-lodge-note').textContent]);
$('ta-lodge').value = '60000'; $('ta-lodge').dispatchEvent(new w.Event('input'));
t('B5 宿泊費を直接入力 -> 手入力バッジ・値を保持', $('ta-lodge').value === '60000' && $('ta-lodge-badge').textContent === '手入力');
$('ta-fare').value = '50000'; $('ta-fare').dispatchEvent(new w.Event('input'));
t('B6 手入力後は往復交通費を変えても宿泊費を上書きしない', $('ta-lodge').value === '60000' && /手入力のため/.test($('ta-lodge-note').textContent), $('ta-lodge').value);
$('ta-lodge').value = ''; $('ta-lodge').dispatchEvent(new w.Event('input'));
t('B7 宿泊費を空欄に戻すと自動算出に戻る (50,000 -> 130,000)', $('ta-lodge').value === '130000' && $('ta-lodge-badge').textContent === 'システム', [$('ta-lodge').value, $('ta-lodge-badge').textContent]);
// C. 算定結果・その他費用への反映
$('ta-zone').value = 'long'; $('ta-zone').dispatchEvent(new w.Event('change'));
$('ta-people').value = '2'; $('ta-people').dispatchEvent(new w.Event('input'));
w.eval('kosuData["bld2"].values[0]=80'); w.recalcAll();
const r = w.taCalc();
t('C1 taCalc の宿泊費単価は画面の宿泊費 (130,000)', r.ok && r.lodge === 130000 && r.fare === 50000, r);
t('C2 宿泊費に上限なし・合計 = 運賃×人数×訪問 + 宿泊費×人数×宿泊 + 手当', r.total === 50000*2*r.trips + 130000*2*r.nights + r.allowUnit*2*r.allowCnt, r.total);
w.taApply();
const tr1 = w.eval('travelRows.find(x=>x.id==="tr1")');
t('C3 その他費用の宿泊費行に単価130,000が入る', tr1.unit === 130000 && tr1.src === 'tool', tr1);
// D. 距離区分の定義 (出張判定図.pdf)
const opt = [...$('ta-zone').options].map(o => o.value + ':' + o.textContent);
t('D1 距離区分は 未選択/短/中/遠 の4択 (自動選択しない)', opt.length === 4 && $('ta-zone').value === 'long', opt);
const z = Object.fromEntries([...$('ta-zone').options].map(o => [o.value, o.textContent]));
t('D2 短距離=赤線・青線が無い日帰り圏 / 中距離=赤線 / 遠距離=青線または図の範囲外', /日帰り圏/.test(z.short) && /赤線が無い|赤線・青線が無い/.test(z.short) && /赤線/.test(z.mid) && /青線/.test(z.long) && /範囲外/.test(z.long), z);
const card = $('travel-assist-card').textContent;
t('D3 基点(東京駅/名古屋/大阪/幕張)と範囲外=遠距離の説明がある', /東京駅/.test(card) && /名古屋/.test(card) && /大阪/.test(card) && /幕張/.test(card) && /仙台/.test(card), null);
t('D4 参考情報に宿泊費ルール(2名分・30%・5,000円単位・新幹線/航空機)', /2名分の新幹線往復運賃×1\.3/.test(doc.body.textContent) && /航空機往復運賃×1\.3/.test(doc.body.textContent) && /5,000円単位で切り上げ/.test(doc.body.textContent));
t('D5 場所の初期値・距離区分の初期値は未選択 (R6)', (() => { const w2 = load('quotation-generator.html'); return w2.document.getElementById('ta-zone').value === '' && w2.document.getElementById('ta-office').value === ''; })());
summary();
})();
