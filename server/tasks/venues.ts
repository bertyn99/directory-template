import { eq, sql } from "drizzle-orm";
import { venues } from "~~/server/db/schemas";
import { generateContent } from "~~/server/db/service/contentGen";

async function saveTranslateDescToDatabase(
  parsedData: { intro: string; text: string; access: string },
  venueId: number,
  targetLocale: string = 'en'
  ) {
  try {
    console.log(`Updating venue ${targetLocale} description:`, venueId);
    const result = await useDrizzle()
      .update(venues)
      .set({
        description: sql`
            jsonb_set(
              coalesce(description, '{}'::jsonb),
              ARRAY[${targetLocale}]::text[],
              coalesce(description->${targetLocale}, description->'fr', description->'en', '{}'::jsonb) ||
              jsonb_build_object(
                'intro', coalesce(description->${targetLocale}->>'intro', description->'fr'->>'intro', description->'en'->>'intro', ${parsedData.intro}),
                'text', coalesce(description->${targetLocale}->>'text', description->'fr'->>'text', description->'en'->>'text', ${parsedData.text})
              ),
              true
            )
          `,
        access: sql`
              jsonb_set(
              coalesce(access, '{}'::jsonb),
              ARRAY[${targetLocale}]::text[],
              coalesce(access->${targetLocale}, access->'fr', access->'en', '[]'::jsonb) || ${parsedData.access.length > 0 ? parsedData.access : "[]"}::jsonb,
              true
            )
          `,
      })
      .where(eq(venues.id, venueId));

    if (Number(result?.rowCount) > 0) {
      console.log(`Venue ${targetLocale} description updated successfully:`, venueId);
    } else {
      console.log("No venue found with id:", venueId);
    }
  } catch (error) {
    console.error(`Error while saving venue ${targetLocale} description:`, error);
  }
}

// server/tasks/generateCategoryContent.ts
export default defineTask({
  meta: {
    name: "update:venues",
    description: "Translate venue descriptions to English using Gemini Flash",
  },
  async run() {
    const config = useRuntimeConfig(event);

    if (!config.geminiApiKey) {
      console.error("GEMINI_API_KEY is not set in the environment variables");
      return;
    }

    try {
      console.log("Load venues...");
      const venuesLoaded = await useDrizzle().query.venues.findMany({
        columns: {
          id: true,
          name: true,
          description: true,
          access: true,
        },

        orderBy: (venues, { asc }) => [asc(venues.id)],
        where: (venues, { gt }) => gt(venues.id, 291),
      });
      console.log("Venues loaded ", venuesLoaded.length);
      for (const venue of venuesLoaded) {
        if (venue.description) {
          const sourceLocale = Object.keys(venue.description).find(
            (key) => venue.description[key]?.text?.length > 0
          ) || 'fr';

          const sourceDesc = venue.description[sourceLocale];
          const sourceAccess = venue.access ? venue.access[sourceLocale] : null;

          const targetLocales = ['fr', 'en', 'de', 'es', 'it', 'pt'].filter(l => l !== sourceLocale);

          for (const targetLocale of targetLocales) {
            if (venue.description[targetLocale]?.text?.length > 0) continue;

            const intro = sourceDesc?.intro?.length > 0
              ? await generateContent({
                type: "venue",
                subType: "keyPoints",
                data: sourceDesc.intro,
                languages: targetLocale,
              })
              : "";

            const text = sourceDesc?.text?.length > 0
              ? await generateContent({
                type: "venue",
                subType: "keyPoints",
                data: sourceDesc.text,
                languages: targetLocale,
              })
              : "";

            const access = sourceAccess?.length > 0
              ? await generateContent({
                type: "venue",
                subType: "keyPoints",
                data: JSON.stringify(sourceAccess),
                languages: targetLocale,
              })
              : "";

            await saveTranslateDescToDatabase({ intro, text, access }, venue.id, targetLocale);
          }
        }
      }
      /* */
      console.log("Content generation complete!");
      //return "Content generation complete!";
      return "Content generation complete!";
    } catch (error) {
      console.error("Error generating content:", error);
    }
  },
});
