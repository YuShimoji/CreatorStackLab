import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Creator Stack Lab home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="ja">/i);
  assert.match(html, /Creator Stack Lab/);
  assert.match(html, /作ったものを使えるか/);
  assert.match(html, /商用利用・出力を確認/);
  assert.match(html, /機材構成を確認/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("renders core list, detail, comparison and policy routes", async () => {
  const cases = [
    ["/softwares", /ソフト適合/],
    ["/softwares/voicevox", /VOICEVOX/],
    ["/setups", /構成適合/],
    ["/setups/iphone-youtube-live-ag03mk2", /信号経路/],
    ["/compare?ids=sw-voicevox,sw-premiere", /比較結果/],
    ["/policy", /検証方針・運営ポリシー/],
    ["/my-stack", /My Stack/],
    ["/status", /今日の制作環境/],
    ["/changes", /変更レーダー/],
  ];
  for (const [path, expected] of cases) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), expected, path);
  }
});

test("renders real-observation controls while separating samples and registered documents", async () => {
  const statusSource = await readFile(new URL("../components/StatusDashboard.tsx", import.meta.url), "utf8");
  assert.match(statusSource, /REAL SOURCES/);
  assert.match(statusSource, /公式ソースの現在値/);
  assert.match(statusSource, /表示サンプル/);
  assert.match(statusSource, /実データと集計を分離/);

  const runControl = await readFile(new URL("../components/ObservationRunControl.tsx", import.meta.url), "utf8");
  assert.match(runControl, /公式ソースをいま確認/);

  const changes = await render("/changes");
  const changesHtml = await changes.text();
  assert.match(changesHtml, /実観測：D1の差分/);
  assert.match(changesHtml, /公式文書：登録済み事実/);
  assert.match(changesHtml, /取得失敗：サービス障害と分離/);
});

test("ships eight sourced software records and eight sourced setup records", async () => {
  const [software, setups] = await Promise.all([
    readFile(new URL("../data/software.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/setups.ts", import.meta.url), "utf8"),
  ]);
  assert.equal((software.match(/id: "sw-/g) ?? []).length, 8);
  assert.equal((setups.match(/id: "setup-/g) ?? []).length, 8);
  assert.equal((`${software}${setups}`.match(/sourceUrls: \[/g) ?? []).length, 16);
  assert.equal((`${software}${setups}`.match(/(?:verifiedAt|testedAt): "2026-07-16"/g) ?? []).length, 16);
  assert.equal((`${software}${setups}`.match(/freshness: \{/g) ?? []).length, 16);
  assert.equal((`${software}${setups}`.match(/physicalTested: false/g) ?? []).length, 16);
  assert.doesNotMatch(`${software}${setups}`, /evidenceType: "実機検証済み"/);
});

test("keeps UI behind the catalog repository boundary", async () => {
  const roots = [new URL("../app/", import.meta.url), new URL("../components/", import.meta.url)];
  for (const root of roots) {
    for (const relative of await readdir(root, { recursive: true })) {
      if (!/\.(?:ts|tsx)$/.test(relative)) continue;
      const source = await readFile(new URL(relative.replaceAll("\\", "/"), root), "utf8");
      assert.doesNotMatch(source, /data\/(?:software|setups)/, relative);
    }
  }
});

test("renders Evidence Passport for connected entities and an unknown boundary elsewhere", async () => {
  for (const path of ["/softwares/obs-studio", "/softwares/voicevox", "/setups/ipad-usbc-youtube-live-ag03mk2"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /EVIDENCE PASSPORT v0/, path);
    assert.match(html, /現在確認できること/, path);
    assert.match(html, /条件と限界/, path);
    assert.match(html, /変更履歴/, path);
    assert.match(html, /運営者実機試験/, path);
  }

  const sourceLess = await render("/softwares/adobe-premiere");
  const sourceLessHtml = await sourceLess.text();
  assert.match(sourceLessHtml, /現在のSource Registryへ直接接続できるClaimがありません/);

  const passportSource = await readFile(new URL("../components/EvidencePassport.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(passportSource, /承認|却下|差し替え/);
  assert.match(passportSource, /取得失敗・最終成功値を保持/);
  assert.match(passportSource, /サービス障害とは判定していません/);
});
