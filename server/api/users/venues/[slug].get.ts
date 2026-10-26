import { getOwnedVenueBySlug } from "~~/server/db/queries/venues";
import { editVenue } from "~~/shared/utils/abilities";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const slug = getRouterParam(event, "slug");

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Venue slug is required" });
  }

  const result = await getOwnedVenueBySlug(slug, session.user.id);

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Venue not found" });
  }

  await authorize(event, editVenue, result.isOwner, result.isFranchiseOwner);

  return { data: result.venue };
});
