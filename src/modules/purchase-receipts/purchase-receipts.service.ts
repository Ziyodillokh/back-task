// purchase-receipt/purchase-receipt.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { ProductTrackingType } from '../products/schemas/product.schema';
import {
  DocumentStatus,
  PurchaseReceipt,
} from './schemas/purchase-receipt.schema';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { UpdatePurchaseReceiptDto } from './dto/update-purchase-receipt.dto';
import { ConfirmPurchaseReceiptDto } from './dto/confirm-purchase-receipt.dto';
import { CancelPurchaseReceiptDto } from './dto/cancel-purchase-receipt.dto';
import { PurchaseReceiptFilterDto } from './dto/purchase-receipt-filter.dto';

@Injectable()
export class PurchaseReceiptService {
  constructor(
    @InjectModel(PurchaseReceipt.name)
    private purchaseReceiptModel: Model<PurchaseReceipt>,
    private productsService: ProductsService,
    private inventoryService: InventoryService,
  ) {}

  async create(dto: CreatePurchaseReceiptDto): Promise<PurchaseReceipt> {
    let total_amount = 0;
    const validatedLines = [];

    for (const line of dto.lines) {
      const product = await this.productsService.findOne(line.product_id);

      // Validate: Variant parent cannot be purchased
      if (product.is_variant_parent) {
        throw new BadRequestException({
          error_code: 'VARIANT_PARENT_NOT_PURCHASABLE',
          message: `Product '${product.name}' is a variant parent and cannot be purchased`,
          field: 'product_id',
        });
      }

      const line_total = line.quantity * line.unit_price;
      const cost = line.quantity * line.unit_price; // Calculate cost
      total_amount += line_total;

      validatedLines.push({
        product_id: new Types.ObjectId(line.product_id),
        quantity: line.quantity,
        unit_price: line.unit_price,
        cost, // Store cost explicitly
        line_total,
        tracking_info: {
          expiration_date: line.expiration_date
            ? new Date(line.expiration_date)
            : undefined,
          lot_code: line.lot_code,
          serial_numbers: line.serial_numbers,
        },
      });
    }

    const receipt = new this.purchaseReceiptModel({
      supplier_id: new Types.ObjectId(dto.supplier_id),
      warehouse_id: new Types.ObjectId(dto.warehouse_id),
      receipt_date: new Date(dto.receipt_date),
      currency: dto.currency,
      invoice_number: dto.invoice_number,
      comment: dto.comment,
      lines: validatedLines,
      status: DocumentStatus.DRAFT,
      total_amount,
      created_by: dto.created_by,
    });

    return receipt.save();
  }

  async findAll(
    filters?: PurchaseReceiptFilterDto,
  ): Promise<PurchaseReceipt[]> {
    const query: any = {
      is_deleted: { $ne: true }, // Exclude soft-deleted receipts
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.supplier_id) {
      query.supplier_id = new Types.ObjectId(filters.supplier_id);
    }

    if (filters?.warehouse_id) {
      query.warehouse_id = new Types.ObjectId(filters.warehouse_id);
    }

    if (filters?.start_date || filters?.end_date) {
      query.receipt_date = {};
      if (filters.start_date) {
        query.receipt_date.$gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        query.receipt_date.$lte = new Date(filters.end_date);
      }
    }

    return this.purchaseReceiptModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<PurchaseReceipt> {
    const receipt = await this.purchaseReceiptModel.findById(id).exec();
    if (!receipt) {
      throw new NotFoundException({
        error_code: 'RECEIPT_NOT_FOUND',
        message: `Purchase receipt with ID '${id}' not found`,
      });
    }
    return receipt;
  }

  async update(
    id: string,
    dto: UpdatePurchaseReceiptDto,
  ): Promise<PurchaseReceipt> {
    const receipt = await this.findOne(id);

    if (receipt.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException({
        error_code: 'RECEIPT_NOT_EDITABLE',
        message: 'Only DRAFT receipts can be updated',
      });
    }

    // IMMUTABILITY ENFORCEMENT: Prevent certain fields from being changed even in DRAFT
    // (Optional - for stricter control, uncomment if needed)
    // if (dto.supplier_id && receipt.supplier_id.toString() !== dto.supplier_id) {
    //   throw new BadRequestException({
    //     error_code: 'SUPPLIER_IMMUTABLE',
    //     message: 'Supplier cannot be changed',
    //   });
    // }

    if (dto.lines) {
      let total_amount = 0;
      const validatedLines = [];

      for (const line of dto.lines) {
        const product = await this.productsService.findOne(line.product_id);
        if (product.is_variant_parent) {
          throw new BadRequestException({
            error_code: 'VARIANT_PARENT_NOT_PURCHASABLE',
            message: `Product '${product.name}' is a variant parent and cannot be purchased`,
          });
        }

        const line_total = line.quantity * line.unit_price;
        const cost = line.quantity * line.unit_price; // Calculate cost
        total_amount += line_total;

        validatedLines.push({
          product_id: new Types.ObjectId(line.product_id),
          quantity: line.quantity,
          unit_price: line.unit_price,
          cost, // Store cost explicitly
          line_total,
          tracking_info: {
            expiration_date: line.expiration_date
              ? new Date(line.expiration_date)
              : undefined,
            lot_code: line.lot_code,
            serial_numbers: line.serial_numbers,
          },
        });
      }

      receipt.lines = validatedLines;
      receipt.total_amount = total_amount;
    }

    if (dto.supplier_id)
      receipt.supplier_id = new Types.ObjectId(dto.supplier_id);
    if (dto.warehouse_id)
      receipt.warehouse_id = new Types.ObjectId(dto.warehouse_id);
    if (dto.receipt_date) receipt.receipt_date = new Date(dto.receipt_date);
    if (dto.invoice_number) receipt.invoice_number = dto.invoice_number;
    if (dto.comment) receipt.comment = dto.comment;

    receipt.updated_by = new Types.ObjectId(dto.updated_by);

    return receipt.save();
  }

  async confirm(
    id: string,
    dto: ConfirmPurchaseReceiptDto,
  ): Promise<PurchaseReceipt> {
    const receipt = await this.findOne(id);

    if (receipt.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException({
        error_code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot confirm receipt with status '${receipt.status}'`,
      });
    }

    for (const line of receipt.lines) {
      const product: any = await this.productsService.findOne(
        line.product_id.toString(),
      );

      // Decrease stock
      await this.inventoryService.increaseStock({
        product_id: line.product_id.toString(),
        warehouse_id: receipt.warehouse_id.toString(),
        quantity: line.quantity,
        tracking_type: product.tracking_type,
        serial_numbers: line.tracking_info?.serial_numbers,
        lot_code: line.tracking_info?.lot_code,
        expiration_date: line.tracking_info?.expiration_date,
      });

      await this.productsService.markAsUsed(line.product_id.toString());
    }

    receipt.status = DocumentStatus.CONFIRMED;
    receipt.confirmed_by = new Types.ObjectId(dto.confirmed_by);
    receipt.confirmed_at = new Date();

    return receipt.save();
  }

  async cancel(
    id: string,
    dto: CancelPurchaseReceiptDto,
  ): Promise<PurchaseReceipt> {
    const receipt = await this.findOne(id);

    if (receipt.status !== DocumentStatus.CONFIRMED) {
      throw new BadRequestException({
        error_code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot cancel receipt with status '${receipt.status}'`,
      });
    }

    for (const line of receipt.lines) {
      const product: any = await this.productsService.findOne(
        line.product_id.toString(),
      );

      await this.inventoryService.decreaseStock({
        product_id: line.product_id.toString(),
        warehouse_id: receipt.warehouse_id.toString(),
        quantity: line.quantity,
        tracking_type: product.tracking_type,
        serial_numbers: line.tracking_info?.serial_numbers,
        lot_code: line.tracking_info?.lot_code,
        expiration_date: line.tracking_info?.expiration_date,
      });
    }

    receipt.status = DocumentStatus.CANCELLED;
    receipt.cancelled_by = new Types.ObjectId(dto.cancelled_by);
    receipt.cancelled_at = new Date();
    receipt.cancellation_reason = dto.cancellation_reason;

    return receipt.save();
  }

  async delete(id: string, deleted_by: string): Promise<PurchaseReceipt> {
    const receipt = await this.purchaseReceiptModel.findById(id);
    if (!receipt) {
      throw new NotFoundException({
        error_code: 'RECEIPT_NOT_FOUND',
        message: `Purchase receipt with ID '${id}' not found`,
      });
    }

    // Soft delete: mark as deleted
    receipt.is_deleted = true;
    receipt.deleted_at = new Date();
    receipt.deleted_by = new Types.ObjectId(deleted_by);

    return receipt.save();
  }
}
