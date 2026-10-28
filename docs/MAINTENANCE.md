# Storage Quotation System — 保守・リリース手順

変更履歴は [`../CHANGELOG.md`](../CHANGELOG.md)、機能の説明は [`../README.md`](../README.md)。分析資料は [`ANALYSIS_REVIEW_2026-10.md`](ANALYSIS_REVIEW_2026-10.md) / [`ESTIMATE_LOGIC_ANALYSIS.md`](ESTIMATE_LOGIC_ANALYSIS.md)。
本書は「変えるときに守ること」と「リリースの手順」だけを書く。機能ごとの履歴は CHANGELOG に書き、ここへ増やさない。

## 1. 構成と責務

| ファイル | 役割 |
|---|---|
| `index.html` | ポータル。依頼シート(xlsx)を解析して各ページへ |
| `request-form.html` | 依頼記入シートの入力フォーム(6ステップ) |
| `quotation-generator.html` | 概算見積(工数・出張費・チェックリスト・取込状況パネル・Visual Diff・GitHub連携) |
| `slink-spec-generator.html` | S-LINK 24項目、仕様書、別紙 |
| `cps-input.html` | CPS(Cost Plan Sheet)入力。別メニュー(R8)。JSON と記入済み .xlsm を出力 |
| `common/request-parser.js` | `readSheetColors` / `parseQuotationRequestExcel` / `inlineRequestParser` の**唯一の実装** |
| `tools/apply_cps.py` | CPS 入力 JSON を雛形 .xlsm へ書く CLI（`cps-input.html` の `fillCps` と同じセル） |
| `tools/check.sh` | 構文・整合・全テストを1コマンドで実行 |
| `tests/` | 回帰テスト t1–tN（jsdom + SheetJS）。手順は [`../tests/README.md`](../tests/README.md) |

- 依頼シートのパーサを直すときは `common/request-parser.js` だけを編集する。**ページ内に複製を作らない**（t21 が検査）。公開時は `common/` を必ず含める。
- 単体HTML保存（概算見積シート3経路、request-form の「案件別HTMLを直接保存」）は `inlineRequestParser(html)` で共通コードを埋め込む。
- 様式が変わったらパーサの見出し別名を追加する（行番号は使わない）。パーサ出力にキーを足したら `cps-input.html` の `REQ_GROUPS` にも足す（t17 が検査）。
- ページ先頭の `let` 変数は jsdom の `window` に出ない。テストでは `w.eval('...')` で読む。

## 2. 守るべき制約（会議メモ R1–R11）
- R1 値の取得元を表示する（文字色で表す。下表）。
- R3 チェックされていない項目は出力しない。
- R4 サービス内容に「設計/構築/稼動テスト/ドキュメント/Q&A」だけの定型行を紛れ込ませない。
- R5 取り込んだデータは EL SE が確認する（「確認済み」チェック）。製品を変えても既定工数は再計算しない。
- R6 出張の基点事業所・距離区分は自動選択しない。
- R8 CPS は別メニュー。
- R9 既存ドキュメントの書式に合わせる（仕様書/別紙は10pt・見出し/表なし）。
- R10 支払い計画はツールで確定しない。既定値はツール算出・編集可・「要営業確認」。
- R11 項目ごとにテストし、Slack 用サマリーを出す。
- お客様向け出力（見積書・仕様書・別紙・チェックリスト出力・S-LINKコピー値）に色・バッジ・セル番地を入れない（t10 / t13）。
- ストレージ担当営業とExpert Labs担当営業は別人。S-LINK の OO はストレージ担当営業、EL営業はチームメンバー(sm24)のみ。
- Opportunity No（HW/SW製品）と（サービス）は別番号。一方が空欄でも他方をコピーしない。

### 取得元 `origin`
| 値 | 意味 | 文字色 |
|---|---|---|
| `sheet` | 依頼シートの黒字（実入力） | 赤 `#c00000` |
| `reference` | 依頼シートのグレー（参考記入例） | グレー斜体 `#8b8f98` |
| `default` | システムが決定・補完 | 青 `#1d4ed8` |
| `manual` | 取込後に手入力・編集 | 黒 |
| `empty` | 記載なし（推測しない） | — |

グレー判定: theme 0/2＋負のtint、または無彩色 #70–#DD。色情報が取れないときは `colorDetect:false` で全値を依頼シート扱い。テンプレートでは行4–51 がグレー、事前確認(Y/N)と契約情報は黒。

## 3. Labor単価
基準 B8: 2026=17,600 / 2027=17,900 / 2028=18,200 / 2029=18,500 円/h。改定するときは `quotation-generator.html` の `LABOR_RATES` と `slink-spec-generator.html` の `LABOR_B8` を**同時に**更新し、`tests/t11.js` の期待値も直す。CPS の Hourly Recovery Cost（`CostPlanSheetTPS2026v1.xlsm`：B6=13,100 / B7=16,400 / B8=18,600 / B9=21,800 / B10=25,200）は別の単価表。

## 4. リリース手順
バージョンの付け方: 機能追加・書式変更=マイナー+1、バグ修正=パッチ+1、大規模再設計=メジャー+1。

1. コードを編集し、必要ならテストを追加・更新する。
2. バージョン表記を更新する（`tools/check.sh` の整合チェックが不一致を検出する）。
   - `quotation-generator.html`: `APP_VERSION`、`id="ver-badge"`、「Release Version」行、変更履歴表の先頭行
   - `index.html`: `<span class="badge">vX</span>`
3. [`../CHANGELOG.md`](../CHANGELOG.md) の先頭にエントリを足す（版・日付・要点・テスト件数）。
4. `tests/README.md` の表に新しいテストを足す（件数は `tools/check.sh` の出力）。
5. `tools/check.sh` を実行し、全て成功することを確認する。
6. スキルを更新する（§7）。
7. 公開する（§5）。

## 5. 公開（GitHub）
| リポジトリ | 内容 |
|---|---|
| `ibm-el-japan/storage-quotation-system`（公開、GitHub Pages `main` `/`） | アプリ本体のみ |
| `ibmkevin/storage-quotation-work`（非公開） | 案件ファイル `work/`、作業メモ、スキルの控え |
| `ibmkevin/playground`（非公開） | 作業ツリー全体（顧客データ・雛形を含む） |

- 公開リポジトリに置いてよいもの: `index.html` / `request-form.html` / `quotation-generator.html` / `slink-spec-generator.html` / `cps-input.html` / `common/` / `tools/` / `tests/`（フィクスチャ除く）/ `docs/`（匿名化済み）/ `README.md` / `CHANGELOG.md` / `work/README.md`。
- **置かないもの**: `work/` 配下の案件ファイル、顧客名・Opportunity No・顧客別金額、CPS の `.xlsm`（単価表・雛形）、`cps-results/`、`Quotation Request Form.xlsx`、pptx、`_ref_quotation_tool_v14.html`、管理者パスワード。
- 公開前に追加行を検索して機微な語句（顧客名、Opportunity No、`ghp_` / `github_pat_` で始まるトークン）が 0 件であることを確認する。両リポジトリは push 時に秘密情報スキャンがある。
- 公開後、約1分待って `https://ibm-el-japan.github.io/storage-quotation-system/<ページ>` を取得し、ローカルのファイルと一致することを確認する（`raw.githubusercontent.com` はキャッシュが強いので使わない）。

## 6. GitHub 連携と管理者パスワード
- アプリ内の「保存 → GitHubへ」「GitHubから開く」「API保存」は非公開リポジトリ `ibmkevin/storage-quotation-work` の `work/` だけを使う（`GH_REPO_OWNER` / `GH_REPO_NAME`）。利用者には同リポジトリへの招待（Write）と PAT（`repo` スコープ）が必要。PAT なしでは一覧取得できない。
- 「WORK_LOG.md を編集」リンク（`GH_WORKLOG_URL`）は非公開リポジトリ側の `WORK_LOG.md`（案件作業ログ）を指す。公開リポジトリの更新履歴は `CHANGELOG.md`。

### 管理者パスワード
`quotation-generator.html` には**ハッシュのみ**を持つ（`ADMIN_PW_SALT` + `ADMIN_PW_SHA256`）。平文はコード・文書・コミットに書かない。
- 変更手順: `python3 -c "import hashlib;print(hashlib.sha256(('sqs-admin-v1:'+'新パスワード').encode()).hexdigest())"` の出力を `ADMIN_PW_SHA256` に設定し、利用者へ別途伝える。
- 画面の出し分け用であり、実際のアクセス制御は GitHub の権限と PAT。ハッシュは公開されるので、長いランダムなパスワードにする。
- 検証: `tests/t14.js`（環境変数 `SQS_ADMIN_PW` を渡すと実パスワードも検証。未設定なら該当項目をスキップ）。

## 7. スキル（Bob）
- 実体: `~/.bob/skills/storage-quotation-system/SKILL.md`。控え: `docs/skill/SKILL.md`（非公開リポジトリのみ。公開しない）。
- スキルは索引にとどめ、版ごとの履歴は書かない（履歴は CHANGELOG）。構成・責務・落とし穴・手順が変わったときだけ更新し、更新したら実体を控えへコピーする。

## 8. 検証
`tools/check.sh` が次を順に行う。
1. 各ページ最後の `<script>` と `common/request-parser.js` を `node --check`。
2. ページ内にパーサの複製が無いこと、バージョン表記が揃っていること。
3. `tests/t*.js` を全て実行して合計を表示（1つでも失敗なら終了コード1）。

ブラウザ実機（Chrome / Edge）での見た目、Windows Excel でのマクロ動作は未確認（jsdom と Excel for Mac のみ）。

## 9. 環境メモ
- 初回は `cd tests && npm install`（jsdom, xlsx@0.18.5, jszip）。黒字版テンプレートの生成は `python3 tests/make_black_template.py`、匿名化フィクスチャは `python3 tests/make_duskin_like.py`（どちらも Git 管理外の `.xlsx` を作る）。
- t4 / t5 / t8 / t20 は CPS の `.xlsm`（単価表を含むため GitHub に置かない）を `storage-quotation-system/` 直下または `work/` から読む。無い環境ではその検査だけ失敗またはスキップする。
- macOS の BSD `sed -i` は GNU と引数が違うので、一括置換は python を使う。
- 未決・改善候補: 見積詳細入力ツールの正式 JSON スキーマ（現在の `cps-input/1` は暫定）、RunExcel 連携、駅名からの距離区分の自動判定（R6 により行わない方針）、`cps-input.html` の色分け、使われていない `PRODUCT_PROFILES` / `pickProductProfile` の整理。
