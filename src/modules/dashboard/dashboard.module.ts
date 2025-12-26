import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import {
  PurchaseReceipt,
  PurchaseReceiptSchema,
} from '../purchase-receipts/schemas/purchase-receipt.schema';
import {
  Inventory,
  InventorySchema,
} from '../inventory/schemas/inventory.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: PurchaseReceipt.name, schema: PurchaseReceiptSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
