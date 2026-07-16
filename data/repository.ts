import { changeRecords, statusRecords } from "./observatory";
import {
  getEvidenceCoverage,
  listClaimsForEntity as readClaimsForEntity,
  listEvidenceForClaim as readEvidenceForClaim,
  listEvidenceForEntity as readEvidenceForEntity,
} from "./evidence";
import { setupRecords } from "./setups";
import { softwareRecords } from "./software";
import type { CatalogItem, EvidencePassportBundle } from "./models";

export function listSoftware() { return softwareRecords; }
export function listSetups() { return setupRecords; }
export function findSoftwareBySlug(slug: string) { return softwareRecords.find((record) => record.slug === slug); }
export function findSetupBySlug(slug: string) { return setupRecords.find((record) => record.slug === slug); }

export function listCatalog(): CatalogItem[] {
  return [
    ...softwareRecords.map((record): CatalogItem => ({
      id: record.id,
      kind: "software",
      name: record.name,
      href: `/softwares/${record.slug}`,
      verdict: record.verdict,
      summary: record.summary,
      verifiedAt: record.verifiedAt,
      recheckAt: record.freshness.recheckAt,
      physicalTested: record.freshness.physicalTested,
    })),
    ...setupRecords.map((record): CatalogItem => ({
      id: record.id,
      kind: "setup",
      name: record.title,
      href: `/setups/${record.slug}`,
      verdict: record.verdict,
      summary: record.summary,
      verifiedAt: record.testedAt,
      recheckAt: record.freshness.recheckAt,
      physicalTested: record.freshness.physicalTested,
    })),
  ];
}

export function findCatalogItem(id: string) { return listCatalog().find((record) => record.id === id); }
export function listStatuses() { return statusRecords; }
export function listChanges() { return [...changeRecords].sort((a, b) => b.changedAt.localeCompare(a.changedAt)); }

export function listClaimsForEntity(entityId: string) {
  return readClaimsForEntity(entityId);
}

export function listEvidenceForClaim(claimId: string) {
  return readEvidenceForClaim(claimId);
}

export function getEvidencePassportBundle(entityId: string): EvidencePassportBundle {
  const record = softwareRecords.find((item) => item.id === entityId)
    ?? setupRecords.find((item) => item.id === entityId);
  return {
    entityId,
    claims: readClaimsForEntity(entityId),
    evidence: readEvidenceForEntity(entityId),
    coverage: getEvidenceCoverage(entityId),
    catalogHistory: record?.revisionHistory ?? [],
  };
}
