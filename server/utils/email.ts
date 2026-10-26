import type { H3Event } from "h3";
import Plunk from "@plunk/node";

interface PlunkEventData {
  event: string;
  email: string;
  data?: Record<string, unknown>;
  subscribed?: boolean;
}

interface SendEmailOptions {
  /**
   * Email template name (path without .vue extension)
   * Examples: 'Signup', 'transactional/Signup', 'ConfirmEmail'
   */
  templateName: string;

  /**
   * Template props including locale for i18n
   */
  props: Record<string, unknown>;

  /**
   * Recipient email address(es)
   */
  to: string | string[];

  /**
   * Email subject line
   */
  subject: string;

  /**
   * Sender email (optional, defaults to env variable)
   */
  from?: string;

  /**
   * User locale for i18n rendering (defaults to 'en')
   */
  locale?: string;

  /**
   * Plunk event name for tracking (optional)
   */
  eventName?: string;
}

export function getPlunkClient(event: H3Event) {
  const config = useRuntimeConfig(event);

  if (!config.plunk?.apiKey) {
    if (import.meta.dev) {
      console.warn("Plunk API key is not configured. Transactional emails will be disabled.");
    }
    return null;
  }

  const client = new Plunk(config.plunk.apiKey, {
    baseUrl: config.plunk.baseUrl,
  });

  return client;
}

/**
 * Track a Plunk event for user analytics and email automation
 */
export async function trackNotificationEvent(event: H3Event, eventData: PlunkEventData) {
  const notify = getPlunkClient(event);

  if (!notify) {
    if (import.meta.dev) {
      console.warn("Notification client not available, skipping event tracking:", eventData.event);
    }
    return;
  }

  try {
    await notify.events.track({
      event: eventData.event,
      email: eventData.email,
      data: eventData.data || {},
      subscribed: eventData.subscribed ?? true,
    });

    if (import.meta.dev) {
      console.log("Notification event tracked:", eventData.event, "for", eventData.email);
    }
  } catch (error) {
    console.error("Failed to track Notification event:", error);
  }
}

/**
 * Send an email using a template from @emails/ and Plunk
 *
 * @example
 * await sendEmail(event, {
 *   templateName: 'Signup',
 *   subject: 'Welcome to Kosmo Notes',
 *   to: 'user@example.com',
 *   locale: 'en',
 *   props: {
 *     userName: 'John',
 *     confirmationUrl: 'https://example.com/verify?token=xxx'
 *   },
 *   eventName: 'user.signup'
 * })
 */
export async function sendEmail(event: H3Event, options: SendEmailOptions) {
  const config = useRuntimeConfig(event);
  const plunk = getPlunkClient(event);

  if (!plunk) {
    console.warn("Plunk client not available. Email will not be sent.", {
      templateName: options.templateName,
      to: options.to,
    });
    return { success: false, error: "Email service unavailable" };
  }

  try {
    // Ensure locale is set in props for template rendering
    const templateProps = {
      ...options.props,
      locale: options.locale || (options.props.locale as string | undefined) || "en",
    };

    // Render template to HTML
    const html = await renderEmailTemplate(options.templateName, templateProps);
    if (!html) {
      throw new Error(`Failed to render template: ${options.templateName}`);
    }

    // Prepare recipients
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const fromEmail =
      options.from || (config.email?.from as string | undefined) || "noreply@kosmonotes.com";

    // Send via Plunk

    const result = await plunk.emails.send({
      to: recipients,
      from: fromEmail,
      subject: options.subject,
      body: html,
      replyTo: config.email?.replyTo as string | undefined,
    } as unknown);

    if (import.meta.dev) {
      console.log("✉️ Email sent successfully", {
        templateName: options.templateName,
        to: recipients,
        subject: options.subject,
        messageId: result?.messageId,
      });
    }

    // Track event if provided
    if (options.eventName) {
      await trackNotificationEvent(event, {
        event: options.eventName,
        email: recipients[0],
        data: {
          templateName: options.templateName,
          locale: templateProps.locale,
        },
        subscribed: true,
      });
    }

    return {
      success: true,
      messageId: result?.messageId || "unknown",
    };
  } catch (error) {
    console.error("Failed to send email:", {
      templateName: options.templateName,
      to: options.to,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Render an email template to HTML string
 * Uses the nuxt-email-renderer module to compile Vue templates
 */
export async function renderEmailTemplate(
  templateName: string,
  props: Record<string, unknown> = {},
): Promise<string | null> {
  try {
    // Dynamically import the render function from the virtual module

    /*     const { renderEmailComponent } = await import('#renderEmailComponent' as any) */

    const html = await renderEmailComponent(templateName, props, {
      pretty: import.meta.dev,
    });

    return html;
  } catch (error) {
    console.error("Failed to render email template:", {
      templateName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
