import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsDateString,
  IsMongoId,
  ArrayMinSize,
  MinLength,
} from 'class-validator';

export class PurchaseReceiptLineDto {
  @IsMongoId()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  unit_price: number;

  @IsDateString()
  @IsOptional()
  expiration_date?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  lot_code?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, {
    message: 'Serial numbers array must contain at least 1 element if provided',
  })
  @IsOptional()
  serial_numbers?: string[];
}
