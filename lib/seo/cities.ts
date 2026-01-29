/**
 * Acadiana cities data for programmatic SEO city landing pages
 * Each city gets its own landing page at /{slug}
 */

export interface AcadianaCity {
  slug: string;
  name: string;
  county: string;
  lat: number;
  lng: number;
  population: number;
  description: string;
  nearbyAreas: string[];
}

export const ACADIANA_CITIES: AcadianaCity[] = [
  {
    slug: "lafayette",
    name: "Lafayette",
    county: "Lafayette Parish",
    lat: 30.2241,
    lng: -92.0198,
    population: 126185,
    description: "the heart of Acadiana and Louisiana's fourth-largest city",
    nearbyAreas: ["Scott", "Broussard", "Youngsville", "Carencro"],
  },
  {
    slug: "new-iberia",
    name: "New Iberia",
    county: "Iberia Parish",
    lat: 30.0035,
    lng: -91.8188,
    population: 30617,
    description: "the Queen City of the Teche",
    nearbyAreas: ["Jeanerette", "Loreauville", "Delcambre"],
  },
  {
    slug: "opelousas",
    name: "Opelousas",
    county: "St. Landry Parish",
    lat: 30.5335,
    lng: -92.0815,
    population: 16330,
    description: "the Zydeco Capital of the World",
    nearbyAreas: ["Eunice", "Sunset", "Grand Coteau"],
  },
  {
    slug: "crowley",
    name: "Crowley",
    county: "Acadia Parish",
    lat: 30.2141,
    lng: -92.3746,
    population: 12000,
    description: "the Rice Capital of Louisiana",
    nearbyAreas: ["Rayne", "Church Point", "Iota"],
  },
  {
    slug: "breaux-bridge",
    name: "Breaux Bridge",
    county: "St. Martin Parish",
    lat: 30.2735,
    lng: -91.8993,
    population: 8100,
    description: "the Crawfish Capital of the World",
    nearbyAreas: ["St. Martinville", "Henderson", "Cecilia"],
  },
  {
    slug: "abbeville",
    name: "Abbeville",
    county: "Vermilion Parish",
    lat: 29.9744,
    lng: -92.1343,
    population: 12000,
    description: "a charming Cajun town known for its historic downtown",
    nearbyAreas: ["Kaplan", "Erath", "Maurice"],
  },
  {
    slug: "youngsville",
    name: "Youngsville",
    county: "Lafayette Parish",
    lat: 30.0996,
    lng: -91.9907,
    population: 14000,
    description: "one of Louisiana's fastest-growing cities",
    nearbyAreas: ["Broussard", "Milton", "Lafayette"],
  },
  {
    slug: "scott",
    name: "Scott",
    county: "Lafayette Parish",
    lat: 30.2357,
    lng: -92.0943,
    population: 9000,
    description: "the Boudin Capital of the World",
    nearbyAreas: ["Lafayette", "Duson", "Carencro"],
  },
] as const;

/**
 * Get a city by its slug
 */
export function getCityBySlug(slug: string): AcadianaCity | undefined {
  return ACADIANA_CITIES.find((city) => city.slug === slug);
}

/**
 * Get all city slugs for static params generation
 */
export function getAllCitySlugs(): string[] {
  return ACADIANA_CITIES.map((city) => city.slug);
}
