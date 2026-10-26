import { useDrizzle } from "#imports";
import { venueSources, venues, addresses, matchCandidates, activities, venueActivities } from "~~/server/db/schemas";
import { eq, sql, inArray } from "drizzle-orm";
import type { VenueRecordForAI } from "./aiMatcher";
import { getAIMatcher } from "./aiMatcher";
import { geocodeAddress } from "../location/geocoding";
import { deriveActivitySlugsFromSource } from "../scraping/activities";
import { translateVenue } from '../translation/autoTranslate';

/**
 * Strip protocol and www. from a website value for protocol-insensitive comparison.
 * Handles both full URLs (https://example.com) and bare hostnames (example.com).
 */
function normalizeWebsiteForCompare(website: string | undefined | null): string | null {
  if (!website) return null;
  try {
    const withProtocol = /^https?:\/\//.test(website) ? website : `https://${website}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return website.replace(/^www\./, "").toLowerCase();
  }
}
export interface MatchingOptions {
  geocodeDistanceThreshold?: number; // meters, default 100
  autoMatchConfidenceThreshold?: number; // 0-1, default 0.85
  reviewQueueMin?: number; // 0-1, default 0.65
  enableGeocoding?: boolean; // default true
  enableAI?: boolean; // default true
}

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  geocodeDistanceThreshold: 100,
  autoMatchConfidenceThreshold: 0.85,
  reviewQueueMin: 0.65,
  enableGeocoding: true,
  enableAI: true,
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper: Check if a name matches venue or its aliases (by locale)
 */
function nameMatchesVenue(
  sourceName: string,
  sourceLocale: string | undefined,
  venue: {
    name: string;
    aliases?: Array<{
      name: string;
      locale?: string;
      source?: string;
    }>;
  }
): boolean {
  const sourceLower = sourceName.toLowerCase().trim();
  const venueNameLower = venue.name.toLowerCase().trim();

  // Exact match with primary name
  if (sourceLower === venueNameLower) return true;

  // Check aliases by locale (prefer exact locale match)
  if (venue.aliases && venue.aliases.length > 0) {
    // First try to find exact locale match
    if (sourceLocale) {
      const localeMatch = venue.aliases.find(
        (alias) =>
          alias.locale === sourceLocale &&
          alias.name.toLowerCase().trim() === sourceLower
      );
      if (localeMatch) return true;
    }

    // Then try any alias
    const anyMatch = venue.aliases.find(
      (alias) => alias.name.toLowerCase().trim() === sourceLower
    );
    if (anyMatch) return true;
  }

  return false;
}

/**
 * Build VenueRecordForAI from venue_sources record
 */
async function buildVenueRecordForAI(
  venueSourceId: number
): Promise<VenueRecordForAI | null> {
  const db = useDrizzle();
  const venueSource = await db.query.venueSources.findFirst({
    where: { id: venueSourceId },
    with: {
      address: {
        with: {
          city: {
            with: {
              country: true,
            },
          },
        },
      },
    },
  });

  if (!venueSource) return null;

  const address = venueSource.address;
  const city = address?.city;
  const country = city?.country;

  return {
    name: venueSource.name || "",
    locale: venueSource.locale || undefined,
    tel: venueSource.tel || undefined,
    website: venueSource.website || undefined,
    address: address
      ? {
        street: address.street1 || undefined,
        city: city?.name || undefined,
        zip: address.zip || undefined,
        countryCode: country?.code || undefined,
      }
      : undefined,
    lat: address?.lat && !isNaN(Number(address.lat)) ? parseFloat(address.lat.toString()) : undefined,
    lng: address?.lng && !isNaN(Number(address.lng)) ? parseFloat(address.lng.toString()) : undefined,
  };
}

/**
 * Rule-based matching: Find candidates by deterministic signals
 */
async function findRuleBasedCandidates(
  venueSourceId: number,
  _options: Required<MatchingOptions>
): Promise<number[]> {
  const db = useDrizzle();
  const venueSource = await db.query.venueSources.findFirst({
    where: { id: venueSourceId },
    with: {
      address: {
        with: {
          city: {
            with: {
              country: true,
            },
          },
        },
      },
    },
  });

  if (!venueSource) return [];

  const orFilters = [];

  // Match by phone
  if (venueSource.tel) {
    orFilters.push({ tel: venueSource.tel });
  }

  // Match by website — try stored value AND bare hostname variant for transition compatibility
  if (venueSource.website) {
    orFilters.push({ website: venueSource.website });
    const hostname = normalizeWebsiteForCompare(venueSource.website);
    if (hostname && hostname !== venueSource.website) {
      orFilters.push({ website: hostname });
    }
  }

  // Match by address
  if (venueSource.addressId) {
    orFilters.push({ addressId: venueSource.addressId });
  }

  if (orFilters.length === 0) return [];

  const candidates = await db.query.venues.findMany({
    where: { OR: orFilters },
    columns: { id: true, name: true, aliases: true },
  });

  // Filter candidates: verify name match (either primary or alias by locale)
  const validCandidates = candidates.filter((candidate) =>
    nameMatchesVenue(venueSource.name || "", venueSource.locale, {
      name: candidate.name,
      aliases: candidate.aliases as unknown as Array<{
        name: string;
        locale?: string;
        source?: string;
      }>,
    })
  );

  return validCandidates.map((c) => c.id);
}

/**
 * Geocoding-based matching: Find candidates by proximity
 */
async function findGeocodingCandidates(
  venueSourceId: number,
  _options: Required<MatchingOptions>
): Promise<Array<{ venueId: number; distance: number }>> {
  const db = useDrizzle();
  const venueSource = await db.query.venueSources.findFirst({
    where: { id: venueSourceId },
    with: {
      address: {
        with: {
          city: {
            with: {
              country: true,
            },
          },
        },
      },
    },
  });

  if (!venueSource?.address) return [];

  // Get or geocode lat/lng for source address
  let sourceLat: number | null = null;
  let sourceLng: number | null = null;

  if (venueSource.address.lat && !isNaN(Number(venueSource.address.lat)) && venueSource.address.lng && !isNaN(Number(venueSource.address.lng))) {
    sourceLat = parseFloat(venueSource.address.lat.toString());
    sourceLng = parseFloat(venueSource.address.lng.toString());
  } else if (_options.enableGeocoding) {
    const geocodeResult = await geocodeAddress({
      street: venueSource.address.street1 || "",
      city: venueSource.address.city?.name || "",
      zip: venueSource.address.zip || undefined,
      countryCode: venueSource.address.city?.country?.code || undefined,
    });

    if (geocodeResult) {
      sourceLat = geocodeResult.lat;
      sourceLng = geocodeResult.lng;
      // Update address with geocoded coordinates
      await db
        .update(addresses)
        .set({
          lat: sourceLat.toString(),
          lng: sourceLng.toString(),
        })
        .where(eq(addresses.id, venueSource.addressId!));
    }
  }

  if (!sourceLat || !sourceLng) return [];

  const cityId = venueSource.address?.cityId

  // Find venues with addresses in the same city
  // We join through addresses to find venues where address.cityId matches
  let candidateVenues: Array<{ id: number; address: { lat: string | null; lng: string | null } | null }> = [];

  if (cityId) {
    // Standard query builder — avoids broken RAW filter in relational API
    const candidateRows = await db
      .select({ id: venues.id, lat: addresses.lat, lng: addresses.lng })
      .from(venues)
      .leftJoin(addresses, eq(venues.addressId, addresses.id))
      .where(eq(addresses.cityId, cityId));

    candidateVenues = candidateRows.map((r) => ({
      id: r.id,
      address: { lat: r.lat, lng: r.lng },
    }));
  }

  // Filter by distance
  const results: Array<{ venueId: number; distance: number }> = [];

  for (const candidate of candidateVenues) {
    if (!candidate.address?.lat || isNaN(Number(candidate.address.lat)) || !candidate.address?.lng || isNaN(Number(candidate.address.lng))) continue;

    const candidateLat = parseFloat(candidate.address.lat.toString());
    const candidateLng = parseFloat(candidate.address.lng.toString());

    const distance = calculateDistance(
      sourceLat,
      sourceLng,
      candidateLat,
      candidateLng
    );

    if (distance <= _options.geocodeDistanceThreshold) {
      results.push({ venueId: candidate.id, distance });
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Check if a venue_source already has a pending match candidate
 */
async function hasPendingCandidate(venueSourceId: number): Promise<boolean> {
  const db = useDrizzle();
  const existing = await db.query.matchCandidates.findFirst({
    where: { AND: [{ venueSourceId: venueSourceId }, { statusCode: "PENDING" }] },
  });
  return existing !== undefined;
}

/**
 * Insert a match candidate into the review queue
 */
async function insertMatchCandidate(
  venueSourceId: number,
  existingVenueId: number,
  score: number
): Promise<void> {
  const db = useDrizzle();
  await db.insert(matchCandidates).values({
    venueSourceId,
    existingVenueId,
    score: score.toFixed(2),
  });
}

/**
 * Match a venue_source to a canonical venue
 */
export async function matchVenueSource(
  venueSourceId: number,
  options: MatchingOptions = {}
): Promise<{ venueId: number | null; method: string; confidence?: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const db = useDrizzle();

  return await db.transaction(async (tx) => {
    // Advisory lock: prevent concurrent matching on the same venue_source
    // Uses pg_advisory_xact_lock for lightweight mutex without row-level locking
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1, ${venueSourceId})`)

    // Skip if already has a pending match candidate
    if (await hasPendingCandidate(venueSourceId)) {
      return { venueId: null, method: "review-pending" };
    }

    // Step 1: Rule-based matching (deterministic, always auto-merge)
    const ruleBasedCandidates = await findRuleBasedCandidates(venueSourceId, opts);
    if (ruleBasedCandidates.length === 1) {
      const matchId = ruleBasedCandidates[0]!
      await tx
        .update(venueSources)
        .set({ venueId: matchId, matchScore: "1.00", matchMethod: "rule-based" })
        .where(eq(venueSources.id, venueSourceId));
      return { venueId: matchId, method: "rule-based" };
    }

    // Step 2: Geocoding-based matching
    if (opts.enableGeocoding) {
      const geocodingCandidates = await findGeocodingCandidates(
        venueSourceId,
        opts
      );

      for (const { venueId, distance } of geocodingCandidates) {
        const candidate = await tx.query.venues.findFirst({
          where: { id: venueId },
        });
        const source = await tx.query.venueSources.findFirst({
          where: { id: venueSourceId },
        });

        if (
          candidate &&
          source &&
          ((source.tel && candidate.tel === source.tel) ||
            (source.website && candidate.website &&
              normalizeWebsiteForCompare(candidate.website) === normalizeWebsiteForCompare(source.website)))
        ) {
          const confidence = distance < 50 ? 0.9 : 0.7;

          // Check review queue threshold
          if (confidence >= opts.autoMatchConfidenceThreshold) {
            await tx
              .update(venueSources)
              .set({ venueId, matchScore: confidence.toFixed(2), matchMethod: "geocoding" })
              .where(eq(venueSources.id, venueSourceId));
            return { venueId, method: "geocoding", confidence };
          }

          // Score in review range → queue for manual review
          if (confidence >= opts.reviewQueueMin) {
            await insertMatchCandidate(venueSourceId, venueId, confidence);
            return { venueId: null, method: "review", confidence };
          }
        }
      }
    }

    // Step 3: AI matching
    if (opts.enableAI) {
      const sourceRecord = await buildVenueRecordForAI(venueSourceId);
      if (!sourceRecord) {
        return { venueId: null, method: "none" };
      }

      const allCandidateIds = new Set([
        ...ruleBasedCandidates,
        ...(opts.enableGeocoding
          ? (await findGeocodingCandidates(venueSourceId, opts)).map(
            (c) => c.venueId
          )
          : []),
      ]);

      if (allCandidateIds.size > 0) {
        const aiMatcher = getAIMatcher();
        let bestMatch: { venueId: number; confidence: number } | null = null;
        let bestReviewMatch: { venueId: number; confidence: number } | null = null;

        for (const candidateId of allCandidateIds) {
          const candidateVenue = await tx.query.venues.findFirst({
            where: { id: candidateId },
            with: {
              address: {
                with: {
                  city: {
                    with: {
                      country: true,
                    },
                  },
                },
              },
            },
          });

          if (!candidateVenue) continue;

          const candidateRecord: VenueRecordForAI = {
            name: candidateVenue.name,
            tel: candidateVenue.tel || undefined,
            website: candidateVenue.website || undefined,
            address: candidateVenue.address
              ? {
                street: candidateVenue.address.street1 || undefined,
                city: candidateVenue.address.city?.name || undefined,
                zip: candidateVenue.address.zip || undefined,
                countryCode: candidateVenue.address.city?.country?.code || undefined,
              }
              : undefined,
            lat: candidateVenue.address?.lat && !isNaN(Number(candidateVenue.address.lat))
              ? parseFloat(candidateVenue.address.lat.toString())
              : undefined,
            lng: candidateVenue.address?.lng && !isNaN(Number(candidateVenue.address.lng))
              ? parseFloat(candidateVenue.address.lng.toString())
              : undefined,
          };

          const matchResult = await aiMatcher.matchVenues(
            sourceRecord,
            candidateRecord
          );

          if (!matchResult.sameVenue) continue;

          const conf = matchResult.confidence;

          // Auto-merge: score >= threshold
          if (conf >= opts.autoMatchConfidenceThreshold) {
            if (!bestMatch || conf > bestMatch.confidence) {
              bestMatch = { venueId: candidateId, confidence: conf };
            }
          }
          // Review queue: score in [reviewQueueMin, autoMatchThreshold)
          else if (conf >= opts.reviewQueueMin) {
            if (!bestReviewMatch || conf > bestReviewMatch.confidence) {
              bestReviewMatch = { venueId: candidateId, confidence: conf };
            }
          }
        }

        // Auto-merge best match
        if (bestMatch) {
          // Add to aliases if name differs
          const venueSource = await tx.query.venueSources.findFirst({
            where: { id: venueSourceId },
          });
          const matchedVenue = await tx.query.venues.findFirst({
            where: { id: bestMatch.venueId },
            columns: { name: true, aliases: true },
          });

          if (
            matchedVenue &&
            venueSource?.name &&
            venueSource.name.toLowerCase().trim() !==
            matchedVenue.name.toLowerCase().trim()
          ) {
            const currentAliases = (matchedVenue.aliases as unknown as Array<{
              name: string;
              locale?: string;
              source?: string;
            }>) || [];
            const aliasExists = currentAliases.some(
              (a: { name: string; locale?: string; source?: string }) =>
                a.name.toLowerCase().trim() ===
                venueSource.name.toLowerCase().trim()
            );

            if (!aliasExists) {
              const newAlias = {
                name: venueSource.name,
                locale: venueSource.locale,
                source: venueSource.sourceCode,
              };
              await tx
                .update(venues)
                .set({
                  aliases: [...currentAliases, newAlias],
                })
                .where(eq(venues.id, bestMatch.venueId));
            }
          }

          await tx
            .update(venueSources)
            .set({ venueId: bestMatch.venueId, matchScore: bestMatch.confidence.toFixed(2), matchMethod: "ai" })
            .where(eq(venueSources.id, venueSourceId));
          return {
            venueId: bestMatch.venueId,
            method: "ai",
            confidence: bestMatch.confidence,
          };
        }

        // Queue for manual review
        if (bestReviewMatch) {
          await insertMatchCandidate(venueSourceId, bestReviewMatch.venueId, bestReviewMatch.confidence);
          return { venueId: null, method: "review", confidence: bestReviewMatch.confidence };
        }
      }
    }

    // Step 4: Create new canonical venue if no match found
    const venueSource = await tx.query.venueSources.findFirst({
      where: { id: venueSourceId },
      with: {
        address: true,
      },
    });

    if (!venueSource) {
      return { venueId: null, method: "none" };
    }

    const [newVenue] = await tx
      .insert(venues)
      .values({
        name: venueSource.name || "Unknown Venue",
        tel: venueSource.tel || undefined,
        website: venueSource.website || undefined,
        addressId: venueSource.addressId || undefined,
        aliases: [],
      })
      .returning({ id: venues.id });
    if (!newVenue) {
      return { venueId: null, method: "none" };
    }

    // Attach activities derived from the source payload so category filtering
    // works immediately (slugs resolved against this environment's activities table)
    const activitySlugs = deriveActivitySlugsFromSource(venueSource.sourceCode, venueSource.raw)
    if (activitySlugs.length > 0) {
      const activityRows = await tx
        .select({ id: activities.id })
        .from(activities)
        .where(inArray(activities.slug, activitySlugs));
      if (activityRows.length > 0) {
        await tx
          .insert(venueActivities)
          .values(activityRows.map(a => ({ venueId: newVenue.id, activityId: a.id })))
          .onConflictDoNothing();
      }
    }

    // Trigger auto-translation for the new venue
    translateVenue(newVenue.id, 'fr').catch((err) => {
      console.error(`[matching] Auto-translation failed for new venue ${newVenue.id}:`, err)
    })

    await tx
      .update(venueSources)
      .set({ venueId: newVenue.id, matchScore: null, matchMethod: "created" })
      .where(eq(venueSources.id, venueSourceId));

    return { venueId: newVenue.id, method: "created" };
  });
}
