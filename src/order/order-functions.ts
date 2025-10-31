import { BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserOrderRole } from './entities/user-order-role.enum';
import { StandardResponse } from '../commons/standard-response';

export function normalizeDateRange(
  startDate?: string,
  endDate?: string,
): { start?: Date; end?: Date } {
  const range: { start?: Date; end?: Date } = {};
  if (startDate) {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    range.start = d;
  }
  if (endDate) {
    const d = new Date(endDate);
    d.setHours(23, 59, 59, 999);
    range.end = d;
  }
  return range;
}

export function validateUserInfo(dto: CreateOrderDto): void {
  if (dto.userOrderRole === UserOrderRole.SENDER) {
    if (!dto.sender?.name || !dto.sender?.email || !dto.sender?.phone) {
      throw new BadRequestException(
        StandardResponse.fail('Sender details are missing'),
      );
    }
  } else if (dto.userOrderRole === UserOrderRole.RECIPIENT) {
    if (
      !dto.recipient?.name ||
      !dto.recipient?.email ||
      !dto.recipient?.phone
    ) {
      throw new BadRequestException(
        StandardResponse.fail('Recipient details are missing'),
      );
    }
  }
}
