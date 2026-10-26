import { getPlunkClient } from "../email";
import type { H3Event } from "h3";

interface OTPEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function getOTPEmailTemplate(otp: string, expiryMinutes: number): OTPEmailTemplate {
  return {
    subject: "Reset your password - Directory Template",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset</h1>
        <p>You requested to reset your password. Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h2 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #000;">${otp}</h2>
        </div>
        <p>This code will expire in ${expiryMinutes} minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `Your verification code is: ${otp}. Valid for ${expiryMinutes} minutes.`,
  };
}

export async function sendOTPEmail(event: H3Event, email: string, otp: string) {
  const plunk = getPlunkClient(event);
  const config = useRuntimeConfig(event);

  if (!plunk) {
    console.warn("Plunk client not available. OTP email will not be sent.");
    return { success: false, error: "Email service unavailable" };
  }

  const template = getOTPEmailTemplate(otp, config.otp.expiryMinutes || 10);
  const fromEmail = config.email?.from || "noreply@example-directory.com";

  try {
    const result = await plunk.emails.send({
      to: email,
      from: fromEmail,
      subject: template.subject,
      body: template.html,
    } as unknown); // Type assertion to bypass potential mismatch if types are strict

    // Plunk's send endpoint answers with the delivered message id
    return {
      success: true,
      messageId: (result as { messageId?: string } | null | undefined)?.messageId,
    };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
