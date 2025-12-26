import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { DashboardService, DashboardFilters } from './dashboard.service';
import { Type } from 'class-transformer';
import { IsOptional, IsDate, IsString, IsEnum } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';

export class DashboardFiltersDto implements DashboardFilters {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date_from?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date_to?: Date;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class TopProductsQueryDto extends DashboardFiltersDto {
  @IsOptional()
  @IsEnum(['quantity', 'revenue'])
  sort_by?: 'quantity' | 'revenue';
}

// TODO: Add authentication guard
// @UseGuards(JwtAuthGuard)
@Controller('dashboard')
@ApiTags('Dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard
   * Complete dashboard with all metrics
   */
  @Get()
  getCompleteDashboard(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getCompleteDashboard(filters);
  }

  /**
   * GET /dashboard/sales/summary
   * Sales summary metrics: total amount, count, average
   */
  @Get('sales/summary')
  getSalesSummary(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getSalesSummary(filters);
  }

  /**
   * GET /dashboard/sales/daily
   * Daily sales chart data
   */
  @Get('sales/daily')
  getDailySales(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getDailySales(filters);
  }

  /**
   * GET /dashboard/products/top
   * Top products by quantity or revenue
   * Query params:
   *   - limit: number (default 10)
   *   - sort_by: 'quantity' | 'revenue' (default 'revenue')
   */
  @Get('products/top')
  getTopProducts(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() query: TopProductsQueryDto,
  ) {
    const sortBy = query.sort_by || 'revenue';
    return this.dashboardService.getTopProducts(limit, sortBy, query);
  }

  /**
   * GET /dashboard/inventory/summary
   * Inventory overview and low stock alerts
   */
  @Get('inventory/summary')
  getInventorySummary(@Query('warehouse_id') warehouseId?: string) {
    return this.dashboardService.getInventorySummary(warehouseId);
  }

  /**
   * GET /dashboard/purchases/summary
   * Purchase receipts summary and top purchased products
   */
  @Get('purchases/summary')
  getPurchaseSummary(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getPurchaseSummary(filters);
  }
}
