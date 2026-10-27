#!/usr/bin/env python3
"""Apply a Storage Quotation System 'cps-input/1' JSON to a CostPlanSheetINF2026v1.1 .xlsm template.

Edits the worksheet XML directly (no openpyxl save) so VBA, form controls, drawings and
data-validation extensions are preserved.  Only input cells are written; formulas are untouched
except the Hourly-Cost override (see HOURLY_OVERRIDE) which follows the existing sample convention.
Usage: apply_cps.py <input.json> <template.xlsm> <out.xlsm> <layout: 2y|3y>
"""
import sys, json, re, zipfile, datetime, shutil
from xml.sax.saxutils import escape

jsn, tpl, out, layout = sys.argv[1:5]
d = json.load(open(jsn, encoding='utf8'))
m = d['main']

# layout -> sheet xml paths (verified from workbook.xml.rels) and the price input cell
L = {
    '2y': dict(main='xl/worksheets/sheet1.xml', detail='xl/worksheets/sheet4.xml',  # 見積詳細1年目
               pay='xl/worksheets/sheet7.xml', price='O22', memo=['C34', 'C35', 'C36'], wrap='329'),  # メモ入力欄 (C:G 結合の3行)
    '3y': dict(main='xl/worksheets/sheet1.xml', detail='xl/worksheets/sheet3.xml',  # 見積詳細
               pay='xl/worksheets/sheet5.xml', price='O21', memo=['C33', 'C34', 'C35'], wrap='331')  # メモ入力欄 (C:G 結合の3行)
}[layout]

BAND = {'Band 6': 'SLS-Bnd6', 'Band 7': 'SLS-Bnd7', 'Band 8': 'SLS-Bnd8', 'Band 9': 'SLS-Bnd9', 'Band 10': 'SLS-Bnd10'}
serial = lambda s: (datetime.date.fromisoformat(s) - datetime.date(1899, 12, 30)).days


def put(xml, ref, kind, val):
    """Replace cell `ref` keeping its style attribute. kind: 'n' number | 's' text."""
    pat = re.compile(r'<c r="%s"((?:\s+[a-z]+="[^"]*")*)\s*(?:/>|>.*?</c>)' % ref, re.S)
    mm = pat.search(xml)
    if not mm:
        raise SystemExit('cell not found: ' + ref)
    sm = re.search(r's="(\d+)"', mm.group(1))
    s = ' s="%s"' % sm.group(1) if sm else ''
    if kind == 'n':
        new = '<c r="%s"%s><v>%s</v></c>' % (ref, s, val)
    else:
        new = '<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>' % (ref, s, escape(val))
    return xml[:mm.start()] + new + xml[mm.end():]


def put_wrapped(xml, ref, text, wrap_style):
    """Write a long text into a (C:G merged) memo cell using the template's own wrap-text style and size the row to fit."""
    xml = put(xml, ref, 's', text)
    xml = re.sub(r'(<c r="%s") s="\d+"' % ref, r'\1 s="%s"' % wrap_style, xml, count=1)
    row = re.search(r'\d+', ref).group(0)
    lines = max(1, sum(-(-sum(2 if ord(ch) > 255 else 1 for ch in seg) // 62) for seg in text.split('\n')))
    ht = min(409, max(15, 15 * lines + 3))
    def fix(mm):
        a = re.sub(r'\s(?:ht|customHeight)="[^"]*"', '', mm.group(1))
        return '<row r="%s"%s ht="%d" customHeight="1">' % (row, a, ht)
    return re.sub(r'<row r="%s"([^>]*?)>' % row, fix, xml, count=1)

zin = zipfile.ZipFile(tpl)
files = {n: zin.read(n) for n in zin.namelist()}
infos = {i.filename: i for i in zin.infolist()}

# ---- メイン
x = files[L['main']].decode('utf8')
x = put(x, 'C5', 's', m['customerName'])
x = put(x, 'C6', 's', m['projectName'])
x = put(x, 'C7', 's', m['oppNo'])
for ref, k in (('C8', 'oo'), ('C9', 'pptl'), ('C10', 'pjtl')):
    if m.get(k):  # blank in JSON -> keep the template's 'XXX' placeholder (to be entered by a person)
        x = put(x, ref, 's', m[k])
x = put(x, 'C11', 'n', serial(m['servicePeriod']['start']))
x = put(x, 'E11', 'n', serial(m['servicePeriod']['end']))
x = put(x, 'C12', 'n', repr(m['approvedGpPct'] / 100))
x = put(x, 'C13', 'n', m['riskLevel'])
x = put(x, L['price'], 'n', m['servicePrice'])
pp = d.get('paymentPlan') or {}
# メモ欄: 依頼シートの全項目 (main.memo, 3行)。無い旧JSONでも、営業未確認の支払計画だけは注記する (R10)
memo = list(m.get('memo') or [])
if not memo and pp.get('rows') and not pp.get('confirmedBySales'):
    memo = ['【要営業確認】支払計画はツール既定値（請求日=月末、支払期日=請求日+30日、均等配分）。営業確認未了のため確定値ではありません。']
for ref, line in zip(L['memo'], memo):
    x = put_wrapped(x, ref, line, L['wrap'])
files[L['main']] = x.encode('utf8')

# ---- 見積詳細 (first/only year sheet): TEL内
x = files[L['detail']].decode('utf8')
start = datetime.date.fromisoformat(m['servicePeriod']['start'])
y0 = start.year
rows = d['sections']['telIn']
assert len(rows) <= 10
for i, r in enumerate(rows):
    nm_row = 8 + 3 * i          # hours row; band/cost row is nm_row+1
    x = put(x, 'B%d' % nm_row, 's', r['name'])
    x = put(x, 'B%d' % (nm_row + 1), 's', BAND[r['band']])
    x = put(x, 'C%d' % (nm_row + 1), 'n', r['hourlyCost'])   # override: JSON uses TPS2026v1 recovery cost
    for k, h in enumerate(r['hours']):
        mon = (start.month - 1 + k)
        if mon // 12 != 0:
            raise SystemExit('period spans a year boundary: use the multi-year sheets manually')
        col = chr(ord('E') + mon % 12)
        x = put(x, '%s%d' % (col, nm_row), 'n', h)
files[L['detail']] = x.encode('utf8')

# ---- 支払計画
x = files[L['pay']].decode('utf8')
for i, r in enumerate(pp.get('rows', [])):
    x = put(x, 'D%d' % (5 + i), 'n', serial(r['dueDate']))
    x = put(x, 'E%d' % (5 + i), 'n', r['amount'])
files[L['pay']] = x.encode('utf8')

# ---- force recalculation on open (cached values of formulas are stale)
w = files['xl/workbook.xml'].decode('utf8')
w = w.replace('<calcPr calcId="191029"/>', '<calcPr calcId="191029" fullCalcOnLoad="1"/>')
assert 'fullCalcOnLoad' in w
files['xl/workbook.xml'] = w.encode('utf8')

# ---- drop calcChain (a formula cell was replaced by a value; Excel rebuilds the chain on load)
del files['xl/calcChain.xml']
r = files['xl/_rels/workbook.xml.rels'].decode('utf8')
r = re.sub(r'<Relationship [^>]*calcChain[^>]*/>', '', r)
files['xl/_rels/workbook.xml.rels'] = r.encode('utf8')
c = files['[Content_Types].xml'].decode('utf8')
c = re.sub(r'<Override [^>]*calcChain[^>]*/>', '', c)
files['[Content_Types].xml'] = c.encode('utf8')

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
    for n in zin.namelist():
        if n in files:
            zo.writestr(n, files[n])
print('wrote', out)
