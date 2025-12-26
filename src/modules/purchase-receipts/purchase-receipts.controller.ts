import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseReceiptService } from './purchase-receipts.service';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { UpdatePurchaseReceiptDto } from './dto/update-purchase-receipt.dto';
import { ConfirmPurchaseReceiptDto } from './dto/confirm-purchase-receipt.dto';
import { CancelPurchaseReceiptDto } from './dto/cancel-purchase-receipt.dto';
import { PurchaseReceiptFilterDto } from './dto/purchase-receipt-filter.dto';
import { ApiTags } from '@nestjs/swagger';

// TODO: Import your auth guards
// @UseGuards(JwtAuthGuard)
@Controller('purchase-receipts')
@ApiTags('Purchase Receipts')
export class PurchaseReceiptsController {
  constructor(
    private readonly purchaseReceiptService: PurchaseReceiptService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreatePurchaseReceiptDto) {
    return this.purchaseReceiptService.create(createDto);
  }

  @Get()
  findAll(@Query() filters: PurchaseReceiptFilterDto) {
    return this.purchaseReceiptService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseReceiptService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePurchaseReceiptDto) {
    return this.purchaseReceiptService.update(id, updateDto);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() confirmDto: ConfirmPurchaseReceiptDto,
  ) {
    // confirmDto.confirmed_by ni to‘g‘ri uzatish
    return this.purchaseReceiptService.confirm(id, confirmDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() cancelDto: CancelPurchaseReceiptDto) {
    return this.purchaseReceiptService.cancel(id, cancelDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @Body() body: { deleted_by: string }) {
    return this.purchaseReceiptService.delete(id, body.deleted_by);
  }
}
