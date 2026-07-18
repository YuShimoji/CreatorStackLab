# Creator Stack Lab

Creator Stack Lab / Creator Stack Observatory は、制作判断に必要な公式情報と外部証拠を、出典、適用条件、鮮度、変更履歴、未知とともに提示する owner-only の観測所です。実機レビュー、購買ランキング、一般障害監視、規約や適合性の自動判定には拡張しません。

## 開発を再開する

必要なNode.jsは `>=22.13.0` です。

```bash
npm ci
npm run dev
```

ローカル画面は通常 `http://localhost:3000/` で開きます。実装前に次の正本を順に確認してください。

1. [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md) — 現在状態、検証済み事実、次のスライス、配備境界
2. [`docs/PRODUCT_BOUNDARY.md`](docs/PRODUCT_BOUNDARY.md) — 製品境界とSource Admission Policy

現在のHighest-Value Sliceは、保存したentityだけを対象にした **My Stack単位の変更要約 v0** です。要件と禁止範囲は `docs/PROJECT_HANDOFF.md` を正本とし、新規Source、定期実行、cloud sync、通知、一般公開を同じスライスへ追加しないでください。

## 検証

```bash
npm test
npm run lint
npx tsc --noEmit
git diff --check
```

`npm test` はproduction build、rendered HTML tests、Observation / Evidence testsを実行します。依存変更時は `npm audit` も確認し、互換性を確認せず `npm audit fix --force` を実行しないでください。

## 実装境界

- `app/`, `components/`: Product Surface、Today、My Stack、比較、変更導線
- `data/repository.ts`: UIの読み取り境界。UIからD1やraw catalogへ直接依存しない
- `data/evidence.ts`, `data/evidence-passport.ts`: Claim / Evidenceと表示投影
- `lib/observation-engine.ts`: Source Registry、取得、正規化、変更判定
- `worker/observation-runtime.ts`, `worker/index.ts`: owner APIとD1 read/write
- `.openai/hosting.json`: 既存Sites identityとbinding。credentialやsecretは保存しない

不明、矛盾、条件付き、stale、fetch failureを正式な状態として維持します。規約hashを規約の意味へ、Source取得失敗を製品障害へ、Source未接続を変更なしへ変換しないでください。

## Git / deployment

共同作業の正本はGitHub `origin/master`、配備mirrorは既存Sites source repositoryの `main` です。配備する場合は両者を同一SHAにし、既存owner-only Siteを再利用します。新規Site作成、credentialの永続化、owner-only設定の変更は行わず、完全な手順は [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md) に従ってください。
