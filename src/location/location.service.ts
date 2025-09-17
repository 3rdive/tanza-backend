// src/location/location.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { StandardResponse } from '../commons/standard-response';

type NominatimReverseResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, unknown>;
};

type OrsRoute = {
  summary: { distance: number; duration: number };
  geometry?: unknown;
};

type OrsDirectionsResponse = {
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

interface PhotonResponse {
  features: PhotonFeature[];
}

@Injectable()
export class LocationService {
  private readonly NOMINATIM_URL: string | undefined;
  private readonly ORS_URL: string | undefined;
  private readonly ORS_API_KEY: string | undefined;
  private readonly APP_USER_AGENT: string | undefined;
  private readonly PHOTON_URL: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.NOMINATIM_URL = this.config.get<string>('NOMINATIM_URL');
    this.ORS_URL = this.config.get<string>('ORS_URL');
    this.ORS_API_KEY = this.config.get<string>('ORS_API_KEY');
    this.APP_USER_AGENT = this.config.get<string>('APP_USER_AGENT');
    this.PHOTON_URL = this.config.get<string>('PHOTON_URL');
  }

  async searchLocation(query: string): Promise<PhotonFeature[]> {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query parameter q is required');
    }

    try {
      const response = await axios.get<PhotonResponse>(this.PHOTON_URL!, {
        params: {
          q: query,
          limit: 5,
          lang: 'en',
        },
      });

      return response.data.features;
    } catch (err) {
      const e = err as AxiosError;
      throw new InternalServerErrorException(
        `Photon search failed: ${e.message}`,
      );
    }
  }

  async reverseGeocode(
    lat: number,
    lon: number,
  ): Promise<NominatimReverseResult> {
    if (lat === undefined || lon === undefined) {
      throw new BadRequestException('lat and lon are required');
    }
    if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) {
      throw new BadRequestException('lat and lon must be numbers');
    }

    try {
      const response = await axios.get<NominatimReverseResult>(
        `${this.NOMINATIM_URL}/reverse`,
        {
          params: {
            lat,
            lon,
            format: 'json',
          },
          headers: {
            'User-Agent': this.APP_USER_AGENT,
          },
        },
      );

      return response.data;
    } catch (err) {
      const e = err as AxiosError;
      throw new InternalServerErrorException(
        `Nominatim reverse failed: ${e.message}`,
      );
    }
  }

  async calculateDistance(
    start: [number, number], // [lon, lat]
    end: [number, number], // [lon, lat]
    mode: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car',
  ): Promise<{
    distance_meters: number;
    distance_in_km: number;
    duration_seconds: number;
    duration_in_words: string;
    geometry?: unknown;
  }> {
    if (!this.ORS_API_KEY) {
      throw new InternalServerErrorException('ORS_API_KEY is not configured');
    }

    try {
      const response = await axios.post<OrsDirectionsResponse>(
        `${this.ORS_URL}/v2/directions/${mode}`,
        {
          coordinates: [start, end],
        },
        {
          headers: {
            Authorization: this.ORS_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );

      const route: OrsRoute | undefined = response.data?.routes?.[0];
      if (!route) {
        throw new BadRequestException(
          StandardResponse.fail('No route returned from OpenRouteService'),
        );
      }
      return {
        distance_meters: route.summary?.distance,
        distance_in_km: route.summary?.distance / 1000,
        duration_seconds: route.summary?.duration,
        duration_in_words: this.secondsToWords(route.summary?.duration),
        geometry: route.geometry, // polyline for map if needed
      };
    } catch (err) {
      const e = err as AxiosError;
      const msg = e.response?.data
        ? JSON.stringify(e.response.data)
        : e.message;
      console.error('OpenRouteService error:', msg);
      throw new BadRequestException(
        StandardResponse.fail(
          'Error Calculation Distance, please try another location.',
        ),
      );
    }
  }

  secondsToWords(seconds: number): string {
    if (seconds === 0) return '0 seconds';

    const units = [
      { label: 'day', value: 86400 },
      { label: 'hour', value: 3600 },
      { label: 'minute', value: 60 },
      { label: 'second', value: 1 },
    ];

    const parts: string[] = [];

    for (const unit of units) {
      const amount = Math.floor(seconds / unit.value);
      if (amount > 0) {
        parts.push(`${amount} ${unit.label}${amount > 1 ? 's' : ''}`);
        seconds %= unit.value;
      }
    }

    return parts.join(' ');
  }
}
