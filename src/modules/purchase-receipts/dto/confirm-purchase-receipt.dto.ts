import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPurchaseReceiptDto {
  @IsString()
  @IsNotEmpty()
  confirmed_by: string;
}
