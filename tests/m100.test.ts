jest.mock("@/lib/db", () => require("./helpers/sqlite-db"));

import {
  validateM100Code,
  claimM100Code,
  ensureApprovedCheckInForM100,
  createAuthorizedM100Code,
  listAuthorizedM100Codes,
  terminateM100CheckIn,
  pauseM100CheckIn,
  resumeM100CheckIn,
  findActivePause,
} from "@/server/m100";
import { one, run } from "@/lib/db";
import { startAttempt } from "@/server/attempts";
import { randomUUID } from "node:crypto";

describe("M100 Automatic Exam Access & Validation", () => {
  const testUserId = "user-m100-test-" + randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  beforeAll(async () => {
    // Seed test codes into the test database
    await run(
      `INSERT OR IGNORE INTO "AuthorizedM100Code" 
       ("id", "code", "employeeName", "department", "isActive", "isUsed", "usedByUserId", "usedAt", "createdAt", "updatedAt")
       VALUES 
       ('m100-test-valid', 'M100-VALID-01', 'Valid Candidate', 'IT', 1, 0, NULL, NULL, ?, ?),
       ('m100-test-inactive', 'M100-INACTIVE-01', 'Inactive Candidate', 'HR', 0, 0, NULL, NULL, ?, ?),
       ('m100-test-used', 'M100-CLAIMED-01', 'Claimed Candidate', 'Finance', 1, 1, 'other-user-id', ?, ?, ?)`,
      [now, now, now, now, now, now, now],
    );

    // Create test user
    await run(
      `INSERT OR IGNORE INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
       VALUES (?, 'm100test@example.com', 'hashedpass', 'Valid Candidate', 'EMPLOYEE', ?, ?)`,
      [testUserId, now, now],
    );
  });

  describe("Validation Scenarios", () => {
    it("1. validates a valid, active, and unused M100 code successfully", async () => {
      const res = await validateM100Code("m100-valid-01");
      expect(res.valid).toBe(true);
      expect(res.code).toBe("M100-VALID-01");
      expect(res.record?.employeeName).toBe("Valid Candidate");
    });

    it("2. denies access for code not starting with AMSH or M100", async () => {
      const res = await validateM100Code("INVALID-1234");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("INVALID_FORMAT");
      expect(res.error).toContain("must start with 'AMSH' or 'M100'");
    });

    it("2b. validates an AMSH- prefix code like AMSH-M1", async () => {
      await createAuthorizedM100Code({
        code: "AMSH-M1",
        employeeName: "Yonas Bogale",
        department: "Engineering",
      });
      const res = await validateM100Code("amsh-m1");
      expect(res.valid).toBe(true);
      expect(res.code).toBe("AMSH-M1");
    });

    it("3. denies access for unrecognized/nonexistent M100 code", async () => {
      const res = await validateM100Code("M100-NONEXISTENT-999");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("NOT_FOUND");
      expect(res.error).toContain("not recognized or unauthorized");
    });

    it("4. denies access for inactive M100 code", async () => {
      const res = await validateM100Code("M100-INACTIVE-01");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("INACTIVE");
      expect(res.error).toContain("currently inactive");
    });

    it("5. prevents duplicate accounts using the same already-claimed M100 code", async () => {
      const res = await validateM100Code("M100-CLAIMED-01", "different-user-id");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("ALREADY_USED");
      expect(res.error).toContain("already been registered");
    });

    it("6. allows same owner to re-validate their own claimed code", async () => {
      const res = await validateM100Code("M100-CLAIMED-01", "other-user-id");
      expect(res.valid).toBe(true);
    });
  });

  describe("Claiming and Automatic Check-In Activation", () => {
    it("claims an M100 code and updates user role to EMPLOYEE", async () => {
      await claimM100Code("M100-VALID-01", testUserId, "Valid Candidate");

      const userRow = await one<{ role: string; m100Code: string }>(
        'SELECT "role", "m100Code" FROM "User" WHERE "id" = ?',
        [testUserId],
      );
      expect(userRow?.role).toBe("EMPLOYEE");
      expect(userRow?.m100Code).toBe("M100-VALID-01");

      const codeRow = await one<{ isUsed: number; usedByUserId: string }>(
        'SELECT "isUsed", "usedByUserId" FROM "AuthorizedM100Code" WHERE "code" = ?',
        ["M100-VALID-01"],
      );
      expect(Boolean(codeRow?.isUsed)).toBe(true);
      expect(codeRow?.usedByUserId).toBe(testUserId);
    });

    it("ensures an APPROVED check-in record is created automatically", async () => {
      const checkInId = await ensureApprovedCheckInForM100(
        testUserId,
        "Valid Candidate",
        "M100-VALID-01",
      );
      expect(checkInId).toBeDefined();

      const checkIn = await one<{ status: string; approvedBy: string; m100Code: string }>(
        'SELECT "status", "approvedBy", "m100Code" FROM "CheckIn" WHERE "id" = ?',
        [checkInId],
      );
      expect(checkIn?.status).toBe("APPROVED");
      expect(checkIn?.approvedBy).toContain("M100");
      expect(checkIn?.m100Code).toBe("M100-VALID-01");
    });
  });

  describe("Terminating M100 Sessions", () => {
    const sessionUserId = "user-m100-term-" + randomUUID().slice(0, 8);
    let checkInId = "";

    beforeAll(async () => {
      await run(
        `INSERT OR IGNORE INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
         VALUES (?, 'terminated@example.com', 'NOPASSWORD', 'Terminated Candidate', 'EMPLOYEE', ?, ?)`,
        [sessionUserId, now, now],
      );
      checkInId = await ensureApprovedCheckInForM100(sessionUserId, "Terminated Candidate", "M100-TERM-01");
    });

    it("marks an M100 auto-approved session as TERMINATED and records the admin", async () => {
      const res = await terminateM100CheckIn(checkInId, "Admin Jane");
      expect(res.status).toBe("TERMINATED");

      const row = await one<{ status: string; notes: string; approvedBy: string }>(
        'SELECT "status", "notes", "approvedBy" FROM "CheckIn" WHERE "id" = ?',
        [checkInId],
      );
      expect(row?.status).toBe("TERMINATED");
      expect(row?.notes).toContain("Terminated by Admin Jane");
      expect(row?.approvedBy).toContain("M100");
    });

    it("refuses to resurrect a terminated session when the employee checks in again", async () => {
      await expect(
        ensureApprovedCheckInForM100(sessionUserId, "Terminated Candidate", "M100-TERM-01"),
      ).rejects.toThrow(/terminated by an administrator/i);
    });

    it("rejects termination of sessions that were not authorised by an M100 code", async () => {
      const id = randomUUID();
      await run(
        `INSERT INTO "CheckIn" ("id", "employeeName", "status", "checkedInAt", "approvedAt", "approvedBy")
         VALUES (?, 'Manual Candidate', 'APPROVED', ?, ?, 'Admin Jane')`,
        [id, now, now],
      );
      await expect(terminateM100CheckIn(id, "Admin Jane")).rejects.toThrow(/M100/);
    });

    it("reports a conflict when the session is already terminated", async () => {
      await expect(terminateM100CheckIn(checkInId, "Admin Jane")).rejects.toThrow(/already terminated/i);
    });
  });

  describe("Pausing and Resuming M100 Sessions", () => {
    const userId = "user-m100-pause-" + randomUUID().slice(0, 8);
    const deviceIp = "203.0.113.9";
    let checkInId = "";

    beforeAll(async () => {
      await run(
        `INSERT OR IGNORE INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
         VALUES (?, 'paused@example.com', 'NOPASSWORD', 'Paused Candidate', 'EMPLOYEE', ?, ?)`,
        [userId, now, now],
      );
      checkInId = await ensureApprovedCheckInForM100(
        userId,
        "Paused Candidate",
        "M100-PAUSE-01",
        deviceIp,
      );
    });

    it("records the candidate's device address on the check-in", async () => {
      const row = await one<{ ipAddress: string | null }>(
        'SELECT "ipAddress" FROM "CheckIn" WHERE "id" = ?',
        [checkInId],
      );
      expect(row?.ipAddress).toBe(deviceIp);
    });

    it("pauses an approved session and records the admin", async () => {
      const res = await pauseM100CheckIn(checkInId, "Admin Jane");
      expect(res.status).toBe("PAUSED");

      const row = await one<{ status: string; notes: string }>(
        'SELECT "status", "notes" FROM "CheckIn" WHERE "id" = ?',
        [checkInId],
      );
      expect(row?.status).toBe("PAUSED");
      expect(row?.notes).toContain("Paused by Admin Jane");
    });

    it("blocks the paused candidate's own check-in until resumed", async () => {
      await expect(
        ensureApprovedCheckInForM100(userId, "Paused Candidate", "M100-PAUSE-01"),
      ).rejects.toThrow(/paused by an administrator/i);
    });

    it("blocks a new check-in from the paused device even under another name", async () => {
      const byName = await findActivePause("paused candidate", null);
      expect(byName?.id).toBe(checkInId);

      const byIp = await findActivePause("Someone Else", deviceIp);
      expect(byIp?.id).toBe(checkInId);

      expect(await findActivePause("Someone Else", "198.51.100.7")).toBeNull();
    });

    it("refuses to pause a session that is already paused", async () => {
      await expect(pauseM100CheckIn(checkInId, "Admin Jane")).rejects.toThrow(/already paused/i);
    });

    it("resumes the session and restores exam access", async () => {
      const res = await resumeM100CheckIn(checkInId, "Admin Jane");
      expect(res.status).toBe("APPROVED");

      await expect(
        ensureApprovedCheckInForM100(userId, "Paused Candidate", "M100-PAUSE-01"),
      ).resolves.toBe(checkInId);
      expect(await findActivePause("Paused Candidate", deviceIp)).toBeNull();
    });

    it("refuses to resume a session that is not paused", async () => {
      await expect(resumeM100CheckIn(checkInId, "Admin Jane")).rejects.toThrow(/not paused/i);
    });
  });

  describe("Admin M100 Code Management", () => {
    it("can create a new M100 code and list all codes", async () => {
      const newCode = "M100-TEST-" + randomUUID().slice(0, 6).toUpperCase();
      const created = await createAuthorizedM100Code({
        code: newCode,
        employeeName: "New Employee",
        department: "R&D",
      });

      expect(created.code).toBe(newCode);
      expect(created.isActive).toBe(true);

      const allCodes = await listAuthorizedM100Codes();
      expect(allCodes.some((c) => c.code === newCode)).toBe(true);
    });
  });
});
