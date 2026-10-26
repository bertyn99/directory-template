import { requireTaskAuth } from "~~/server/utils/taskAuth";
import { z } from "zod";

const geocodePayloadSchema = z.object({
  force: z.boolean().optional().default(false),
  limit: z.number().int().positive().max(10000).optional(),
});

/**
 * POST /api/admin/tasks/geocode-addresses
 *
 * Trigger the geocode:addresses Nitro task.
 * Payload options:
 *   - force: Re-geocode addresses that already have coordinates (default: false)
 *   - limit: Max addresses to process (default: all missing ones)
 *
 * Idempotent — only processes addresses without coordinates unless forced.
 */
export default defineEventHandler(async (event) => {
  await requireTaskAuth(event);

  const body = await readValidatedBody(event, geocodePayloadSchema.parse);
  const { result } = await runTask("geocode-addresses", { payload: body });

  return { data: result };
});
