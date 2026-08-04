import crypto from "crypto";

export function generateTemporaryPassword() {
  const randomPart = crypto.randomBytes(6).toString("base64url");
  return `Kopa@${randomPart}A1`;
}