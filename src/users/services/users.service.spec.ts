import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../user.entity';
import { OtpService } from '../../otp/services/otp.service';
import { UserDetailsService } from './user-details.service';
import { RiderService } from './rider.service';
import { Role } from '../../auth/roles.enum';
import { BadRequestException } from '@nestjs/common';
import { UserRegDto } from '../../auth/models/user-reg.dto';
import { OtpType } from '../../otp/OtpTypes';

describe('UsersService - Registration Flow', () => {
  let service: UsersService;
  let otpService: OtpService;

  const mockUserRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
  };

  const mockOtpService = {
    createOtp: jest.fn(),
    consumeOtp: jest.fn(),
    clearOtp: jest.fn(),
  };

  const mockUserDetailsService = {
    findByEmailAndMobile: jest.fn(),
  };

  const mockRiderService = {
    initRiderInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: UserDetailsService,
          useValue: mockUserDetailsService,
        },
        {
          provide: RiderService,
          useValue: mockRiderService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    otpService = module.get<OtpService>(OtpService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Registration Flow', () => {
    const mobile = '+1234567890';
    const testOtp = '1234';

    const mockUserRegDto: UserRegDto = {
      firstName: 'John',
      lastName: 'Doe',
      mobile: mobile,
      email: 'john@example.com',
      password: 'password123',
      countryCode: '+1',
      otp: testOtp,
      role: Role.User,
      profilePic: 'https://example.com/profile.jpg',
      usersAddress: {
        name: 'Home',
        lat: 123.456,
        lon: 789.012,
      },
    };

    it('should complete the full registration flow successfully', async () => {
      // Step 1: Create OTP
      await otpService.createOtp({
        reference: mobile,
        otpType: OtpType.MOBILE,
      });
      expect(mockOtpService.createOtp).toHaveBeenCalledWith({
        reference: mobile,
        otpType: OtpType.MOBILE,
      });

      // Step 2: Consume OTP
      await otpService.consumeOtp({
        reference: mobile,
        code: testOtp,
        otpType: OtpType.MOBILE,
      });
      expect(mockOtpService.consumeOtp).toHaveBeenCalledWith({
        reference: mobile,
        code: testOtp,
        otpType: OtpType.MOBILE,
      });

      // Step 3: Register User
      mockUserDetailsService.findByEmailAndMobile.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({ ...mockUserRegDto, id: '1' });

      const result = await service.register(mockUserRegDto, Role.User);

      expect(mockUserDetailsService.findByEmailAndMobile).toHaveBeenCalledWith(
        mockUserRegDto.email,
        mockUserRegDto.mobile,
      );
      expect(mockOtpService.clearOtp).toHaveBeenCalledWith(
        mockUserRegDto.mobile,
        mockUserRegDto.otp,
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', '1');
    });

    it('should fail registration if user already exists', async () => {
      mockUserDetailsService.findByEmailAndMobile.mockResolvedValue({
        id: '1',
      });

      await expect(service.register(mockUserRegDto, Role.User)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should fail registration if OTP is invalid', async () => {
      mockUserDetailsService.findByEmailAndMobile.mockResolvedValue(null);
      mockOtpService.clearOtp.mockRejectedValue(
        new BadRequestException('invalid otp'),
      );

      await expect(service.register(mockUserRegDto, Role.User)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should initialize rider info if registering as rider', async () => {
      const riderRegDto = { ...mockUserRegDto, role: Role.RIDER };
      mockUserDetailsService.findByEmailAndMobile.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({ ...riderRegDto, id: '1' });

      await service.register(riderRegDto, Role.RIDER);

      expect(mockRiderService.initRiderInfo).toHaveBeenCalledWith('1');
    });
  });
});
