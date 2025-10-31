import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActiveStatus } from '../active-status.entity';

export type ActiveStatusType = 'active' | 'inactive';

export interface UpdateActiveStatusDto {
  status?: ActiveStatusType;
  latitude?: string;
  longitude?: string;
}

@Injectable()
export class ActiveStatusService {
  constructor(
    @InjectRepository(ActiveStatus)
    private readonly activeStatusRepository: Repository<ActiveStatus>,
  ) {}

  async initialize(
    userId: string,
    defaultStatus: ActiveStatusType = 'inactive',
  ): Promise<ActiveStatus> {
    let record = await this.activeStatusRepository.findOne({
      where: { userId },
    });
    if (record) return record;

    record = this.activeStatusRepository.create({
      userId,
      status: defaultStatus,
    });
    return this.activeStatusRepository.save(record);
  }

  async update(
    userId: string,
    payload: UpdateActiveStatusDto,
  ): Promise<ActiveStatus> {
    let record = await this.activeStatusRepository.findOne({
      where: { userId },
    });
    if (!record) {
      record = this.activeStatusRepository.create({
        userId,
        status: payload.status ?? 'inactive',
      });
    }

    if (payload.status) record.status = payload.status;
    if (payload.latitude !== undefined) record.latitude = payload.latitude;
    if (payload.longitude !== undefined) record.longitude = payload.longitude;

    const saved = await this.activeStatusRepository.save(record);
    return saved;
  }

  async getByUserId(userId: string): Promise<ActiveStatus | null> {
    return this.activeStatusRepository.findOne({ where: { userId } });
  }
}
