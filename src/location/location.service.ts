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

@Injectable()
export class LocationService {
  private readonly NOMINATIM_URL: string | undefined;
  private readonly ORS_URL: string | undefined;
  private readonly ORS_API_KEY: string | undefined;
  private readonly APP_USER_AGENT: string | undefined;
  private readonly PHOTON_URL: string | undefined;
  private readonly MAP_API_KEY: string | undefined;

  constructor(private readonly config: ConfigService) {
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

      // console.log('search_result: ', response);

      const predictions = response.data?.predictions ?? [];

      // Get details for each prediction to extract full address components
      const results: SearchLocationResultDto[] = await Promise.all(
        predictions.slice(0, 5).map(async (prediction: any) => {
          try {
            const detailsResponse = await axios.get(
              'https://maps.googleapis.com/maps/api/place/details/json',
              {
                params: {
                  place_id: prediction.place_id,
                  fields: 'name,formatted_address,geometry,address_components',
                  key: this.MAP_API_KEY,
                },
              },
            );

            const place = detailsResponse.data?.result;
            const addressComponents = place?.address_components ?? [];

            // Extract address components
            const getComponent = (types: string[]) => {
              const component = addressComponents.find((c: any) =>
                types.some((type) => c.types.includes(type)),
              );
              return component?.long_name;
            };

            return {
              name: place?.name ?? prediction.description,
              description: place?.formatted_address ?? prediction.description,
              country: getComponent(['country']),
              state: getComponent(['administrative_area_level_1']),
              city:
                getComponent(['locality']) ??
                getComponent(['administrative_area_level_2']),
              street:
                getComponent(['route']) ??
                getComponent(['sublocality_level_1']),
              postcode: getComponent(['postal_code']),
              latitude: place?.geometry?.location?.lat ?? 0,
              longitude: place?.geometry?.location?.lng ?? 0,
              countrycode: addressComponents
                .find((c: any) => c.types.includes('country'))
                ?.short_name?.toLowerCase(),
            };
          } catch (detailError) {
            // If details fail, return basic info from autocomplete
            console.error('Failed to fetch place details:', detailError);
            return {
              name:
                prediction.structured_formatting?.main_text ??
                prediction.description,
              description: prediction.description,
              country: undefined,
              state: undefined,
              city: undefined,
              street: undefined,
              postcode: undefined,
              latitude: 0,
              longitude: 0,
              countrycode: undefined,
            };
          }
        }),
      );

      return results;
    } catch (err) {
      const e = err as AxiosError;
      console.error('Google Maps API error:', e.response?.data ?? e.message);
      throw new InternalServerErrorException(
        `Google Maps search failed: ${e.message}`,
      );
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeDto> {
    if (lat === undefined || lon === undefined) {
      throw new BadRequestException('lat and lon are required');
    }
    if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) {
      throw new BadRequestException('lat and lon must be numbers');
    }

    if (!this.MAP_API_KEY) {
      throw new InternalServerErrorException('MAP_API_KEY is not configured');
    }

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
