import { UserRegDto } from '../auth/models/user-reg.dto';
import { UserResponseDto } from '../auth/models/user-response.dto';
import { UserProfileDto } from './models/user-profile.dto';
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
    user.password = userRegDto.password;
    user.usersAddress = userRegDto.usersAddress;
    return user;
  }

  static toResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((u) => this.toResponseDto(u));
  }

  static toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePic: user.profilePic ?? null,
      countryCode: user.countryCode,
      registrationDate: user.registrationDate,
      updatedAt: user.updatedAt,
      registrationMode: user.registrationMode,
      usersAddress: user.usersAddress,
    };
  }
}
