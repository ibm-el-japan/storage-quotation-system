# Storage Expert Labs Quotation Automation System

IBM Storage Expert Labs Japan 向けの見積もり・支援依頼自動化システムです。  
Storage Sales / Tech Sales による依頼入力から、Expert Labs による概算工数試算、S-LINK 登録メタデータおよび仕様書・別紙の自動生成までを一気通貫で自動化します。

---

## 🌐 チーム公開 URL (GitHub Pages)

| ページ名 | 公開 URL | 用途 |
|---|---|---|
| **総合ポータル** | [https://ibm-el-japan.github.io/storage-quotation-system/](https://ibm-el-japan.github.io/storage-quotation-system/) | 原本Excelアップロード & 各ツール分岐ハブ |
| **① 見積もり依頼記入シート** | [https://ibm-el-japan.github.io/storage-quotation-system/request-form.html](https://ibm-el-japan.github.io/storage-quotation-system/request-form.html) | 営業/TS向け 依頼入力・原本Excelパース |
| **② 概算見積シート** | [https://ibm-el-japan.github.io/storage-quotation-system/quotation-generator.html](https://ibm-el-japan.github.io/storage-quotation-system/quotation-generator.html) | 工数試算・差分比較・提出用見積もり出力 |
| **④ CPS入力（見積詳細）** | [https://ibm-el-japan.github.io/storage-quotation-system/cps-input.html](https://ibm-el-japan.github.io/storage-quotation-system/cps-input.html) | Cost Plan Sheet(TPS2026v1)作成用JSONの入力・出力(別メニュー) |
| **③ S-LINK & 仕様書・別紙生成** | [https://ibm-el-japan.github.io/storage-quotation-system/slink-spec-generator.html](https://ibm-el-japan.github.io/storage-quotation-system/slink-spec-generator.html) | S-LINKメタデータ & 仕様書/別紙 (Word/HTML) 生成 |

---

## 📋 アーキテクチャ & 主要機能

### 1. 原本 Excel（Quotation Request Form.xlsx）直接連携
- Storage Sales / Tech Sales が作成した「`見積もり依頼記入シート_テンプレート.xlsx`（Quotation Request Form.xlsx）」をそのままブラウザ上でアップロード可能。
- `SheetJS` を用いて、ブラウザ側（サーバー不要・完全クライアントサイド）で全セル（顧客名、案件名、Opp No、Offering、製品、工数、場所、打合せ回数、提出物、除外事項、12項目事前確認、契約形態、支払計画等）を完全パース。
- `sessionStorage`（キー: `STORAGE_QUOTATION_REQUEST_DATA`）および内部ステートを介して、全ツールにシームレスに同期。

### 2. 見積もり依頼記入シート (`request-form.html`)
- 原本 Excel テンプレート（`見積もり依頼記入シート_テンプレート.xlsx`）および整理資料（`見積り関連情報整理.xlsx`）に完全準拠。
- 6ステップのナビゲーション（① 案件基本情報 → ② 支援対象・内容 → ③ 工数・Other Cost自動試算 → ④ 事前確認事項 12項目 → ⑤ 契約・支払条件 → ⑥ 確認・自動生成）。
- **リアルタイム工数＆Other Cost自動試算**:
  - 作業分類別（設計・構築・テスト・提出ドキュメント作成・QA・PM）の工数入力から月別展開（CPS/S-LINK用）を自動算出。
  - 現地オンサイト日数・場所から往復移動回数（予備20%加算）、宿泊日数、宿泊費（円/泊・上限なしの手入力）、出張手当（中距離¥1,500/長距離¥3,500/宿泊朝夕無¥4,000/宿泊朝有夕無¥3,200）を自動算定。
- 案件別スタンドアローン HTML エクスポート機能（`downloadStandaloneToolHtml`）により、入力データが埋め込まれた自己完結型ツールを即時出力可能。

### 3. 概算見積シート (`quotation-generator.html`)
- **概算見積Excelとの整合(v2.5.5)**: 過去の概算見積Excel 119件の計算ロジックを分析し（[`docs/ESTIMATE_LOGIC_ANALYSIS.md`](docs/ESTIMATE_LOGIC_ANALYSIS.md)、匿名化済み）、価格式・丸め度・年度別単価・eDOU がExcelと一致することをテスト化(t16)。製品別の既定工数とプロジェクト管理比率の実績中央値を整理した（v2.5.8 以降、工数へは自動反映しない）。年度跨ぎの単価差分（その他費用への加算）の目安表示と行追加を追加。
- **新様式の依頼シートに対応(v2.5.4)**: 取込を行番号ではなく見出し・項目名で判定。旧様式（A1:F91）・新様式（A1:F85、支援期間／支援(作業実施)場所／支援内容（詳細）／Expert Labs担当営業名 など）の両方を全項目取り込み、基本情報・チェックシート・工数（期間）・交通費（場所）・取込状況に反映。
- **反映元セルの赤字表示(v2.5.2)**: 依頼シートのどのセル（例: C44）の値がどの項目へ反映されたかを、基本情報・期間設定・チェックシート・工数・交通費・取込状況パネルに赤字「依頼シート C44」で表示。お客様向け出力には含めない。
- **Labor単価(v2.5.1)**: 年度×Band 表（2026〜2029年、**基準 B8**: 2026=¥17,600 / 2027=¥17,900 / 2028=¥18,200 / 2029=¥18,500）。既定値はサービス開始年の B8 に連動、プリセット選択・直接入力は手入力として保持。
- **マスター準拠チェックシート**: 「見積りテンプレート.xlsx」に準拠した前提条件・適用除外・提出ドキュメントの自動選択。
- **データパイプライン自動同期**: 依頼シートから引き継いだ工数内訳・出張旅費（Other Cost）を工数表および経費テーブルへ即時自動入力。
- **依頼シート取込状況パネル(v2.3.0)**: 項目ごとの取込済/未入力と取得元(Auto/Template/Tool/Manual)を表示。EL SEが確認・補完した旨をチェックする運用。赤字項目(提出ドキュメント・打合せ回数・除外事項)も前提/除外/ドキュメントへ反映。
- **取得元の文字色(v2.5.0)**: 赤＝依頼シート(黒字の実入力)、グレー斜体＝依頼シート(グレーの参考記入例)、青＝システムが決定・補完した値、黒＝手入力。入力欄・チェックリスト・取込状況パネル・S-LINK項目・依頼フォームで共通。グレー/黒はセルのフォント色から自動判別し、お客様向け出力には色を含めない。
- **出張費アシスタント(v2.3.0)**: 事業所・距離区分(短/中/遠、`出張判定図.pdf`で判定)・日帰り/宿泊・人数から、構築+テスト工数ベースで訪問回数・宿泊数・出張手当を算定(予備20%)。人数・交通費単価は手入力。
- 前バージョンとのスナップショット比較を行う **Visual Diff（差分表示モーダル）** を完備。
- GitHub `work/` フォルダ連携（案件作業ファイルの保存・読込）に対応。**案件ファイルは非公開リポジトリ `ibmkevin/storage-quotation-work`（要招待）に保存し、公開リポジトリには置きません**（v2.5.3）。

### 5. CPS入力（見積詳細）(`cps-input.html`) — v2.4.0
- **別メニュー(R8)**: S-LINK・仕様書生成とは独立。概算見積の「作成・出力」→「CPS入力へ渡す」で、期間・承認GP%・Risk Level(Contingency率から最近似)・月別工数(TEL内)・Other Cost・概算見積り価格を引き継ぐ。
- **スライド15の入力ステップ 0〜8**(基本情報/TEL内/TEL外/Other Cost/SSO/連結子会社/Harmony-2/H-2 Other Cost/サマリー・出力)と進捗表示。単価・Risk表・Cost Infla率は `CostPlanSheetTPS2026v1.xlsm` のパラメーターに一致。
- **支払計画の既定値(スライド18)**: 提示額とサービス期間から、請求日=各月末・支払期日=請求日+30日・金額=均等配分で算出。Tool/要営業確認の既定値であり編集可。営業確認チェックなしで出力する場合は確認ダイアログ。
- **出力**: `CostPlan_見積詳細_YYYYMMDDhhmmss.json`。※JSON項目構成は暫定仕様で、既存「見積詳細入力ツール」/RunExcelのJSON仕様とのすり合わせが必要。Excel生成(RunExcel/マクロ)は本ツールの範囲外。
- **取込状況パネルを直接編集(v2.5.7)**: 概算見積シート 基本情報の「依頼シート取込状況・値の取得元」パネルの「取込内容」欄を、取込後にその場で修正できる（31項目＋事前確認12問のY/N・補足）。修正は基本情報の入力欄・チェックシート（サービス内容／対象製品／提出ドキュメント／前提／適用除外）・期間（開始/終了日→月ラベル）・保存データ・S-LINK・CPS入力へ反映され、取得元は「手入力（黒）」、依頼シートの元セルは「修正済」と表示。基本情報側で編集してもパネルに反映される。手入力で追加したチェックシート行と、チェックを外した行は再反映でも保持。サービス内容（詳細）の定型行（設計/構築など）は編集対象外、支払い計画は「営業確認」のまま、出張の拠点・距離区分は自動選択しない。
- **工数の初期値0・場所の自由入力(v2.5.8)**: 概算見積シートの「工数」は依頼シート取込後も自動入力せず、全セル初期値「0」から手入力で任意の数値に変更できる（製品別既定工数・定例打ち合わせ・PM比率の自動反映を廃止）。「交通費等」の「某拠点事業所」は「場所」に変更して自由入力（任意の地名。その他費用の場所列へそのまま入る）、「宿泊費 円/泊」は上限10,000円の表記と自動切り下げを削除。出張の拠点・距離区分は従来どおり自動選択しない。
- **宿泊費の初期値0(v2.5.9)**: 概算見積シート「交通費等」の「宿泊費 円/泊」の初期値を0に変更（手入力で任意の金額に変更可）。
- **Opportunity No を補完しない(v2.5.10)**: 「Opportunity No（HW/SW製品）」と「Opportunity No（サービス）」は別番号で登録するため、一方が空欄でももう一方の番号を自動コピーしない（依頼シート取込・基本情報・取込状況パネル・CPS入力への引継ぎ）。空欄のときは人が入力する。
- **見積もり依頼記入シートの全項目をCPSへ反映(v2.5.6)**: 「CPS入力へ渡す」で依頼シートの全31項目＋事前確認事項12問（案件情報・サービス内容・契約情報）を、取得元（依頼シート/参考例/システム補完/手入力）とセル番地つきで引き継ぐ。基本情報ステップに「依頼シートの内容 → CPS 反映」表を表示。CPSに専用セルがある項目（お客様名・プロジェクト名・Opp No.・サービス期間）はそのセルへ、無い項目（BP名・営業/TS名・Offering・製品・提供場所・提出ドキュメント・契約形態・事前確認Y/Nなど）は メイン「メモ」欄（3行）へ参考記入（出力JSONの `request` / `main.memo`）。OO・PPTL・PJTL は Notes ID が必要で依頼シートに該当項目が無いため自動入力せず、OO の候補（Expert Labs担当営業名）のみ表示。支払い計画は分割方法のみ反映し、確定は営業確認後（R10）。

### 4. S-LINK & サービス仕様書・別紙 生成 (`slink-spec-generator.html`)
- **マスター準拠の正式条項テンプレート**: 「`XXXX支援_ 仕様書年月日.doc`」「`XXXX支援_別紙年月日.doc`」に完全適合。
  - 個人データ処理制限（DPA準拠）、IBMツール利用条項、お客様提供ツール責任、生成AI出力（アウトプット）取扱条項を完全装備。
- S-LINK 登録用メタデータ（契約金額、GP、Contingency、OO、PPTL/PJTL、支払計画等 21項目）の自動生成。
- **書式(v2.3.0)**: 前提条件は（1）（2）…付番。仕様書・別紙とも現行書式に合わせ10pt・見出し/表なしで出力。チェック済み項目のみ出力。
- **支払計画はツールで決定しません**: 営業確認→CPS登録後、別紙タブの「CPSから支払計画を取り込む」で `.xlsm/.xlsx` の「支払計画」シートを読込。
- **Wordドキュメント（`.doc`）直接エクスポート**: 仕様書および別紙をブラウザから直接 `.doc` 形式でダウンロード可能。

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
├── index.html                   ← システム総合ポータル (Excel アップロード対応)
├── request-form.html            ← 見積もり依頼記入シート
├── quotation-generator.html     ← 概算見積シート (工数試算 & 差分表示)
├── slink-spec-generator.html    ← S-LINK & 仕様書・別紙生成
├── cps-input.html               ← CPS入力(見積詳細入力ツール連携・別メニュー)
├── CostPlanSheetTPS2026v1.xlsm  ← CPS雛形(パラメーター等の正)
├── Quotation Request Form.xlsx  ← 原本 Excel テンプレート
├── docs/ANALYSIS_REVIEW_2026-10.md ← 資料分析・改善計画・CPS設計案
├── 出張判定図.pdf               ← 出張距離区分の判定図(参照用)
├── WORK_LOG.md                  ← 案件作業ログ & システム更新記録
├── README.md                    ← システム全体説明書 (本書)
└── work/                        ← （公開側は説明のみ。実際の案件ファイルは非公開リポジトリ ibmkevin/storage-quotation-work に保存）
    └── README.md
```

---

## 🛠️ 管理・改善・今後のアップデート方針

実案件でのフィードバックや改善要望が生じた際は、以下のフローで継続的にアップデートを行います：

1. **Bob への改善指示**:
   - 会話上で「概算見積シートの計算ルールを修正したい」「テンプレート項目を追加したい」等と伝えるだけで、コード編集・テスト・GitHub への自動プッシュまで一貫して実行可能です。
2. **情報の取得・確認方法**:
   - 各ツールの画面上にある「**📂 保存ファイル読込**」や「**📂 GitHubから開く**」メニューから、過去に保存された案件データやテンプレート設定をいつでもワンクリックで復元・再利用できます。
   - `WORK_LOG.md` または GitHub の [コミット履歴](https://github.com/ibm-el-japan/storage-quotation-system/commits/main) から、過去の更新内容と変更差分をいつでも確認できます。

### CPS入力結果をCPS雛形(.xlsm)へ適用する (`tools/apply_cps.py`)
CPS入力ページが出力した `cps-input/1` JSON を、`CostPlanSheetINF2026v1.1`（2年/3年）の入力セルへ書き込みます。シートXMLを直接編集するため、マクロ・フォームコントロール・入力規則は変更されません。
```
python3 tools/apply_cps.py <CostPlan_*.json> "<雛形>.xlsm" <出力>.xlsm 2y   # 2年版は 2y、3年版は 3y
```
- 単年(同一暦年内)のサービス期間のみ対応（年をまたぐ場合は中断）。OO/PPTL/PJTL が JSON に無い場合は雛形の `XXX` のまま。
- JSON の `main.memo`（依頼シートの全項目を3行に整理したもの）を、雛形のメモ入力欄（C:G結合の3行）へ書き込みます。営業未確認の支払計画は「要営業確認」と併記（R10）。
- 出力はExcelで全再計算されるよう設定済み。**顧客別の適用結果は非公開リポジトリで管理**します。
