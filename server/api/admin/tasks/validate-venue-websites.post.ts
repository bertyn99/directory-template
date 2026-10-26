import { accessAdmin } from "~~/shared/utils/abilities";
import { z } from "zod";

const validateWebsitesPayloadSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  limit: z.number().int().positive().max(2000).optional().default(500),
  timeoutMs: z.number().int().positive().max(30000).optional().default(8000),
});

/**
 * POST /api/admin/tasks/validate-venue-websites
 *
 * Trigger the validate:venue-websites Nitro task.
 * HEAD-checks all venue websites, nulls out broken ones (4xx/5xx/timeout).
 *
 * Payload options:
 *   - dryRun:    Report only, don't null anything (default: false)
 *   - limit:     Max venues to check (default: 500, max: 2000)
 *   - timeoutMs: Per-request timeout (default: 8000ms, max: 30000ms)
 */
export default defineEventHandler(async (event) => {
  const _session = await requireUserSession(event);
  await authorize(event, accessAdmin);

  const body = await readValidatedBody(event, validateWebsitesPayloadSchema.parse);
  const { result } = await runTask("validate-venue-websites", { payload: body });

  return { data: result };
});
