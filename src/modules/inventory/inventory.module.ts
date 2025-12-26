import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { Inventory, InventorySchema } from './schemas/inventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
