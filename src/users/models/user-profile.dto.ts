import { Role } from '../../auth/roles.enum';
import { RegMode } from '../reg-mode.enum';
import { UserAddress } from '../user-address';

export class UserProfileDto {
  id: string;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  role: Role;
  profilePic: string | null;
  countryCode: string;
  registrationDate: Date;
  updatedAt: Date;
  registrationMode: RegMode;
  usersAddress?: UserAddress;
  documentStatus: string | null;
}
