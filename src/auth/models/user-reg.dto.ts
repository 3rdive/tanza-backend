import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Length,
  ValidateNested,
} from 'class-validator';
import { UserAddress } from '../../users/user-address';
import { Role } from '../roles.enum';

export class UserRegDto {
  @IsNotEmpty({ message: 'lastName is required' })
  lastName: string;

  @IsNotEmpty({ message: 'firstName is required' })
  firstName: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserAddress)
  usersAddress: UserAddress;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'mobile is required' })
  @Length(10, 10, { message: 'Mobile must be 10 characters' })
  mobile: string; //otp reference

  @IsNotEmpty({ message: 'password is required' })
  @Length(8, 20, { message: 'password must be atleast 8 characters' })
  password: string;

  @IsNotEmpty({ message: 'otp is required' })
  @Length(4, 20, { message: 'otp must be 4 characters' })
  otp: string;

  @IsNotEmpty({ message: 'profilePic is required' })
  // @IsUrl()
  profilePic: string;

  @IsNotEmpty({ message: 'countryCode is required' })
  countryCode: string;

  @IsOptional()
  @IsEnum(Role)
  role: Role = Role.User;
}
