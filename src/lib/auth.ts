import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { HouseholdRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEFAULT_COOKIE_NAME = "home_dashboard_session";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarColor: string;
};

export type HouseholdAuth = Awaited<ReturnType<typeof requireHousehold>>;

export function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function sessionDays(): number {
  const parsed = Number(process.env.SESSION_DAYS || "30");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export async function createSession(userId: string): Promise<void> {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays() * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarColor: true
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.user;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireHousehold() {
  const user = await requireUser();
  const membership = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: true },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) {
    throw new Error("No household membership found for the current user.");
  }

  return {
    user,
    household: membership.household,
    membership
  };
}

export async function requireAdminHousehold() {
  const auth = await requireHousehold();

  if (auth.membership.role !== HouseholdRole.OWNER) {
    redirect("/");
  }

  return auth;
}

export async function logoutCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(sessionCookieName());
}

export async function authenticateWithPassword(identifierInput: string, password: string) {
  const identifier = normalizeIdentifier(identifierInput);
  const throttleKey = identifier;
  const attempt = await prisma.loginAttempt.findUnique({ where: { email: throttleKey } });

  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    return { ok: false as const, reason: "Too many attempts. Try again in a few minutes." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }]
    }
  });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!valid || !user) {
    const failedCount = (attempt?.failedCount || 0) + 1;
    const lockedUntil =
      failedCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await prisma.loginAttempt.upsert({
      where: { email: throttleKey },
      create: {
        email: throttleKey,
        failedCount,
        lockedUntil,
        lastAttemptAt: new Date()
      },
      update: {
        failedCount,
        lockedUntil,
        lastAttemptAt: new Date()
      }
    });

    return { ok: false as const, reason: "Username, email, or password is incorrect." };
  }

  await prisma.loginAttempt.deleteMany({ where: { email: throttleKey } });
  await createSession(user.id);
  return { ok: true as const };
}
