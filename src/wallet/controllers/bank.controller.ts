import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { BankService } from '../services/bank.service';
import { SearchBanksDto } from '../dto/search-banks.dto';
import { ValidateAccountDto } from '../dto/validate-account.dto';
import {
  BankDto,
  AccountValidationResponseDto,
} from '../dto/bank-response.dto';
import { BaseUrl } from '../../constants';

@Controller(`${BaseUrl.WALLET}/banks`)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get()
  searchBanks(
    @Query(new ValidationPipe({ transform: true })) searchDto: SearchBanksDto,
  ): BankDto[] {
    return this.bankService.searchBanks(searchDto.query);
  }

  @Get('validate')
  async validateAccount(
    @Query(new ValidationPipe({ transform: true }))
    validateDto: ValidateAccountDto,
  ): Promise<AccountValidationResponseDto> {
    return await this.bankService.validateAccount(
      validateDto.account_number,
      validateDto.bank_code,
    );
  }
}
