// src/location/location.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { StandardResponse } from '../commons/standard-response';
import {
  OrsDirectionsResponseRaw,
  OrsRouteRaw,
  SearchLocationResultDto,
  ReverseGeocodeDto,
  DistanceResultDto,
} from './location.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class LocationService {
  private readonly NOMINATIM_URL: string | undefined;
  private readonly ORS_URL: string | undefined;
  private readonly ORS_API_KEY: string | undefined;
  private readonly APP_USER_AGENT: string | undefined;
  private readonly PHOTON_URL: string | undefined;
  private readonly MAP_API_KEY: string | undefined;

  // Cache TTL constants (in seconds)
  private readonly CACHE_TTL = {
    LOCATION_SEARCH: 7 * 24 * 60 * 60, // 7 days - location searches are relatively stable
    REVERSE_GEOCODE: 30 * 24 * 60 * 60, // 30 days - reverse geocoding rarely changes
    DISTANCE: 7 * 24 * 60 * 60, // 7 days - distance calculations are stable
  };

  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.NOMINATIM_URL = this.config.get<string>('NOMINATIM_URL');
    this.ORS_URL = this.config.get<string>('ORS_URL');
    this.ORS_API_KEY = this.config.get<string>('ORS_API_KEY');
    this.APP_USER_AGENT = this.config.get<string>('APP_USER_AGENT');
    this.PHOTON_URL = this.config.get<string>('PHOTON_URL');
    this.MAP_API_KEY = this.config.get<string>('MAP_API_KEY');
  }

  async searchLocation(query: string): Promise<SearchLocationResultDto[]> {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query parameter q is required');
    }

    if (!this.MAP_API_KEY) {
      throw new InternalServerErrorException('MAP_API_KEY is not configured');
    }

    // Generate cache key for this search query
    const cacheKey = this.cacheService.generateKey(
      'location',
      'search',
      query.toLowerCase().trim(),
    );

    // Use cache wrapper to handle get/set automatically
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        return await this.performLocationSearch(query);
      },
      { ttl: this.CACHE_TTL.LOCATION_SEARCH },
    );
  }

  /**
   * Internal method to perform the actual location search
   */
  private async performLocationSearch(
    query: string,
  ): Promise<SearchLocationResultDto[]> {
    try {
      // Use Google Maps Places API Autocomplete
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        {
          params: {
            input: query,
            key: this.MAP_API_KEY,
            language: 'en',
          },
        },
      );

      const predictions = response.data?.predictions ?? [];

      // Return predictions directly without fetching full place details
      const results: SearchLocationResultDto[] = predictions
        .slice(0, 5)
        .map((prediction: any) => ({
          id: prediction.place_id,
          name:
            prediction.structured_formatting?.main_text ??
            prediction.description,
          description: prediction.description,
          // Predictions don't include detailed location info or coordinates
          // Use the getPlaceDetails method to fetch full details
          country: undefined,
          state: undefined,
          city: undefined,
          street: undefined,
          postcode: undefined,
          latitude: 0,
          longitude: 0,
          countrycode: undefined,
        }));

      return results;
    } catch (err) {
      const e = err as AxiosError;
      console.error('Google Maps API error:', e.response?.data ?? e.message);
      throw new InternalServerErrorException(
        `Google Maps search failed: ${e.message}`,
      );
    }
  }

  async getPlaceDetails(placeId: string): Promise<SearchLocationResultDto> {
    if (!placeId || !placeId.trim()) {
      throw new BadRequestException('placeId parameter is required');
    }

    if (!this.MAP_API_KEY) {
      throw new InternalServerErrorException('MAP_API_KEY is not configured');
    }

    // Cache place details
    const cacheKey = this.cacheService.generateKey(
      'location',
      'place-details',
      placeId.trim(),
    );

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        return await this.performPlaceDetailsLookup(placeId);
      },
      { ttl: this.CACHE_TTL.LOCATION_SEARCH },
    );
  }

  /**
   * Internal method to fetch place details from Google Maps
   */
  private async performPlaceDetailsLookup(
    placeId: string,
  ): Promise<SearchLocationResultDto> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: placeId,
            fields: 'name,formatted_address,geometry,address_components',
            key: this.MAP_API_KEY,
          },
        },
      );

      const place = response.data?.result;
      if (!place) {
        throw new BadRequestException('No place found for the given place_id');
      }

      const addressComponents = place?.address_components ?? [];

      // Extract address components
      const getComponent = (types: string[]) => {
        const component = addressComponents.find((c: any) =>
          types.some((type) => c.types.includes(type)),
        );
        return component?.long_name;
      };

      return {
        id: placeId,
        name: place?.name ?? place?.formatted_address,
        description: place?.formatted_address,
        country: getComponent(['country']),
        state: getComponent(['administrative_area_level_1']),
        city:
          getComponent(['locality']) ??
          getComponent(['administrative_area_level_2']),
        street:
          getComponent(['route']) ?? getComponent(['sublocality_level_1']),
        postcode: getComponent(['postal_code']),
        latitude: place?.geometry?.location?.lat ?? 0,
        longitude: place?.geometry?.location?.lng ?? 0,
        countrycode: addressComponents
          .find((c: any) => c.types.includes('country'))
          ?.short_name?.toLowerCase(),
      };
    } catch (err) {
      const e = err as AxiosError;
      console.error(
        'Google Maps Place Details API error:',
        e.response?.data ?? e.message,
      );
      throw new InternalServerErrorException(
        `Failed to fetch place details: ${e.message}`,
      );
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeDto> {
    if (lat === undefined || lon === undefined) {
      throw new BadRequestException('lat and lon are required');
    }

    const latNum = Number(lat);
    const lonNum = Number(lon);

    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      throw new BadRequestException('lat and lon must be numbers');
    }

    if (!this.MAP_API_KEY) {
      throw new InternalServerErrorException('MAP_API_KEY is not configured');
    }

    // Generate cache key with hashed coordinates (reduces precision for better cache hits)
    const coordsHash = this.cacheService.hashCoordinates(latNum, lonNum, 4);
    const cacheKey = this.cacheService.generateKey(
      'location',
      'reverse',
      coordsHash,
    );

    // Use cache wrapper to handle get/set automatically
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        return await this.performReverseGeocode(latNum, lonNum);
      },
      { ttl: this.CACHE_TTL.REVERSE_GEOCODE },
    );
  }

  /**
   * Internal method to perform the actual reverse geocoding
   */
  private async performReverseGeocode(
    lat: number,
    lon: number,
  ): Promise<ReverseGeocodeDto> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: `${lat},${lon}`,
            key: this.MAP_API_KEY,
            language: 'en',
          },
        },
      );

      const result = response.data?.results?.[0];
      if (!result) {
        throw new BadRequestException('No results found for these coordinates');
      }

      const addressComponents = result?.address_components ?? [];

      // Extract address components
      const getComponent = (types: string[]) => {
        const component = addressComponents.find((c: any) =>
          types.some((type) => c.types.includes(type)),
        );
        return component?.long_name;
      };

      const getShortComponent = (types: string[]) => {
        const component = addressComponents.find((c: any) =>
          types.some((type) => c.types.includes(type)),
        );
        return component?.short_name;
      };

      return {
        displayName: result?.formatted_address ?? '',
        country: getComponent(['country']),
        state: getComponent(['administrative_area_level_1']),
        city:
          getComponent(['locality']) ??
          getComponent(['administrative_area_level_2']),
        street:
          getComponent(['route']) ?? getComponent(['sublocality_level_1']),
        postcode: getComponent(['postal_code']),
        countryCode: getShortComponent(['country'])?.toLowerCase(),
        houseNumber: getComponent(['street_number']),
      };
    } catch (err) {
      const e = err as AxiosError;
      console.error(
        'Google Maps Geocoding API error:',
        e.response?.data ?? e.message,
      );
      throw new InternalServerErrorException(
        `Google Maps reverse geocoding failed: ${e.message}`,
      );
    }
  }

  async calculateDistance(
    start: [number, number], // [lon, lat]
    end: [number, number], // [lon, lat]
    mode:
      | 'driving-car'
      | 'cycling-regular'
      | 'foot-walking' = 'cycling-regular',
  ): Promise<DistanceResultDto> {
    if (!this.ORS_API_KEY) {
      throw new InternalServerErrorException('ORS_API_KEY is not configured');
    }

    const startLon = Number(start[0]);
    const startLat = Number(start[1]);
    const endLon = Number(end[0]);
    const endLat = Number(end[1]);

    if (isNaN(startLon) || isNaN(startLat) || isNaN(endLon) || isNaN(endLat)) {
      throw new BadRequestException('Coordinates must be valid numbers');
    }

    // Generate cache key with hashed coordinates for better cache hits
    const startHash = this.cacheService.hashCoordinates(startLat, startLon, 4);
    const endHash = this.cacheService.hashCoordinates(endLat, endLon, 4);
    const cacheKey = this.cacheService.generateKey(
      'location',
      'distance',
      mode,
      startHash,
      endHash,
    );

    // Use cache wrapper to handle get/set automatically
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        return await this.performDistanceCalculation(
          [startLon, startLat],
          [endLon, endLat],
          mode,
        );
      },
      { ttl: this.CACHE_TTL.DISTANCE },
    );
  }

  /**
   * Internal method to perform the actual distance calculation
   */
  private async performDistanceCalculation(
    start: [number, number],
    end: [number, number],
    mode:
      | 'driving-car'
      | 'cycling-regular'
      | 'foot-walking' = 'cycling-regular',
  ): Promise<DistanceResultDto> {
    try {
      const response = await axios.post<OrsDirectionsResponseRaw>(
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

      const route: OrsRouteRaw | undefined = response.data?.routes?.[0];
      if (!route) {
        throw new BadRequestException(
          StandardResponse.fail('No route returned from OpenRouteService'),
        );
      }

      const distance = route.summary?.distance ?? 0;
      const duration = route.summary?.duration ?? 0;

      return {
        mode,
        distanceMeters: distance,
        distanceKm: distance / 1000,
        durationSeconds: duration,
        durationHuman: this.secondsToWords(duration),
      };
    } catch (err) {
      const e = err as AxiosError<any>;
      // Log the detailed provider error for observability
      const raw = e.response?.data ?? e.message;
      console.error(
        'OpenRouteService error:',
        typeof raw === 'string' ? raw : JSON.stringify(raw),
      );

      // Map known ORS error codes to a friendly message
      const orsCode: number | undefined = e?.response?.data?.error?.code;
      const friendlyMessage =
        orsCode === 2010
          ? 'No nearby road found for one of the locations. Please select a location closer to a road and try again.'
          : 'We could not calculate a route for those locations. Please try a nearby point and try again.';

      throw new BadRequestException(StandardResponse.fail(friendlyMessage));
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
