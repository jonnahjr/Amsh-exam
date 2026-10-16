
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { one } from "@/lib/db";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type Role = "STUDENT" | "INSTRUCTOR" | "ADMINISTRATOR";

/** Higher number means more privilege. Used by `requireRole`. */
const ROLE_RANK: Record<Role, number> = {
  STUDENT: 1,
  INSTRUCTOR: 2,
  ADMINISTRATOR: 3,
};

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: Role;
}

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "exam_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short.\n" +
        "Copy .env.example to .env and set a long random value:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return new TextEncoder().encode(secret);
}

// --------------------------------------------------------------- passwords --

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ----------------------------------------------------------------- tokens ---

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(authSecret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), { algorithms: ["HS256"] });
    const id = payload.sub;
    const email = payload.email;
    const role = payload.role as Role | undefined;
    if (!id || typeof email !== "string" || !role || !(role in ROLE_RANK)) return null;
    return {
      id,
      email,
      name: typeof payload.name === "string" ? payload.name : null,
      role,
    };
  } catch {
    // Expired or tampered token.
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

// -------------------------------------------------------------- accessors ---

/**
 * Resolve the signed-in user for the current request.
 *
 * The token is verified and then re-checked against the database so that a
 * deleted or downgraded account cannot keep a stale session alive.
 *
 * Wrapped in React `cache()` so multiple callers in one request (navbar,
 * page, etc.) share a single JWT verification and DB lookup instead of
 * paying a duplicate remote-DB round trip per caller.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await readSessionToken(token);
  if (!claims) return null;

  const row = await one<{ id: string; email: string; name: string | null; role: Role }>(
    'SELECT "id","email","name","role" FROM "User" WHERE "id" = ?',
    [claims.id],
  );
  if (!row) return null;

  return { id: row.id, email: row.email, name: row.name, role: row.role };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Require one of the given roles, or at least the rank of the lowest one. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (roles.length === 0) return user;

  const required = Math.min(...roles.map((role) => ROLE_RANK[role]));
  if (ROLE_RANK[user.role] < required) {
    throw new ForbiddenError(
      `This action requires the ${roles.join(" or ")} role. You are signed in as ${user.role}.`,
    );
  }
  return user;
}

export function hasRole(user: SessionUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/** True for roles allowed to author and publish questions. */
export function canAuthorContent(user: SessionUser | null): boolean {
  return hasRole(user, "INSTRUCTOR", "ADMINISTRATOR");
}
