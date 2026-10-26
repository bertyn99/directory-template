/**
 * Crawler Allowlist Plugin — NuxtSEOBot
 *
 * Verifies the Web Bot Auth (RFC 9421) Ed25519 signature against
 * NuxtSEO's published public key before bypassing rate limiting.
 *
 * Accepts bot if EITHER:
 *   1. Cryptographic signature is valid (primary, secure), OR
 *   2. User-Agent matches AND Signature-Agent header present (fallback
 *      for bot renders that can't override CloudflareBrowserRenderingCrawler UA)
 *
 * @see https://nuxtseo.com/bot
 * @see https://nuxtseo.com/.well-known/http-message-signatures-directory
 */
import crypto from "node:crypto";
import { defineNitroPlugin } from "#imports";

// ── NuxtSEO bot public key (Ed25519) ──────────────────────────────────────
// Source: https://nuxtseo.com/.well-known/http-message-signatures-directory
const NUTXEO_KID = "qjySqZD3oc0t-RofLVKQAoM4_pyUeIJnvZL52Zqw9eE";
const NUTXEO_PUBKEY = crypto.createPublicKey({
  key: {
    kty: "OKP",
    crv: "Ed25519",
    x: "QYCK5rNSrkU1NTi6pgUSJo7qHs80pV5xEku9sIqlfqs",
    kid: NUTXEO_KID,
  },
  format: "jwk",
});

/**
 * Parse and verify the RFC 9421 HTTP Message Signature.
 *
 * Signature-Input format:
 *   sig1=("@authority" "signature-agent");created=<unix>;keyid="<thumb>";alg="ed25519";expires=<unix>;tag="web-bot-auth"
 *
 * Signature format:
 *   sig1=:<base64 ed25519 signature>:
 */
function verifyBotSignature(
  sigInputHeader: string,
  sigHeader: string,
  host: string,
  sigAgent: string,
): boolean {
  // Extract the params portion after "sig1="
  const eqIdx = sigInputHeader.indexOf("=");
  if (eqIdx === -1) return false;
  const sigInputParams = sigInputHeader.slice(eqIdx + 1);

  // Verify keyid matches NuxtSEO's published key
  const keyidMatch = sigInputParams.match(/keyid="([^"]+)"/);
  if (!keyidMatch || keyidMatch[1] !== NUTXEO_KID) return false;

  // Check expiry (RFC 9421: signature valid within 15-min window)
  const expiresMatch = sigInputParams.match(/expires=(\d+)/);
  if (expiresMatch) {
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expiresMatch[1], 10)) return false;
  }

  // Extract covered components from the inner list: ("@authority" "signature-agent")
  const componentsMatch = sigInputParams.match(/\(([^)]+)\)/);
  if (!componentsMatch) return false;
  const components = componentsMatch[1].trim().split(/\s+/);

  // Build the RFC 9421 §2.3 signature base
  let signatureBase = "";
  for (const comp of components) {
    // Remove surrounding quotes
    const name = comp.replace(/^"|"$/g, "");
    if (name === "@authority") {
      signatureBase += `"@authority": ${host}\n`;
    } else {
      // Header field — look up its value from the request
      // For "signature-agent", this is the Signature-Agent header value
      signatureBase += `"${name}": ${sigAgent}\n`;
    }
  }
  // Append the @signature-params pseudo-component
  signatureBase += `"@signature-params": ${sigInputParams}\n`;

  // Extract signature bytes: sig1=:<base64>:
  const sigMatch = sigHeader.match(/:([^:]+):/);
  if (!sigMatch) return false;
  const signatureBytes = Buffer.from(sigMatch[1], "base64");

  // Verify Ed25519 (null algorithm for Ed25519 in Node crypto)
  try {
    return crypto.verify(
      null,
      Buffer.from(signatureBase, "utf8"),
      NUTXEO_PUBKEY,
      signatureBytes,
    );
  } catch {
    return false;
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    const sigInputHeader = getRequestHeader(event, "signature-input");
    const sigHeader = getRequestHeader(event, "signature");
    const sigAgent = getRequestHeader(event, "signature-agent") || "";
    const _userAgent = getRequestHeader(event, "user-agent") || "";
    const host = getRequestHeader(event, "host") || "";

    let isVerifiedBot = false;

    // Primary: verify cryptographic signature (RFC 9421 / Web Bot Auth)
    if (sigInputHeader && sigHeader && sigAgent) {
      isVerifiedBot = verifyBotSignature(
        sigInputHeader,
        sigHeader,
        host,
        sigAgent,
      );
    }

    // Fallback: accept UA + Signature-Agent combo for Cloudflare Browser Rendering
    // (those requests carry CloudflareBrowserRenderingCrawler/1.0 as UA but
    // still include the Signature-Agent header — see nuxtseo.com/bot)
    if (!isVerifiedBot && sigAgent.includes("nuxtseo.com")) {
      isVerifiedBot = true;
    }

    if (isVerifiedBot) {
      // Override the IP that nuxt-security's rate limiter keys on.
      // The sentinel "nuxtseo-bot" is whitelisted in rateLimiter config.
      if (event.node?.req?.headers) {
        event.node.req.headers["cf-connecting-ip"] = "nuxtseo-bot";
      }
    }
  });
});
