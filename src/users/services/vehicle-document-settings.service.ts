import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateVehicleDocumentSettingDto,
  UpdateVehicleDocumentSettingDto,
} from '../dto/vehicle-document-settings.dto';
import { VehicleDocumentSettings } from '../entities/vehicle-document-settings.entity';
import { VehicleType } from '../../vehicle-type/entities/vehicle-type.entity';

@Injectable()
export class VehicleDocumentSettingsService {
  constructor(
    @InjectRepository(VehicleDocumentSettings)
    private readonly settingsRepository: Repository<VehicleDocumentSettings>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
  ) {}

  async create(
    dto: CreateVehicleDocumentSettingDto,
  ): Promise<VehicleDocumentSettings> {
    const setting = this.settingsRepository.create(dto);
    return await this.settingsRepository.save(setting);
  }

  async findAll(): Promise<VehicleDocumentSettings[]> {
    return await this.settingsRepository.find({ relations: ['vehicleType'] });
  }

  async findByVehicleTypeId(
    vehicleTypeId: string,
  ): Promise<VehicleDocumentSettings[]> {
    return await this.settingsRepository.find({
      where: { vehicleTypeId },
      relations: ['vehicleType'],
    });
  }

  async findByVehicleTypeIdentifier(
    identifier: string,
  ): Promise<VehicleDocumentSettings[]> {
    let vehicleTypeId = identifier;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    if (!isUuid) {
      const vehicleType = await this.vehicleTypeRepository.findOne({
        where: { name: identifier },
      });
      if (!vehicleType) {
        throw new NotFoundException(`Vehicle type '${identifier}' not found`);
      }
      vehicleTypeId = vehicleType.id;
    }
    return this.findByVehicleTypeId(vehicleTypeId);
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

    // Get vehicle types by name
    const bike = await this.vehicleTypeRepository.findOne({
      where: { name: 'bike' },
    });
    const bicycle = await this.vehicleTypeRepository.findOne({
      where: { name: 'bicycle' },
    });
    const van = await this.vehicleTypeRepository.findOne({
      where: { name: 'van' },
    });

    if (!bike || !bicycle || !van) {
      console.warn(
        'Vehicle types not found. Skipping document settings initialization.',
      );
      return;
    }

    const defaultSettings = [
      // Bike settings
      {
        vehicleTypeId: bike.id,
        docName: 'Vehicle Photo',
        requiresExpiration: false,
        isRequired: true,
      },
      {
        vehicleTypeId: bike.id,
        docName: 'Driver License',
        requiresExpiration: true,
        isRequired: true,
      },
      {
        vehicleTypeId: bike.id,
        docName: 'Vehicle Registration',
        requiresExpiration: true,
        isRequired: true,
      },
      // Bicycle settings
      {
        vehicleTypeId: bicycle.id,
        docName: 'Vehicle Photo',
        requiresExpiration: false,
        isRequired: true,
      },
      {
        vehicleTypeId: bicycle.id,
        docName: 'ID Card',
        requiresExpiration: true,
        isRequired: true,
      },
      // Van settings
      {
        vehicleTypeId: van.id,
        docName: 'Vehicle Photo',
        requiresExpiration: false,
        isRequired: true,
      },
      {
        vehicleTypeId: van.id,
        docName: 'Driver License',
        requiresExpiration: true,
        isRequired: true,
      },
      {
        vehicleTypeId: van.id,
        docName: 'Vehicle Registration',
        requiresExpiration: true,
        isRequired: true,
      },
      {
        vehicleTypeId: van.id,
        docName: 'Insurance Certificate',
        requiresExpiration: true,
        isRequired: true,
      },
    ];

    const settings = this.settingsRepository.create(defaultSettings);
    await this.settingsRepository.save(settings);
  }
}
