# 依存関係ポリシー

## 1週間ルール

**リリースから7日未満のパッケージバージョンは採用しない。**

### 背景

新バージョンリリース直後は以下のリスクが高い：

- 公開直後に発覚したバグへの緊急パッチが出る可能性
- セキュリティ脆弱性の発見（特に npm エコシステムでは初週に集中しやすい）
- 依存先パッケージとの非互換が判明してのリバート

7日間の猶予を設けることで、コミュニティが問題を発見・報告し、  
メンテナが修正パッチを出す時間を確保する。

---

## 強制方法

`.github/renovate.json` に `minimumReleaseAge: "7 days"` を設定済み。  
Renovate が自動更新 PR を作成する際、リリースから7日未満のバージョンは  
`internalChecksFilter: "strict"` によって PR 作成自体がブロックされる。

```json
{
  "minimumReleaseAge": "7 days",
  "internalChecksFilter": "strict"
}
```

手動でバージョンを上げる場合も、このルールに従うこと。

---

## 例外

以下の場合は7日ルールを適用しない：

| ケース | 理由 |
|---|---|
| セキュリティ脆弱性の修正パッチ（CVE 付き） | リスクが既知で修正が明確なため |
| 破壊的バグで開発がブロックされている場合 | PR にその旨を明記すること |

例外を適用した PR には `skip-release-age-check` ラベルを付与し、  
レビューで理由を明示すること。

---

## ツールバージョン（mise）

`.mise.toml` で管理する Node.js・pnpm も同様に1週間ルールを適用する。  
Renovate の `matchManagers: ["mise"]` で自動更新 PR も同ルールに従う。

---

## サプライチェーン対策一覧

| レイヤー | 対策 | 設定ファイル |
|---|---|---|
| バージョン固定 | `save-exact=true` で `^` レンジを禁止 | `.npmrc` |
| ロックファイル | `pnpm-lock.yaml` をコミット必須 | CI: `--frozen-lockfile` |
| リリース待機 | 新バージョンを7日間ブロック | `.github/renovate.json` |
| 脆弱性検知 | OSV DB との照合・自動 PR | `.github/renovate.json` (`osvVulnerabilityAlerts`) |
| 脆弱性 CI ゲート | `pnpm audit --audit-level=high` で高以上をブロック | `.github/workflows/ci.yml` |
| PR 差分監視 | 新規追加パッケージの脆弱性・ライセンスを自動チェック | `.github/workflows/dependency-review.yml` |
| Actions ピン | `uses:` を `@SHA` 形式に固定（タグ書き換え耐性） | 各 workflow ファイル |
| ライセンス制限 | GPL-2.0 / GPL-3.0 / AGPL-3.0 を依存禁止 | `.github/workflows/dependency-review.yml` |

### 脆弱性アラートの例外

セキュリティ修正パッチは7日ルールの適用外（`vulnerabilityAlerts.minimumReleaseAge: null`）。  
Renovate が即座に PR を作成するため、レビューを優先して対応すること。
