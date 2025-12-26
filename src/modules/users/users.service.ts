// users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) {
      throw new ConflictException({
        error_code: 'EMAIL_EXISTS',
        message: 'Email already exists',
        field: 'email',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      ...dto,
      password: hashedPassword,
    });

    return this.sanitize(user);
  }

  async findAll() {
    const users = await this.userModel.find();
    return users.map(this.sanitize);
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException({
        error_code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException({
        error_code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    await user.save();

    return this.sanitize(user);
  }

  async deactivate(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException({
        error_code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    user.is_active = false;
    await user.save();

    return { message: 'User deactivated' };
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email, is_deleted: { $ne: true } });
  }

  private sanitize(user: UserDocument) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
  }
}
