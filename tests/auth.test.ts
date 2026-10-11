// `@/lib/auth` imports next/headers for its cookie helpers. These tests cover
// hashing and token signing, not request plumbing, so stub the module out.
jest.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined, set: () => undefined }),
}));

import {
  createSessionToken,
  hashPassword,
  readSessionToken,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";

const user: SessionUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "student@exam.local",
  name: "Sam Student",
  role: "STUDENT",
};

beforeAll(() => {
  // authSecret() reads this at call time.
  process.env.AUTH_SECRET = "test-secret-that-is-definitely-long-enough";
});

describe("password hashing", () => {
  it("produces a bcrypt hash that is not the plaintext", async () => {
    const hash = await hashPassword("supersecret");
    expect(hash).not.toBe("supersecret");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("supersecret");
    await expect(verifyPassword("supersecret", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("supersecret");
    await expect(verifyPassword("wrongpassword", hash)).resolves.toBe(false);
  });

  it("salts, so identical passwords hash differently", async () => {
    const first = await hashPassword("identical");
    const second = await hashPassword("identical");
    expect(first).not.toBe(second);
    // Both still verify.
    await expect(verifyPassword("identical", first)).resolves.toBe(true);
    await expect(verifyPassword("identical", second)).resolves.toBe(true);
  });
});

describe("session tokens", () => {
  it("round-trips the user claims", async () => {
    const token = await createSessionToken(user);
    const claims = await readSessionToken(token);

    expect(claims).not.toBeNull();
    expect(claims?.id).toBe(user.id);
    expect(claims?.email).toBe(user.email);
    expect(claims?.name).toBe(user.name);
    expect(claims?.role).toBe(user.role);
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(user);
    const [header, payload, signature] = token.split(".");
    const tampered = `${header}.${payload}.${signature.slice(0, -3)}xyz`;
    await expect(readSessionToken(tampered)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(user);
    process.env.AUTH_SECRET = "a-completely-different-secret-value";
    await expect(readSessionToken(token)).resolves.toBeNull();
    process.env.AUTH_SECRET = "test-secret-that-is-definitely-long-enough";
  });

  it("rejects garbage input", async () => {
    await expect(readSessionToken("not.a.jwt")).resolves.toBeNull();
    await expect(readSessionToken("")).resolves.toBeNull();
  });

  it("refuses to sign when the secret is missing", async () => {
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    await expect(createSessionToken(user)).rejects.toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = saved;
  });

  it("preserves a null display name", async () => {
    const token = await createSessionToken({ ...user, name: null });
    const claims = await readSessionToken(token);
    expect(claims?.name).toBeNull();
  });
});
