# 📝 Storage Quotation System — 変更履歴 (WORK_LOG)

Storage Quotation System で作成・編集された案件作業ファイル（`work/` 内）およびシステム機能の変更ログです。

---

## 📋 案件作業ログ (`work/`)

| 日付 | 案件名 | ファイル名 | 担当者 | 変更内容・コメント |
|---|---|---|---|---|
| 2025-09-01 | サンプル案件 | `Sample_20250901_v1_EL.html` | Expert Labs | 初期テンプレート作成 |

---

## 🛠️ システム更新履歴

### 2026-09-01 (v2.0.0) — 「Expert Labs Storage Inputs and Outputs」完全対応 & 自動化全面刷新
- **「見積もり依頼記入シート_テンプレート.xlsx」直接アップロード連携の完全実装**
  - ポータル（`index.html`）、見積もり依頼記入シート（`request-form.html`）、概算見積シート（`quotation-generator.html`）、S-LINK仕様書生成（`slink-spec-generator.html`）の全4画面に「📊 Excelアップロード (.xlsx)」メニューを新設。
  - 営業/Tech Salesが作成した原本Excelをそのままドラッグ＆ドロップまたはファイル選択するだけで、全セル（顧客名、案件名、Opportunity No、Offering、製品、工数、提供場所、打合せ回数、提出物、除外事項、契約形態、支払計画、12項目事前確認等）をブラウザ側で完全自動解析。
  - 解析された全データが `request-form.html`, `quotation-generator.html`, `slink-spec-generator.html` の全工程に瞬時に同期・自動反映されるパイプラインを確立。
- **見積もり依頼記入シート (HTML) の原本 Excel 完全準拠・機能拡充**
  - お客様番号（8桁）・BPお客様番号の入力欄を追加。
  - 提出ドキュメント（基本設計書、詳細設計書、テスト計画兼報告書、操作手順書等）の選択機能を追加。
  - サービス提供場所（詳細・最寄り駅）、打合せ回数・頻度、サービス除外事項の個別指定欄を設置。
  - 「⚡ 案件別概算見積シートHTML直接生成・ダウンロード」機能を追加。
- **概算見積シート の自動化・工数初期展開エンジンの強化**
  - 見積もり依頼記入シート から引き継いだ対象製品（Ceph / Scale / FlashSystem / Protect 等）に基づき、初期工数（設計・構築・テスト・ドキュメント・QA）を自動プリセット。
  - 提出ドキュメント・除外条件・打合せ回数をチェックシートおよび案件補足情報へ自動マッピング。
  - 案件別HTMLファイルのセーブ/ロードおよびVisual Diff（差分比較モーダル）との完全統合。
- **S-LINK & 仕様書・別紙 生成ツールの自動整理・出力最適化**
  - PPTX 定義の全 S-LINK 登録メタデータ（契約先/請求先番号、契約金額、GP、Contingency、OO、PPTL/PJTL、支払計画等）を完全自動マッピング。
  - サービス仕様書（対象製品・範囲・提出物・前提条件・除外事項）および別紙（工数・提供場所・支払期日・金額表）の自動整形、Word出力対応。

### 2025-09-01 (v1.4.0)
- **専用リポジトリ & GitHub Pages 本番稼働**
  - スタンドアロンリポジトリ `ibm-el-japan/storage-quotation-system` を開設（管理者: ibmkevin / kevin.wooseung.shim@ibm.com）。
  - GitHub Pages によるワンクリックアクセス（URLコピー不要）を有効化。
- **チーム共同編集 & 差分表示機能 (Visual Diff)**
  - 「💾 保存 → GitHubへ」および「📂 GitHubから開く」モーダルを統合。
  - 前バージョンとのスナップショット比較（基本情報・工数・交通費・チェックシート）を自動ポップアップ表示。
  - 管理者用「☁️ API保存」ボタンを追加。
- **工数シートの簡素化**
  - 月別列を `工数(h)` の1列レイアウトへ最適化。
- **パイプライン連携の強化**
  - `request-form.html` → `quotation-generator.html` → `slink-spec-generator.html` の完全自動データ引き継ぎを実現。
