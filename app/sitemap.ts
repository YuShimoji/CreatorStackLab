import type { MetadataRoute } from "next";
import { softwareRecords } from "../data/software";
import { setupRecords } from "../data/setups";

const base = "https://creator-stack-lab.thankyoukass.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-07-16T00:00:00+09:00");
  return [
    { url: base, lastModified: now, priority: 1 },
    { url: `${base}/softwares`, lastModified: now, priority: .8 },
    { url: `${base}/setups`, lastModified: now, priority: .8 },
    { url: `${base}/compare`, lastModified: now, priority: .6 },
    { url: `${base}/policy`, lastModified: now, priority: .5 },
    ...softwareRecords.map((record) => ({ url: `${base}/softwares/${record.slug}`, lastModified: new Date(record.verifiedAt), priority: .7 })),
    ...setupRecords.map((record) => ({ url: `${base}/setups/${record.slug}`, lastModified: new Date(record.testedAt), priority: .7 })),
  ];
}
