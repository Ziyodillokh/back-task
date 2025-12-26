import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseReceiptsController } from './purchase-receipts.controller';
import {
  PurchaseReceipt,
  PurchaseReceiptSchema,
} from './schemas/purchase-receipt.schema';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchaseReceiptService } from './purchase-receipts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseReceipt.name, schema: PurchaseReceiptSchema },
    ]),
    ProductsModule,
    InventoryModule,
  ],
  controllers: [PurchaseReceiptsController],
  providers: [PurchaseReceiptService],
  exports: [PurchaseReceiptService],
})
export class PurchaseReceiptsModule {}
