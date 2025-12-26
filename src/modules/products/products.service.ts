import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
  ProductTrackingType,
} from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    await this.ensureSkuUnique(dto.sku);
    await this.validateVariantRules(dto);

    const product = new this.productModel({
      ...dto,
      sku: dto.sku.toUpperCase(),
    });

    return product.save();
  }

  async findAll(filters?: {
    is_active?: boolean;
    tracking_type?: ProductTrackingType;
    parent_product_id?: string;
  }) {
    return this.productModel
      .find({ ...filters, deleted_at: null })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('INVALID_ID');

    const product = await this.productModel.findOne({
      _id: id,
      deleted_at: null,
    });

    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');

    return product;
  }

  async findBySku(sku: string) {
    const product = await this.productModel.findOne({
      sku: sku.toUpperCase(),
      deleted_at: null,
    });

    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    this.ensureEditable(product, dto);

    Object.assign(product, dto);
    return product.save();
  }

  async remove(id: string, deleted_by: string) {
    const product = await this.findOne(id);

    if (product.used_in_documents) {
      product.is_active = false;
      product.deleted_at = new Date();
      product.deleted_by = deleted_by;
      return product.save();
    }

    product.deleted_at = new Date();
    product.deleted_by = deleted_by;

    return product.save();
  }

  private async ensureSkuUnique(sku: string) {
    const exists = await this.productModel.exists({
      sku: sku.toUpperCase(),
      deleted_at: null,
    });

    if (exists) throw new ConflictException('DUPLICATE_SKU');
  }

  private async validateVariantRules(dto: CreateProductDto) {
    // Variant parent
    if (dto.is_variant_parent) {
      if (!dto.variant_schema?.length)
        throw new BadRequestException('VARIANT_SCHEMA_REQUIRED');
    }

    // Variant child
    if (dto.parent_product_id) {
      if (!Types.ObjectId.isValid(dto.parent_product_id))
        throw new BadRequestException('INVALID_PARENT_ID');

      const parent = await this.productModel.findById(dto.parent_product_id);

      if (!parent || parent.deleted_at)
        throw new NotFoundException('PARENT_NOT_FOUND');
      if (!parent.is_variant_parent)
        throw new BadRequestException('INVALID_PARENT');
    }
  }

  private ensureEditable(product: ProductDocument, dto: UpdateProductDto) {
    if (!product.used_in_documents) return;

    const forbiddenFields = ['sku', 'tracking_type', 'parent_product_id'];

    for (const field of forbiddenFields) {
      if (field in dto)
        throw new BadRequestException(`${field.toUpperCase()}_LOCKED`);
    }
  }

  async markAsUsed(productId: string): Promise<void> {
    const product = await this.productModel.findById(productId);
    if (!product) return;

    product.is_used = true;
    await product.save();
  }
}
