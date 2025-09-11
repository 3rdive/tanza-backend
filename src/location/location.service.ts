// src/location/location.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { StandardResponse } from '../commons/standard-response';

type NominatimSearchItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, unknown>;
};

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

@Injectable()
export class LocationService {
  private readonly NOMINATIM_URL: string | undefined;
  private readonly ORS_URL: string | undefined;
  private readonly ORS_API_KEY: string | undefined;
  private readonly APP_USER_AGENT: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.NOMINATIM_URL = this.config.get<string>('NOMINATIM_URL');
    this.ORS_URL = this.config.get<string>('ORS_URL');
    this.ORS_API_KEY = this.config.get<string>('ORS_API_KEY');
    this.APP_USER_AGENT = this.config.get<string>('APP_USER_AGENT');
  }

  async searchLocation(query: string): Promise<NominatimSearchItem[]> {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query parameter q is required');
    }

    try {
      const response = await axios.get<NominatimSearchItem[]>(
        `${this.NOMINATIM_URL}/search`,
        {
          params: {
            q: query,
            format: 'json',
            addressdetails: 1,
            limit: 5,
            countrycodes: 'ng', // restrict to Nigeria
          },
          headers: {
            'User-Agent': this.APP_USER_AGENT, // Nominatim requires a valid UA
          },
        },
      );

      return response.data;
    } catch (err) {
      const e = err as AxiosError;
      throw new InternalServerErrorException(
        `Nominatim search failed: ${e.message}`,
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
    duration_seconds: number;
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
        duration_seconds: route.summary?.duration,
        geometry: route.geometry, // polyline for map if needed
      };
    } catch (err) {
      const e = err as AxiosError;
      const msg = e.response?.data
        ? JSON.stringify(e.response.data)
        : e.message;
      throw new InternalServerErrorException(
        StandardResponse.fail(`OpenRouteService request failed: ${msg}`),
      );
    }
  }
}
