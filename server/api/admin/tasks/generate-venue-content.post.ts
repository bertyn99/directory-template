import { accessAdmin } from "~~/shared/utils/abilities"
/**
 * POST /api/admin/tasks/generate-venue-content
 *
 * Trigger the update:venues Nitro task.
 * Translates venue descriptions to all configured locales using Gemini.
 *
 * This task processes venues with id > 291 and translates their
 * description.intro, description.text, and access fields to fr/en/de/es/it/pt.
 */
export default defineEventHandler(async (event) => {
  const _session = await requireUserSession(event);
  await authorize(event, accessAdmin);

  const { result } = await runTask("update:venues", { payload: {} });

  return { data: result };
});
