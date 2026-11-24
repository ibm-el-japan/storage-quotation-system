const {load, t, summary} = require('./harness');

(async () => {
  const w = load('quotation-generator.html');
  await new Promise(r => setTimeout(r, 300));
  const doc = w.document;
  const $ = id => doc.getElementById(id);

  console.log('[T24] travel preset locations, return allowance, and movements (v2.5.16)');

  // 1. Preset definitions and verified fares
  const presets = w.eval('TA_PRESETS');
  t('TA_PRESETS array exists and has at least 11 items (10 major + unselected/other)', Array.isArray(presets) && presets.length >= 11);

  const expectedTable = [
    { id: 'nagoya', name: '名古屋', zone: 'long', trans: 'shinkansen', fare: 30000 },
    { id: 'kyoto', name: '京都', zone: 'long', trans: 'shinkansen', fare: 40000 },
    { id: 'osaka', name: '大阪', zone: 'long', trans: 'shinkansen', fare: 40000 },
    { id: 'hiroshima', name: '広島', zone: 'long', trans: 'shinkansen', fare: 50000 },
    { id: 'fukuoka', name: '福岡（博多）', zone: 'long', trans: 'air', fare: 80000 },
    { id: 'fukushima', name: '福島', zone: 'mid', trans: 'shinkansen', fare: 30000 },
    { id: 'sendai', name: '仙台', zone: 'long', trans: 'shinkansen', fare: 30000 },
    { id: 'morioka', name: '盛岡', zone: 'long', trans: 'shinkansen', fare: 40000 },
    { id: 'aomori', name: '青森', zone: 'long', trans: 'shinkansen', fare: 50000 },
    { id: 'sapporo', name: '北海道（札幌）', zone: 'long', trans: 'air', fare: 100000 }
  ];

  for (const exp of expectedTable) {
    const item = presets.find(x => x.id === exp.id);
    t('preset ' + exp.name + ' matches verified fare ¥' + exp.fare + ' (' + exp.zone + ', ' + exp.trans + ')',
      item && item.name === exp.name && item.zone === exp.zone && item.trans === exp.trans && item.fare === exp.fare,
      item);
  }

  // 2. Select preset in UI -> updates office, zone, trans, fare, lodge
  $('ta-preset').value = 'osaka';
  $('ta-preset').dispatchEvent(new w.Event('change'));

  t('selecting osaka sets office="大阪"', $('ta-office').value === '大阪');
  t('selecting osaka sets zone="long"', $('ta-zone').value === 'long');
  t('selecting osaka sets trans="shinkansen"', $('ta-trans').value === 'shinkansen');
  t('selecting osaka sets fare="40000"', $('ta-fare').value === '40000');
  t('selecting osaka auto-computes lodge: 40000*2*1.3 -> 105,000', $('ta-lodge').value === '105000');

  // 3. Select Fukuoka (airplane)
  $('ta-preset').value = 'fukuoka';
  $('ta-preset').dispatchEvent(new w.Event('change'));
  t('selecting fukuoka sets office="福岡（博多）", trans="air", fare=80000',
    $('ta-office').value === '福岡（博多）' && $('ta-trans').value === 'air' && $('ta-fare').value === '80000');
  t('selecting fukuoka auto-computes lodge: 80000*2*1.3 -> 210,000', $('ta-lodge').value === '210000');

  // 4. Return-day allowance and total movements calculation
  // Set 200h onsite (e.g. 5 weeks of 40h -> 5 base trips, with 20% buffer = 6 trips)
  $('ta-preset').value = 'osaka';
  $('ta-preset').dispatchEvent(new w.Event('change'));
  $('ta-people').value = '2';
  $('ta-weekh').value = '40';
  $('ta-npt').value = '4'; // 4 nights per 5 business days
  $('ta-meal').value = '4000';
  w.eval('kosuData["bld2"].values[0] = 200');
  w.recalcAll();
  $('ta-people').dispatchEvent(new w.Event('input'));

  const r = w.taCalc();
  t('r.ok is true for 200h long stay', r.ok === true);
  t('trips = 6 (5 + 20%)', r.trips === 6);
  t('total movements = 6 trips * 2 one-way * 2 persons = 24', r.totalMovements === 24);
  t('nights = 24 (20 + 20%)', r.nights === 24);
  t('stay allowance unit = 4000, cnt = 24', r.allowUnit === 4000 && r.allowCnt === 24);
  t('return-day allowance unit = 3500, cnt = 6 (1 per 5 business days trip)', r.returnAllowUnit === 3500 && r.returnAllowCnt === 6);
  t('stay allowance total = 4000 * 24 * 2 = ¥192,000', r.stayAllowTotal === 192000);
  t('return allowance total = 3500 * 6 * 2 = ¥42,000', r.returnAllowTotal === 42000);
  t('allowance total = ¥192,000 + ¥42,000 = ¥234,000', r.allowTotal === 234000);
  const expectedGrandTotal = (40000 * 2 * 6) + (105000 * 2 * 24) + 234000;
  t('overall total includes fare + lodge + both allowances: ¥' + expectedGrandTotal, r.total === expectedGrandTotal);

  // 5. taApply applies both stay allowance (tr2) and return-day allowance (tr2_ret)
  w.taApply();
  const rows = w.eval('travelRows');
  const t0 = rows.find(x => x.id === 'tr0');
  const t1 = rows.find(x => x.id === 'tr1');
  const t2 = rows.find(x => x.id === 'tr2');
  const t2ret = rows.find(x => x.id === 'tr2_ret');

  t('apply: tr0 fare is 40,000, qty=2, cnt=6', t0 && t0.unit === 40000 && t0.qty === 2 && t0.cnt === 6);
  t('apply: tr1 lodge is 105,000, qty=2, cnt=24', t1 && t1.unit === 105000 && t1.qty === 2 && t1.cnt === 24);
  t('apply: tr2 stay allowance is 4,000, qty=2, cnt=24', t2 && t2.unit === 4000 && t2.qty === 2 && t2.cnt === 24);
  t('apply: tr2_ret return-day allowance is 3,500, qty=2, cnt=6', t2ret && t2ret.unit === 3500 && t2ret.qty === 2 && t2ret.cnt === 6);

  // 6. Day trip Fukushima (mid distance)
  $('ta-preset').value = 'fukushima';
  $('ta-preset').dispatchEvent(new w.Event('change'));
  $('ta-mode').value = 'day';
  $('ta-mode').dispatchEvent(new w.Event('change'));
  w.eval('kosuData["bld2"].values[0] = 16');
  w.recalcAll();
  $('ta-people').value = '1';
  $('ta-people').dispatchEvent(new w.Event('input'));

  const rMid = w.taCalc();
  t('mid day-trip: allowance is 1,500 * 3 trips * 1 person = 4500, no return allowance',
    rMid.allowUnit === 1500 && rMid.returnAllowCnt === 0 && rMid.allowTotal === 4500);

  w.taApply();
  const rowsMid = w.eval('travelRows');
  t('mid day-trip: tr2_ret is removed when not long-stay', !rowsMid.some(x => x.id === 'tr2_ret'));

  // 7. Free text / custom option
  $('ta-preset').value = 'other';
  $('ta-preset').dispatchEvent(new w.Event('change'));
  $('ta-office').value = '特命開発センター（つくば）';
  $('ta-zone').value = 'mid';
  $('ta-fare').value = '12000';
  $('ta-fare').dispatchEvent(new w.Event('input'));
  w.taApply();
  const customRows = w.eval('travelRows');
  t('custom input place preserved in travelRows', customRows[0].place === '特命開発センター（つくば）・中距離');

  summary();
})();
