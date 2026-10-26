
// Re-export PlaceData from sources/types for backward compatibility
export type { PlaceData } from "./sources/types";

export interface ActivityData {
  name: string;
  url: string;
  image?: string;
}

export interface CityData {
  id: string;
  city: string;
  url: string;
}

/**
 * Re-export MASPlaceData from the MAS adapter for backward compatibility
 */
export type { MASPlaceData } from "./sources/masalledesport/parser";
