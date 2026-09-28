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
  - 現地オンサイト日数・場所から往復移動回数（予備20%加算）、宿泊日数、宿泊上限額（¥10,000/泊）、出張手当（中距離¥1,500/長距離¥3,500/宿泊朝夕無¥4,000/宿泊朝有夕無¥3,200）を自動算定。
- 案件別スタンドアローン HTML エクスポート機能（`downloadStandaloneToolHtml`）により、入力データが埋め込まれた自己完結型ツールを即時出力可能。

### 3. 概算見積シート (`quotation-generator.html`)
- **Labor単価プリセット**: 2025年〜2028年の Band 6〜Band 10 レートテーブル（2026年 B8: ¥17,900/h 等）をワンクリックで選択・自動反映。
- **マスター準拠チェックシート**: 「見積りテンプレート.xlsx」に準拠した前提条件・適用除外・提出ドキュメントの自動選択。
- **データパイプライン自動同期**: 依頼シートから引き継いだ工数内訳・出張旅費（Other Cost）を工数表および経費テーブルへ即時自動入力。
- 前バージョンとのスナップショット比較を行う **Visual Diff（差分表示モーダル）** を完備。
- GitHub `work/` フォルダ連携（案件作業ファイルの保存・読込）に対応。

### 4. S-LINK & サービス仕様書・別紙 生成 (`slink-spec-generator.html`)
- **マスター準拠の正式条項テンプレート**: 「`XXXX支援_ 仕様書年月日.doc`」「`XXXX支援_別紙年月日.doc`」に完全適合。
  - 個人データ処理制限（DPA準拠）、IBMツール利用条項、お客様提供ツール責任、生成AI出力（アウトプット）取扱条項を完全装備。
- S-LINK 登録用メタデータ（契約金額、GP、Contingency、OO、PPTL/PJTL、支払計画等 21項目）の自動生成。
- **Wordドキュメント（`.doc`）直接エクスポート**: 仕様書および別紙をブラウザから直接 `.doc` 形式でダウンロード可能。

---

## 👥 チーム共同編集フロー (`work/` フォルダ)

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
├── Quotation Request Form.xlsx  ← 原本 Excel テンプレート
├── WORK_LOG.md                  ← 案件作業ログ & システム更新記録
├── README.md                    ← システム全体説明書 (本書)
└── work/                        ← チームの案件作業ファイル置き場
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
