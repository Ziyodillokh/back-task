import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/modules/users/schemas/user.schema';

class ReturnUser {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  last_name?: string;

  @ApiProperty({
    description: 'User email',
    example: 'john@example.com',
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'CASHIER',
  })
  @IsNotEmpty()
  @IsString()
  role: string;

  constructor(user: User & { _id?: string }) {
    this.id = user._id?.toString() || '';
    this.first_name = user.first_name;
    this.last_name = user.last_name;
    this.email = user.email;
    this.role = user.role;
  }
}

export default ReturnUser;
