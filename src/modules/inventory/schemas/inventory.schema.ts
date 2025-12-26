import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema({ _id: false })
export class SerialNumber {
  @Prop({ required: true, unique: true })
  serial_number: string;

  @Prop({ default: false })
  is_sold: boolean;

  @Prop()
  received_date: Date;

  @Prop()
  sold_date?: Date;
}

@Schema({ _id: false })
export class LotBatch {
  @Prop({ required: true })
  lot_code: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop()
  received_date: Date;
}

@Schema({ _id: true })
export class ExpirationBatch {
  @Prop()
  _id?: Types.ObjectId;

  @Prop({ required: true })
  expiration_date: Date;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop()
  received_date: Date;
}

@Schema({ timestamps: true })
export class Inventory {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouse_id: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  quantity: number;

  // For SERIALIZED products
  @Prop({ type: [SerialNumber], default: [] })
  serial_numbers: SerialNumber[];

  // For LOT_TRACKED products
  @Prop({ type: [LotBatch], default: [] })
  lot_batches: LotBatch[];

  // For EXPIRABLE products
  @Prop({ type: [ExpirationBatch], default: [] })
  expiration_batches: ExpirationBatch[];
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);

// Indexes
InventorySchema.index({ product_id: 1, warehouse_id: 1 }, { unique: true });
InventorySchema.index({ 'serial_numbers.serial_number': 1 });
InventorySchema.index({ 'lot_batches.lot_code': 1 });
InventorySchema.index({ 'expiration_batches.expiration_date': 1 });
