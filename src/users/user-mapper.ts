import { UserRegDto } from '../auth/model/user-reg.dto';
import { UserResponseDto } from '../auth/model/user-response.dto';
import { User } from './user.entity';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  static toEntity(userRegDto: UserRegDto): User {
    const user = new User();
    user.email = userRegDto.email;
    user.mobile = userRegDto.mobile;
    user.lastName = userRegDto.lastName;
    user.firstName = userRegDto.firstName;
    user.profilePic = userRegDto.profilePic;
    user.countryCode = userRegDto.countryCode;
    return user;
  }

  static toResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((u) => this.toResponseDto(u));
  }
}
