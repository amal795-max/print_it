import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Raw, Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto.js';
import { UserRole } from './roles/user-role.enum.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Creates a user account with a bcrypt-hashed password.
   */
  async create(dto: RegisterDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existing) {
      throw new ConflictException('Email or phone is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: UserRole.CUSTOMER,
      isVerified: false,
    });

    const saved = await this.userRepository.save(user);
    this.logger.log(`Created user: ${saved.id}`);
    return saved;
  }

  /**
   * Stores a hashed OTP and its expiry for the given user.
   */
  async saveOtp(
    userId: string,
    otpHash: string,
    otpExpiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, { otp: otpHash, otpExpiresAt });
  }

  /**
   * Loads a user by email including the OTP hash.
   */
  async findByEmailWithOtp(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.otp')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Loads a user by email without secret columns.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Consumes the OTP only if it is still current and unexpired.
   */
  async consumeOtp(userId: string, expectedOtpHash: string): Promise<boolean> {
    const result = await this.userRepository.update(
      {
        id: userId,
        otp: expectedOtpHash,
        otpExpiresAt: Raw((column) => `${column} > clock_timestamp()`),
        isVerified: false,
      },
      { isVerified: true, otp: null, otpExpiresAt: null },
    );

    return result.affected === 1;
  }

  /**
   * Loads a user by email including the password hash for credential checks.
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Loads a user by id without the password hash.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Loads a user by id or throws NotFoundException.
   */
  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Returns all users (password hash excluded by entity select:false).
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Compares a plain password with the stored bcrypt hash.
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
