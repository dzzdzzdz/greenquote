import { z } from "zod";

/**
 * Shared by the browser and the API. The client uses these for inline field
 * errors, the server re-parses everything it receives: client-side validation
 * is a convenience, server-side validation is the actual gate.
 */

// Lowercased so "Ada@test.com" and "ada@test.com" cannot become two accounts:
// the unique constraint is on the stored value.
const email = z.email("Enter a valid email address").toLowerCase();
const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

export const registerSchema = z.object({
  fullName: requiredText("Full name"),
  email,
  // Length only. Composition rules push people towards "Password1!" while
  // rejecting long passphrases, which NIST has advised against since 2017.
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email,
  // Deliberately not the registration rule: enforcing a minimum here would
  // tell an attacker that short passwords belong to no account.
  password: z.string().min(1, "Password is required"),
});

export const quoteInputSchema = z.object({
  fullName: requiredText("Full name"),
  email,
  address: requiredText("Address"),
  monthlyConsumptionKwh: z
    .number()
    .int("Enter a whole number of kWh")
    .positive("Monthly consumption must be greater than zero")
    .max(100_000, "That is higher than any residential consumption"),
  systemSizeKw: z
    .number()
    .positive("System size must be greater than zero")
    .max(1_000, "That is larger than any residential system"),
  downPaymentCents: z
    .number()
    .int()
    .nonnegative("A down payment cannot be negative")
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
