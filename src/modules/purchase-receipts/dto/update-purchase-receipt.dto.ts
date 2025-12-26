import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseReceiptDto } from './create-purchase-receipt.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseReceiptDto extends PartialType(
  CreatePurchaseReceiptDto,
) {
  @IsString()
  @IsOptional()
  updated_by: string;
}
