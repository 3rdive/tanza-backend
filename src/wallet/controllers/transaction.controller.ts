import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { JwtPayload } from '../../auth/models/jwt-payload.type';
import { BaseUrl } from '../../constants';
import { CurrentUser } from '../../users/user.decorator';
import { PaginationDto } from '../../commons/pagination.dto';
import { TransactionService } from '../services/transaction.service';

@Controller(BaseUrl.TRANSACTION)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async fetchTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto,
  ) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.transactionService.fetchTransactions(user.sub, paginationDto);
  }

  @Get(':idOrReference')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('idOrReference') idOrReference: string,
  ) {
    if (!user) {
      throw new BadRequestException('Unauthorized');
    }
    return this.transactionService.findById(user.sub, idOrReference);
  }
}
