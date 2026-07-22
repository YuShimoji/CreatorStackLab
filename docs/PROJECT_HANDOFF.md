# Creator Stack Lab — Project Handoff

最終更新: 2026-07-23 (Asia/Tokyo)

この文書は、別端末・別セッションから Creator Stack Lab / Creator Stack Observatory の作業を再開するための運用上の正本です。製品境界の正本は [`PRODUCT_BOUNDARY.md`](./PRODUCT_BOUNDARY.md) であり、ここでは重複定義せず、現在状態、実装構造、検証済み事実、配備境界、次の作業を記録します。状態が変わった場合は新しい引き継ぎ文書を増やさず、このファイルを更新してください。

## 2026-07-23 リモート同期・開発再開監査 / 監修AI向け要約

GitHub `origin` を `fetch --prune` した後、`git pull --ff-only origin master` を実行した。local `master`、`origin/master`、`HEAD` はすべて `d42ec4963c2edd980a872e161fd88ffb99ef2165` で一致し、ahead 0 / behind 0、tracked worktreeはcleanである。GitHub上の共同作業正本はpublic repository `YuShimoji/CreatorStackLab`、default branchは `master`。取り込むべきリモート差分はなく、My Stack変更要約 v0はsource checkpointへ既に含まれている。

**結論:** ローカルは次の実装・acceptance作業を開始できる。source/build/testの回帰は検出していない。一方、My Stack新UIの実ブラウザacceptance、GitHub / Sites / productionのSHA一致、owner表示は未完了であり、production依存のhigh advisory 2件も新たな配備判断ゲートとして残る。したがって `d42ec49` を「production反映済み」または「owner受入済み」と表現してはならない。

### 2026-07-23 実測した開発ゲート

| Gate | 実測結果 |
|---|---|
| Runtime | Node.js `v24.13.0`、npm `11.6.2`。`package.json` の `>=22.13.0` を満たす |
| Install | repo内の重複npm処理を解消後、単一の `npm ci --no-audit --no-fund` が終了コード0、506 packagesを再現 |
| Dependency tree | `npm ls --depth=0` は終了コード0。`@emnapi/*`、`@tybys/wasm-util` のplatform系推移依存4件は `extraneous` 表示だがbuild/test/runtimeを阻害していない |
| Production build / tests | `npm test` 成功。rendered HTML 6 + Evidence / Observation / My Stack 27 = **33 / 33成功** |
| Static gates | `npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功 |
| Local runtime smoke | `npm run dev -- --host 127.0.0.1` で起動。現行vinextはWindows上で `::1:3000` にlistenしたため `http://localhost:3000/` を使用。主要8ルートと正しいsoftware / setup詳細2ルートがHTTP 200、Creator Stack識別子あり、server logにアプリ例外なし |
| Runtime cleanup | smoke後にdev serverを停止し、port 3000が閉じたことを確認 |
| Final Git | `git status --short --branch` は `## master...origin/master`、parity `0 0` |

インストール中、同じcheckoutを作業ディレクトリとする複数の `npm ci` が重なり、展開途中に `node_modules/.bin/vinext` が一時的に存在しない状態を観測した。最終的には単一install完了後のdependency tree、全自動gate、runtime smokeで健全性を再確認した。次回もnpm操作前にcheckout所有のnpm / nodeプロセスを確認し、install・audit・testを並列実行しない。

vinext dev logの初回compile時間が非常に大きな値で表示されたが、実リクエスト時間、HTTP結果、build、testsには失敗がない。製品回帰として扱わず、Node 24 / vinextの開発ログ表示上の既知候補として依存保守時に再確認する。

### GitHub / Sites / production のlive境界

2026-07-23にSites control planeをread-only確認した。既存Siteは `active`、access mode `custom`、許可ユーザー1名、workspace / tenant group 0、latest saved versionはVersion 8で、そのsource commitは `eca336d15d48cc2b08533a79ff2bb17d7f8a79da`。現在のGitHub `d42ec49` はSites latest saved sourceより2 commits先である。匿名でproduction `/` を取得するとHTTP 401であり、owner-only入口は維持されている。

control planeのこのreadbackだけでは、現在liveなproduction deploymentがどのversionかを機械的に特定できなかった。過去の正本では最後のfeature deploymentをVersion 6 / `278f507` としているが、これを2026-07-23のlive SHA確認へ昇格しない。owner表示、snapshot API / run APIの匿名401、production body、GitHub / Sites / deployment archiveの同一SHAは次のacceptance / deployment担当が確認する。

### 依存セキュリティの現在値

2026-07-23のregistry readbackでは、`npm audit --omit=dev` は **moderate 1 / high 2 / critical 0**。`next@16.2.6` 経由の `postcss <8.5.10` と `sharp <0.35.0` が対象で、`npm audit fix --force` はNext 9.3.3へのbreaking downgradeを提示するため実行していない。全依存では **low 1 / moderate 5 / high 11 / critical 0** で、Babel、brace-expansion、esbuild、fast-uri、js-yaml、PostCSS、sharp、undici、Vite、ws等を含む。audit commandの終了コード0は `--audit-level=critical` によるもので、脆弱性0を意味しない。

production high advisoryが増えたため、Browser acceptanceは先行してよいが、private checkpoint deployment前に次のどちらかを監修役が明示する。

- 互換性を確認した依存保守スライスを先に行い、build、33 tests、lint、TypeScript、runtime、owner-only回帰を再検証する。
- owner-only・入力境界・実利用経路を根拠に期限付きrisk acceptanceを記録し、checkpoint deployment後すぐ依存保守を行う。

force fix、Next 9へのdowngrade、検証なしoverrideは採用しない。

### 現在の完成度と最大gap

private operational betaを10段階とした概算は **6 / 10**（`██████░░░░`）。Catalog / Repository境界、4公式SourceのObservation、D1履歴、Evidence Passport、Today / Changes / Compare / My Stack、変更要約source、自動検証は存在する。残る主要gapは、My Stack変更要約の実ブラウザ・owner snapshot受入、source / saved version / live deploymentの同一SHA、security maintenance、実在pendingを扱うReview Queue運用、定期観測前の復旧・保持・監査契約である。この数字は一般公開サービスの完成度ではなく、製品境界内のowner-only private betaへの到達度を示す。

### 残作業の監督表

| 目的 | 効果 | 要件 | 状態 | Owner | 次の一手 |
|---|---|---|---|---|---|
| My Stack変更要約のBrowser acceptance | 誤変換、読みにくさ、responsive退行をdeployment前に止める | 1440px / 390px、ready / empty / baseline / multi-source / Catalog-only / snapshot error、実遷移、console、横溢れ | 自動gateとHTTP smokeは成功、client acceptance未実施 | 実装・QA担当。最終的な読みやすさはowner | ローカルfixtureとowner snapshotの双方でacceptance evidenceを残す |
| production依存のhigh advisoryを処理する | 既知脆弱性を抱えたままcheckpointを進める判断を明示化 | Next / vinext / Worker互換、33 tests、runtime、owner-onlyを維持。force fix禁止 | moderate 1 / high 2 / critical 0 | 依存保守担当、risk acceptanceは監修役 / owner | fixed version / safe override / bounded acceptanceを調査し、deployment前の順序を決める |
| GitHub / Sites / live SHAを一致させる | 「sourceは新しいがproductionは古い」状態を解消 | 既存Siteのみ、短期credentialのみ、同一commit archive、access custom、user 1、group 0 | GitHub `d42ec49`、Sites latest saved `eca336d`。live versionは未特定 | 配備権限を持つ担当 | acceptanceとsecurity gate後、Sites source push、save、private deploy、SHA readback |
| owner / anonymous production acceptance | private runtimeの機能・認証境界を証明 | owner body、My Stack、snapshot / run、匿名 `/` / APIs 401、console、responsive | 匿名 `/` 401のみlive再確認。owner bodyとAPIsは未確認 | owner sessionを持つQA担当 | deployment後に実ブラウザで確認し、結果を本書へ反映 |
| 実在pendingに対するReview Queue運用 | terms等の意味判断を自動反映せず、人間判断を追跡可能にする | 実在 `review_pending`、approve / reject / supersede、actor / timestamp / provenance、再実行の冪等性 | データ層とqueueはあるがoperator UIは意図的に未実装 | 次期feature担当 + 判断owner | pending fixtureだけで先に大UIを作らず、実在または正本fixtureで薄いvertical sliceを定義 |
| 定期観測前の運用契約 | スケジュール化で誤通知・過剰取得・履歴破損を増やさない | rate limit、conditional request、retry、idempotency、retention、manual override、restore | 手動owner runまで。正式scheduleは未接続 | runtime / operations担当 | Review Queueとrestore proofの後に限定Sourceでprivate pilot |

### 先行目標案（監修役AIが順序を管理）

長期項目は方向案であり、直近スライス以外を同時実装しない。各段階は前段のevidenceをentry conditionにする。

| Horizon | 目標 | Exit criteria |
|---|---|---|
| H0 — Restart-ready checkpoint | remote同期、依存再現、build / tests / lint / type / runtime、正本更新 | **2026-07-23完了**。doc commitのGitHub反映と最終parityのみ本作業のcloseoutで確認 |
| H1 — Acceptable private checkpoint | My Stack変更要約を実ブラウザ受入し、security gateを解決または期限付き受容した上で既存owner-only Siteへ同一SHA配備 | 1440px / 390px、owner成功、匿名3経路401、user 1 / group 0、GitHub = Sites = archive = live source、rollback version保持 |
| H2 — Operator Review vertical slice | 実在または正本fixtureの `review_pending` をownerが確認し、approve / reject / supersedeできる | 意味判断をhashから自動生成しない、actor / reason / timestamp / evidence保存、二重処理なし、Evidence Passport / historyへ反映 |
| H3 — Observation reliability beta | 4既存Sourceについて取得・304・timeout・malformed・stale・last success・retryを運用可能にする | bounded retry、per-source health、idempotent run、保持期間、export / restore drill、失敗をservice outageへ変換しない |
| H4 — Decision surface beta | Source eventを「今日何を確認すべきか」という保存entity / 判断topic単位へ編成する | My Stack優先順位の説明可能性、cross-entity topic、比較からEvidence Passport / historyへのtrace、未知を残す。おすすめ・購買rankingへ拡張しない |
| H5 — Source governance | Source Admission Policyを実装前gateとして機械・人間の両方で運用する | adapter contract tests、officiality / terms / cadence / failure semantics / maintenance costの審査記録。需要根拠のないSource増加なし |
| H6 — Private scheduled observation pilot | 限定Sourceだけをowner-onlyで定期観測し、手動runと共存させる | rate limit、conditional request、single-flight、run ledger、停止switch、review backlog上限、通知・一般公開なし |
| H7 — Operational hardening | owner-only運用を継続可能にする | dependency更新cadence、backup / restore、D1 migration rehearsal、rollback、secret scan、runbook、最小限の非PII運用指標 |
| H8 — Expansion decision gate | cloud sync、通知、第三者報告、実機検証管理、一般公開等を製品境界変更として個別審査 | ownerの明示承認と `PRODUCT_BOUNDARY.md` 更新がない限り未着手。技術的成功やprivate deploymentから承認を推定しない |

監修役AIの推奨順序は `H1 Browser acceptance → security decision → private deployment → H2 Review → H3 reliability`。H4以降は、H1〜H3で得た実利用証拠に基づき再評価する。

## 2026-07-21 My Stack変更要約 v0 source checkpoint

**My Stack単位の変更要約 v0** のsource実装と全自動検証を完了した。この文書と同じcommitをGitHub `origin/master` の共同作業正本とする。Sites source repository、owner-only production、Browser QAはこのcheckpointでは更新・再検証していないため、GitHub sourceの完了をproduction配備済みへ読み替えない。

実装は `components/MyStackClient.tsx`、`data/my-stack-change-summary.ts`、`tests/my-stack-change-summary.test.ts` と、test suiteへ新規testを含める `package.json` の1行変更で構成する。保存entityだけを対象に、Source単位の状態を保持したままentity単位へ要約し、優先順位を `review_pending > fetch_failed > stale > meaningful_change > source_unavailable > baseline_only > unchanged_since_visit` とした。

次の境界を自動testと意味レビューで維持している。

- `previousVisit` より前の変更を新着へ含めず、`previousVisit` 不明時は過去差分をbaselineとして扱う。
- baselineとunchangedをmeaningful changeへ、fetch failureを製品・サービス障害へ、Source未接続を変更なしへ変換しない。
- bounded historyがなければunchangedを推測しない。
- VOICEVOXのreleaseとtermsをSource単位で保持する。
- 変更・取得失敗は変更履歴へ、安定境界とCatalog-onlyはEvidence Passportへ接続する。
- My Stackのready、空状態、snapshot loading / error、localStorageだけの保存境界を維持する。

### 2026-07-21 自動検証

| Gate | 結果 |
|---|---|
| Install | `npm ci --no-audit --no-fund` 成功。lockfileどおり506 packages、tracked追加差分なし |
| Production build | `npm test` 内の `vinext build` 成功 |
| Automated tests | 33 / 33成功。rendered 6、Evidence / Observation 15、My Stack変更要約 12 |
| Static gates | `npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功 |
| Dependency audit | productionはmoderate 2件（`next`経由の`postcss`）。全体はlow 1、moderate 7、high 6、critical 0 |
| Browser / production | 未実施。1440px・390px、console、owner表示、匿名401、Sites SHA parityは次のgate |

`npm audit --omit=dev` の修正候補はNext 9.3.3へのmajor downgradeを提示するため採用しない。全体auditは `@cloudflare/vite-plugin` 1.45.1、Vite 8.1.5等の非major候補も提示するが、featureへ混ぜず独立した依存保守スライスで互換性を確認する。`npm audit fix`、force fix、override、依存version変更は行っていない。

patch適用後に `package.json` のEOL差分が全行化したため、HEAD blobの既存EOLを保持してtest script 1行だけを置換した。通常の `git diff` は `1 insertion / 1 deletion` であり、改行だけの全行差分は残していない。

### 次端末の最初の作業

1. `origin/master` の最新HEADを取得し、この文書と `docs/PRODUCT_BOUNDARY.md` を読む。
2. GitHub sourceとSites `main` / productionのSHA差を確認する。Sitesを同一SHAと仮定しない。
3. My Stack変更要約を1440px・390pxで確認し、ready、空、初回baseline、VOICEVOX複数Source、Catalog-only、snapshot error、各リンク、console 0を検証する。
4. 回帰がなければ既存owner-only Siteへ同一SHAを同期・private checkpoint deploymentし、owner成功、匿名401、許可ユーザー1名、group 0を確認する。
5. DB schema、認証、API契約、Source Registry、cloud sync、通知、一般公開はこのacceptance / deploymentスライスへ追加しない。

## 2026-07-18 再開監査 / 監修AI向け現状報告

2026-07-18 (Asia/Tokyo) に GitHub `origin` を `fetch --prune` し、local `master` と `origin/master` が同一の `eca336d15d48cc2b08533a79ff2bb17d7f8a79da`、ahead 0 / behind 0 であることを確認した。取り込むべきリモート差分はなく、Feature baseline `278f507` 以降は引き継ぎ文書の追加だけで、製品コードの追加変更はない。

現在のNorth Starは、公式情報と外部証拠を、出典、条件、鮮度、変更履歴、未知とともに提示するowner-onlyの制作判断観測所である。現在の開発軸は Evidence Passport v0 完了後の **My Stack単位の変更要約 v0**。この次スライスは未着手であり、最大のdelivery gapは、保存した複数entityについて「前回訪問後に何を見るべきか」をentity単位で安全に要約する体験がまだないこと。詳細要件は後段の「次に実行するスライス」を正本とする。

### ローカル開発準備

| Gate | 2026-07-18の結果 |
|---|---|
| Runtime | Node.js `v24.13.0`、npm `11.6.2`。要件 Node.js `>=22.13.0` を満たす |
| Install | `npm ci` 成功。lockfileどおり506 packagesを再現 |
| Production build | `npm test` 内の `vinext build` 成功 |
| Automated tests | 21 / 21成功。rendered 6、Evidence / Observation 15 |
| Static gates | `npm run lint`、`npx tsc --noEmit`、同期直後の `git diff --check` 成功 |
| Local runtime smoke | `npm run dev -- --host 127.0.0.1` で起動し、`http://localhost:3000/` がHTTP 200、Creator Stack識別子あり。確認後にプロセス停止 |
| Git worktree | 監査開始時はtracked差分なし。端末固有の `.serena/` は内容を削除せず `.git/info/exclude` だけでlocal除外 |

### 残作業と証拠境界

| 目的 | 影響 | 要件 | 状態 | Owner | 次の一手 |
|---|---|---|---|---|---|
| production依存の脆弱性を解消する | `npm audit --omit=dev` はmoderate 2件。`next@16.2.6` 同梱の `postcss@8.4.31` が `<8.5.10` のadvisory対象 | Next / vinext互換性とbuild・33 tests・owner-only回帰を維持する。監査が提示するNext 9.3.3への大幅downgradeは採用しない | 未解消。同期・再開を妨げるbuild failureではないが、production security maintenanceとして残る | 次回の依存保守担当（監修AIが割当） | vinext / Next側の互換修正版または安全なoverride可否を調査し、独立スライスで更新・全gate再検証 |
| 開発依存の監査警告を整理する | 全依存ではlow 1、moderate 7、high 6。主にCloudflare / Vite / Wrangler / Drizzle toolchainの推移依存 | runtimeとSites build互換性を維持し、一括force fixを避ける | 未解消。現在のbuild・test・dev serverは成功 | 次回の依存保守担当（監修AIが割当） | direct dependencyごとに非major更新を分け、auditと全gateを再実行 |
| Sites mirror / production parityを再確認する | この端末には `sites` remoteがなく、Sites `main`、owner表示、匿名401は今回live再検証していない | 既存Siteの短期source credentialとowner session。tokenを保存しない | 未確認。過去の検証済み状態を現在のproduction事実として再主張しない | 配備権限を持つ担当 | 次回の配備前にGitHub SHA = Sites SHA、owner-only、許可ユーザー1名、匿名401をlive確認 |

監修判断として、ローカルは次スライスの実装を開始できる。依存監査とSites live parityは隠さず別ゲートとして保持し、My Stack変更要約へ混ぜない。READMEは製品名、正本、再開コマンドが最初に見えるよう2026-07-18にスターター文面から更新した。

## 最短の再開手順

1. GitHubの `https://github.com/YuShimoji/CreatorStackLab.git` をcloneし、`origin/master` を取得する。GitHub CLIを使う場合は `gh repo clone YuShimoji/CreatorStackLab` で開始できる。
2. Codex Sites の既存Site編集ライフサイクルを使い、`.openai/hosting.json` の `project_id` を再利用する。`create_site` は実行しない。
3. `origin/master`、Sites source repositoryの `main`、現在の `HEAD` が一致していることを確認する。`sites` remoteが端末にない場合は、既存Siteから短期source credentialを取得し、その `remote_url` をremoteとして登録する。tokenをURL、Git設定、文書、ログへ保存しない。
4. この文書、`docs/PRODUCT_BOUNDARY.md`、`data/repository.ts`、`data/evidence.ts`、`data/evidence-passport.ts`、`lib/observation-engine.ts`、`worker/observation-runtime.ts` を読む。
5. `npm ci` の後、`npm test`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行する。
6. 変更前にSite identity、owner-only設定、Git status、remote差分を確認する。無関係な未コミット差分が混在している場合だけ停止する。

## 引き継ぎ時点の状態

| 項目 | 確認済み状態 |
|---|---|
| Site | Creator Stack Lab / Creator Stack Observatory |
| Production URL | https://creator-stack-lab.thankyoukass.chatgpt.site |
| Access | `custom`、許可ユーザー1名、workspace / tenant group 0、owner-only |
| Production feature baseline | `278f507d72b91bef4f50f944c984160b9001f566` — `feat: add evidence passports` |
| GitHub source checkpoint | `origin/master` の最新HEAD — My Stack変更要約 v0 sourceと自動検証を収録 |
| Branch parity | local `master` = GitHub `origin/master`。Sites `main` / production parityは2026-07-21未確認 |
| GitHub | https://github.com/YuShimoji/CreatorStackLab — collaboration / handoff source |
| Source visibility | GitHub repositoryはpublic。Site runtimeはowner-only |
| Catalog | software 8件、setup 8件 |
| State | Catalogは静的Repository、公式観測はD1、My Stackは端末内localStorage |
| Observation mode | owner-only手動実行。正式な定期実行は未接続 |
| External sources | 既存4ソースのみ。新規Sourceは追加していない |
| Evidence Passport | OBS Studio、VOICEVOX、Twitch接続構成で完成。Source未接続対象は明示的に未確認 |
| Last feature deployment | Sites Version 6。GitHub引き継ぎ同期後のsource-only checkpointはVersion 8 |
| Pull request | 作成していない |

引き継ぎ用コミットの完全SHAはこの文書へ固定せず、GitHub `origin/master` の最新 `HEAD` を共同作業の正本とします。Sites source repositoryの `main` は配備用mirrorですが、2026-07-21のGitHub source checkpointには未同期です。production Siteの見た目と実行ロジックをGitHub sourceと同一だと推定せず、次の配備前にSHAとowner-only境界をlive確認してください。

GitHub repositoryはpublicです。これはSiteの閲覧権限とは別の境界であり、production Siteは引き続きowner-onlyです。sourceへsecret、認証情報、account ID、cookie、D1実データ、非公開の外部本文をcommitしないでください。source自体を非公開にする必要が生じた場合は、GitHub repositoryのvisibility変更をユーザー判断として先に行います。

## 製品として守る境界

Creator Stack Observatoryは、公式情報と外部証拠を、出典、適用条件、鮮度、変更履歴、未知とともに編成する制作判断の観測所です。実機検証ラボ、ガジェットブログ、購買ランキング、自由投稿コミュニティ、一般障害監視、広告・アフィリエイト媒体へ変更しません。

詳細とSource Admission Policyは `docs/PRODUCT_BOUNDARY.md` を参照してください。特に次を維持します。

- 不明、矛盾、条件付き、鮮度超過、取得失敗を正式な状態として扱う。
- 規約hashを規約の意味や商用可否へ自動変換しない。
- 情報源の取得失敗を製品・サービス障害へ変換しない。
- 運営者実機試験の未実施を「証拠なし」と表示しない。
- Sourceは網羅性ではなく、制作判断への必要性と維持価値で追加する。
- owner-onlyを維持し、一般公開、広告、アフィリエイトを追加しない。

## 実装の全体像

| 層 | 主な正本 | 責務 |
|---|---|---|
| Product Surface | `app/softwares/[slug]/page.tsx`、`app/setups/[slug]/page.tsx`、`components/EvidencePassport.tsx` | 結論、根拠、条件、未知、鮮度、履歴を表示 |
| Today / workflow | `components/StatusDashboard.tsx`、`components/ChangeRadar.tsx`、`components/MyStackProvider.tsx` | 現在値、変更、端末内My Stack、詳細への導線 |
| Catalog / Repository | `data/catalog.ts`、`data/repository.ts` | UIが静的配列やD1へ直接依存しない読み取り境界 |
| Claim / Evidence | `data/models.ts`、`data/evidence.ts`、`data/evidence-passport.ts` | Claim、Evidence Reference、離散的な認識状態、Product Surface向け投影 |
| Observation domain | `lib/observation-engine.ts` | Source Registry、取得adapter、正規化、意味のある変更判定 |
| Runtime / D1 | `worker/observation-runtime.ts`、`worker/index.ts` | owner API、D1 read/write、snapshot、履歴要約 |
| Hosting | `.openai/hosting.json` | 既存Site identityと論理D1 binding。tokenや環境秘密は保存しない |

データの基本経路は次のとおりです。

`Catalog Entity → Claim → Evidence Reference → Source / Observation → Evidence Passport`

UIからD1テーブルやraw配列を直接参照しないでください。新しい読み取り需要はまずRepositoryへ追加し、`unknown`、`stale`、`fetch_failed` をUI向け状態へ変換します。

## Evidence Passport v0

対象詳細には、次の4セクションがあります。

1. 現在確認できること
2. 根拠
3. 条件と限界
4. 変更履歴

Epistemic Statusは数値confidenceではなく、`officially_stated`、`observed_current`、`conditional`、`unknown`、`conflicted`、`stale` の離散状態です。

| 既存・観測状態 | 表示上の意味 | 禁止する変換 |
|---|---|---|
| `physicalTested: false` | 運営者自身の実機試験が未実施 | 証拠なし、未検証製品、動作不可 |
| 公式文書あり | 発行者が公式に記載した範囲 | 個別構成での動作保証 |
| `observed_current` | 公式Sourceから現在値を取得済み | 適合性や商用可否の自動断定 |
| `stale` | 鮮度期限を超過 | 最新情報としての表示 |
| `fetch_failed` | 情報源の取得に失敗 | サービス障害・製品障害 |
| 規約hash | 文書同一性・変化の受領証跡 | 規約の意味、商用利用可否 |
| Source未接続 | Catalog情報はあるが公式観測へ未接続 | 正常、不変、確認済み |

完成対象は次の3 entityです。

| Entity | Claims / Evidence | 現在の表示原則 |
|---|---|---|
| `sw-obs-studio` | 4 Claims / 3 Evidence | Release、System Requirements、Recording Guide。性能は条件付き、運営者実機試験なし |
| `sw-voicevox` | 4 Claims / 2 Evidence | Releaseと利用規約。規約hashと人手で確認した意味を分離 |
| `setup-ag03-ipad-usbc` | 1 Claim / 1 Evidence | Twitch公式サービス状態とiPad・AG03・回線等のローカル適合を分離 |

## Source RegistryとD1

既存Source Registryは4件です。次のスライスでSourceを増やさないでください。

| Source ID | Entity | Method | 自動反映境界 |
|---|---|---|---|
| `twitch-status` | `setup-ag03-ipad-usbc` | Statuspage JSON | 公式サービス状態のみ。ローカル構成適合へ変換しない |
| `obs-studio-releases` | `sw-obs-studio` | GitHub Releases JSON | バージョン、公開日、Source URL |
| `voicevox-releases` | `sw-voicevox` | GitHub Releases JSON | バージョン、公開日、Source URL |
| `voicevox-software-terms` | `sw-voicevox` | 公式HTML text hash | review-only。意味や商用可否を自動反映しない |

D1 binding名は `DB` です。既存テーブルは `sources`、`observations`、`change_events`、`update_runs`、`review_queue` です。Evidence Passport v0ではスキーマmigrationを追加していません。

Snapshot履歴は直近Observationを `baseline`、`unchanged`、`changed`、`fetch_failed`、`review_pending` へ要約します。全ObservationをProduct Surfaceへ無制限表示しません。

## 主要ルートと導線

| Route | 用途 |
|---|---|
| `/status` | owner-only手動観測、公式4ソースの現在値、Today導線 |
| `/my-stack` | localStorageに保存した対象。クラウド同期なし |
| `/softwares` | software検索・絞り込み |
| `/softwares/:slug` | software詳細とEvidence Passport |
| `/setups` | setup検索・絞り込み |
| `/setups/:slug` | setup詳細とEvidence Passport |
| `/compare` | software比較。390pxでもドキュメント横溢れなし |
| `/changes` | Catalog変更とObservation変更のレーダー |
| `/policy` | 検証・表示方針 |

Todayの各公式Sourceカードから、対応するEvidence Passportへ移動できます。Source未接続対象の詳細は壊さず、公式観測未接続であることを明示します。

## My Stackの現在境界

- 保存先はlocalStorageで、このブラウザ・この端末だけに存在する。
- アカウント同期、クラウド同期、メール・push通知はない。
- Providerのready前は0件や正常と断定せず、読込中表示を行う。
- `previousVisit` はlocalStorageの既存値を読み取ってから現在時刻で上書きし、変更要約の比較基準に使う。
- 保存entityだけを対象に、Source単位の状態を失わずentity単位の変更要約を表示する。
- snapshotのloading / error時は変更なしや正常と断定せず、Evidence Passportの根拠と未知へ戻れる。
- Source未接続はCatalog-only、履歴不足はbaseline-onlyとして扱い、unchangedを推測しない。

## 検証済み事実

Feature baseline `278f507` で以下を確認済みです。

| Gate | 結果 |
|---|---|
| production build | 成功 |
| TypeScript | 成功 |
| lint | 成功 |
| `git diff --check` | 成功 |
| automated tests | 21 / 21成功。rendered 6、Evidence / Observation 15 |
| Browser QA | 1440px・390px成功。console error 0 / warning 0 |
| Workflow regression | 検索、比較、My Stack、Today、Changes、8+8件に退行なし |
| owner production | 成功。OBS 32.1.2、VOICEVOX 0.25.2、Twitch正常、規約hash確認済み |
| anonymous production | `/`、snapshot API、run APIが401 |
| deployment | 同一Site、owner-only、許可ユーザー1名、許可グループ0 |

外部Sourceの値と鮮度は時間で変化します。上記バージョンや状態を将来の事実として固定せず、再開時はownerの `/status` とEvidence Passportで再確認してください。初回client hydration直後はObservation Snapshotを読込中の場合があるため、`実観測を読み込み中` を未接続の確定状態と誤読しないでください。

GitHub source checkpointでは2026-07-21にproduction build、33 / 33 tests、lint、TypeScript、diff checkまで成功しています。これは上記deployed Feature baselineのBrowser QA / owner production証拠をMy Stack変更要約へ継承するものではありません。新UIのBrowser QA、Sites同期、owner / anonymous production確認は未実施です。

## GitとSitesの安全な反映手順

1. 変更前に `git status --short --branch`、`git log`、GitHub `origin/master`、Sites `main` を確認する。
2. Product Surfaceまたはruntimeを変更した場合は、build、tests、lint、TypeScript、diff checkを通す。
3. public repositoryへ出す前に、全tracked sourceをsecret・認証情報・D1実データ混入の観点で確認する。
4. 単一の明確なcommitを作成し、GitHub `origin/master` へ直接pushする。自分宛てPRは作らない。
5. 既存Siteから短期source credentialを取得し、per-command headerで同じcommitをSites `HEAD:main` へpushする。tokenをremote URLやファイルへ保存しない。
6. pushした完全SHAと同じsourceからSites package helperでarchiveを作る。
7. `save_site_version` 後、Siteが `custom`、許可ユーザー1名、group 0であることを再確認する。
8. `deploy_private_site_version` を使い、同じSiteへ配備する。`create_site` は使わない。
9. GitHub SHA、Sites SHA、owner表示、匿名401、clean treeを確認する。

DB schema、認証、API契約、owner-only設定の変更が必要になった場合は実装前に停止し、事実、影響、代替案を提示してください。

## 意図的に未実装のもの

- 実在pending発生前のReview Queue承認・却下・差し替えUI
- 正式な定期実行
- 第三者実地報告の収集・投稿機能
- 運営者による実機検証管理
- 一般公開
- 広告、アフィリエイト、ランキング
- My Stackのクラウド同期、アカウント同期、通知
- 任意URL Source登録

## 次に実行するスライス

次のHighest-Value Sliceは **My Stack変更要約 v0のBrowser acceptance** です。その直後に **production依存security decision** を置き、解決または期限付きrisk acceptanceが明示された場合だけ **既存owner-only Siteへのcheckpoint deployment** へ進みます。

source実装と全自動gate、HTTP runtime smokeは完了しています。次のボトルネックは、新UIが実際のowner-only snapshot、localStorage、レスポンシブ画面で期待どおり読めること、production high advisory 2件の扱い、GitHub / Sites / productionを同一SHAへ揃えることです。

### 次スライスのacceptance要件

- 1440px・390pxでMy Stackを確認し、console error / warning 0、document横溢れなしを確認する。
- ready前、My Stack空、previousVisit不明、snapshot loading / errorが壊れず、正常・不変へ誤変換されないことを確認する。
- 保存entityだけが表示され、VOICEVOXの複数Source、Catalog-only、優先順位、日時、理由、次の確認事項が読めることを確認する。
- Evidence Passportと変更履歴へのリンクを実遷移で確認する。
- 検索、比較、Today、Changes、8+8件の既存workflowに退行がないことを確認する。
- GitHub `origin/master`、Sites `main`、配備archiveを同一SHAへ揃え、既存Siteだけをprivate checkpoint deploymentする。
- owner成功、匿名 `/` / snapshot API / run APIの401、許可ユーザー1名、group 0を確認する。
- private deployment前にproduction auditのmoderate 1 / high 2を再確認し、互換修正または期限付きrisk acceptanceを記録する。
- 新規Site、Source追加、Review Queue操作、定期実行、DB / 認証 / API変更、cloud sync、通知、一般公開、広告を追加しない。
- audit修正は独立スライスとし、Next 9 downgrade、force fix、検証なしoverrideを行わない。

### 次セッションへ渡す依頼文

> `docs/PROJECT_HANDOFF.md` と `docs/PRODUCT_BOUNDARY.md`、GitHub `origin/master` の最新HEADを正本として、まずMy Stack変更要約 v0のBrowser acceptanceを行ってください。最初にGitHub HEAD、Sites latest saved source、production version、access policyをlive確認し、同一と仮定しないでください。checkout所有のnpm / nodeプロセスを確認してnpm操作を直列化し、`npm ci`、`npm test`（33 tests想定だが実出力を正本）、lint、TypeScript、diff checkを再確認してください。1440px・390pxでready、空、初回baseline、VOICEVOX複数Source、Catalog-only、snapshot error、Evidence Passport / history遷移、console 0、横溢れなし、既存workflow回帰を確認してください。次にproduction auditのmoderate 1 / high 2をlive再確認し、互換修正または期限付きrisk acceptanceを監修判断として記録してください。このsecurity gateを通過した場合だけ、GitHub HEADと同一SHAをSites `main`へ同期し、既存Siteへprivate checkpoint deploymentしてください。owner成功、匿名 `/` / snapshot API / run API 401、許可ユーザー1名、group 0、GitHub / Sites / archive / live source parity、clean treeまで確認してください。新規Site、Source、DB / 認証 / API変更、Review Queue操作、定期実行、cloud sync、通知、一般公開、広告は追加しないでください。Next 9 downgrade、force fix、検証なしoverrideは禁止です。

## 引き継ぎ更新ルール

- 完了したスライス、現在のfeature baseline、検証数、deployment境界、次の一スライスをこのファイルで更新する。
- Product Boundaryの定義変更は `docs/PRODUCT_BOUNDARY.md` だけで行い、この文書には要約と参照だけを残す。
- source credential、bypass token、account ID、cookie、認証情報、外部本文を記録しない。
- GitHubがpublicである限り、tracked source全体を公開情報として扱い、D1実データやowner固有情報を記録しない。
- 実測値は確認日時とともに扱い、恒久的事実としてコピーしない。
- 同じ目的の `HANDOFF-*`、`CURRENT_STATE-*`、`NEXT_PROMPT-*` 文書を増やさない。
