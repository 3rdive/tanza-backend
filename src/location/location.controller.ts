// src/location/location.controller.ts
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.anotation';
import { StandardResponse } from '../commons/standard-response';
import { BaseUrl } from '../constants';
import { LocationService } from './location.service';

@Controller(BaseUrl.LOCATION)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get('search')
  async search(@Query('q') query: string) {
    return this.locationService.searchLocation(query);
  }

  @Public()
  @Get('place-details')
  async getPlaceDetails(@Query('placeId') placeId: string) {
    return this.locationService.getPlaceDetails(placeId);
  }

  @Public()
  @Get('reverse')
  async reverse(@Query('lat') lat: number, @Query('lon') lon: number) {
    return this.locationService.reverseGeocode(lat, lon);
  }

  @Get('distance')
  async distance(
    @Query('startLat') startLat: number,
    @Query('startLon') startLon: number,
    @Query('endLat') endLat: number,
    @Query('endLon') endLon: number,
  ) {
    if (!startLat || !startLon || !endLat || !endLon) {
      throw new BadRequestException(
        StandardResponse.fail(
          'startLat, startLon, endLat, and endLon are required',
        ),
      );
    }
    return this.locationService.calculateDistance(
      [startLon, startLat], // ORS expects [lon, lat]
      [endLon, endLat],
    );
  }
}
