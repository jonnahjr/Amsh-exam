import { randomUUID } from "node:crypto";
import { all, one, run, fromBool } from "@/lib/db";

export interface AuthorizedM100Row {
  id: string;
  code: string;
  employeeName: string | null;
  department: string | null;
  isActive: boolean | number;
  isUsed: boolean | number;
  usedByUserId: string | null;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  code?: string;
  record?: AuthorizedM100Row;
  error?: string;
  reason?: "INVALID_FORMAT" | "NOT_FOUND" | "INACTIVE" | "ALREADY_USED";
}

/**
 * Validate an M100 employee code against authorized records.
 *
 * Checks:
 * 1. Format: must start with M100 (case-insensitive).
 * 2. Existence: must exist in the AuthorizedM100Code table.
 * 3. Active status: must be active (isActive = 1/true).
 * 4. Duplicate prevention: must not be already claimed by another user.
 */
export async function validateM100Code(
  rawCode: string | null | undefined,
  currentUserId?: string | null,
): Promise<ValidationResult> {
  if (!rawCode || typeof rawCode !== "string") {
    return {
      valid: false,
      error: "Please enter your M100 employee code.",
      reason: "INVALID_FORMAT",
    };
  }

  const code = rawCode.trim().toUpperCase();

  // Must begin with M100
  if (!code.startsWith("M100")) {
    return {
      valid: false,
      error: "Invalid code format. An M100 code must start with 'M100' (e.g. M100-AMSH-001).",
      reason: "INVALID_FORMAT",
    };
  }

  const row = await one<AuthorizedM100Row>(
    `SELECT "id", "code", "employeeName", "department", "isActive", "isUsed", "usedByUserId", "usedAt", "createdAt", "updatedAt"
     FROM "AuthorizedM100Code"
     WHERE UPPER("code") = ?`,
    [code],
  );

  if (!row) {
    return {
      valid: false,
      error: "M100 code not recognized or unauthorized. Please verify your employee code.",
      reason: "NOT_FOUND",
    };
  }

  const isActive = Boolean(row.isActive);
  if (!isActive) {
    return {
      valid: false,
      error: "This M100 employee code is currently inactive. Please contact your administrator.",
      reason: "INACTIVE",
    };
  }

  const isUsed = Boolean(row.isUsed);
  if (isUsed && currentUserId && row.usedByUserId && row.usedByUserId !== currentUserId) {
    return {
      valid: false,
      error: "This M100 code has already been registered to another account.",
      reason: "ALREADY_USED",
    };
  }

  return {
    valid: true,
    code,
    record: row,
  };
}

/**
 * Marks an M100 code as claimed by a user and updates the user's role to EMPLOYEE.
 */
export async function claimM100Code(
  code: string,
  userId: string,
  employeeName?: string,
): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const now = new Date().toISOString();

  await run(
    `UPDATE "AuthorizedM100Code"
     SET "isUsed" = ?, "usedByUserId" = ?, "usedAt" = ?, "updatedAt" = ?
     WHERE UPPER("code") = ?`,
    [fromBool(true), userId, now, now, normalizedCode],
  );

  await run(
    `UPDATE "User"
     SET "m100Code" = ?, "role" = 'EMPLOYEE', "updatedAt" = ?
     WHERE "id" = ?`,
    [normalizedCode, now, userId],
  );
}

/**
 * Ensures an active, APPROVED CheckIn record exists for an M100-activated employee,
 * allowing immediate exam sitting without waiting for manual admin approval.
 */
export async function ensureApprovedCheckInForM100(
  userId: string,
  employeeName: string,
  m100Code: string,
): Promise<string> {
  const normalizedCode = m100Code.trim().toUpperCase();
  const now = new Date().toISOString();

  // Check if there is already an active APPROVED checkin
  const existing = await one<{ id: string }>(
    `SELECT "id" FROM "CheckIn"
     WHERE ("id" = ? OR LOWER("employeeName") = LOWER(?))
       AND "status" = 'APPROVED'
     ORDER BY "checkedInAt" DESC
     LIMIT 1`,
    [userId, employeeName],
  );

  if (existing) {
    await run(
      `UPDATE "CheckIn"
       SET "m100Code" = ?, "approvedBy" = 'Auto-Approved (M100 Code)'
       WHERE "id" = ?`,
      [normalizedCode, existing.id],
    );
    return existing.id;
  }

  // Create new auto-approved check-in session
  const checkInId = userId.length > 20 ? userId : randomUUID();
  await run(
    `INSERT INTO "CheckIn"
       ("id", "employeeName", "status", "checkedInAt", "approvedAt", "approvedBy", "m100Code", "notes")
     VALUES (?, ?, 'APPROVED', ?, ?, 'Auto-Approved (M100 Code)', ?, 'Automatic authorization via valid M100 code')`,
    [checkInId, employeeName, now, now, normalizedCode],
  );

  return checkInId;
}

/**
 * List all authorized M100 codes for admin inspection.
 */
export async function listAuthorizedM100Codes(): Promise<AuthorizedM100Row[]> {
  return all<AuthorizedM100Row>(
    `SELECT "id", "code", "employeeName", "department", "isActive", "isUsed", "usedByUserId", "usedAt", "createdAt", "updatedAt"
     FROM "AuthorizedM100Code"
     ORDER BY "code" ASC`,
  );
}

/**
 * Create a new authorized M100 employee code (admin only).
 */
export async function createAuthorizedM100Code(params: {
  code: string;
  employeeName?: string | null;
  department?: string | null;
}): Promise<AuthorizedM100Row> {
  const normalized = params.code.trim().toUpperCase();
  const id = randomUUID();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO "AuthorizedM100Code"
       ("id", "code", "employeeName", "department", "isActive", "isUsed", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, normalized, params.employeeName ?? null, params.department ?? null, fromBool(true), fromBool(false), now, now],
  );

  return {
    id,
    code: normalized,
    employeeName: params.employeeName ?? null,
    department: params.department ?? null,
    isActive: true,
    isUsed: false,
    usedByUserId: null,
    usedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
