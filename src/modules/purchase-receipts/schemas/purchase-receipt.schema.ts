import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum ProductTrackingType {
  SIMPLE = 'SIMPLE',
  EXPIRABLE = 'EXPIRABLE',
  SERIALIZED = 'SERIALIZED',
  LOT_TRACKED = 'LOT_TRACKED',
  VARIANT = 'VARIANT',
}

@Schema({ _id: false })
export class TrackingInfo {
  @Prop()
  expiration_date?: Date;

  @Prop()
  lot_code?: string;

  @Prop({ type: [String] })
  serial_numbers?: string[];
}

@Schema({ _id: true })
export class PurchaseReceiptLine {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unit_price: number;

  @Prop({ required: true })
  cost: number; // Total cost for this line: quantity * unit_price

  @Prop()
  line_total: number; // Legacy, same as cost

  @Prop({ type: TrackingInfo })
  tracking_info: TrackingInfo;
}

@Schema({ timestamps: true })
export class PurchaseReceipt extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplier_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouse_id: Types.ObjectId;

  @Prop({ required: true })
  receipt_date: Date;

  @Prop({ required: true })
  currency: string;

  @Prop()
  invoice_number?: string;

  @Prop()
  comment?: string;

  @Prop({ type: [PurchaseReceiptLine], required: true })
  lines: PurchaseReceiptLine[];

  @Prop({ enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  created_by: Types.ObjectId;

  @Prop()
  created_at: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  confirmed_by?: Types.ObjectId;

  @Prop()
  confirmed_at?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updated_by?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelled_by?: Types.ObjectId;

  @Prop()
  cancelled_at?: Date;

  @Prop()
  cancellation_reason?: string;

  @Prop()
  total_amount: number;

  // Soft delete
  @Prop({ default: false })
  is_deleted?: boolean;

  @Prop()
  deleted_at?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deleted_by?: Types.ObjectId;
}

export const PurchaseReceiptSchema =
  SchemaFactory.createForClass(PurchaseReceipt);

// Indexes
PurchaseReceiptSchema.index({ status: 1, receipt_date: -1 });
PurchaseReceiptSchema.index({ supplier_id: 1 });
PurchaseReceiptSchema.index({ warehouse_id: 1 });
