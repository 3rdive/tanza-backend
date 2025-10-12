import { UserOrderRole } from '../../order/entities/user-order-role.enum';

export interface UserInfo {
  name: string;
  email: string;
  phone: string;
  role: UserOrderRole;
}
