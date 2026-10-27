# tests — Storage Quotation System 回帰テスト (jsdom + SheetJS)

```bash
cd storage-quotation-system/tests
npm install            # jsdom, xlsx@0.18.5
python3 make_black_template.py   # t9/t10 用の「黒字版」テンプレートを生成
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do node t$i.js | tail -1; done
```

| ファイル | 内容 | 件数 |
|---|---|---|
| t1–t3 | Phase1: 取込網羅・取得元バッジ・出張費アシスタント | 19 / 10 / 21 |
| t4–t6 | Phase1: 書式整合・支払計画のCPS取込・保存/復元・S-LINK引継ぎ | 20 / 15 / 18 |
| t7–t8 | Phase2: 項目名統一・CPS入力ページ | 11 / 30 |
| t9 | Phase3: グレー/黒判定・テンプレ全項目・文字色・引継ぎ | 59 |
| t10 | Phase3: お客様向け出力に色/バッジが混入しない | 6 |
| t11 | v2.5.1: Labor単価表（基準B8）・開始年連動・手入力保持・保存復元・S-LINK | 28 |
| t12 | v2.5.1追補: 工数/交通費タブの取得元・打合せ回数→定例打ち合わせ | 19 |
| t13 | v2.5.2: 反映元セル（cells）・各タブの赤字表示・保存復元・顧客向け出力に非混入 | 52 |
| t14 | v2.5.3: 案件ファイルの保存先（非公開リポジトリ）・管理者パスワードのハッシュ化（環境変数 `SQS_ADMIN_PW` で実パスワードも検証。未設定なら該当項目をスキップ） | 15 |
| t15 | v2.5.4: 新様式の依頼シート（A1:F85）。匿名化フィクスチャ `make_duskin_like.py` で全項目の値・セル番地・基本情報/チェックシート/工数/交通費/取込状況/S-LINK/request-form への反映、顧客向け出力に非混入・営業2名の取り違え防止 | 73 |

- 注意: t4 / t5 / t8 は CPS の xlsm（`CostPlanSheetTPS2026v1.xlsm`、`work/CostPlanSheetINF2026v1.1_*.xlsm`、`（2年/3年）CostPlanSheetINF2026v1.1.xlsm`）を読む。**単価表を含むためGitHubには置いていない**。ローカルの `storage-quotation-system/` 直下 / `work/` に置いて実行する。無い場合はその3本だけ失敗/スキップする。
- ハーネス（`harness.js`）: `load(file, sessionObj)`。ページ先頭の `let` 変数は `window` に出ないので `w.eval('...')` で読む。ロード後 300ms 待つ。
