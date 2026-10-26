import { z } from "zod";
import { MAX_ATTEMPTS, otpStorage, safeCompare } from "~~/server/utils/auth/otp";

const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().length(6),
});

export default defineEventHandler(async (event) => {
  try {
    const { email, otp } = await readValidatedBody(event, verifyOtpSchema.parse);

    // 1. Get OTP Data
    const otpData = await otpStorage.getOtp(email);

    if (!otpData) {
      throw createError({
        statusCode: 400,
        message: "Invalid or expired verification code.",
      });
    }

    // 2. Check Attempts (increment happens on failure, but we check count first)
    // Note: We don't get the count here to check, relying on increment return or subsequent check would be better,
    // but sticking to previous logic flow: check, then verify.
    // However, `otpStorage` helper doesn't expose "getAttempts" directly to keep interface clean.
    // We can infer max attempts logic inside the helper or just handle it here.
    // For now, let's just proceed to verify. If verification fails, we increment.
    // If we want to strictly enforce "max attempts reached before trying", we'd need to peek at attempts.
    // Let's rely on the increment return value for simplicity and robustness.

    // 3. Verify OTP
    const isValid = safeCompare(otpData.otp, otp);

    if (!isValid) {
      const attemptsCount = await otpStorage.incrementAttempts(email);

      if (attemptsCount >= MAX_ATTEMPTS) {
        await otpStorage.deleteOtp(email); // Burn the OTP
        throw createError({
          statusCode: 429,
          message: "Too many failed attempts. Please request a new code.",
        });
      }

      throw createError({
        statusCode: 400,
        message: "Invalid verification code.",
      });
    }

    // 4. Success: Generate Verified Token
    await otpStorage.markVerified(email, otpData.userId);

    // Cleanup
    await otpStorage.deleteOtp(email);

    return { success: true, message: "Code verified successfully." };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) throw error;
    console.error("Verify OTP error:", error);
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
});
