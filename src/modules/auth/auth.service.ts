import * as bcrypt from 'bcrypt';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login user with email and password
   */
  async login(email: string, password: string) {
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        error_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException({
        error_code: 'USER_INACTIVE',
        message: 'User account is inactive',
      });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        error_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString());

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Register new user
   */
  async register(dto: CreateUserDto) {
    // Create user (will check for duplicates)
    const user = await this.usersService.create(dto);

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString());

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Logout user (client-side: clear cookies)
   */
  async logout() {
    return { message: 'Logged out successfully' };
  }

  /**
   * Validate user by ID (for JWT strategy)
   */
  async validateUserById(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedException({
        error_code: 'INVALID_USER',
        message: 'User not found or inactive',
      });
    }
    return this.sanitizeUser(user);
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // 15 minutes
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // 7 days
      secret: this.configService.get(
        'JWT_REFRESH_SECRET',
        'refresh_secret_key',
      ),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Remove password from user object
   */
  private sanitizeUser(user: any) {
    const obj = user.toObject ? user.toObject() : user;
    delete obj.password;
    return obj;
  }
}
