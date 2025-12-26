import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * User Login
   * POST /auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    const result = await this.authService.login(body.email, body.password);

    // Set cookies
    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  /**
   * User Register
   * POST /auth/register
   */
  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiResponse({
    status: 201,
    description: 'User registered successfully and logged in',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  })
  async register(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);

    // Set cookies
    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Registration successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  /**
   * User Logout
   * POST /auth/logout
   */
  @Post('logout')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
  })
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear cookies
    response.clearCookie(ACCESS_TOKEN_COOKIE);
    response.clearCookie(REFRESH_TOKEN_COOKIE);

    return { message: 'Logout successful' };
  }

  /**
   * Refresh Access Token
   * POST /auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
  })
  async refresh(
    @Body() body: { refreshToken: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      // Verify refresh token
      const payload = this.authService['jwtService'].verify(body.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      });

      const userId = payload.sub;

      // Validate user
      const user = await this.authService.validateUserById(userId);

      // Generate new tokens
      const tokens = this.authService['generateTokens'](userId);

      // Set new cookies
      response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      return {
        message: 'Token refreshed',
        accessToken: tokens.accessToken,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
