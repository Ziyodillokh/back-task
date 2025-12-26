import { IsString, IsNotEmpty } from 'class-validator';

export class CancelPurchaseReceiptDto {
  @IsString()
  @IsNotEmpty()
  cancelled_by: string;

  @IsString()
  @IsNotEmpty()
  cancellation_reason: string;
}
