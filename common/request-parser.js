// common/request-parser.js — 見積もり依頼記入シート(.xlsx)の取込み (4ページ共通の唯一の実装)
// 使用ページ: index.html / request-form.html / quotation-generator.html / slink-spec-generator.html
// 依存: グローバルの XLSX (SheetJS)。パーサを直すときはこのファイルだけを編集する (tests/t21.js が各ページに複製が無いことを検査)。
// 保存した単体HTML(案件別ツール)では、ページ側の inlineCommonParser() がこのコードをHTMLへ埋め込む。

// ---- 依頼シートのフォント色判定 (グレー=参考記入例 / 黒=実入力) ----
// SheetJS は bookFiles:true で読み込むと wb.files に生XMLが残るため、styles / sharedStrings / sheet から文字色を判定する。
function readSheetColors(wb, sheetName) {
  const out = { grey: {}, greyCount: 0, available: false };
  try {
    const files = wb.files || {};
    const dec = f => {
      const o = files[f]; if (!o) return '';
      const c = o.content;
      if (typeof c === 'string') return c;
      if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(c);
      let s = '';
      for (let i = 0; i < c.length; i += 8192) s += String.fromCharCode.apply(null, Array.prototype.slice.call(c, i, i + 8192));
      try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
    };
    const styles = dec('xl/styles.xml');
    if (!styles) return out;
    const isGreyTag = tag => {
      if (!tag) return false;
      const th = tag.match(/theme="(\d+)"/), ti = tag.match(/tint="(-?[\d.]+)"/), rg = tag.match(/rgb="([0-9A-Fa-f]{6,8})"/);
      if (th && ti && parseFloat(ti[1]) <= -0.1 && (th[1] === '0' || th[1] === '2')) return true;
      if (rg) {
        const h = rg[1].slice(-6), r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
        return Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r >= 0x70 && r <= 0xDD;
      }
      return false;
    };
    const colorOf = xml => { const m = (xml || '').match(/<color\b[^>]*>/); return m ? m[0] : ''; };
    const fontsBlock = (styles.match(/<fonts\b[\s\S]*?<\/fonts>/) || [''])[0];
    const fontGrey = [];
    fontsBlock.replace(/<font\s*\/>|<font(?:\s[^>]*)?>([\s\S]*?)<\/font>/g, (m, inner) => { fontGrey.push(isGreyTag(colorOf(inner))); return m; });
    const xfBlock = (styles.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/) || [''])[0];
    const xfGrey = [];
    xfBlock.replace(/<xf\b[^>]*?>/g, m => { const f = m.match(/fontId="(\d+)"/); xfGrey.push(f ? !!fontGrey[+f[1]] : false); return m; });
    const sst = dec('xl/sharedStrings.xml');
    const sis = [];
    sst.replace(/<si>([\s\S]*?)<\/si>/g, (m, inner) => {
      const runs = [];
      inner.replace(/<r>([\s\S]*?)<\/r>/g, (mm, r) => {
        const t = (r.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [, ''])[1];
        const c = colorOf(r);
        runs.push({ text: t, grey: c ? isGreyTag(c) : null });
        return mm;
      });
      sis.push(runs);
      return m;
    });
    const idx = Math.max(0, (wb.SheetNames || []).indexOf(sheetName)) + 1;
    let sheetXml = dec('xl/worksheets/sheet' + idx + '.xml');
    if (!sheetXml) sheetXml = dec('xl/worksheets/sheet1.xml');
    if (!sheetXml) return out;
    out.available = true;
    sheetXml.replace(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (m, ref, attrs, body) => {
      const sm = attrs.match(/\ss="(\d+)"/);
      const cellGrey = sm ? !!xfGrey[+sm[1]] : false;
      let grey = cellGrey;
      if (/\st="s"/.test(attrs) && body) {
        const v = body.match(/<v>(\d+)<\/v>/);
        const runs = v ? sis[+v[1]] : null;
        if (runs && runs.length) {
          const sig = runs.filter(r => String(r.text).trim());
          if (sig.length) grey = sig.every(r => r.grey === null ? cellGrey : r.grey);
        }
      }
      if (grey && body && /<v>|<is>/.test(body)) { out.grey[ref] = true; out.greyCount++; }
      return m;
    });
  } catch (e) { console.warn('readSheetColors failed', e); }
  return out;
}

function parseQuotationRequestExcel(wb) {
  const sheetName = wb.SheetNames.find(n => n.includes("依頼") || n.includes("Quotation") || n.includes("Sheet1")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("シートが見つかりません");

  // フォント色: グレー = テンプレートの参考記入例 / 黒 = 実際の入力値
  const colors = readSheetColors(wb, sheetName);
  const isGrey = (col, row) => !!colors.grey[col + row];
  const refs = {};
  const R = (key, col, row) => { (refs[key] = refs[key] || []).push([col, row]); };
  // 値が空でも「この項目はこのセルに記入する欄」と分かるよう、見つけたラベル行のセル番地を保持 (v2.5.4)
  const tpl = {}, trg = {};
  const T = (key, col, row) => { if (!tpl[key]) tpl[key] = col + row; };
  const Tr = (key, row) => { const r = trg[key] = trg[key] || [row, row]; r[0] = Math.min(r[0], row); r[1] = Math.max(r[1], row); };
  const OPT_ROW = /^[\u2000-\u2BFF\uFE0F\s]*[□■◾☑✔●]/;
  // 選択肢末尾の「（例）…」注記を除去
  const cleanOpt = s => String(s || '').replace(/[\u3000\s]*[（(]例[）)].*$/, '').replace(/[\u3000\s]+$/, '').trim();
  const stripMark = s => String(s || '').replace(/^[■◾️☑✔●\s□]+/, '').trim();
  // 行ラベルの正規化 (空白・全角空白・必須マーク * を除去)
  const norm = s => String(s || '').replace(/[\s\u3000*＊]/g, '');
  // 「Name（☑️A□B□C）」形式の行は、チェック済みの下位選択肢だけを残す (v2.5.4)
  const resolveSub = s => {
    const m = String(s || '').match(/^([^（(]*)[（(](.*)[）)]\s*$/);
    if (!m || !/[□■◾☑✔●]/.test(m[2])) return s;
    const on = [];
    m[2].replace(/([□■◾☑✔●])\uFE0F?([^□■◾☑✔●]*)/g, (x, mk, t) => { if (mk !== '□' && t.trim()) on.push(t.trim()); return x; });
    return on.length ? m[1].trim() + '（' + on.join('・') + '）' : m[1].trim();
  };

  const getCell = (col, row) => {
    const c = ws[col + row];
    return c ? (c.w || String(c.v !== undefined ? c.v : "")).trim() : "";
  };
  const pad2 = n => String(n).padStart(2, '0');
  // 記入日: Excel の日付セル(シリアル値/Date) と 文字列("2026/10/26", "2026年10月26日") の両方に対応 (v2.5.4)
  const getDateCell = (col, row) => {
    const c = ws[col + row];
    if (!c) return "";
    try {
      if (c.t === 'd' && c.v instanceof Date) return `${c.v.getFullYear()}-${pad2(c.v.getMonth() + 1)}-${pad2(c.v.getDate())}`;
      if (typeof c.v === 'number' && c.z && XLSX.SSF && XLSX.SSF.is_date && XLSX.SSF.is_date(c.z)) {
        const d = XLSX.SSF.parse_date_code(c.v);
        if (d && d.y) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
      }
    } catch (e) { /* 文字列として処理 */ }
    const m = getCell(col, row).match(/(\d{4})\s*[/年.-]\s*(\d{1,2})\s*[/月.-]\s*(\d{1,2})/);
    return m ? `${m[1]}-${pad2(m[2])}-${pad2(m[3])}` : "";
  };

  const data = {
    version: "2.5",
    createdDate: "",
    author: "",
    customerName: "",
    customerNo: "",
    projectName: "",
    dnsoNo: "",
    oppNoProduct: "",
    oppNoService: "",
    bpName: "",
    bpCustomerNo: "",
    salesName: "",
    tsName: "",
    elSalesName: "",
    otherMembers: "",
    offering: "Storage Expert Labs（Product：6911-450/Product Family：Expert Labs）",
    products: [],
    serviceSummary: "",
    startDate: "",
    endDate: "",
    periodNote: "",
    workLocation: "リモート",
    workLocationDetail: "",
    workDetail: "",
    docs: [],
    meetingFrequency: "",
    serviceExclusions: "",
    confidential: "無し",
    confidentialNote: "",
    meetingInternal: "調整します",
    meetingInternalNote: "",
    meetingExternal: "調整します",
    meetingExternalNote: "",
    preChecks: [],
    contractType: "支援契約（Expert Labsの単独契約）",
    dealType: "直販（サブコン）",
    paymentPlan: "各月（標準）",
    monthlyReport: "無",
    // 項目ごとの取得元: sheet=依頼シート(黒字の実入力) / reference=グレー(参考記入例) / default=システム補完 / empty=未入力
    origin: {},
    colorDetect: colors.available,
    greyCellCount: colors.greyCount
  };

  const CHECKED = "[■◾️☑✔●]";
  const CHECKED_SYMBOLS = ["■", "◾️", "☑", "✔", "●"];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:F100');

  const ynMatchRules = [
    { id: "yn1", key: "SOセールスにおけるSTGテクニカル支援依頼プロセス" },
    { id: "yn2", key: "相談者名", isText: true },
    { id: "yn3", key: "SAレビューやTCTを実施" },
    { id: "yn4", key: "SAレビューやTCT以外の提案時に必要なレビュー" },
    { id: "yn5", key: "提案前チェックリスト" },
    { id: "yn6", key: "パフォーマンスの妥当性" },
    { id: "yn7", key: "キャパシティーの妥当性" },
    { id: "yn8", key: "適切なサポート条件" },
    { id: "yn9", key: "制限/前提事項" },
    { id: "yn10", key: "例外承認" },
    { id: "yn11", key: "適切な保守契約" },
    { id: "yn12", key: "適切な運用支援サービス契約" }
  ];

  // 選択肢行: 選択済み記号が付いている行だけを採用する (■/◾️/☑ のみ。□ は未選択)
  const pickChecked = (rowStr, cVal, bVal) => {
    if (!CHECKED_SYMBOLS.some(s => rowStr.includes(s))) return "";
    return stripMark(cVal || bVal);
  };
  // 「☑️調整します（補足…）」の補足部分 (v2.5.4)
  const choiceNote = (cVal, kw) => {
    const i = cVal.indexOf(kw);
    if (i < 0) return "";
    let rest = cVal.slice(i + kw.length).split(/\r?\n/)[0].trim();
    const m = rest.match(/^[（(]([\s\S]*)[）)]$/);
    if (m) rest = m[1].trim();
    return rest;
  };
  // 日付 (YYYY年M月[D日]) の解析。年省略時は fallbackYear を使う (v2.5.4)
  const parseYMD = (s, fallbackYear) => {
    const m = String(s || '').match(/(?:(\d{4})\s*[年/.-]\s*)?(\d{1,2})\s*(?:月|[/.-])\s*(?:(\d{1,2})\s*日?)?/);
    if (!m) return null;
    const y = m[1] || fallbackYear;
    if (!y) return null;
    return { y: +y, m: +m[2], d: m[3] ? +m[3] : 0 };
  };

  // 区画(セクション)はラベルで判定する: 行番号が変わっても追従できる (v2.5.4)
  let sec = 'basic', sub = '', bpSeen = false;

  for (let R0 = range.s.r; R0 <= range.e.r; ++R0) {
    const rowNum = R0 + 1;
    const aVal = getCell('A', rowNum);
    const bVal = getCell('B', rowNum);
    const cVal = getCell('C', rowNum);
    const dVal = getCell('D', rowNum);
    const eVal = getCell('E', rowNum);
    const fVal = getCell('F', rowNum);
    const rowStr = [aVal, bVal, cVal, dVal, eVal, fVal].join(" ");
    const aN = norm(aVal), bN = norm(bVal);

    if (aN.includes('事前確認事項')) sec = 'pre';
    else if (aN.includes('契約情報')) { sec = 'contract'; sub = ''; }
    else if (aN.includes('案件情報')) sec = 'basic';
    else if (bN && sec !== 'pre' && sec !== 'contract') {
      if (/^Offering/i.test(bN)) sec = 'offering';
      else if (/対象製品/.test(bN)) sec = 'products';
      else if (sec === 'offering' || sec === 'products') sec = 'service';
    }
    if (bN && sec !== 'pre' && /ご提供形態/.test(bN)) sec = 'contract';
    if (sec === 'contract' && bN) {
      if (/ご提供形態/.test(bN)) sub = 'provider';
      else if (/契約形態/.test(bN)) sub = 'deal';
      else if (/支払い?計画/.test(bN)) sub = 'pay';
      else if (/月次/.test(bN)) sub = 'monthly';
      else sub = '';
    }

    // 1. 基本情報
    if (bVal.includes("記入日")) {
      const d = getDateCell('C', rowNum);
      T('createdDate', 'C', rowNum);
      if (d) { data.createdDate = d; R('createdDate', 'C', rowNum); }
    } else if (bVal.includes("記入者")) {
      data.author = cVal; R('author', 'C', rowNum); T('author', 'C', rowNum);
    } else if (bVal.includes("お客様名")) {
      data.customerName = cVal; R('customerName', 'C', rowNum); T('customerName', 'C', rowNum);
    } else if (bVal.includes("サービス名") || bVal.includes("案件名")) {
      data.projectName = cVal; R('projectName', 'C', rowNum); T('projectName', 'C', rowNum);
    } else if (bVal.includes("お客様番号")) {
      if (!bpSeen) { data.customerNo = cVal; R('customerNo', 'C', rowNum); T('customerNo', 'C', rowNum); }
      else { data.bpCustomerNo = cVal; R('bpCustomerNo', 'C', rowNum); T('bpCustomerNo', 'C', rowNum); }
    } else if (bVal.includes("DNSO")) {
      data.dnsoNo = cVal; R('dnsoNo', 'C', rowNum); T('dnsoNo', 'C', rowNum);
    } else if (bVal.includes("Opportunity No") && (bVal.includes("HW") || bVal.includes("製品"))) {
      data.oppNoProduct = cVal; R('oppNoProduct', 'C', rowNum); T('oppNoProduct', 'C', rowNum);
    } else if (bVal.includes("Opportunity No") && bVal.includes("サービス")) {
      data.oppNoService = cVal; R('oppNoService', 'C', rowNum); T('oppNoService', 'C', rowNum);
    } else if (bVal.includes("ビジネス・パートナー")) {
      bpSeen = true;
      data.bpName = cVal; R('bpName', 'C', rowNum); T('bpName', 'C', rowNum);
    } else if (/ExpertLabs担当営業/.test(bN)) {
      data.elSalesName = cVal; R('elSalesName', 'C', rowNum); T('elSalesName', 'C', rowNum);
    } else if (bVal.includes("担当営業名")) {
      data.salesName = cVal; R('salesName', 'C', rowNum); T('salesName', 'C', rowNum);
    } else if (bVal.includes("担当テクニカル")) {
      data.tsName = cVal; R('tsName', 'C', rowNum); T('tsName', 'C', rowNum);
    } else if (bVal.includes("その他案件関係者")) {
      data.otherMembers = cVal; R('otherMembers', 'C', rowNum); T('otherMembers', 'C', rowNum);
    }

    // 2. Offering (「Offering」行 〜 「…対象製品」行の手前)
    if (sec === 'offering') {
      if (OPT_ROW.test(cVal)) Tr('offering', rowNum);
      const clean = pickChecked(rowStr, cVal, bVal);
      if (clean && !clean.includes("支援対象Offering")) { data.offering = clean; R('offering', 'C', rowNum); }
    }

    // 3. 支援対象/サービス対象製品 (「…対象製品」行 〜 次のラベル行の手前)
    if (sec === 'products') {
      if (OPT_ROW.test(cVal)) Tr('products', rowNum);
      const clean = pickChecked(rowStr, cVal, bVal);
      if (clean && !clean.includes("支援対象製品を選択")) {
        const prod = resolveSub(clean);
        if (!data.products.includes(prod)) data.products.push(prod);
        R('products', 'C', rowNum);
      }
    }

    // 4. サービス内容 (サービス期間/支援期間 など。旧様式・新様式のラベルに両対応)
    if (/^(サービス|支援)期間/.test(bN)) {
      R('startDate', 'C', rowNum); R('endDate', 'C', rowNum); T('startDate', 'C', rowNum); T('endDate', 'C', rowNum);
      const parts = cVal.split(/～|~|〜/);
      const p1 = parseYMD(parts[0], null);
      const p2 = parts.length >= 2 ? parseYMD(parts[1], p1 ? p1.y : null) : null;
      const notes = [];
      if (p1) {
        data.startDate = `${p1.y}-${pad2(p1.m)}-${pad2(p1.d || 1)}`;
        if (!p1.d) notes.push('開始日は日の記載が無いため1日で補完');
      }
      if (p2) {
        const last = p2.d || new Date(p2.y, p2.m, 0).getDate();
        data.endDate = `${p2.y}-${pad2(p2.m)}-${pad2(last)}`;
        if (!p2.d) notes.push('終了日は日の記載が無いため月末で補完');
      }
      data.periodNote = notes.join(' / ');
    } else if (/^(サービス|支援).*場所/.test(bN)) {
      T('workLocation', 'C', rowNum);
      data.workLocationDetail = cVal;
      if (cVal) { R('workLocation', 'C', rowNum); R('workLocationDetail', 'C', rowNum); }
      const REMOTE_RE = /リモート|オンライン|在宅|Teams|Web会議/g;
      const hasRemote = /リモート|オンライン|在宅|Teams|Web会議/.test(cVal);
      const rest = cVal.replace(REMOTE_RE, '');
      const restBody = rest.replace(/[\s\u3000、,，・＋+/／()（）]/g, '');
      const hasOnsite = /オンサイト|お客様先|現地|[都道府県市区町村]|駅|最寄/.test(rest)
        || (!hasRemote && restBody !== '' && !/^(未定|TBD|なし|無し|N\/?A)$/i.test(restBody));
      if (hasRemote && hasOnsite) data.workLocation = "リモート＋オンサイト";
      else if (hasOnsite && /IBM/.test(rest) && !/お客様先|オンサイト/.test(rest)) data.workLocation = "IBM社内";
      else if (hasOnsite) data.workLocation = "お客様先（オンサイト）";
      else data.workLocation = "リモート";
    } else if (/^(サービス|支援)内容/.test(bN) && !bN.includes("詳細")) {
      if (cVal && !/見積りに必要な項目/.test(cVal)) { data.serviceSummary = cVal; R('serviceSummary', 'C', rowNum); T('serviceSummary', 'C', rowNum); }
    } else if (/^(サービス|支援)内容/.test(bN)) {
      T('workDetail', 'C', rowNum);
      // 詳細欄に「提出ドキュメント」の箇条書きが同居する様式 (v2.5.4): ドキュメントと作業内容に分離する
      const lines = ((ws['C' + rowNum] && String(ws['C' + rowNum].v != null ? ws['C' + rowNum].v : '')) || cVal).split(/\r?\n/);
      const hi = lines.findIndex(l => /^[\s\u3000]*提出ドキュメント/.test(l));
      if (hi < 0) {
        data.workDetail = cVal;
      } else {
        const bullet = /^[\s\u3000]*[・･•\-－]/;
        const docs = [];
        const inline = lines[hi].replace(/^[\s\u3000]*提出ドキュメント[:：]?\s*/, '').trim();
        if (inline) inline.split(/[、,]/).forEach(t => { if (t.trim()) docs.push(t.trim()); });
        let j = hi + 1;
        while (j < lines.length && bullet.test(lines[j])) { docs.push(lines[j].replace(bullet, '').trim()); j++; }
        docs.forEach(t => { if (t && !data.docs.includes(t)) data.docs.push(t); });
        if (docs.length) R('docs', 'C', rowNum);
        data.workDetail = lines.filter((l, i) => i < hi || i >= j).map(l => l.replace(/[\s\u3000]+$/, '')).join('\n').trim();
      }
      R('workDetail', 'C', rowNum);
    } else if (bVal.includes("提出ドキュメント")) {
      R('docs', 'C', rowNum); T('docs', 'C', rowNum);
      cVal.split(/\n|・|,|、/).forEach(l => {
        const t = l.trim();
        if (t && !data.docs.includes(t)) data.docs.push(t);
      });
    } else if (bVal.includes("打合せ回数")) {
      data.meetingFrequency = cVal; R('meetingFrequency', 'C', rowNum); T('meetingFrequency', 'C', rowNum);
    } else if (bVal.includes("サービス除外事項")) {
      data.serviceExclusions = cVal; R('serviceExclusions', 'C', rowNum); T('serviceExclusions', 'C', rowNum);
    } else if (bVal.includes("機密情報取扱い")) {
      T('confidential', 'C', rowNum);
      if (new RegExp(CHECKED + "\\s*有り").test(cVal)) { data.confidential = "有り"; R('confidential', 'C', rowNum); }
      else if (new RegExp(CHECKED + "\\s*無し").test(cVal)) { data.confidential = "無し"; R('confidential', 'C', rowNum); }
      if (dVal && !dVal.includes("機密保持契約締結情報")) { data.confidentialNote = dVal; R('confidentialNote', 'D', rowNum); }
    } else if (bVal.includes("社内関係者との打ち合わせ") || (bVal.includes("社内") && bVal.includes("調整"))) {
      T('meetingInternal', 'C', rowNum);
      if (new RegExp(CHECKED + "\\s*不要").test(cVal)) { data.meetingInternal = "不要"; R('meetingInternal', 'C', rowNum); data.meetingInternalNote = choiceNote(cVal, "不要"); }
      else if (new RegExp(CHECKED + "\\s*調整").test(cVal)) { data.meetingInternal = "調整します"; R('meetingInternal', 'C', rowNum); data.meetingInternalNote = choiceNote(cVal, "調整します"); }
      if (data.meetingInternalNote) R('meetingInternalNote', 'C', rowNum);
    } else if (bVal.includes("社外関係者との打ち合わせ") || (bVal.includes("社外") && bVal.includes("調整"))) {
      T('meetingExternal', 'C', rowNum);
      if (new RegExp(CHECKED + "\\s*不要").test(cVal)) { data.meetingExternal = "不要"; R('meetingExternal', 'C', rowNum); data.meetingExternalNote = choiceNote(cVal, "不要"); }
      else if (new RegExp(CHECKED + "\\s*調整").test(cVal)) { data.meetingExternal = "調整します"; R('meetingExternal', 'C', rowNum); data.meetingExternalNote = choiceNote(cVal, "調整します"); }
      if (data.meetingExternalNote) R('meetingExternalNote', 'C', rowNum);
    }

    // 5. 事前確認事項 (「事前確認事項」見出し 〜 「契約情報」見出し)
    if (sec === 'pre') {
      ynMatchRules.forEach(rule => {
        if (bVal.includes(rule.key) || aVal.includes(rule.key)) {
          let ynVal = "", ynCol = "D";
          [["D", dVal], ["E", eVal], ["F", fVal], ["C", cVal]].some(c => {
            const up = c[1].toUpperCase().trim();
            if (up === "Y" || up === "N" || up === "N/A") { ynVal = up; ynCol = c[0]; return true; }
            return false;
          });
          const noteVal = rule.isText ? (cVal || dVal || eVal) : (eVal || fVal || "");
          const existing = data.preChecks.find(p => p.id === rule.id);
          const org = (ynVal || noteVal) ? (isGrey(ynCol, rowNum) ? 'reference' : 'sheet') : 'empty';
          if (!existing) {
            data.preChecks.push({ id: rule.id, yn: ynVal, note: noteVal, origin: org, cell: (ynVal || noteVal) ? ((ynVal ? ynCol : (cVal ? 'C' : 'D')) + rowNum) : '', tplCell: (rule.isText ? 'C' : 'D') + rowNum });
          } else {
            if (rule.isText && norm(bVal).startsWith(rule.key)) existing.tplCell = 'C' + rowNum;
            if (ynVal) existing.yn = ynVal;
            if (noteVal) existing.note = noteVal;
            if (org !== 'empty') existing.origin = org;
          }
        }
      });
    }

    // 6. 契約情報 (ご提供形態 / 契約形態 / 支払い計画 の各ブロック内で選択済み行を採用)
    if (sec === 'contract' && OPT_ROW.test(cVal)) Tr({ provider: 'contractType', deal: 'dealType', pay: 'paymentPlan' }[sub] || '_', rowNum);
    if (sec === 'contract' && sub === 'provider') {
      const clean = pickChecked(rowStr, cVal, bVal);
      if (clean && !clean.includes("支援のご提供形態")) { data.contractType = cleanOpt(clean); R('contractType', 'C', rowNum); }
    }
    if (sec === 'contract' && sub === 'deal') {
      const clean = pickChecked(rowStr, cVal, bVal);
      if (clean && !clean.includes("契約形態を選択")) { data.dealType = cleanOpt(clean); R('dealType', 'C', rowNum); }
    }
    if (sec === 'contract' && sub === 'pay') {
      const clean = pickChecked(rowStr, cVal, bVal);
      if (clean && !clean.includes("支払い計画を選択")) { data.paymentPlan = cleanOpt(clean); R('paymentPlan', 'C', rowNum); }
    }
    if (bVal.includes("月次作業報告書") || bVal.includes("月次報告書")) {
      T('monthlyReport', 'C', rowNum);
      if (new RegExp(CHECKED + "\\s*有").test(rowStr)) { data.monthlyReport = "有"; R('monthlyReport', 'C', rowNum); }
      else if (new RegExp(CHECKED + "\\s*無").test(rowStr)) { data.monthlyReport = "無"; R('monthlyReport', 'C', rowNum); }
    }
  }

  // Opportunity No（HW/SW製品）と（サービス）は別番号で登録するため、一方が空欄でももう一方の番号を補完しない (v2.5.10)

  // 項目ごとの取得元を決定
  const isEmptyVal = v => Array.isArray(v) ? v.length === 0 : !String(v == null ? '' : v).trim();
  const SKIP = ['origin', 'preChecks', 'version', 'colorDetect', 'greyCellCount'];
  Object.keys(data).forEach(k => {
    if (SKIP.includes(k)) return;
    const list = refs[k];
    if (list && list.length && !isEmptyVal(data[k])) {
      data.origin[k] = list.some(r => !isGrey(r[0], r[1])) ? 'sheet' : 'reference';
    } else if (!isEmptyVal(data[k])) {
      data.origin[k] = 'default';   // 依頼シートに記載が無く、システムの既定値が入っている
    } else {
      data.origin[k] = 'empty';
    }
  });
  data.greyKeys = Object.keys(data.origin).filter(k => data.origin[k] === 'reference');
  // 反映元セル: 値が入っている項目ごとに、依頼シート上のセル番地(例: C44)を保持する (v2.5.3)
  data.cells = {};
  Object.keys(refs).forEach(k => {
    if (isEmptyVal(data[k])) return;
    const seen = [];
    refs[k].forEach(r => { const a = r[0] + r[1]; if (!seen.includes(a)) seen.push(a); });
    if (seen.length) data.cells[k] = seen;
  });

  Object.keys(trg).forEach(k => { if (k !== '_') tpl[k] = 'C' + trg[k][0] + (trg[k][1] !== trg[k][0] ? '〜C' + trg[k][1] : ''); });
  data.tplCells = tpl;

  return data;
}

// 単体HTML(案件別ツール等)として保存するとき、<script src="common/request-parser.js"> をこのコード自体の埋め込みに置き換える。
// 保存したHTMLを別の場所へ移しても取込みが動くようにするため。fetch を使わないので file:// でも動く。
function inlineRequestParser(html) {
  const code = [readSheetColors, parseQuotationRequestExcel, inlineRequestParser].map(f => f.toString()).join('\n\n');   // 自分自身も含める (保存したHTMLをもう一度保存しても動く)
  return html.replace(/<script src="common\/request-parser\.js"><\/script>/g, () => '<script>\n' + code + '\n<\/script>');
}
