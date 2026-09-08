# 📝 Storage Quotation System — 変更履歴 (WORK_LOG)

Storage Quotation System で作成・編集された案件作業ファイル（`work/` 内）およびシステム機能の変更ログです。

---

## 📋 案件作業ログ (`work/`)

| 日付 | 案件名 | ファイル名 | 担当者 | 変更内容・コメント |
|---|---|---|---|---|
| 2025-09-01 | サンプル案件 | `Sample_20250901_v1_EL.html` | Expert Labs | 初期テンプレート作成 |

---

## 🛠️ システム更新履歴

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
