import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductTrackingType } from './schemas/product.schema';
import { ApiTags } from '@nestjs/swagger';

@Controller('products')
@ApiTags('Products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ================= CREATE =================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // ================= READ ALL =================
  @Get()
  findAll(
    @Query('is_active') is_active?: string,
    @Query('tracking_type') tracking_type?: ProductTrackingType,
    @Query('parent_product_id') parent_product_id?: string,
  ) {
    const filters: any = {};

    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
    }

    if (tracking_type) {
      filters.tracking_type = tracking_type;
    }

    if (parent_product_id) {
      filters.parent_id = parent_product_id;
    }

    return this.productsService.findAll(filters);
  }

  // ================= READ BY ID =================
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // ================= READ BY SKU =================
  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  // ================= GET VARIANTS =================
  @Get(':id/variants')
  async getVariants(@Param('id') id: string) {
    const parent = await this.productsService.findOne(id);

    if (!parent.is_variant_parent) {
      throw new BadRequestException('PRODUCT_NOT_VARIANT_PARENT');
    }

    const variants = await this.productsService.findAll({
      parent_product_id: id,
      is_active: true,
    });

    return variants;
  }

  // ================= UPDATE =================
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  // ================= DELETE (Soft-delete) =================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @Body('deleted_by') deleted_by: string) {
    if (!deleted_by) {
      throw new BadRequestException('DELETED_BY_REQUIRED');
    }
    return this.productsService.remove(id, deleted_by);
  }
}
