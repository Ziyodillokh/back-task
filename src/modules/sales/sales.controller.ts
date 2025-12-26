import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import {
  UpdateSaleDto,
  ConfirmSaleDto,
  CancelSaleDto,
} from './dto/update-sale.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentStatus } from '@/common/enums';

@Controller('sales')
@ApiTags('Sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new sale (DRAFT)' })
  @ApiResponse({
    status: 201,
    description: 'Sale created successfully',
    schema: {
      example: {
        _id: '694ca3e5f2dabb524f963c4a',
        status: 'DRAFT',
        total_amount: 499.95,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  findAll(
    @Query('status') status?: DocumentStatus,
    @Query('warehouse_id') warehouse_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    const filters: any = {};

    if (status) filters.status = status;
    if (warehouse_id) filters.warehouse_id = warehouse_id;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    return this.salesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string, @Body() confirmDto: ConfirmSaleDto) {
    return this.salesService.confirm(id, confirmDto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @Body() cancelDto: CancelSaleDto) {
    return this.salesService.cancel(id, cancelDto);
  }
}
