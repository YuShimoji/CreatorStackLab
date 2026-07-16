# Creator Stack Lab — Project Handoff

最終更新: 2026-07-16 (Asia/Tokyo)

この文書は、別端末・別セッションから Creator Stack Lab / Creator Stack Observatory の作業を再開するための運用上の正本です。製品境界の正本は [`PRODUCT_BOUNDARY.md`](./PRODUCT_BOUNDARY.md) であり、ここでは重複定義せず、現在状態、実装構造、検証済み事実、配備境界、次の作業を記録します。状態が変わった場合は新しい引き継ぎ文書を増やさず、このファイルを更新してください。

## 最短の再開手順

1. Codex Sites の既存Site編集ライフサイクルを使い、`.openai/hosting.json` の `project_id` を再利用する。`create_site` は実行しない。
2. Gitの `master` と Sites source repository の `main` を確認し、現在の `HEAD` と一致させる。`sites` remoteが端末にない場合は、既存Siteから短期source credentialを取得し、その `remote_url` をremoteとして登録する。tokenをURL、Git設定、文書、ログへ保存しない。
3. この文書、`docs/PRODUCT_BOUNDARY.md`、`data/repository.ts`、`data/evidence.ts`、`data/evidence-passport.ts`、`lib/observation-engine.ts`、`worker/observation-runtime.ts` を読む。
4. `npm ci` の後、`npm test`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行する。
5. 変更前にSite identity、owner-only設定、Git status、remote差分を確認する。無関係な未コミット差分が混在している場合だけ停止する。

## 引き継ぎ時点の状態

| 項目 | 確認済み状態 |
|---|---|
| Site | Creator Stack Lab / Creator Stack Observatory |
| Production URL | https://creator-stack-lab.thankyoukass.chatgpt.site |
| Access | `custom`、許可ユーザー1名、workspace / tenant group 0、owner-only |
| Feature baseline | `278f507d72b91bef4f50f944c984160b9001f566` — `feat: add evidence passports` |
| Branch | local `master` → Sites source repository `main` |
| Catalog | software 8件、setup 8件 |
| State | Catalogは静的Repository、公式観測はD1、My Stackは端末内localStorage |
| Observation mode | owner-only手動実行。正式な定期実行は未接続 |
| External sources | 既存4ソースのみ。新規Sourceは追加していない |
| Evidence Passport | OBS Studio、VOICEVOX、Twitch接続構成で完成。Source未接続対象は明示的に未確認 |
| Last feature deployment | Sites Version 6。引き継ぎ同期後のsource-only checkpointはVersion 7 |
| Pull request | 作成していない |

引き継ぎ用コミットの完全SHAはこの文書へ固定せず、remote `main` の最新 `HEAD` を正本とします。上記Feature baseline以降が文書同期だけであれば、サイトの見た目と実行ロジックはFeature baselineと同一です。

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
- `previousVisit` は次の変更要約スライスで比較基準として使う予定だが、上書き順序を実装前に監査する。
- My Stackの現在画面は保存対象一覧であり、entity単位の変更要約はまだない。

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

## GitとSitesの安全な反映手順

1. 変更前に `git status --short --branch`、`git log`、remote `main` を確認する。
2. Product Surfaceまたはruntimeを変更した場合は、build、tests、lint、TypeScript、diff checkを通す。
3. 単一の明確なcommitを作成する。自分宛てPRは作らない。
4. 既存Siteから短期source credentialを取得し、per-command headerで `HEAD:main` をpushする。tokenをremote URLやファイルへ保存しない。
5. pushした完全SHAと同じsourceからSites package helperでarchiveを作る。
6. `save_site_version` 後、Siteが `custom`、許可ユーザー1名、group 0であることを再確認する。
7. `deploy_private_site_version` を使い、同じSiteへ配備する。`create_site` は使わない。
8. owner表示、匿名401、remote SHA、clean treeを確認する。

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

次のHighest-Value Sliceは **My Stack単位の変更要約** です。

Evidence Passportで対象単位の根拠は追跡できるようになりました。次のボトルネックは、保存した複数対象のうち前回訪問後に何を見るべきかを利用者が探す作業です。

### 次スライスの実装要件

- 保存entityだけを対象に、`meaningful change`、`review pending`、`fetch failed`、`stale`、`unchanged since visit`、`baseline only`、`source unavailable / catalog only` を区別する。
- `previousVisit` を上書きする前の値を今回の比較基準として保持できるか監査する。
- 一つのentityに複数Sourceがある場合、Source単位の状態を失わずentity単位へ要約する。
- TodayまたはMy Stackに、対象名、重要状態、発生日時、理由、次に確認すべき事項を表示する。
- 各要約からEvidence Passportまたは変更履歴へ移動できるようにする。
- unchangedを安全・適合・リスクなしへ変換しない。
- Source未接続を変更なしとして扱わない。
- localStorageのままとし、cloud syncや通知を追加しない。
- 新規Source、Review Queue操作、定期実行、一般公開を追加しない。

### 次スライスの最低テスト

- My Stackに保存したentityだけが要約される。
- `previousVisit` 以前の変更が新規変更へ混入しない。
- baselineとunchangedを意味のある変更として数えない。
- `fetch_failed` をサービス障害へ変換しない。
- Source未接続を変更なしへ変換しない。
- 複数Sourceを持つVOICEVOXの状態を欠落させない。
- ready前、My Stack空、previousVisit不明、snapshot失敗で画面が壊れない。
- Evidence Passportへのリンクが成立する。
- 既存検索、比較、Today、Changes、8+8件が退行しない。
- 1440px・390px、console 0、owner成功、anonymous 401を確認する。

### 次セッションへ渡す依頼文

> 既存のowner-only Site「Creator Stack Lab / Creator Stack Observatory」を分岐させず、`docs/PROJECT_HANDOFF.md` と `docs/PRODUCT_BOUNDARY.md` を正本として「My Stack単位の変更要約 v0」を実装してください。最初に既存Site、owner-only設定、Git HEADとremote main、My Stack Providerのready / previousVisit更新順序、Observation Snapshot、Evidence Repositoryを実物から確認してください。保存entityだけを対象に、meaningful change、review pending、fetch failed、stale、unchanged since visit、baseline only、source unavailable / catalog onlyを区別し、各項目からEvidence Passportまたは変更履歴へ移動できるようにしてください。localStorageのMy Stackを維持し、新規Site、Source追加、Review Queue操作、定期実行、cloud sync、通知、一般公開、広告は追加しないでください。DB・認証・API契約の変更が不可欠な場合だけ停止し、事実と代替案を提示してください。fixtureまたはmockでテストし、build、TypeScript、lint、既存・新規テスト、diff check、1440px・390px、console 0、owner成功、anonymous 401を確認後、単一commitをSites remote mainへpushし、同一owner-only Siteへprivate checkpoint deploymentしてください。PRは作成せず、clean treeで完了してください。

## 引き継ぎ更新ルール

- 完了したスライス、現在のfeature baseline、検証数、deployment境界、次の一スライスをこのファイルで更新する。
- Product Boundaryの定義変更は `docs/PRODUCT_BOUNDARY.md` だけで行い、この文書には要約と参照だけを残す。
- source credential、bypass token、account ID、cookie、認証情報、外部本文を記録しない。
- 実測値は確認日時とともに扱い、恒久的事実としてコピーしない。
- 同じ目的の `HANDOFF-*`、`CURRENT_STATE-*`、`NEXT_PROMPT-*` 文書を増やさない。
