import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  ];
  for (const [path, expected] of cases) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), expected, path);
  }
});

test("ships four sourced software records and four sourced setup records", async () => {
  const [software, setups] = await Promise.all([
    readFile(new URL("../data/software.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/setups.ts", import.meta.url), "utf8"),
  ]);
  assert.equal((software.match(/id: "sw-/g) ?? []).length, 4);
  assert.equal((setups.match(/id: "setup-/g) ?? []).length, 4);
  assert.equal((`${software}${setups}`.match(/sourceUrls: \[/g) ?? []).length, 8);
  assert.equal((`${software}${setups}`.match(/(?:verifiedAt|testedAt): "2026-07-16"/g) ?? []).length, 8);
  assert.doesNotMatch(`${software}${setups}`, /evidenceType: "実機検証済み"/);
});
