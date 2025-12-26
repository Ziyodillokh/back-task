import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from './modules/products/products.module';
import { PurchaseReceiptsModule } from './modules/purchase-receipts/purchase-receipts.module';
import { SalesModule } from './modules/sales/sales.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_database',
    ),
    AuthModule,
    ProductsModule,
    InventoryModule,
    PurchaseReceiptsModule,
    SalesModule,
    DashboardModule,
    UsersModule,
  ],
})
export class AppModule {}
