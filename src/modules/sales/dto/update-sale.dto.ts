import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSaleDto } from './create-sale.dto';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSaleDto extends PartialType(
  OmitType(CreateSaleDto, ['created_by'] as const),
) {
  @IsString()
  @IsNotEmpty()
  updated_by: string;
}

export class ConfirmSaleDto {
  @IsString()
  @IsNotEmpty()
  confirmed_by: string;
}

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty()
  cancelled_by: string;

  @IsString()
  @IsNotEmpty()
  cancellation_reason: string;
}
