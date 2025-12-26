import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsDateString,
  ArrayMinSize,
  IsMongoId,
  IsEnum,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleDocumentStatus } from '../schemas/sale.schema';

export enum PaymentTypeEnum {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  CREDIT = 'CREDIT',
}

export class SaleLineDto {
  @ApiProperty({
    description: 'Product ID (MongoDB ObjectId)',
    example: '694ca3e5f2dabb524f963c4a',
  })
  @IsMongoId()
  @IsNotEmpty()
  product_id: string;

  @ApiProperty({
    description: 'Quantity sold',
    example: 5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: 'Unit selling price',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  unit_price: number;

  @ApiPropertyOptional({
    description: 'Serial numbers (for SERIALIZED products)',
    example: ['SN001', 'SN002'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, {
    message: 'Serial numbers array must contain at least 1 element if provided',
  })
  @IsOptional()
  serial_numbers?: string[];

  @ApiPropertyOptional({
    description: 'Lot code (for LOT_TRACKED products)',
    example: 'LOT-2025-001',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  lot_code?: string;

  @ApiPropertyOptional({
    description: 'Expiration date (for EXPIRABLE products)',
    example: '2025-12-31',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  expiration_date?: string;

  @ApiPropertyOptional({
    description: 'Expiration batch ID',
    example: 'BATCH-001',
  })
  @IsString()
  @IsOptional()
  expiration_batch_id?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    description: 'Customer ID (MongoDB ObjectId)',
    example: '694ca3e5f2dabb524f963c4a',
  })
  @IsMongoId()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({
    description: 'Warehouse ID (MongoDB ObjectId)',
    example: '694ca3e5f2dabb524f963c4a',
  })
  @IsMongoId()
  @IsNotEmpty()
  warehouse_id: string;

  @ApiProperty({
    description: 'Sale date',
    example: '2025-12-25',
    format: 'date-time',
  })
  @IsDateString()
  @IsNotEmpty()
  sale_date: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'UZS',
    default: 'UZS',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment type (CASH, CARD, TRANSFER, CHECK, CREDIT)',
    example: 'CASH',
    enum: ['CASH', 'CARD', 'TRANSFER', 'CHECK', 'CREDIT'],
  })
  @IsEnum(PaymentTypeEnum)
  @IsOptional()
  payment_type?: PaymentTypeEnum;

  @ApiPropertyOptional({
    description: 'Additional comments',
    example: 'Bulk order from corporate client',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'Sale line items (at least 1 required)',
    type: [SaleLineDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  @ArrayMinSize(1)
  lines: SaleLineDto[];

  @ApiProperty({
    description: 'User ID who created the sale',
    example: '694ca3e5f2dabb524f963c4a',
  })
  @IsMongoId()
  @IsNotEmpty()
  created_by: string;

  @ApiPropertyOptional({
    description: 'Total amount for the sale',
    example: 499.95,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_amount?: number;

  @ApiPropertyOptional({
    example: 'CONFIRMED',
    enum: ['DRAFT', 'CONFIRMED', 'SHIPPED', 'CANCELLED', 'DELIVERED'],
  })
  @IsEnum(['DRAFT', 'CONFIRMED', 'SHIPPED', 'CANCELLED', 'DELIVERED'])
  @IsOptional()
  status?: SaleDocumentStatus;
}
