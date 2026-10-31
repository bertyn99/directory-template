import { describe, expect, it } from "vitest";
import { ensureUrl } from "../../app/utils/urls";

/**
 * Audit H1: user/scraper-supplied URLs must never render as dangerous
 * schemes. Zod's `.url()` alone accepts javascript:/data: — the sanitizer is
 * the render-time guard for venue websites, booking URLs and franchise
 * social links.
 */
describe("ensureUrl", () => {
  it("passes http(s) URLs through unchanged", () => {
    expect(ensureUrl("https://example.com/club")).toBe("https://example.com/club");
    expect(ensureUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// to protocol-less values", () => {
    expect(ensureUrl("example.com/club")).toBe("https://example.com/club");
    expect(ensureUrl("  playtomic.com  ")).toBe("https://playtomic.com");
  });

  it("returns undefined for dangerous schemes (never renders them)", () => {
    expect(ensureUrl("javascript:alert(1)")).toBeUndefined();
    expect(ensureUrl("JaVaScRiPt:alert(1)")).toBeUndefined();
    expect(ensureUrl("data:text/html,<script>1</script>")).toBeUndefined();
    expect(ensureUrl("vbscript:msgbox(1)")).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(ensureUrl(null)).toBeUndefined();
    expect(ensureUrl(undefined)).toBeUndefined();
    expect(ensureUrl("   ")).toBeUndefined();
    expect(ensureUrl("")).toBeUndefined();
  });
});
