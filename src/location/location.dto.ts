export type NominatimReverseResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, unknown>;
};

export type OrsRoute = {
  summary: { distance: number; duration: number };
  geometry?: unknown;
};

export type OrsDirectionsResponse = {
  routes: OrsRoute[];
};
export interface PhotonFeature {
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    name?: string;
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    postcode?: string;
    [key: string]: any;
  };
}

export interface PhotonResponse {
  features: PhotonFeature[];
}
