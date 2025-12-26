import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { SoftDeleteFields } from '../../../common/interfaces/audit.interface';

export type ProductDocument = HydratedDocument<Product>;

export enum ProductTrackingType {
  SIMPLE = 'SIMPLE',
  EXPIRABLE = 'EXPIRABLE',
  SERIALIZED = 'SERIALIZED',
  LOT_TRACKED = 'LOT_TRACKED',
  VARIANT = 'VARIANT',
}

@Schema({ timestamps: true })
export class Product implements SoftDeleteFields {
  // =========================
  // Core identity
  // =========================
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  sku: string;

  @Prop()
  barcode?: string;

  @Prop({ required: true })
  unit_of_measure: string;

  // =========================
  // Tracking rules (ERP CORE)
  // =========================
  @Prop({
    required: true,
    enum: ProductTrackingType,
    type: String,
  })
  tracking_type: ProductTrackingType;

  // =========================
  // Variant logic
  // =========================
  @Prop({ type: Types.ObjectId, ref: 'Product', default: null })
  parent_id?: Types.ObjectId; // Variant CHILD

  @Prop({ type: Object })
  variant_attributes?: Record<string, string>; // Variant CHILD attributes

  @Prop({
    type: [
      {
        attribute_name: { type: String, required: true },
        values: [{ type: String, required: true }],
      },
    ],
  })
  variant_schema?: {
    attribute_name: string;
    values: string[];
  }[]; // Variant PARENT

  @Prop({ default: false })
  is_variant_parent?: boolean;

  // =========================
  // Defaults (pricing hints)
  // =========================
  @Prop({ min: 0 })
  sale_price_default?: number;

  @Prop({ min: 0 })
  purchase_price_default?: number;

  // =========================
  // Inventory hints
  // =========================
  @Prop({ min: 0 })
  min_stock_level?: number;

  // =========================
  // Status / soft delete / usage
  // =========================
  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  used_in_documents: boolean;

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop()
  deleted_by?: string;

  @Prop()
  deleted_at?: Date;

  @Prop({ default: false })
  is_used: boolean;

  // =========================
  // Audit fields
  // =========================
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  created_by?: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexlar
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ parent_id: 1 });
ProductSchema.index({ is_active: 1 });
