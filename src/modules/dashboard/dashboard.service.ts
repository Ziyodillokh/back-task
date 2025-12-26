import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PurchaseReceipt,
  DocumentStatus,
} from '../purchase-receipts/schemas/purchase-receipt.schema';
import { Sale, SaleDocumentStatus } from '../sales/schemas/sale.schema';
import { Product } from '../products/schemas/product.schema';
import { Inventory } from '../inventory/schemas/inventory.schema';

export interface SalesSummary {
  total_sales_amount: number;
  sales_count: number;
  average_sale_value: number;
  currency?: string;
}

export interface ProfitMetrics {
  total_cogs: number; // Cost of Goods Sold
  total_sales_amount: number;
  gross_profit: number; // Sales - COGS
  gross_margin: number; // (Sales - COGS) / Sales * 100
}

export interface DailySalesData {
  date: string;
  total_amount: number;
  count: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface InventorySummary {
  total_skus: number;
  total_stock_quantity: number;
  low_stock_count: number;
  low_stock_products: Array<{
    product_id: string;
    product_name: string;
    current_stock: number;
    min_stock_level: number;
  }>;
}

export interface PurchaseSummary {
  total_purchase_amount: number;
  receipt_count: number;
  top_purchased_products: Array<{
    product_id: string;
    product_name: string;
    quantity_purchased: number;
    total_spent: number;
  }>;
}

export interface DashboardFilters {
  date_from?: Date;
  date_to?: Date;
  warehouse_id?: string;
  currency?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(PurchaseReceipt.name)
    private purchaseReceiptModel: Model<PurchaseReceipt>,
    @InjectModel(Sale.name) private saleModel: Model<Sale>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Inventory.name) private inventoryModel: Model<Inventory>,
  ) {}

  async getSalesSummary(filters?: DashboardFilters): Promise<SalesSummary> {
    const matchStage: any = {
      status: SaleDocumentStatus.CONFIRMED,
    };

    if (filters?.date_from || filters?.date_to) {
      matchStage.sale_date = {};
      if (filters.date_from) {
        matchStage.sale_date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        matchStage.sale_date.$lte = filters.date_to;
      }
    }

    if (filters?.warehouse_id) {
      matchStage.warehouse_id = filters.warehouse_id;
    }

    if (filters?.currency) {
      matchStage.currency = filters.currency;
    }

    try {
      const result = await this.saleModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total_sales_amount: { $sum: '$total_amount' },
            sales_count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            total_sales_amount: 1,
            sales_count: 1,
            average_sale_value: {
              $cond: [
                { $eq: ['$sales_count', 0] },
                0,
                { $divide: ['$total_sales_amount', '$sales_count'] },
              ],
            },
          },
        },
      ]);

      return (
        result[0] || {
          total_sales_amount: 0,
          sales_count: 0,
          average_sale_value: 0,
        }
      );
    } catch (error) {
      console.error('Error fetching sales summary:', error);
      return {
        total_sales_amount: 0,
        sales_count: 0,
        average_sale_value: 0,
      };
    }
  }

  async getDailySales(filters?: DashboardFilters): Promise<DailySalesData[]> {
    const matchStage: any = {
      status: SaleDocumentStatus.CONFIRMED,
    };

    if (filters?.date_from || filters?.date_to) {
      matchStage.sale_date = {};
      if (filters.date_from) {
        matchStage.sale_date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        matchStage.sale_date.$lte = filters.date_to;
      }
    }

    if (filters?.warehouse_id) {
      matchStage.warehouse_id = filters.warehouse_id;
    }

    try {
      const results = await this.saleModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$sale_date' },
            },
            total_amount: { $sum: '$total_amount' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            total_amount: 1,
            count: 1,
          },
        },
        { $sort: { date: 1 } },
      ]);

      return results;
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      return [];
    }
  }

  async getTopProducts(
    limit: number = 10,
    sortBy: 'quantity' | 'revenue' = 'revenue',
    filters?: DashboardFilters,
  ): Promise<TopProduct[]> {
    const matchStage: any = {
      status: SaleDocumentStatus.CONFIRMED,
    };

    if (filters?.date_from || filters?.date_to) {
      matchStage.sale_date = {};
      if (filters.date_from) {
        matchStage.sale_date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        matchStage.sale_date.$lte = filters.date_to;
      }
    }

    if (filters?.warehouse_id) {
      matchStage.warehouse_id = filters.warehouse_id;
    }

    try {
      const results = await this.saleModel.aggregate([
        { $match: matchStage },
        { $unwind: '$lines' },
        {
          $group: {
            _id: '$lines.product_id',
            quantity_sold: { $sum: '$lines.quantity' },
            revenue: { $sum: '$lines.line_total' },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            product_id: { $toString: '$_id' },
            product_name: { $ifNull: ['$product.name', 'Unknown Product'] },
            quantity_sold: 1,
            revenue: 1,
          },
        },
        {
          $sort:
            sortBy === 'quantity' ? { quantity_sold: -1 } : { revenue: -1 },
        },
        { $limit: limit },
      ]);

      return results;
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  async getInventorySummary(warehouseId?: string): Promise<InventorySummary> {
    try {
      const matchStage: any = {};
      if (warehouseId) {
        matchStage.warehouse_id = warehouseId;
      }

      const stockStats = await this.inventoryModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total_skus: { $sum: 1 },
            total_stock_quantity: { $sum: '$quantity' },
          },
        },
      ]);

      const lowStockProducts = await this.inventoryModel.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'products',
            localField: 'product_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $expr: {
              $lt: ['$quantity', { $ifNull: ['$product.min_stock_level', 0] }],
            },
          },
        },
        {
          $project: {
            _id: 0,
            product_id: { $toString: '$product_id' },
            product_name: { $ifNull: ['$product.name', 'Unknown Product'] },
            current_stock: '$quantity',
            min_stock_level: { $ifNull: ['$product.min_stock_level', 0] },
          },
        },
        { $limit: 20 },
      ]);

      return {
        total_skus: stockStats[0]?.total_skus || 0,
        total_stock_quantity: stockStats[0]?.total_stock_quantity || 0,
        low_stock_count: lowStockProducts.length,
        low_stock_products: lowStockProducts,
      };
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      return {
        total_skus: 0,
        total_stock_quantity: 0,
        low_stock_count: 0,
        low_stock_products: [],
      };
    }
  }

  async getPurchaseSummary(
    filters?: DashboardFilters,
  ): Promise<PurchaseSummary> {
    const matchStage: any = {
      status: DocumentStatus.CONFIRMED,
    };

    if (filters?.date_from || filters?.date_to) {
      matchStage.receipt_date = {};
      if (filters.date_from) {
        matchStage.receipt_date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        matchStage.receipt_date.$lte = filters.date_to;
      }
    }

    if (filters?.warehouse_id) {
      matchStage.warehouse_id = filters.warehouse_id;
    }

    try {
      const totals = await this.purchaseReceiptModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total_purchase_amount: { $sum: '$total_amount' },
            receipt_count: { $sum: 1 },
          },
        },
      ]);

      const topProducts = await this.purchaseReceiptModel.aggregate([
        { $match: matchStage },
        { $unwind: '$lines' },
        {
          $group: {
            _id: '$lines.product_id',
            quantity_purchased: { $sum: '$lines.quantity' },
            total_spent: { $sum: '$lines.line_total' },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            product_id: { $toString: '$_id' },
            product_name: { $ifNull: ['$product.name', 'Unknown Product'] },
            quantity_purchased: 1,
            total_spent: 1,
          },
        },
        { $sort: { total_spent: -1 } },
        { $limit: 10 },
      ]);

      return {
        total_purchase_amount: totals[0]?.total_purchase_amount || 0,
        receipt_count: totals[0]?.receipt_count || 0,
        top_purchased_products: topProducts,
      };
    } catch (error) {
      console.error('Error fetching purchase summary:', error);
      return {
        total_purchase_amount: 0,
        receipt_count: 0,
        top_purchased_products: [],
      };
    }
  }

  async getCompleteDashboard(filters?: DashboardFilters) {
    const [
      salesSummary,
      dailySales,
      topProducts,
      inventorySummary,
      purchaseSummary,
      profitMetrics,
    ] = await Promise.all([
      this.getSalesSummary(filters),
      this.getDailySales(filters),
      this.getTopProducts(10, 'revenue', filters),
      this.getInventorySummary(filters?.warehouse_id),
      this.getPurchaseSummary(filters),
      this.getProfitMetrics(filters),
    ]);

    return {
      sales: salesSummary,
      daily_sales: dailySales,
      top_products: topProducts,
      inventory: inventorySummary,
      purchases: purchaseSummary,
      profit_metrics: profitMetrics,
      filters_applied: filters,
    };
  }

  async getProfitMetrics(filters?: DashboardFilters): Promise<ProfitMetrics> {
    // Get total COGS from confirmed purchases
    const purchaseMatchStage: any = {
      status: DocumentStatus.CONFIRMED,
    };

    if (filters?.date_from || filters?.date_to) {
      purchaseMatchStage.receipt_date = {};
      if (filters.date_from) {
        purchaseMatchStage.receipt_date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        purchaseMatchStage.receipt_date.$lte = filters.date_to;
      }
    }

    const cogsResults = await this.purchaseReceiptModel.aggregate([
      { $match: purchaseMatchStage },
      {
        $unwind: '$lines',
      },
      {
        $group: {
          _id: null,
          total_cogs: { $sum: '$lines.cost' },
        },
      },
    ]);

    const total_cogs = cogsResults[0]?.total_cogs || 0;

    // Get total sales from confirmed sales
    const saleMatchStage: any = {
      status: SaleDocumentStatus.CONFIRMED,
    };

    if (filters?.date_from || filters?.date_to) {
      saleMatchStage.sale_date = {};
      if (filters.date_from) {
        saleMatchStage.sale_date.$gte = filters.date_from;
      }
      if (filters.date_to) {
        saleMatchStage.sale_date.$lte = filters.date_to;
      }
    }

    const salesResults = await this.saleModel.aggregate([
      { $match: saleMatchStage },
      {
        $group: {
          _id: null,
          total_sales_amount: { $sum: '$total_amount' },
        },
      },
    ]);

    const total_sales_amount = salesResults[0]?.total_sales_amount || 0;
    const gross_profit = total_sales_amount - total_cogs;
    const gross_margin =
      total_sales_amount > 0 ? (gross_profit / total_sales_amount) * 100 : 0;

    return {
      total_cogs,
      total_sales_amount,
      gross_profit,
      gross_margin,
    };
  }
}
