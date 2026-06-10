const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000");

export interface SendInvitationEmailParams {
  email: string;
  token: string;
  orgName: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Sends an invitation email to a solicitor with a tokenized registration link.
 *
 * In production, this uses the Resend API (set RESEND_API_KEY and optionally
 * EMAIL_FROM in your environment). During development without an API key it
 * logs the invitation details to the console so the flow can still be tested.
 */
export async function sendInvitationEmail({
  email,
  token,
  orgName,
  firstName,
  lastName,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  const registrationLink = `${BASE_URL}/register?token=${token}`;

  const recipientName = [firstName, lastName].filter(Boolean).join(" ") || email;

  const subject = `You've been invited to join ${orgName}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're Invited!</h2>
      <p>Hi ${recipientName},</p>
      <p>You've been invited to join <strong>${orgName}</strong> as a solicitor.</p>
      <p>Click the link below to create your account and get started:</p>
      <p style="margin: 24px 0;">
        <a href="${registrationLink}"
           style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #6B7280;">${registrationLink}</p>
      <p style="color: #9CA3AF; font-size: 14px; margin-top: 32px;">
        This invitation will expire in 72 hours. If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  const textBody = `Hi ${recipientName},

You've been invited to join ${orgName} as a solicitor.

Click the link below to create your account and get started:

${registrationLink}

This invitation will expire in 72 hours. If you did not expect this invitation, you can safely ignore this email.`;

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    // Development fallback: log invitation details
    console.log("=== INVITATION EMAIL (no RESEND_API_KEY configured) ===");
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Registration Link: ${registrationLink}`);
    console.log("========================================================");
    return { success: true };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || "noreply@yourdomain.com";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as Record<string, string>).message ||
        `Email API returned status ${response.status}`;
      console.error("Failed to send invitation email:", errorMessage);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email sending error";
    console.error("Failed to send invitation email:", message);
    return { success: false, error: message };
  }
}
