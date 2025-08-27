import { Role } from '../roles.enum';

export class UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
}
