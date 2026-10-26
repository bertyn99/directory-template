import { requireTaskAuth } from "~~/server/utils/taskAuth";
import { z } from "zod";

const cityCoversPayloadSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * POST /api/admin/tasks/generate-city-covers
 *
 * Trigger the generate-city-covers Nitro task.
 * Payload options:
 *   - force: Rewrite cover paths even if already set (default: false)
 *
 * Idempotent — safe to run after every deploy.
 */
export default defineEventHandler(async (event) => {
  await requireTaskAuth(event);

  const body = await readValidatedBody(event, cityCoversPayloadSchema.parse);

  try {
    const { result } = await runTask("generate-city-covers", { payload: body });
    return { data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-city-covers] Task error:", message);
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
