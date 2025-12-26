import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Inventory,
  InventoryDocument,
  SerialNumber,
  LotBatch,
  ExpirationBatch,
} from './schemas/inventory.schema';
import { ProductTrackingType } from '../products/schemas/product.schema';

export interface StockIncreaseParams {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  tracking_type: ProductTrackingType;
  serial_numbers?: string[];
  lot_code?: string;
  expiration_date?: Date;
}

export interface StockDecreaseParams {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  tracking_type: ProductTrackingType;
  serial_numbers?: string[];
  lot_code?: string;
  expiration_date?: Date;
  expiration_batch_id?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
  ) {}

  async increaseStock(params: StockIncreaseParams): Promise<void> {
    const {
      product_id,
      warehouse_id,
      quantity,
      tracking_type,
      serial_numbers,
      lot_code,
      expiration_date,
    } = params;

    let inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    if (!inventory) {
      inventory = new this.inventoryModel({
        product_id: new Types.ObjectId(product_id),
        warehouse_id: new Types.ObjectId(warehouse_id),
        quantity: 0,
        serial_numbers: [],
        lot_batches: [],
        expiration_batches: [],
      });
    }

    switch (tracking_type) {
      case ProductTrackingType.SIMPLE:
        inventory.quantity += quantity;
        break;

      case ProductTrackingType.SERIALIZED:
        if (!serial_numbers || serial_numbers.length !== quantity) {
          throw new BadRequestException({
            error_code: 'SERIAL_COUNT_MISMATCH',
            message: 'Serial numbers count must match quantity',
          });
        }

        // Check for duplicate serials within the same warehouse
        for (const serial of serial_numbers) {
          const exists = await this.inventoryModel.findOne({
            warehouse_id: new Types.ObjectId(warehouse_id),
            'serial_numbers.serial_number': serial,
          });
          if (exists) {
            throw new BadRequestException({
              error_code: 'DUPLICATE_SERIAL',
              message: `Serial number '${serial}' already exists in this warehouse`,
              field: 'serial_numbers',
            });
          }
        }

        serial_numbers.forEach((serial) => {
          inventory.serial_numbers.push({
            serial_number: serial,
            is_sold: false,
            received_date: new Date(),
          });
        });
        inventory.quantity += quantity;
        break;

      case ProductTrackingType.LOT_TRACKED:
        if (!lot_code) {
          throw new BadRequestException({
            error_code: 'LOT_CODE_REQUIRED',
            message: 'Lot code is required for lot-tracked products',
          });
        }

        const existingLot = inventory.lot_batches.find(
          (lot) => lot.lot_code === lot_code,
        );
        if (existingLot) {
          existingLot.quantity += quantity;
        } else {
          inventory.lot_batches.push({
            lot_code,
            quantity,
            received_date: new Date(),
          });
        }
        inventory.quantity += quantity;
        break;

      case ProductTrackingType.EXPIRABLE:
        if (!expiration_date) {
          throw new BadRequestException({
            error_code: 'EXPIRATION_DATE_REQUIRED',
            message: 'Expiration date is required for expirable products',
          });
        }

        const existingExpBatch = inventory.expiration_batches.find(
          (batch) =>
            batch.expiration_date.getTime() ===
            new Date(expiration_date).getTime(),
        );
        if (existingExpBatch) {
          existingExpBatch.quantity += quantity;
        } else {
          inventory.expiration_batches.push({
            expiration_date: new Date(expiration_date),
            quantity,
            received_date: new Date(),
          });
        }
        inventory.quantity += quantity;
        break;

      default:
        throw new BadRequestException({
          error_code: 'INVALID_TRACKING_TYPE',
          message: 'Invalid tracking type',
        });
    }

    await inventory.save();
  }

  async decreaseStock(params: StockDecreaseParams): Promise<void> {
    const {
      product_id,
      warehouse_id,
      quantity,
      tracking_type,
      serial_numbers,
      lot_code,
      expiration_batch_id,
    } = params;

    const inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    if (!inventory) {
      throw new BadRequestException({
        error_code: 'INSUFFICIENT_STOCK',
        message: 'Product not found in inventory',
      });
    }

    switch (tracking_type) {
      case ProductTrackingType.SIMPLE:
        if (inventory.quantity < quantity) {
          throw new BadRequestException({
            error_code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock. Available: ${inventory.quantity}, Required: ${quantity}`,
          });
        }
        inventory.quantity -= quantity;
        break;

      case ProductTrackingType.SERIALIZED:
        if (!serial_numbers || serial_numbers.length !== quantity) {
          throw new BadRequestException({
            error_code: 'SERIAL_COUNT_MISMATCH',
            message: 'Serial numbers count must match quantity',
          });
        }

        for (const serial of serial_numbers) {
          const serialDoc = inventory.serial_numbers.find(
            (s) => s.serial_number === serial && !s.is_sold,
          );
          if (!serialDoc) {
            throw new BadRequestException({
              error_code: 'SERIAL_NOT_AVAILABLE',
              message: `Serial number '${serial}' not available`,
              field: 'serial_numbers',
            });
          }
          serialDoc.is_sold = true;
          serialDoc.sold_date = new Date();
        }
        inventory.quantity -= quantity;
        break;

      case ProductTrackingType.LOT_TRACKED:
        if (!lot_code) {
          throw new BadRequestException({
            error_code: 'LOT_CODE_REQUIRED',
            message: 'Lot code is required for lot-tracked products',
          });
        }

        const lot = inventory.lot_batches.find((l) => l.lot_code === lot_code);
        if (!lot || lot.quantity < quantity) {
          throw new BadRequestException({
            error_code: 'INSUFFICIENT_LOT_STOCK',
            message: `Insufficient stock in lot '${lot_code}'`,
          });
        }
        lot.quantity -= quantity;
        inventory.quantity -= quantity;
        break;

      case ProductTrackingType.EXPIRABLE:
        // FIFO by expiration date if not specified
        if (!expiration_batch_id) {
          // Auto-select earliest expiration
          inventory.expiration_batches.sort(
            (a, b) => a.expiration_date.getTime() - b.expiration_date.getTime(),
          );
        }

        const batch = expiration_batch_id
          ? inventory.expiration_batches.find(
              (b) => b._id.toString() === expiration_batch_id,
            )
          : inventory.expiration_batches[0];

        if (!batch || batch.quantity < quantity) {
          throw new BadRequestException({
            error_code: 'INSUFFICIENT_EXPIRABLE_STOCK',
            message: 'Insufficient stock in expiration batch',
          });
        }

        // Check if expired
        if (batch.expiration_date < new Date()) {
          throw new BadRequestException({
            error_code: 'EXPIRED_PRODUCT',
            message: 'Cannot sell expired product',
          });
        }

        batch.quantity -= quantity;
        inventory.quantity -= quantity;
        break;

      default:
        throw new BadRequestException({
          error_code: 'INVALID_TRACKING_TYPE',
          message: 'Invalid tracking type',
        });
    }

    // Prevent negative stock
    if (inventory.quantity < 0) {
      throw new BadRequestException({
        error_code: 'NEGATIVE_STOCK',
        message: 'Stock cannot be negative',
      });
    }

    await inventory.save();
  }

  async checkAvailability(
    product_id: string,
    warehouse_id: string,
    quantity: number,
  ): Promise<boolean> {
    const inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    return inventory ? inventory.quantity >= quantity : false;
  }

  async getAvailableStock(
    product_id: string,
    warehouse_id: string,
  ): Promise<number> {
    const inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    return inventory ? inventory.quantity : 0;
  }

  async getAvailableSerials(
    product_id: string,
    warehouse_id: string,
  ): Promise<string[]> {
    const inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    if (!inventory) return [];

    return inventory.serial_numbers
      .filter((s) => !s.is_sold)
      .map((s) => s.serial_number);
  }

  async getAvailableLots(
    product_id: string,
    warehouse_id: string,
  ): Promise<LotBatch[]> {
    const inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    if (!inventory) return [];

    return inventory.lot_batches.filter((lot) => lot.quantity > 0);
  }

  async getAvailableExpirationBatches(
    product_id: string,
    warehouse_id: string,
  ): Promise<ExpirationBatch[]> {
    const inventory = await this.inventoryModel.findOne({
      product_id: new Types.ObjectId(product_id),
      warehouse_id: new Types.ObjectId(warehouse_id),
    });

    if (!inventory) return [];

    return inventory.expiration_batches
      .filter(
        (batch) => batch.quantity > 0 && batch.expiration_date > new Date(),
      )
      .sort(
        (a, b) => a.expiration_date.getTime() - b.expiration_date.getTime(),
      );
  }
}
