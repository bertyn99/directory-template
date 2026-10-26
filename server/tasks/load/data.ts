import { scrapeVenuesJob } from "~~/server/jobs/scrape-venues";

export default defineTask({
  meta: {
    name: "load:data",
    description: "Scrape venues data using the new scraping architecture",
  },
  async run({ payload: _payload, context: _context }) {
    console.log("Starting venue scraping job...");
    try {
      const metricsArray = await scrapeVenuesJob();
      
      console.log("Scraping completed successfully!");
      const totalActivities = metricsArray.reduce((sum, m) => sum + m.activitiesProcessed, 0);
      const totalCities = metricsArray.reduce((sum, m) => sum + m.citiesProcessed, 0);
      const totalVenues = metricsArray.reduce((sum, m) => sum + m.venuesProcessed, 0);
      const allErrors = metricsArray.flatMap(m => m.errors);
      
      console.log(`Processed ${totalActivities} activities`);
      console.log(`Processed ${totalCities} cities`);
      console.log(`Processed ${totalVenues} venues`);
      
      if (allErrors.length > 0) {
        console.warn(`Encountered ${allErrors.length} errors:`);
        allErrors.forEach((error) => {
          console.warn(`  - ${error.type}: ${error.message}`);
        });
      }
      
      return {
        success: true,
        metrics: metricsArray,
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Scraping job failed:", err);
      throw createError({
        statusCode: 500,
        statusMessage: err.message,
      });
    }
  },
});
