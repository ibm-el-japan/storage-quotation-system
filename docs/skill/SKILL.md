---
name: storage-quotation-system
description: Use when the user asks about the IBM Storage Expert Labs quotation automation system, storage-quotation-system, request-form.html, quotation-generator.html, slink-spec-generator.html, cps-input.html, Quotation Request Form.xlsx, S-LINK metadata generation, CPS (Cost Plan Sheet) output, or any work under the storage-quotation-system/ directory in the playground workspace.
---

# Storage Quotation System — Comprehensive Skillset & Maintenance Guide

IBM Storage Expert Labs Japan の見積・契約関連業務を自動化するブラウザ完結型ツール群（依頼シート xlsx → 概算見積 → S-LINK/仕様書・別紙、別メニューで CPS 入力）。UI・出力は日本語。
**版ごとの履歴はこのスキルに書かない**（[`CHANGELOG.md`](../../CHANGELOG.md) に集約）。導入価値・全体設計は [`docs/WHY_HTML_TOOL.md`](../WHY_HTML_TOOL.md) に集約。

---

## 1. リポジトリ構成と配置場所

| 区分 | リポジトリ / パス | 役割・内容 | 公開/非公開 |
|---|---|---|---|
| **ローカル作業ツリー** | `/Users/kevinshim/.bob/playground/storage-quotation-system/` | 開発・検証用作業ディレクトリ | ローカル |
| **公開リポジトリ** | `ibm-el-japan/storage-quotation-system` (`main` `/`) | GitHub Pages 公開サイト（アプリ本体・共通パーサ・匿名化文書）<br>URL: `https://ibm-el-japan.github.io/storage-quotation-system/` | 公開 (Public) |
| **案件・作業用** | `ibmkevin/storage-quotation-work` | 実案件ファイル (`work/`)、個別作業メモ、本スキル控え | 非公開 (Private) |
| **全体ツリー** | `ibmkevin/playground` | 開発環境全体のスナップショット・履歴管理 | 非公開 (Private) |
| **Bob スキル実体** | `~/.bob/skills/storage-quotation-system/SKILL.md` | Bob が実行時に参照するスキル定義ファイル | ローカル |
| **スキル控え** | `storage-quotation-system/docs/skill/SKILL.md` | リポジトリ内に保管するスキルセット本体（本ファイル） | Git 管理 |

> **セキュリティ・トークン保護ルール:**
> - PAT（Personal Access Token）は `~/.bob/settings/mcp.json` にのみ保存し、画面出力やコミットに生の値を含めない。
> - `git remote -v` や URL をログに出力する際は `sed -E 's#ghp_[A-Za-z0-9]+#ghp_***#g'` を通す。

---

## 2. ファイル構成と責務

| ファイル / ディレクトリ | 責務と役割 | 編集・保守ルール |
|---|---|---|
| `common/request-parser.js` | 依頼シートの取込みパーサ・色判定・HTML埋め込み処理 (`readSheetColors`, `parseQuotationRequestExcel`, `inlineRequestParser`) | **唯一の実装元**。HTML 各ページ内に複製を作らない（`tools/check.sh` / t21 が検査） |
| `index.html` | ポータル画面。依頼シート(xlsx)をドラッグ＆ドロップして各機能へルーティング | バッジ表記は `CHANGELOG.md` と連動 |
| `request-form.html` | 依頼記入シートのWeb入力フォーム（6ステップ、案件別HTML保存機能あり） | 共通パーサは `<script src="common/request-parser.js">` 経由 |
| `quotation-generator.html` | 概算見積シート（工数算出、出張費・手当自動計算、チェックリスト、取込状況パネル、Visual Diff、お客様提出用出力） | バージョン定数 `APP_VERSION` と画面バッジを管理 |
| `slink-spec-generator.html` | S-LINK 24項目メタデータ生成、仕様書、別紙生成 | 既存書式（10pt・見出し/表なし）を厳守 |
| `cps-input.html` | CPS (Cost Plan Sheet) 詳細入力ツール。JSON および記入済み `.xlsm` を直接出力 | 制約 R8 により別メニューとして独立 |
| `tools/apply_cps.py` | CPS 入力 JSON を雛形 `.xlsm` へ書き込む CLI ツール | `cps-input.html` の `fillCps` と同一セル番地に書き込む |
| `tools/check.sh` | 構文検査・パーサ重複検査・バージョン整合検査・全回帰テスト (t1–tN) を一括実行 | コミット・公開前の必須チェック |
| `tests/` | 回帰テストスイート (jsdom + SheetJS) | テスト追加時は `tests/README.md` の件数表を更新 |
| `CHANGELOG.md` | 全リリース履歴の一元管理ファイル | 1リリースにつき1エントリを先頭に追記 |
| `docs/WHY_HTML_TOOL.md` | なぜHTMLツールなのか（導入価値・現行Excel比較・全体フロー・セキュリティ・統合ロードマップ） | レビュー用詳細資料 |
| `docs/MAINTENANCE.md` | 保守手順、制約詳細、パスワード管理、リリース手順の詳細書 | 実装の運用標準 |
| `README.md` | プロジェクト概要・機能説明 | 公開前に差分・機密情報の混入がないか確認 |

---

## 3. 遵守すべき基本制約（会議メモ R1–R11）

1. **R1: 値の取得元を表示する（文字色で識別）**
   - 画面上では取得元に応じて以下の文字色を適用する（お客様向け出力には色・バッジを入れない）。
   - `sheet` (赤 `#c00000`): 依頼シートの実入力（黒字セル）。
   - `reference` (グレー斜体 `#8b8f98`): 依頼シートの参考記入例（グレー文字セル）。
   - `default` (青 `#1d4ed8`): システムが自動決定・補完した値。
   - `manual` (黒): 取込後に利用者が手入力・編集した値。
   - `empty` (—): 記載なし（推測・捏造しない）。
2. **R3: チェックされていない項目は出力しない**
   - オプションや作業項目で未選択のものは見積・仕様書・別紙・CPSに出力しない。
3. **R4: 定型行の混入防止**
   - サービス内容に「設計/構築/稼動テスト/ドキュメント/Q&A」だけの意味のない定型行を紛れ込ませない。
4. **R5: EL SE による確認と工数保護**
   - 取り込んだデータは EL SE が「確認済み」チェックを行う。製品を変更しても既定工数を勝手に再計算・上書きしない。
5. **R6: 出張判定の自動決定禁止・主要プリセットによる支援**
   - 出張の基点事業所（東京／名古屋／大阪／幕張）および距離区分（短距離／中距離／遠距離）は人が選択・確認する。
   - 主要10地点（名古屋・京都・大阪・広島・福岡・福島・仙台・盛岡・青森・札幌）はプリセットで一次計算を支援し、手入力補正を維持する。
6. **R8: CPS は別メニュー**
   - 概算見積・S-LINK 生成とは独立したメニューとして `cps-input.html` を提供する。
7. **R9: 既存ドキュメント書式の厳守**
   - 仕様書・別紙は従来の Word 書式（10pt・見出しスタイルや表組みを用いないプレーンな段落構成）を踏襲する。
8. **R10: 支払い計画の確定禁止**
   - 支払い計画（マイルストーン分割）はツールで勝手に確定させず、既定値はツール算出・編集可能・「要営業確認」と明記する。
9. **R11: 項目ごとのテストと検証**
   - 機能追加・修正時は回帰テストを追加し、`tools/check.sh` で全件合格を確認する。
10. **お客様向け出力のクリーン化ルール**
    - お客様提出用（見積書・仕様書・別紙・チェックリスト・S-LINKコピー値・Excel出力）には、内部用の色・バッジ・セル番地を含めない。
11. **Opportunity No / 営業担当の分離**
    - HW/SW製品とサービスで Opportunity No は別。一方が空欄でも他方を補完しない。
    - ストレージ担当営業（製品）と Expert Labs 担当営業（サービス）は別人。S-LINK の OO はストレージ担当営業、EL営業は sm24（チームメンバー）に設定する。

---

## 4. Labor 単価と出張費・宿泊費の算出ルール

### Labor 単価 (基準 B8)
- 2026年: **17,600 円/h**
- 2027年: **17,900 円/h**
- 2028年: **18,200 円/h**
- 2029年: **18,500 円/h**
- ※単価改定時は `quotation-generator.html` の `LABOR_RATES` と `slink-spec-generator.html` の `LABOR_B8` を**同時に**更新し、`tests/t11.js` を修正する。
- ※CPS の Hourly Recovery Cost（`CostPlanSheetTPS2026v1.xlsm`：B6=13,100 / B7=16,400 / B8=18,600 / B9=21,800 / B10=25,200）は別体系。

### 主要10地点プリセットと確認済み参考運賃 (東京駅基準)

| 訪問先 | 距離区分 | 既定移動手段 | 参考往復運賃 | 宿泊費目安（2名分×1.3 切上げ） |
|---|---|---|---|---|
| **名古屋** | 中距離 | 新幹線 | ¥22,000 | ¥60,000 |
| **京都** | 遠距離 | 新幹線 | ¥28,000 | ¥75,000 |
| **大阪** | 遠距離 | 新幹線 | ¥30,000 | ¥80,000 |
| **広島** | 遠距離 | 新幹線 | ¥39,520 | ¥105,000 |
| **福岡（博多）** | 遠距離 | 飛行機 | ¥60,000 | ¥160,000 |
| **福島** | 中距離 | 新幹線 | ¥18,660 | ¥50,000 |
| **仙台** | 遠距離 | 新幹線 | ¥23,260 | ¥65,000 |
| **盛岡** | 遠距離 | 新幹線 | ¥30,900 | ¥85,000 |
| **青森** | 遠距離 | 新幹線 | ¥35,820 | ¥95,000 |
| **北海道（札幌）** | 遠距離 | 飛行機 | ¥80,000 | ¥210,000 |
| **その他（自由入力）** | 手動選択 | 手動選択 | 手動入力 | 運賃連動または手入力 |

### 出張手当・帰着日遠距離手当 (3,500円)
- **日帰り**: 短距離=0円 / 中距離=1,500円 / 遠距離=3,500円 × 訪問回数 × 人数
- **宿泊（5業務日ブロック制）**:
  - 宿泊出張手当: 食事区分別単価（¥4,000 / ¥3,200 / ¥1,300 / ¥500）× 宿泊数 × 人数
  - **帰着日遠距離手当 (¥3,500)**: 遠距離出張時、5業務日ごとに宿泊手当4日分＋長距離手当1日分（¥3,500）として自動計算（訪問回数 × 1日 × ¥3,500 × 人数）。
- **予備率 (20%)**: 現地作業時間から算出した基本回数・宿泊数に 20% の予備（切上げ）を自動加算。
- **総移動回数**: 往復回数 × 片道2 × 人数 を自動明示。

---

## 5. 公開・非公開の分離とセキュリティ境界

### 公開リポジトリ (`ibm-el-japan/storage-quotation-system`) に含めてよいもの
- アプリ本体 (`index.html`, `request-form.html`, `quotation-generator.html`, `slink-spec-generator.html`, `cps-input.html`)
- 共通ライブラリ (`common/request-parser.js`)
- 検証ツール (`tools/check.sh`, `tools/apply_cps.py`)
- 回帰テストコード (`tests/*.js`, `tests/README.md`)
- 匿名化されたドキュメント・変更履歴 (`README.md`, `CHANGELOG.md`, `docs/WHY_HTML_TOOL.md`, `docs/MAINTENANCE.md`, `docs/skill/SKILL.md`)

### **絶対に公開リポジトリに置いてはならないもの**
- `work/` 配下の実案件ファイル・顧客固有データ
- 顧客名、Opportunity No、顧客別金額、案件作業ログ (`WORK_LOG.md`)
- CPS の実雛形・単価表 `.xlsm`（`CostPlanSheet*.xlsm`）
- `Quotation Request Form.xlsx`（原本）
- プレゼンテーション資料 (`*.pptx`)
- 管理者パスワードの平文（アプリ内では salt + sha256 ハッシュのみ使用）
- API トークン (`ghp_*`, `github_pat_*`)

---

## 6. 検証・リリース作業フロー

1. **コード修正**:
   - パーサ変更時は `common/request-parser.js` のみを編集。
   - お客様向け出力・画面表示の修正時は制約 R1–R11 を確認。
2. **テスト実行**:
   ```bash
   cd /Users/kevinshim/.bob/playground/storage-quotation-system
   ./tools/check.sh
   ```
   （全テスト合格 `ALL OK` を確認）
3. **バージョン番号の更新** (バージョンアップ時):
   - `quotation-generator.html`: `APP_VERSION`、`id="ver-badge"`、Release Version 行、変更履歴表先頭行
   - `index.html`: `<span class="badge">vX.Y.Z</span>`
   - `CHANGELOG.md`: 先頭に新バージョンのエントリを追加
   - `tests/README.md`: テスト件数・一覧を更新
4. **スキルセットの同期**:
   - `~/.bob/skills/storage-quotation-system/SKILL.md` を更新後、`docs/skill/SKILL.md` にコピー。
5. **公開リポジトリへの反映 (`/tmp/pub`)**:
   ```bash
   # /tmp/pub が無ければ git clone git@github.com:ibm-el-japan/storage-quotation-system.git /tmp/pub
   cd /tmp/pub
   git pull --rebase
   # 変更ファイル（common/, tools/, html, docs/ 等）をコピー
   git add -A
   # 機微情報のチェック（0件であること）
   git diff --cached | grep -E "ghp_|github_pat_|Opportunity|[0-9]{7,}"
   git commit -m "Release vX.Y.Z"
   git push origin HEAD:main
   ```
6. **全体ツリーへのコミット (`ibmkevin/playground`)**:
   ```bash
   cd /Users/kevinshim/.bob/playground
   git add storage-quotation-system/
   git commit -m "Update storage-quotation-system vX.Y.Z"
   git push origin main
   ```
7. **反映確認**:
   - 約1分後、`https://ibm-el-japan.github.io/storage-quotation-system/` の各ページを取得してローカルと一致することを確認。

---

## 7. スキルセットの参照・確認・更新手順 (Skillset Retrieval, Review & Update)

今後、運用経験や改善項目に基づきこのスキルセットを見直し・更新する際の手順：

### ステップ 1: スキルセットの取得・確認 (Retrieve & Review)
- **Bob 上でスキルを呼び出す場合:**
  - プロンプトで「Storage Quotation System について教えて」「概算見積ツールの保守ルールを確認したい」と入力するか、明示的に `use_skill: storage-quotation-system` を実行します。
- **GitHub / リポジトリ上で確認する場合:**
  - リポジトリ内パス: [`storage-quotation-system/docs/skill/SKILL.md`](docs/skill/SKILL.md)
  - ローカル実体: `~/.bob/skills/storage-quotation-system/SKILL.md`

### ステップ 2: スキルセットの更新 (Update)
1. 実体ファイル `~/.bob/skills/storage-quotation-system/SKILL.md` を編集します。
2. 編集内容をリポジトリ内保管用ファイル `storage-quotation-system/docs/skill/SKILL.md` に同期します：
   ```bash
   cp ~/.bob/skills/storage-quotation-system/SKILL.md /Users/kevinshim/.bob/playground/storage-quotation-system/docs/skill/SKILL.md
   ```
3. 非公開作業リポジトリ `ibmkevin/storage-quotation-work` にもバックアップをコピーします。

### ステップ 3: GitHub へのコミットと永続化 (Persist to GitHub)
```bash
cd /Users/kevinshim/.bob/playground
git add storage-quotation-system/docs/skill/SKILL.md
git commit -m "Update storage-quotation-system skill: <更新内容の要約>"
git push origin main
```
公開リポジトリ側 (`ibm-el-japan/storage-quotation-system`) にも反映する場合は、`/tmp/pub/docs/skill/SKILL.md` にコピーして push します。
