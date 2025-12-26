import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductTrackingType } from '../schemas/product.schema';

class VariantSchemaItem {
  @ApiProperty({ example: 'Color', description: 'Variant attribute name' })
  @IsString()
  attribute_name: string;

  @ApiProperty({
    example: ['Red', 'Blue', 'Green'],
    description: 'Possible values for this attribute',
  })
  @IsArray()
  @IsString({ each: true })
  values: string[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop Dell XPS', description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SKU-001', description: 'Unique SKU' })
  @IsString()
  sku: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Product barcode',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 'pcs', description: 'Unit of measure' })
  @IsString()
  unit_of_measure: string;

  @ApiProperty({
    enum: ProductTrackingType,
    example: ProductTrackingType.SIMPLE,
    description: 'Product tracking type',
  })
  @IsEnum(ProductTrackingType)
  tracking_type: ProductTrackingType;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Parent product ID (for variants)',
  })
  @IsOptional()
  parent_product_id?: string;

  @ApiPropertyOptional({
    type: [VariantSchemaItem],
    description: 'Variant schema definition',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantSchemaItem)
  variant_schema?: VariantSchemaItem[];

  @ApiPropertyOptional({
    example: false,
    description: 'Is this a variant parent product',
  })
  @IsOptional()
  @IsBoolean()
  is_variant_parent?: boolean;

  @ApiPropertyOptional({
    example: { color: 'Red', size: 'L' },
    description: 'Variant attributes (for variant products)',
  })
  @IsOptional()
  @Type(() => Object)
  variant_attributes?: Record<string, string>;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'Default sale price',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sale_price_default?: number;

  @ApiPropertyOptional({
    example: 50.0,
    description: 'Default purchase price',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_price_default?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Minimum stock level',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock_level?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Is product active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
