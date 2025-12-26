import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import ReturnUser from './return-user.dto';

class JwtPayloadDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  sub: string;

  constructor(user: ReturnUser) {
    this.sub = user.id;
  }
}

export default JwtPayloadDto;
