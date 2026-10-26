"""テンプレートのグレー指定(theme 0/2 + 負のtint)を黒(theme=1)へ置換した検証用xlsxを作る。
実案件で「グレーが黒に変わった依頼シート」を模した t9/t10 の入力。"""
import zipfile, re, os
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', 'work', '見積もり依頼記入シート_テンプレート.xlsx')
dst = os.path.join(here, 'tpl_black.xlsx')
pat = re.compile(r'<color theme="(0|2)" tint="-[\d.]+"\s*/>')
zin = zipfile.ZipFile(src); zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED); n = 0
for it in zin.infolist():
    d = zin.read(it.filename)
    if it.filename in ('xl/styles.xml', 'xl/sharedStrings.xml'):
        t, c = pat.subn('<color theme="1"/>', d.decode('utf8')); n += c; d = t.encode('utf8')
    zout.writestr(it, d)
zout.close(); print('recolored', n, '->', dst)
