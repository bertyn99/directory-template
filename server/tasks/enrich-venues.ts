import { enrichVenues } from "../services/venues/enrich";

export default defineTask({
  meta: {
    name: "enrich-venues",
    description:
      "Enrich venues with AI-generated descriptions from scraped website + Google Maps data. Payload: { force?: boolean, locales?: string[], venueIds?: number[], limit?: number }",
  },
  async run({ payload }) {
    const config = useRuntimeConfig();
    if (!config.geminiApiKey) {
      console.error("[enrich-venues] GEMINI_API_KEY is not set");
      return { result: "error", message: "GEMINI_API_KEY missing" };
    }

    const force = payload?.force === true || payload?.force === "true";
    const locales = (payload?.locales as string[] | undefined) ?? ["fr", "en"];
    const venueIds = payload?.venueIds as number[] | undefined;
    const limit = (payload?.limit as number | undefined) ?? 50;

    console.log(
      `[enrich-venues] Starting (force=${force}, locales=[${locales.join(",")}], limit=${limit})`,
    );

    const result = await enrichVenues({ force, locales, venueIds, limit });

    const message = `Done. Processed: ${result.processed}, Skipped: ${result.skipped}, Failed: ${result.failed}`;
    console.log(`[enrich-venues] ${message}`);

    return { result: "success", ...result };
  },
});
