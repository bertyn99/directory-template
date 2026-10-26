/**
 * The 30 biggest supported cities (city-proper population), covering every
 * supported country. The `generate:city-covers` task upserts these values
 * into `cities.population` and generates `cities.cover` images for them.
 *
 * Names MUST match `cities.name` rows exactly (the task logs unmatched
 * entries). Slugs are derived via slugify(name) and double as image filenames.
 */
export interface MajorCityPopulation {
  name: string;
  countryCode: string;
  population: number;
}

export const MAJOR_CITY_POPULATIONS: MajorCityPopulation[] = [
  // France — top 10 (INSEE commune population)
  { name: "Paris", countryCode: "FR", population: 2_102_652 },
  { name: "Marseille", countryCode: "FR", population: 870_018 },
  { name: "Lyon", countryCode: "FR", population: 522_250 },
  { name: "Toulouse", countryCode: "FR", population: 502_133 },
  { name: "Nice", countryCode: "FR", population: 342_637 },
  { name: "Nantes", countryCode: "FR", population: 320_732 },
  { name: "Montpellier", countryCode: "FR", population: 300_486 },
  { name: "Strasbourg", countryCode: "FR", population: 289_430 },
  { name: "Bordeaux", countryCode: "FR", population: 259_809 },
  { name: "Lille", countryCode: "FR", population: 233_098 },
  // Germany
  { name: "Berlin", countryCode: "DE", population: 3_850_809 },
  { name: "Hamburg", countryCode: "DE", population: 1_899_160 },
  { name: "Munich", countryCode: "DE", population: 1_488_202 },
  { name: "Cologne", countryCode: "DE", population: 1_083_498 },
  // United Kingdom
  { name: "London", countryCode: "GB", population: 8_908_081 },
  { name: "Birmingham", countryCode: "GB", population: 1_144_900 },
  { name: "Glasgow", countryCode: "GB", population: 611_748 },
  // Spain
  { name: "Madrid", countryCode: "ES", population: 3_334_730 },
  { name: "Barcelona", countryCode: "ES", population: 1_660_476 },
  { name: "Valencia", countryCode: "ES", population: 800_215 },
  // Italy
  { name: "Rome", countryCode: "IT", population: 2_749_031 },
  { name: "Milan", countryCode: "IT", population: 1_371_498 },
  { name: "Naples", countryCode: "IT", population: 913_462 },
  // Netherlands / Belgium / Austria / Switzerland
  { name: "Amsterdam", countryCode: "NL", population: 921_402 },
  { name: "Brussels", countryCode: "BE", population: 1_218_314 },
  { name: "Vienna", countryCode: "AT", population: 1_931_593 },
  { name: "Zurich", countryCode: "CH", population: 437_308 },
  // Portugal
  { name: "Lisbon", countryCode: "PT", population: 545_245 },
  { name: "Porto", countryCode: "PT", population: 231_800 },
  // Réunion
  { name: "Saint-Denis", countryCode: "RE", population: 153_810 },
];
