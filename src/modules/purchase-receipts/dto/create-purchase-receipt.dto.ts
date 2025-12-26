import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseReceiptLineDto } from './purchase-receipt-line.dto';

export class CreatePurchaseReceiptDto {
  @ApiProperty({
    description: "Sotuvchi/Ta'minotchi ID (MongoDB)",
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  supplier_id: string;

  @ApiProperty({
    description: 'Omborxona ID (MongoDB)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  @IsNotEmpty()
  warehouse_id: string;

  @ApiProperty({
    description: 'Xaridni qabul qilish sanasi',
    example: '2025-12-24',
  })
  @IsDateString()
  @IsNotEmpty()
  receipt_date: string;

  @ApiProperty({
    description: 'Pul birligi',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Faktura raqami (ixtiyoriy)',
    example: 'INV-2025-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  invoice_number?: string;

  @ApiProperty({
    description: 'Izoh (ixtiyoriy)',
    example: 'Qush xarid',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'Xarid qatorlari (minimal 1 ta)',
    type: [PurchaseReceiptLineDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  @ArrayMinSize(1)
  lines: PurchaseReceiptLineDto[];

  @ApiProperty({
    description: 'Yaratuvchining ID si (MongoDB)',
    example: '507f1f77bcf86cd799439013',
  })
  @IsMongoId()
  @IsNotEmpty()
  created_by: string;
}
