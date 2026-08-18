import bcrypt from "bcryptjs";

/**
 * Work factor. bcrypt is deliberately slow and each increment doubles the cost:
 * one login for a legitimate user, every guess for an attacker.
 */
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
