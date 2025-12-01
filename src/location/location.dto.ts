/**
 * High-level DTO types for the LocationService responses.
 *
 * These DTOs are intended to be the normalized, consumer-facing shapes
 * returned by service methods like `searchLocation`, `reverseGeocode`,
 * and `calculateDistance`. They intentionally include both a simplified
 * shape for clients and the raw provider payload (under `raw`) for
 * debugging/observability when needed.
 *
 * Keep these DTOs stable — changing them is a breaking change for any
 * callers of the service.
 */

/* Basic types */

export type Coordinate = [number, number]; // [lon, lat]

/* Photon (geocoding) provider types (raw shapes) */

export interface PhotonFeatureRaw {
  geometry: {
    type: string;
    coordinates: Coordinate;
  };
  properties: {
    // Photon returns many possible properties; keep as indexable
    // but expose the common ones explicitly where possible.
    name?: string;
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    postcode?: string;
    borough?: string;
    housenumber?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface PhotonResponseRaw {
  features: PhotonFeatureRaw[];
  [key: string]: any;
}

/* OpenStreetMap Nominatim (reverse geocode) provider raw type */

export interface NominatimReverseRaw {
  place_id?: number;
  licence?: string;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
  [key: string]: any;
}

export interface NominatimSearchItemRaw {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address: {
    amenity?: string;
    road?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    'ISO3166-2-lvl4'?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export type NominatimSearchResponseRaw = NominatimSearchItemRaw[];

/* OpenRouteService (ORS) raw types */

export interface OrsRouteRaw {
  summary?: {
    distance?: number; // meters
    duration?: number; // seconds
    [key: string]: any;
  };
  geometry?: unknown; // polyline or geojson (depending on request)
  segments?: any[];
  [key: string]: any;
}

export interface OrsDirectionsResponseRaw {
  routes?: OrsRouteRaw[];
  [key: string]: any;
}

/* Consumer-facing DTOs */

/**
 * A single search result normalized for consumers.
 * - `latitude` / `longitude` are numbers (not strings).
 * - `raw` contains the original provider feature (Photon).
 */
export interface SearchLocationResultDto {
  id?: string; // optional id if available from provider
  name?: string;
  description?: string; // a short human-friendly description (if available)
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  countrycode?: string;
}

/**
 * Normalized reverse geocoding result returned by `reverseGeocode`.
 * `address` exposes commonly useful address parts while `raw` contains
 * the complete provider response for advanced use.
 */
export interface ReverseGeocodeDto {
  displayName: string;
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  postcode?: string;
  countryCode?: string;
  houseNumber?: string;
}

/**
 * Normalized distance/route result returned by `calculateDistance`.
 * - `distanceMeters` and `distanceKm` are derived from provider data.
 * - `durationSeconds` is the total travel time in seconds.
 * - `durationHuman` is a human readable approximation (e.g. "1 hour 5 minutes").
 * - `geometry` is the provider route geometry if requested (polyline / geojson).
 */
export interface DistanceResultDto {
  mode: 'driving-car' | 'cycling-regular' | 'foot-walking'; // allowed travel modes
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationHuman: string;
}

/* Utility DTOs / helpers */

/**
 * Simple envelope used when returning an error-like payload or failure
 * from a provider. Not necessarily used by LocationService, but included
 * for completeness and future extension.
 */
export interface ProviderErrorDto {
  provider: string;
  code?: number | string;
  message: string;
  details?: any;
}

/* Example mapping helpers (typing only, not implementations)
 *
 * These signatures can be used to guide implementation in the service:
 *
 * - mapPhotonToSearchResult(feature: PhotonFeatureRaw): SearchLocationResultDto
 * - mapNominatimToReverseDto(raw: NominatimReverseRaw): ReverseGeocodeDto
 * - mapOrsToDistanceDto(raw: OrsDirectionsResponseRaw, mode: string): DistanceResultDto
 *
 * Implementations of those mappers belong in the service or a mapping module.
 */
