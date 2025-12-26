import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument } from 'mongoose';

export type SaleDocument = HydratedDocument<Sale>;

export enum SaleDocumentStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentType {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  CREDIT = 'CREDIT',
}

@Schema({ _id: false })
export class SaleLine {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product_id: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unit_price: number;

  @Prop({ required: true, min: 0 })
  line_total: number;

  @Prop({ type: [String], default: [] })
  serial_numbers?: string[];

  @Prop()
  lot_code?: string;

  @Prop()
  expiration_date?: Date;
}

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true, unique: true })
  sale_number: string;

  @Prop({ required: true, type: Date })
  sale_date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouse_id: Types.ObjectId;

  @Prop({
    required: true,
    enum: SaleDocumentStatus,
    default: SaleDocumentStatus.DRAFT,
  })
  status: SaleDocumentStatus;

  @Prop({ type: [SaleLine], required: true, default: [] })
  lines: SaleLine[];

  @Prop({ required: true, min: 0 })
  total_amount: number;

  @Prop({ required: true, default: 'UZS' })
  currency: string;

  @Prop({ enum: PaymentType })
  payment_type?: PaymentType;

  @Prop()
  comment?: string;

  @Prop()
  created_by?: Types.ObjectId;

  @Prop()
  updated_by?: Types.ObjectId;

  @Prop()
  confirmed_by?: Types.ObjectId;

  @Prop()
  confirmed_at?: Date;

  @Prop()
  cancelled_by?: Types.ObjectId;

  @Prop()
  cancelled_at?: Date;

  @Prop()
  cancellation_reason?: string;

  @Prop()
  shipped_by?: Types.ObjectId;

  @Prop()
  shipped_at?: Date;

  @Prop()
  delivered_by?: Types.ObjectId;

  @Prop()
  delivered_at?: Date;

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop()
  deleted_at?: Date;

  @Prop()
  deleted_by?: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

SaleSchema.index({ sale_number: 1 }, { unique: true });
SaleSchema.index({ sale_date: 1 });
SaleSchema.index({ customer_id: 1 });
SaleSchema.index({ warehouse_id: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ 'lines.product_id': 1 });
SaleSchema.index({ 'lines.serial_numbers': 1 });
SaleSchema.index({ 'lines.lot_code': 1 });
