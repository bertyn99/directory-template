import { getVenueBySlug } from "~~/server/db/queries/venues";

export default defineEventHandler(async (event) => {
  try {
    const rawSlug = event.context.params?.slug;

    if (!rawSlug) {
      throw createError({
        statusCode: 400,
        statusMessage: "Venue slug is required",
      });
    }

    // Normalize slug: replace dots with hyphens to match slugify() output.
    // External sources (crawlers, old bookmarks) sometimes use the venue's domain
    // (e.g. /venues/foo.com) but slugify() converts dots to hyphens (foo-com).
    const slug = rawSlug.replace(/\./g, '-');

    const venue = await getVenueBySlug(slug);

    if (!venue) {
      // Legacy bare-domain slugs (e.g. /venues/arene-aix.com) whose venue records
      // were deleted (dead websites). Return 410 Gone so Google drops them from
      // the index instead of re-crawling 404s. Normal non-domain slugs 404.
      if (/\.[a-z]{2,}$/i.test(rawSlug)) {
        throw createError({
          statusCode: 410,
          statusMessage: "Venue removed",
        });
      }
      throw createError({
        statusCode: 404,
        statusMessage: "Venue not found",
      });
    }

    return {
      data: venue,
    };
  } catch (err: unknown) {
    // Re-throw H3Error instances (createError) with their original status code
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }

    console.error('Error fetching venue:', err);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch venue',
    });
  }
});
