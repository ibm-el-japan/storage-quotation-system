#!/usr/bin/env bash
# Storage Quotation System — 構文チェック + 全回帰テストを1コマンドで実行する。
#   使い方: tools/check.sh            (どこから呼んでも可)
#   終了コード: 0 = 全て成功 / 1 = 構文エラーまたはテスト失敗
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail=0

command -v node >/dev/null || { echo "node が必要です"; exit 1; }

# --- 準備: 依存とフィクスチャ（Git管理外のものだけ。既にあれば何もしない） ---
[ -d tests/node_modules/jsdom ] || (cd tests && npm install --silent) || { echo "npm install に失敗"; exit 1; }
if command -v python3 >/dev/null; then
  [ -f tests/tpl_black.xlsx ]   || (cd tests && python3 make_black_template.py >/dev/null 2>&1) || echo "  注意: tpl_black.xlsx を生成できません（t9/t10 が失敗する可能性）"
  [ -f tests/duskin_like.xlsx ] || (cd tests && python3 make_duskin_like.py   >/dev/null 2>&1) || echo "  注意: duskin_like.xlsx を生成できません（t15 が失敗する可能性）"
fi

# --- 1. 構文: 各ページ最後の <script> と common/*.js ---
echo "== 構文チェック (node --check)"
for page in index request-form quotation-generator slink-spec-generator cps-input; do
  node -e '
    const h = require("fs").readFileSync(process.argv[1] + ".html", "utf8");
    const m = [...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    require("fs").writeFileSync(process.argv[2], m.length ? m[m.length - 1][1] : "");
  ' "$page" "$TMP/$page.js"
  if node --check "$TMP/$page.js" 2>"$TMP/err.txt"; then echo "  OK   $page.html"; else echo "  NG   $page.html"; cat "$TMP/err.txt"; fail=1; fi
done
for f in common/*.js; do
  if node --check "$f" 2>"$TMP/err.txt"; then echo "  OK   $f"; else echo "  NG   $f"; cat "$TMP/err.txt"; fail=1; fi
done

# --- 2. 回帰テスト: tests/t*.js を並列実行（各スイートの最終行 "passed=N failed=M" を集計） ---
echo "== 回帰テスト"
ls tests/t[0-9]*.js | sed -E 's#.*/t([0-9]+)\.js#\1#' | sort -n > "$TMP/list.txt"
JOBS="${JOBS:-4}"
( cd tests && xargs -P "$JOBS" -I{} sh -c 'node t{}.js > "'"$TMP"'/t{}.log" 2>&1' ) < "$TMP/list.txt"

pass=0; bad=0; suites=0
while read -r n; do
  suites=$((suites + 1))
  last="$(tail -n 1 "$TMP/t$n.log")"
  p="$(echo "$last" | sed -nE 's/.*pass(ed)?[=: ]+([0-9]+).*/\2/p')"
  f="$(echo "$last" | sed -nE 's/.*fail(ed)?[=: ]+([0-9]+).*/\2/p')"
  if [ -z "$p" ] || [ -z "$f" ]; then
    echo "  NG   t$n: 結果行を読めません -> $last"; fail=1; continue
  fi
  pass=$((pass + p)); bad=$((bad + f))
  if [ "$f" -gt 0 ]; then
    echo "  NG   t$n: pass=$p fail=$f"; grep -E 'FAIL|✗|NG' "$TMP/t$n.log" | head -10; fail=1
  fi
done < "$TMP/list.txt"

echo "== 結果: ${suites} スイート, pass=${pass}, fail=${bad}"
[ "$fail" -eq 0 ] && echo "ALL OK" || echo "FAILED"
exit "$fail"
