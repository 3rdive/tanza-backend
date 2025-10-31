import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandardResponse } from '../../commons/standard-response';
import { UserDetailsService } from '../../users/services/user-details.service';
import {
  CreateWithdrawalOptionDto,
  UpdateWithdrawalOptionDto,
} from '../dto/withdrawal-option.dto';
import { WithdrawalOptions } from '../entities/withdrawal-options.entity';

@Injectable()
export class WithdrawalOptionsService {
  constructor(
    @InjectRepository(WithdrawalOptions)
    private readonly withdrawalOptionsRepository: Repository<WithdrawalOptions>,
    private readonly userDetailsService: UserDetailsService,
  ) {}

  async create(riderId: string, dto: CreateWithdrawalOptionDto) {
    // ensure rider exists
    await this.userDetailsService.findOneOrThrow(riderId);

    // prevent adding duplicate withdrawal option for the same rider
    const duplicate = await this.withdrawalOptionsRepository.findOne({
      where: { riderId },
    });
    if (duplicate) {
      throw new BadRequestException(
        StandardResponse.fail('withdrawal option already exists'),
      );
    }

    // Determine if this should be default (first option for rider)
    const existing = await this.withdrawalOptionsRepository.count({
      where: { riderId },
    });
    const entity = this.withdrawalOptionsRepository.create({
      riderId,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      bankHoldersName: dto.bankHoldersName,
      isDefault: existing === 0,
      slug: dto.slug,
    });
    return this.withdrawalOptionsRepository.save(entity);
  }

  async findAllForRider(riderId: string) {
    return this.withdrawalOptionsRepository.find({ where: { riderId } });
  }

  async findOneForRider(riderId: string, id: string) {
    const opt = await this.withdrawalOptionsRepository.findOne({
      where: { id, riderId },
    });
    if (!opt) {
      throw new BadRequestException(
        StandardResponse.fail('withdrawal option not found'),
      );
    }
    return opt;
  }

  async update(riderId: string, id: string, dto: UpdateWithdrawalOptionDto) {
    const opt = await this.findOneForRider(riderId, id);
    Object.assign(opt, dto);
    return this.withdrawalOptionsRepository.save(opt);
  }

  async remove(riderId: string, id: string) {
    const opt = await this.findOneForRider(riderId, id);
    await this.withdrawalOptionsRepository.remove(opt);
    return { success: true };
  }

  async setDefault(riderId: string, id: string) {
    const opt = await this.findOneForRider(riderId, id);

    // unset other options for rider
    await this.withdrawalOptionsRepository.update(
      { riderId, isDefault: true },
      { isDefault: false },
    );

    // set chosen one
    opt.isDefault = true;
    return this.withdrawalOptionsRepository.save(opt);
  }
}
