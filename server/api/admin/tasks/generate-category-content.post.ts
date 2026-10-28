import { accessAdmin } from "~~/shared/utils/abilities"
import { z } from "zod";

const categoryContentPayloadSchema = z.object({
  force: z.boolean().optional().default(false),
  fields: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : undefined)),
  locales: z.array(z.string()).optional().default(["fr", "en"]),
});

/**
 * POST /api/admin/tasks/generate-category-content
 *
 * Trigger the generate:category-content Nitro task.
 * Payload options:
 *   - force:    Regenerate content even if it already exists (default: false)
 *   - fields:   Limit generation to specific fields (techniques, keyPoints, equipments, contraindications, benefits, content)
 *   - locales:  Target locales (default: ["fr", "en"])
 */
export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  await authorize(event, accessAdmin);

  const body = await readValidatedBody(event, categoryContentPayloadSchema.parse);
  const { result } = await runTask("generate-category-content", { payload: body });

  return { data: result };
});
