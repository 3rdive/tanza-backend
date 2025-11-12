import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from '../../order/entities/vehicle-type.enum';
import {
  CreateVehicleDocumentSettingDto,
  UpdateVehicleDocumentSettingDto,
} from '../dto/vehicle-document-settings.dto';
import { VehicleDocumentSettings } from '../entities/vehicle-document-settings.entity';

@Injectable()
export class VehicleDocumentSettingsService {
  constructor(
    @InjectRepository(VehicleDocumentSettings)
    private readonly settingsRepository: Repository<VehicleDocumentSettings>,
  ) {}

  async create(
    dto: CreateVehicleDocumentSettingDto,
  ): Promise<VehicleDocumentSettings> {
    const setting = this.settingsRepository.create(dto);
    return await this.settingsRepository.save(setting);
  }

  async findAll(): Promise<VehicleDocumentSettings[]> {
    return await this.settingsRepository.find();
  }

  async findByVehicleType(
    vehicleType: VehicleType,
  ): Promise<VehicleDocumentSettings[]> {
    return await this.settingsRepository.find({
      where: { vehicleType },
    });
  }

  async findOne(id: string): Promise<VehicleDocumentSettings> {
    const setting = await this.settingsRepository.findOne({ where: { id } });
    if (!setting) {
      throw new NotFoundException('Document setting not found');
    }
    return setting;
  }

  async update(
    id: string,
    dto: UpdateVehicleDocumentSettingDto,
  ): Promise<VehicleDocumentSettings> {
    const setting = await this.findOne(id);
    Object.assign(setting, dto);
    return await this.settingsRepository.save(setting);
  }

  async remove(id: string): Promise<void> {
    const setting = await this.findOne(id);
    await this.settingsRepository.remove(setting);
  }

  async initializeDefaultSettings(): Promise<void> {
    const existingSettings = await this.settingsRepository.count();

    if (existingSettings > 0) {
      return; // Settings already initialized
    }

    const defaultSettings = [
      // Bike settings
      {
        vehicleType: VehicleType.BIKE,
        docName: 'Vehicle Photo',
        requiresExpiration: false,
        isRequired: true,
      },
      {
        vehicleType: VehicleType.BIKE,
        docName: 'Driver License',
        requiresExpiration: true,
        isRequired: true,
      },
      {
        vehicleType: VehicleType.BIKE,
        docName: 'Vehicle Registration',
        requiresExpiration: true,
        isRequired: true,
      },
      // Bicycle settings
      {
        vehicleType: VehicleType.BICYCLE,
        docName: 'Vehicle Photo',
        requiresExpiration: false,
        isRequired: true,
      },
      {
        vehicleType: VehicleType.BICYCLE,
        docName: 'ID Card',
        requiresExpiration: true,
        isRequired: true,
      },
      // Van settings
      {
        vehicleType: VehicleType.VAN,
        docName: 'Vehicle Photo',
        requiresExpiration: false,
        isRequired: true,
      },
      {
        vehicleType: VehicleType.VAN,
        docName: 'Driver License',
        requiresExpiration: true,
        isRequired: true,
      },
      {
        vehicleType: VehicleType.VAN,
        docName: 'Vehicle Registration',
        requiresExpiration: true,
        isRequired: true,
      },
      {
        vehicleType: VehicleType.VAN,
        docName: 'Insurance Certificate',
        requiresExpiration: true,
        isRequired: true,
      },
    ];

    const settings = this.settingsRepository.create(defaultSettings);
    await this.settingsRepository.save(settings);
  }
}
