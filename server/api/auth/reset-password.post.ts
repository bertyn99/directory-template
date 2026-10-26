import { z } from "zod";
import { hashPassword, passwordSchema } from "~~/server/utils/auth/password";
import { useDrizzle, tables, eq, and } from "~~/server/utils/drizzle";
import { otpStorage } from "~~/server/utils/auth/otp";

const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
});

export default defineEventHandler(async (event) => {
  try {
    const { email, password } = await readValidatedBody(event, resetPasswordSchema.parse);

    // 1. Check Verification Token
    const verifiedToken = await otpStorage.getVerifiedToken(email);

    if (!verifiedToken) {
      throw createError({
        statusCode: 400,
        message: "Verification session expired. Please verify your code again.",
      });
    }

    // 2. Hash Password
    const hashedPassword = await hashPassword(password);

    // 3. Update Database
    const db = useDrizzle();

    // Update accounts table (where provider = 'credentials')
    await db
      .update(tables.accounts)
      .set({
        hashedPassword,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tables.accounts.userId, verifiedToken.userId),
          eq(tables.accounts.provider, "credentials"),
        ),
      );

    // 4. Invalidate Sessions
    await db.delete(tables.sessions).where(eq(tables.sessions.userId, verifiedToken.userId));

    // 5. Cleanup
    await otpStorage.clearVerifiedToken(email);

    return { success: true, message: "Password has been reset successfully. You can now log in." };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    console.error("Reset password error:", error);
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
});
