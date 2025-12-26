import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSaleDto } from './dto/create-sale.dto';
import {
  UpdateSaleDto,
  ConfirmSaleDto,
  CancelSaleDto,
} from './dto/update-sale.dto';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { ProductTrackingType } from '../products/schemas/product.schema';
import { Sale, SaleDocument, SaleDocumentStatus } from './schemas/sale.schema';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel('SaleCounter')
    private readonly counterModel: Model<any>,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  private async generateSaleNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    const counter = await this.counterModel.findByIdAndUpdate(
      { _id: `sale_${dateKey}` },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true },
    );

    const sequence = String(counter.sequence).padStart(4, '0');
    return `SALE-${dateKey}-${sequence}`;
  }

  async create(createSaleDto: CreateSaleDto): Promise<SaleDocument> {
    let total_amount = 0;
    const validatedLines = [];

    for (const line of createSaleDto.lines) {
      const product = await this.productsService.findOne(line.product_id);

      if (product.is_variant_parent) {
        throw new BadRequestException({
          error_code: 'VARIANT_PARENT_NOT_SELLABLE',
          message: `Product '${product.name}' is a variant parent and cannot be sold`,
          field: 'product_id',
        });
      }

      this.validateTrackingInfo(product.tracking_type, line);

      const line_total = line.quantity * line.unit_price;
      total_amount += line_total;

      validatedLines.push({
        product_id: new Types.ObjectId(line.product_id),
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total,
        serial_numbers: line.serial_numbers || [],
        lot_code: line.lot_code || null,
        expiration_date: line.expiration_date || null,
      });
    }

    const sale_number = await this.generateSaleNumber();

    const sale = new this.saleModel({
      sale_number,
      customer_id: createSaleDto.customer_id
        ? new Types.ObjectId(createSaleDto.customer_id)
        : undefined,
      warehouse_id: new Types.ObjectId(createSaleDto.warehouse_id),
      sale_date: new Date(createSaleDto.sale_date),
      currency: createSaleDto.currency || 'UZS',
      status: SaleDocumentStatus.DRAFT,
      payment_type: createSaleDto.payment_type || null,
      comment: createSaleDto.comment || null,
      lines: validatedLines,
      total_amount,
      created_by: createSaleDto.created_by,
    });

    return sale.save();
  }

  async findAll(filters?: {
    status?: SaleDocumentStatus;
    warehouse_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SaleDocument[]> {
    const query: any = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.warehouse_id)
      query.warehouse_id = new Types.ObjectId(filters.warehouse_id);
    if (filters?.start_date || filters?.end_date) {
      query.sale_date = {};
      if (filters.start_date)
        query.sale_date.$gte = new Date(filters.start_date);
      if (filters.end_date) query.sale_date.$lte = new Date(filters.end_date);
    }

    return this.saleModel
      .find(query)
      .populate('lines.product_id', 'name sku tracking_type')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<SaleDocument> {
    const sale = await this.saleModel
      .findById(id)
      .populate('lines.product_id', 'name sku tracking_type')
      .exec();

    if (!sale) {
      throw new NotFoundException({
        error_code: 'SALE_NOT_FOUND',
        message: `Sale with ID '${id}' not found`,
      });
    }

    return sale;
  }

  async update(
    id: string,
    updateSaleDto: UpdateSaleDto,
  ): Promise<SaleDocument> {
    const sale = await this.findOne(id);

    if (sale.status !== SaleDocumentStatus.DRAFT) {
      throw new BadRequestException({
        error_code: 'SALE_NOT_EDITABLE',
        message: 'Only DRAFT sales can be updated',
      });
    }

    if (updateSaleDto.lines) {
      let total_amount = 0;
      const validatedLines = [];

      for (const line of updateSaleDto.lines) {
        const product = await this.productsService.findOne(line.product_id);

        if (product.is_variant_parent) {
          throw new BadRequestException({
            error_code: 'VARIANT_PARENT_NOT_SELLABLE',
            message: `Product '${product.name}' is a variant parent and cannot be sold`,
          });
        }

        this.validateTrackingInfo(product.tracking_type, line);

        const line_total = line.quantity * line.unit_price;
        total_amount += line_total;

        validatedLines.push({
          product_id: new Types.ObjectId(line.product_id),
          quantity: line.quantity,
          unit_price: line.unit_price,
          line_total,
          serial_numbers: line.serial_numbers || [],
          lot_code: line.lot_code || null,
          expiration_date: line.expiration_date || null,
        });
      }

      sale.lines = validatedLines;
      sale.total_amount = total_amount;
    }

    if (updateSaleDto.customer_id)
      sale.customer_id = new Types.ObjectId(updateSaleDto.customer_id);
    if (updateSaleDto.warehouse_id)
      sale.warehouse_id = new Types.ObjectId(updateSaleDto.warehouse_id);
    if (updateSaleDto.sale_date)
      sale.sale_date = new Date(updateSaleDto.sale_date);
    if (updateSaleDto.comment) sale.comment = updateSaleDto.comment;

    sale.updated_by = new Types.ObjectId(updateSaleDto.updated_by);

    return sale.save();
  }

  async confirm(id: string, confirmDto: ConfirmSaleDto): Promise<SaleDocument> {
    const sale = await this.findOne(id);

    if (sale.status !== SaleDocumentStatus.DRAFT) {
      throw new BadRequestException({
        error_code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot confirm sale with status '${sale.status}'`,
      });
    }

    for (const line of sale.lines) {
      const product: any = await this.productsService.findOne(
        line.product_id.toString(),
      );

      this.validateTrackingInfoStrict(product.tracking_type, line);

      const available = await this.inventoryService.checkAvailability(
        line.product_id.toString(),
        sale.warehouse_id.toString(),
        line.quantity,
      );

      if (!available) {
        throw new BadRequestException({
          error_code: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for product '${product.name}'`,
          field: 'product_id',
        });
      }

      await this.inventoryService.decreaseStock({
        product_id: line.product_id.toString(),
        warehouse_id: sale.warehouse_id.toString(),
        quantity: line.quantity,
        tracking_type: product.tracking_type,
        serial_numbers: line.serial_numbers,
        lot_code: line.lot_code,
        expiration_date: line.expiration_date,
      });

      await this.productsService.markAsUsed(line.product_id.toString());
    }

    sale.status = SaleDocumentStatus.CONFIRMED;
    sale.confirmed_by = new Types.ObjectId(confirmDto.confirmed_by);
    sale.confirmed_at = new Date();

    return sale.save();
  }

  async cancel(id: string, cancelDto: CancelSaleDto): Promise<SaleDocument> {
    const sale = await this.findOne(id);

    if (sale.status !== SaleDocumentStatus.CONFIRMED) {
      throw new BadRequestException({
        error_code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot cancel sale with status '${sale.status}'`,
      });
    }

    for (const line of sale.lines) {
      const product: any = await this.productsService.findOne(
        line.product_id.toString(),
      );

      await this.inventoryService.increaseStock({
        product_id: line.product_id.toString(),
        warehouse_id: sale.warehouse_id.toString(),
        quantity: line.quantity,
        tracking_type: product.tracking_type,
        serial_numbers: line.serial_numbers,
        lot_code: line.lot_code,
        expiration_date: line.expiration_date,
      });
    }

    sale.status = SaleDocumentStatus.CANCELLED;
    sale.cancelled_by = new Types.ObjectId(cancelDto.cancelled_by);
    sale.cancelled_at = new Date();
    sale.cancellation_reason = cancelDto.cancellation_reason;

    return sale.save();
  }

  private validateTrackingInfo(tracking_type: ProductTrackingType, line: any) {
    switch (tracking_type) {
      case ProductTrackingType.SERIALIZED:
        if (!line.serial_numbers || line.serial_numbers.length === 0) {
          throw new BadRequestException({
            error_code: 'SERIAL_NUMBERS_REQUIRED',
            message: 'Serial numbers are required for serialized products',
            field: 'serial_numbers',
          });
        }
        break;
      case ProductTrackingType.LOT_TRACKED:
        if (!line.lot_code) {
          throw new BadRequestException({
            error_code: 'LOT_CODE_REQUIRED',
            message: 'Lot code is required for lot-tracked products',
            field: 'lot_code',
          });
        }
        break;
      case ProductTrackingType.EXPIRABLE:
        break;
    }
  }

  private validateTrackingInfoStrict(
    tracking_type: ProductTrackingType,
    line: any,
  ) {
    switch (tracking_type) {
      case ProductTrackingType.SERIALIZED:
        if (
          !line.serial_numbers ||
          line.serial_numbers.length !== line.quantity
        ) {
          throw new BadRequestException({
            error_code: 'SERIAL_COUNT_MISMATCH',
            message: 'Serial numbers count must match quantity',
            field: 'serial_numbers',
          });
        }
        break;
      case ProductTrackingType.LOT_TRACKED:
        if (!line.lot_code) {
          throw new BadRequestException({
            error_code: 'LOT_CODE_REQUIRED',
            message: 'Lot code is required for lot-tracked products',
            field: 'lot_code',
          });
        }
        break;
    }
  }

  async transitionToShipped(
    id: string,
    shipped_by: string,
  ): Promise<SaleDocument> {
    const sale = await this.findOne(id);

    if (sale.status !== SaleDocumentStatus.CONFIRMED) {
      throw new BadRequestException({
        error_code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot ship sale with status '${sale.status}'. Sale must be CONFIRMED first`,
      });
    }

    sale.status = SaleDocumentStatus.SHIPPED;
    sale.shipped_by = new Types.ObjectId(shipped_by);
    sale.shipped_at = new Date();

    return sale.save();
  }

  async transitionToDelivered(
    id: string,
    delivered_by: string,
  ): Promise<SaleDocument> {
    const sale = await this.findOne(id);

    if (sale.status !== SaleDocumentStatus.SHIPPED) {
      throw new BadRequestException({
        error_code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot deliver sale with status '${sale.status}'. Sale must be SHIPPED first`,
      });
    }

    sale.status = SaleDocumentStatus.DELIVERED;
    sale.delivered_by = new Types.ObjectId(delivered_by);
    sale.delivered_at = new Date();

    return sale.save();
  }
}
