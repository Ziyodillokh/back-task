import { IsOptional, IsEnum, IsMongoId, IsDateString } from 'class-validator';
import { DocumentStatus } from '../schemas/purchase-receipt.schema';

export class PurchaseReceiptFilterDto {
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsMongoId()
  supplier_id?: string;

  @IsOptional()
  @IsMongoId()
  warehouse_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
