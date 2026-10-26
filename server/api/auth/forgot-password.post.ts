import { z } from "zod";
import { generateOTP, otpStorage } from "~~/server/utils/auth/otp";
import { sendOTPEmail } from "~~/server/utils/email/send-otp";
import { getUserByEmail, findAccountCredentials } from "~~/server/db/queries/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export default defineEventHandler(async (event) => {
  try {
    const { email } = await readValidatedBody(event, forgotPasswordSchema.parse);

    // 1. Rate Limiting
    const allowed = await otpStorage.checkRateLimit(email);

    if (!allowed) {
      throw createError({
        statusCode: 429,
        message: "Too many requests. Please try again later.",
      });
    }

    await otpStorage.incrementRateLimit(email);

    // 2. Check User & Account
    const user = await getUserByEmail(email);

    // Security: Always return success even if user not found
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email, you will receive a verification code.",
      };
    }

    const account = await findAccountCredentials(user.id);
    if (!account) {
      // User exists but no credentials account (e.g. only OAuth)
      return {
        success: true,
        message: "If an account exists with this email, you will receive a verification code.",
      };
    }

    // 3. Generate & Store OTP
    const otp = generateOTP();
    await otpStorage.storeOtp(email, user.id, otp);

    // 4. Send Email
    const emailResult = await sendOTPEmail(event, email, otp);

    if (!emailResult.success) {
      console.error("Failed to send OTP email");
      throw createError({
        statusCode: 500,
        message: "Failed to send verification code",
      });
    }

    return {
      success: true,
      message: "If an account exists with this email, you will receive a verification code.",
    };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error && error.statusCode === 429) throw error;

    console.error("Forgot password error:", error);
    return {
      success: true,
      message: "If an account exists with this email, you will receive a verification code.",
    };
  }
});
