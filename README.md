# Storage Expert Labs Quotation Automation System

IBM Storage Expert Labs Japan 向けの見積もり・支援依頼自動化システムです。  
Storage Sales / Tech Sales による依頼入力から、Expert Labs による概算工数試算、CPS（見積詳細）入力、S-LINK 登録メタデータおよび仕様書・別紙の生成までをブラウザ上（サーバー不要・完全クライアントサイド）で行います。

変更履歴: [`CHANGELOG.md`](CHANGELOG.md) ／ 保守・リリース手順: [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) ／ 回帰テスト: [`tests/README.md`](tests/README.md)

---

## 🌐 チーム公開 URL (GitHub Pages)

| ページ名 | 公開 URL | 用途 |
|---|---|---|
| **総合ポータル** | [https://ibm-el-japan.github.io/storage-quotation-system/](https://ibm-el-japan.github.io/storage-quotation-system/) | 依頼シート(xlsx)アップロード & 各ツール分岐ハブ |
| **① 見積もり依頼記入シート** | [https://ibm-el-japan.github.io/storage-quotation-system/request-form.html](https://ibm-el-japan.github.io/storage-quotation-system/request-form.html) | 営業/TS向け 依頼入力・依頼シート(xlsx)の取込 |
| **② 概算見積シート** | [https://ibm-el-japan.github.io/storage-quotation-system/quotation-generator.html](https://ibm-el-japan.github.io/storage-quotation-system/quotation-generator.html) | 工数試算・差分比較・提出用見積もり出力 |
| **③ S-LINK & 仕様書・別紙生成** | [https://ibm-el-japan.github.io/storage-quotation-system/slink-spec-generator.html](https://ibm-el-japan.github.io/storage-quotation-system/slink-spec-generator.html) | S-LINKメタデータ & 仕様書/別紙 (Word/HTML) 生成 |
| **④ CPS入力（見積詳細）** | [https://ibm-el-japan.github.io/storage-quotation-system/cps-input.html](https://ibm-el-japan.github.io/storage-quotation-system/cps-input.html) | Cost Plan Sheet 用の入力。JSON と記入済み .xlsm を出力(別メニュー) |

---

## 📋 主要機能

### 共通: 依頼シート(Excel)の取込み
- 営業/Tech Sales が作成した「見積もり依頼記入シート」をブラウザ上でアップロードし（`SheetJS`）、顧客名・案件名・Opportunity No・Offering・製品・提供場所・打合せ回数・提出物・除外事項・事前確認12項目・契約形態・支払計画などを全項目パースする。旧様式（A1:F91）・新様式（A1:F85）の両方に対応（行番号でなく見出しで判定）。
- 取込み処理は [`common/request-parser.js`](common/request-parser.js) の**1ファイルのみ**。4ページ（ポータル・依頼フォーム・概算見積・S-LINK）が読み込む。単体HTMLとして保存するときは共通コードを埋め込むので、保存したファイルだけでも取込みが動く。
- `sessionStorage`（キー `STORAGE_QUOTATION_REQUEST_DATA`）で全ツールに同期。
- **取得元の文字色**（お客様向け出力には含めない）: 赤＝依頼シート(黒字の実入力)、グレー斜体＝依頼シート(グレーの参考記入例)、青＝システムが決定・補完した値、黒＝手入力。赤字には依頼シート上のセル番地（例: C44）を併記する。
- Opportunity No は（HW/SW製品）と（サービス）を別番号として扱い、一方が空欄でも他方をコピーしない。

### ① 見積もり依頼記入シート (`request-form.html`)
- 6ステップ（案件基本情報 → 支援対象・内容 → 工数・Other Cost自動試算 → 事前確認事項12項目 → 契約・支払条件 → 確認・自動生成）。
- 作業分類別の工数から月別展開（CPS/S-LINK用）、現地作業日数から往復移動回数（予備20%）・宿泊日数・出張手当（中距離¥1,500/長距離¥3,500/宿泊朝夕無¥4,000/宿泊朝有夕無¥3,200）を試算。
- 案件別スタンドアローンHTMLの出力（`downloadStandaloneToolHtml`）。

### ② 概算見積シート (`quotation-generator.html`)
- **取込状況パネル**: 基本情報の「依頼シート取込状況・値の取得元」で、31項目＋事前確認12問の取込済/未入力・取得元・元セルを表示し、その場で修正できる。修正は入力欄・チェックシート・期間・保存データ・S-LINK・CPS入力へ反映され、取得元は手入力（黒）になる。手入力で追加した行と、チェックを外した行は再反映でも保持。EL SE が確認した旨をチェックする運用。
- **工数**: 全セル初期値「0」から手入力（取込後も自動入力しない）。期間を取り込むと月見出しも合わせて更新する。
- **Labor単価**: 年度×Band 表（基準 B8: 2026=¥17,600 / 2027=¥17,900 / 2028=¥18,200 / 2029=¥18,500）。既定値はサービス開始年の B8 に連動し、プリセット選択・直接入力は手入力として保持。
- **交通費等**: 場所は自由入力。距離区分（短/中/遠）は出張判定図の凡例（赤線＝中距離、青線＝遠距離、線の無い範囲＝短距離、図の範囲外＝遠距離）に従い**人が選ぶ**（自動選択しない）。宿泊費（円/泊）の初期値は0で、往復交通費を入力すると「2名分の往復運賃×1.3を5,000円単位で切上げ」で自動算出（手入力で変更可）。出張手当・訪問回数・宿泊数は出張費アシスタントで算定（予備20%）。年度を跨ぐ期間は単価差分の目安を表示し、その他費用へ行追加できる（自動加算しない）。
- **マスター準拠チェックシート**: 「見積りテンプレート.xlsx」に準拠した前提条件・適用除外・提出ドキュメントを自動選択。チェックされていない項目は出力しない。
- 価格式（Labor＋Other→Contingency→GP/(1−GP)→ROUNDUP）・丸め度は過去の概算見積Excelと一致（[`docs/ESTIMATE_LOGIC_ANALYSIS.md`](docs/ESTIMATE_LOGIC_ANALYSIS.md)、匿名化済み）。
- **Visual Diff**（前回保存との差分モーダル）と GitHub `work/` 連携（案件作業ファイルの保存・読込）。**案件ファイルは非公開リポジトリ `ibmkevin/storage-quotation-work`（要招待）に保存し、公開リポジトリには置かない。**

### ③ S-LINK & サービス仕様書・別紙 (`slink-spec-generator.html`)
- 「`XXXX支援_ 仕様書年月日.doc`」「`XXXX支援_別紙年月日.doc`」に準拠した正式条項（個人データ処理制限、IBMツール利用条項、お客様提供ツール責任、生成AI出力の取扱い）。前提条件は（1）（2）…付番、10pt・見出し/表なし、チェック済み項目のみ出力。
- S-LINK 登録用メタデータ（契約金額、GP、Contingency、OO、PPTL/PJTL、支払計画、チームメンバー等 24項目）を自動生成。OO はストレージ担当営業、Expert Labs担当営業はチームメンバーのみ。
- **支払計画はツールで決定しない**: 営業確認→CPS登録後、別紙タブの「CPSから支払計画を取り込む」で `.xlsm/.xlsx` の「支払計画」シートを読み込む。
- 仕様書・別紙を Word（`.doc`）でブラウザから直接ダウンロード。

### ④ CPS入力（見積詳細）(`cps-input.html`)
- S-LINK・仕様書生成とは独立した別メニュー。概算見積の「CPS入力へ渡す」で、期間・承認GP%・Risk Level・月別工数(TEL内)・Other Cost・概算見積り価格に加え、依頼シートの全項目（取得元・セル番地つき）を引き継ぐ。
- 入力ステップ0〜8（基本情報／TEL内／TEL外／Other Cost／SSO／連結子会社／Harmony-2／H-2 Other Cost／サマリー・出力）。単価・Risk表・Cost Infla率は `CostPlanSheetTPS2026v1.xlsm` のパラメーターに一致。基本情報に「依頼シートの内容 → CPS 反映」表を表示する。CPS に専用セルが無い項目は メイン「メモ」欄（3行）へ参考記入。OO/PPTL/PJTL は自動入力しない。
- 支払計画の既定値は請求日=各月末・支払期日=請求日+30日・均等配分（ツール算出・編集可・要営業確認）。
- **出力**: `CostPlan_見積詳細_YYYYMMDDhhmmss.json`（暫定スキーマ `cps-input/1`）、および CPS 雛形（`（2年_26-27）…xlsm` / `（3年_26-28）…xlsm`、ブラウザ内で読み込み・外部送信なし）を選ぶと入力内容を書き込んだ .xlsm。シートXMLの入力セルだけを書き換えるため、マクロ・数式・書式は雛形のまま。2年版は暦年2年分まで、3年版は見積詳細1枚＝暦年1年分（年をまたぐ期間は拒否）。

### CPS入力結果をCPS雛形(.xlsm)へ適用する (`tools/apply_cps.py`)
CPS入力ページが出力した `cps-input/1` JSON を、`CostPlanSheetINF2026v1.1`（2年/3年）の入力セルへ書き込みます（ブラウザの .xlsm 出力と同じセル）。シートXMLを直接編集するため、マクロ・フォームコントロール・入力規則は変更されません。
```
python3 tools/apply_cps.py <CostPlan_*.json> "<雛形>.xlsm" <出力>.xlsm 2y   # 2年版は 2y、3年版は 3y
```
- 単年(同一暦年内)のサービス期間のみ対応（年をまたぐ場合は中断）。OO/PPTL/PJTL が JSON に無い場合は雛形の `XXX` のまま。
- JSON の `main.memo`（依頼シートの全項目を3行に整理したもの）を、雛形のメモ入力欄（C:G結合の3行）へ書き込みます。営業未確認の支払計画は「要営業確認」と併記（R10）。
- 出力はExcelで全再計算されるよう設定済み。**顧客別の適用結果は非公開リポジトリで管理**します。

---

## 👥 チーム共同編集フロー (非公開リポジトリ `ibmkevin/storage-quotation-work` の `work/`)

1. [ポータル](https://ibm-el-japan.github.io/storage-quotation-system/) または [概算見積シート](https://ibm-el-japan.github.io/storage-quotation-system/quotation-generator.html) を開きます。
2. 「**📂 GitHubから開く**」で `work/` フォルダ内の案件作業ファイルを選択して読み込みます。
3. 編集後、「**💾 保存 → GitHubへ**」または「**☁️ API保存**」で `work/` へ保存します。
4. ファイルを開くたびに、前回保存時からの変更点が色分けされた差分モーダルで自動表示されます。

---

## 📁 ディレクトリ構成

```
ibm-el-japan/storage-quotation-system
├── index.html                   ← 総合ポータル
├── request-form.html            ← ① 見積もり依頼記入シート
├── quotation-generator.html     ← ② 概算見積シート
├── slink-spec-generator.html    ← ③ S-LINK & 仕様書・別紙生成
├── cps-input.html               ← ④ CPS入力(別メニュー)
├── common/request-parser.js     ← 依頼シート取込み処理(唯一の実装)
├── tools/
│   ├── apply_cps.py             ← CPS入力JSON → CPS雛形(.xlsm)
│   └── check.sh                 ← 構文チェック + 全回帰テスト
├── tests/                       ← 回帰テスト t1–tN (jsdom + SheetJS)
├── docs/
│   ├── MAINTENANCE.md           ← 保守・リリース手順・守るべき制約
│   ├── ESTIMATE_LOGIC_ANALYSIS.md ← 概算見積Excelの計算ロジック分析(匿名化)
│   └── ANALYSIS_REVIEW_2026-10.md ← 資料分析・改善計画・CPS設計案
├── CHANGELOG.md                 ← 変更履歴
├── README.md                    ← 本書
└── work/README.md               ← 案件ファイルは非公開リポジトリ ibmkevin/storage-quotation-work に保存
```

CPS 雛形（`.xlsm`、単価表を含む）、原本の依頼シート(xlsx)、出張判定図は公開リポジトリに含まれません。

---

## 🛠️ 改善の進め方

- 改善要望は Bob に伝えるだけで、コード編集・テスト（`tools/check.sh`）・GitHub への公開まで一貫して実行できます。リリース手順は [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md)。
- 過去の保存データは各ツールの「**📂 保存ファイル読込**」「**📂 GitHubから開く**」で復元できます。更新内容は [`CHANGELOG.md`](CHANGELOG.md) または GitHub の [コミット履歴](https://github.com/ibm-el-japan/storage-quotation-system/commits/main) で確認できます。
