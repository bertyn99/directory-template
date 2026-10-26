import { accessAdmin } from "~~/shared/utils/abilities";
import { z } from "zod";

const enrichVenuesPayloadSchema = z.object({
  force: z.boolean().optional().default(false),
  locales: z.array(z.string().length(2)).max(6).optional().default(["fr", "en"]),
  venueIds: z.array(z.number().int().positive()).max(500).optional(),
  limit: z.number().int().positive().max(500).optional().default(50),
});

/**
 * POST /api/admin/tasks/enrich-venues
 *
 * Trigger the enrich:venues Nitro task.
 * Multi-page scrapes venue websites (home + schedule/pricing/programs pages),
 * generates multilingual descriptions with Gemini, and saves them to
 * venues.description. Thin scrapes get a deterministic factual stub.
 *
 * Payload options:
 *   - force:    Regenerate even if a description already exists (default: false)
 *   - locales:  Target locales (default: ["fr", "en"])
 *   - venueIds:  Specific venue IDs — skips the empty-description filter
 *   - limit:    Max venues per run when no venueIds given (default: 50, max: 500)
 */
export default defineEventHandler(async (event) => {
  const _session = await requireUserSession(event);
  await authorize(event, accessAdmin);

  const body = await readValidatedBody(event, enrichVenuesPayloadSchema.parse);
  const { result } = await runTask("enrich-venues", { payload: body });

  return { data: result };
});
