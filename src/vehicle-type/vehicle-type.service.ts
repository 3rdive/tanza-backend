import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from './entities/vehicle-type.entity';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';

@Injectable()
export class VehicleTypeService {
  constructor(
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
  ) {}

  async initVehicleTypes() {
    const counts = await this.vehicleTypeRepository.count();
    if (counts > 0) {
      return;
    }
    const defaultTypes: Omit<
      VehicleType,
      'id' | 'deletedAt' | 'createdAt' | 'updatedAt'
    >[] = [
      {
        name: 'bike',
        description: 'Motorcycle for fast deliveries',
        baseFee: 0,
        isActive: true,
        maxWeight: 100,
      },
      {
        name: 'bicycle',
        description: 'Eco-friendly bicycle delivery',
        baseFee: 0,
        isActive: false,
        maxWeight: 50,
      },
      {
        name: 'van',
        description: 'Large vehicle for bulk deliveries',
        baseFee: 0,
        isActive: false,
        maxWeight: 200,
      },
    ];

    for (const typeData of defaultTypes) {
      const existing = await this.vehicleTypeRepository.findOne({
        where: { name: typeData.name },
      });
      if (!existing) {
        const vehicleType = this.vehicleTypeRepository.create(typeData);
        await this.vehicleTypeRepository.save(vehicleType);
      }
    }
  }

  async create(createDto: CreateVehicleTypeDto): Promise<VehicleType> {
    // Check if vehicle type with same name already exists
    const existing = await this.vehicleTypeRepository.findOne({
      where: { name: createDto.name },
      withDeleted: true,
    });

    if (existing && !existing.deletedAt) {
      throw new BadRequestException(
        `Vehicle type with name '${createDto.name}' already exists`,
      );
    }

    if (existing && existing.deletedAt) {
      throw new BadRequestException(
        `Vehicle type with name '${createDto.name}' exists but is deleted. Please restore it instead.`,
      );
    }

    const vehicleType = this.vehicleTypeRepository.create(createDto);
    return this.vehicleTypeRepository.save(vehicleType);
  }

  async findAll(includeInactive = false): Promise<VehicleType[]> {
    const query = this.vehicleTypeRepository.createQueryBuilder('vehicleType');

    if (!includeInactive) {
      query.where('vehicleType.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id },
    });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID '${id}' not found`);
    }

    return vehicleType;
  }

  async findByName(name: string): Promise<VehicleType | null> {
    return this.vehicleTypeRepository.findOne({
      where: { name },
    });
  }

  async update(
    id: string,
    updateDto: UpdateVehicleTypeDto,
  ): Promise<VehicleType> {
    const vehicleType = await this.findOne(id);

    // Check if updating name to one that already exists
    if (updateDto.name && updateDto.name !== vehicleType.name) {
      const existing = await this.vehicleTypeRepository.findOne({
        where: { name: updateDto.name },
        withDeleted: true,
      });

      if (existing) {
        throw new BadRequestException(
          `Vehicle type with name '${updateDto.name}' already exists`,
        );
      }
    }

    Object.assign(vehicleType, updateDto);
    return this.vehicleTypeRepository.save(vehicleType);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.vehicleTypeRepository.softDelete(id);
  }

  async restore(id: string): Promise<VehicleType> {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID '${id}' not found`);
    }

    if (!vehicleType.deletedAt) {
      throw new BadRequestException('Vehicle type is not deleted');
    }

    await this.vehicleTypeRepository.restore(id);
    return this.findOne(id);
  }

  async initializeDefaultVehicleTypes(): Promise<void> {
    const defaultTypes = [
      {
        name: 'bike',
        displayName: 'Bike',
        description: 'Motorcycle for fast deliveries',
        baseFee: 0,
        isActive: true,
      },
      {
        name: 'bicycle',
        displayName: 'Bicycle',
        description: 'Eco-friendly bicycle delivery',
        baseFee: 0,
        isActive: false,
      },
      {
        name: 'van',
        displayName: 'Van',
        description: 'Large vehicle for bulk deliveries',
        baseFee: 0,
        isActive: false,
      },
    ];

    for (const typeData of defaultTypes) {
      const existing = await this.findByName(typeData.name);
      if (!existing) {
        await this.create(typeData);
      }
    }
  }
}
