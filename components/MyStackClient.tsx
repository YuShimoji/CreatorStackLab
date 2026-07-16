"use client";

import Link from "next/link";
import { listCatalog } from "../data/repository";
import { VerdictBadge } from "./Badges";
import { useMyStack } from "./MyStackProvider";

const kindLabels = { software: "ソフトウェア", service: "サービス／アプリ", hardware: "ハードウェア", setup: "構成" } as const;

export function MyStackClient() {
  const { ids, ready, remove } = useMyStack();
  const records = listCatalog().filter((record) => ids.includes(record.id));
  if (!ready) return <div className="empty-state" aria-live="polite"><span aria-hidden="true">…</span><h2>保存内容を読み込んでいます</h2></div>;
  if (!records.length) return (
    <div className="empty-state" data-testid="my-stack-empty">
      <span aria-hidden="true">0</span><h2>My Stackはまだ空です</h2>
      <p>購入済み・利用中・検討中の項目を、検索結果または詳細から追加してください。保存先はこのブラウザだけで、ログインやクラウド同期はありません。</p>
      <div className="empty-actions"><Link className="primary-button inline-button" href="/softwares">ソフトを探す</Link><Link className="text-link" href="/setups">構成を探す</Link></div>
    </div>
  );
  return (
    <div className="stack-list" data-testid="my-stack-list">
      {records.map((record) => <article className="stack-row" key={record.id}>
        <div><span className="record-type">{kindLabels[record.kind]}</span><h2><Link href={record.href}>{record.name}</Link></h2><p>{record.summary}</p></div>
        <div className="stack-row-meta"><VerdictBadge verdict={record.verdict} /><time dateTime={record.verifiedAt}>確認 {record.verifiedAt}</time><button type="button" onClick={() => remove(record.id)} data-testid={`stack-remove-${record.id}`}>削除</button></div>
      </article>)}
    </div>
  );
}
