import { randomUUID } from "node:crypto";
import { all, run } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import type { AuditLogRow } from "@/types";

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append an audit record.
 * Audit writes must never break the request they describe, so failures are
 * logged and swallowed.
 */
export function recordAudit(entry: AuditEntry): void {
  // Fire-and-forget: do not await so callers stay synchronous
  run(
    `INSERT INTO "AuditLog"
       ("id","userId","action","entity","entityId","details","ipAddress","userAgent","createdAt")
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      randomUUID(),
      entry.userId ?? null,
      entry.action,
      entry.entity ?? null,
      entry.entityId ?? null,
      entry.details === undefined ? null : stringifyJson(entry.details),
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      new Date().toISOString(),
    ],
  ).catch((error: unknown) => {
    console.error("Failed to write audit log:", error);
  });
}

/** Best-effort client address, honouring the common proxy headers. */
export function clientAddress(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}

export interface AuditLogWithUser extends AuditLogRow {
  userEmail: string | null;
  userName: string | null;
}

/** Most recent audit entries, newest first, with the actor resolved. */
export async function listAuditLogs(limit = 100): Promise<AuditLogWithUser[]> {
  return all<AuditLogWithUser>(
    `SELECT a.*, u."email" AS "userEmail", u."name" AS "userName"
     FROM "AuditLog" a
     LEFT JOIN "User" u ON u."id" = a."userId"
     ORDER BY a."createdAt" DESC
     LIMIT ?`,
    [limit],
  );
}