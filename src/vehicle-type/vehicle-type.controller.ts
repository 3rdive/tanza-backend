import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehicleTypeService } from './vehicle-type.service';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';
import { VehicleType } from './entities/vehicle-type.entity';
import { Public } from '../auth/public.anotation';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { RolesGuard } from '../auth/roles.guards';
import { BaseUrl } from 'src/constants';

@Controller(BaseUrl.VEHICLE_TYPES)
@UseGuards(RolesGuard)
export class VehicleTypeController {
  constructor(private readonly vehicleTypeService: VehicleTypeService) {}

  @Post()
  @Roles(Role.Admin)
  async create(@Body() createDto: CreateVehicleTypeDto): Promise<VehicleType> {
    return this.vehicleTypeService.create(createDto);
  }

  @Get()
  @Public()
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<VehicleType[]> {
    return this.vehicleTypeService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<VehicleType> {
    return this.vehicleTypeService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateVehicleTypeDto,
  ): Promise<VehicleType> {
    return this.vehicleTypeService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.vehicleTypeService.remove(id);
    return { message: 'Vehicle type deleted successfully' };
  }

  @Post(':id/restore')
  @Roles(Role.Admin)
  async restore(@Param('id') id: string): Promise<VehicleType> {
    return this.vehicleTypeService.restore(id);
  }
}
