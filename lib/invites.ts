import crypto from "crypto";

export function randomInviteToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
