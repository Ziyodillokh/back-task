import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PurchaseReceiptService } from '../src/modules/purchase-receipts/purchase-receipts.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { ProductsService } from '../src/modules/products/products.service';
import { DocumentStatus } from '../src/modules/purchase-receipts/schemas/purchase-receipt.schema';
import { ProductTrackingType } from '../src/modules/products/schemas/product.schema';

describe('Purchase Receipt - ERP Rules (e2e)', () => {
  let app: INestApplication;
  let purchaseReceiptService: PurchaseReceiptService;
  let inventoryService: InventoryService;
  let productsService: ProductsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [], // Import your modules
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    purchaseReceiptService = moduleFixture.get<PurchaseReceiptService>(
      PurchaseReceiptService,
    );
    inventoryService = moduleFixture.get<InventoryService>(InventoryService);
    productsService = moduleFixture.get<ProductsService>(ProductsService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DRAFT Receipt - No Stock Impact', () => {
    it('should not increase inventory when receipt is in DRAFT status', async () => {
      // Create a DRAFT receipt
      const receipt = await purchaseReceiptService.create({
        supplier_id: 'supplier_123',
        warehouse_id: 'warehouse_123',
        receipt_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_123',
            quantity: 10,
            unit_price: 100,
            tracking_type: ProductTrackingType.SIMPLE,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Check that status is DRAFT
      expect(receipt.status).toBe(DocumentStatus.DRAFT);

      // Inventory should not be affected
      const stock = await inventoryService.getAvailableStock(
        'product_123',
        'warehouse_123',
      );
      expect(stock).toBe(0); // No stock added yet
    });
  });

  describe('CONFIRMED Receipt - Stock Increases', () => {
    it('should increase inventory when receipt is confirmed', async () => {
      // Create and confirm a receipt
      const receipt = await purchaseReceiptService.create({
        supplier_id: 'supplier_123',
        warehouse_id: 'warehouse_123',
        receipt_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_456',
            quantity: 20,
            unit_price: 50,
            tracking_type: ProductTrackingType.SIMPLE,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Confirm the receipt
      await purchaseReceiptService.confirm(receipt._id.toString(), {
        confirmed_by: 'user_123',
      } as any);

      // Check that inventory increased
      const stock = await inventoryService.getAvailableStock(
        'product_456',
        'warehouse_123',
      );
      expect(stock).toBe(20);
    });
  });

  describe('CONFIRMED Receipt - Immutability', () => {
    it('should prevent updating a CONFIRMED receipt', async () => {
      const receipt = await purchaseReceiptService.create({
        supplier_id: 'supplier_123',
        warehouse_id: 'warehouse_123',
        receipt_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_789',
            quantity: 5,
            unit_price: 200,
            tracking_type: ProductTrackingType.SIMPLE,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Confirm it
      await purchaseReceiptService.confirm(receipt._id.toString(), {
        confirmed_by: 'user_123',
      } as any);

      // Try to update
      const updateResult = () =>
        purchaseReceiptService.update(receipt._id.toString(), {
          lines: [
            {
              product_id: 'product_999',
              quantity: 10,
              unit_price: 100,
              tracking_type: ProductTrackingType.SIMPLE,
            },
          ],
          updated_by: 'user_123',
        } as any);

      expect(updateResult()).rejects.toThrow(
        'Only DRAFT receipts can be updated',
      );
    });
  });

  describe('CANCELLED Receipt - Stock Reverted', () => {
    it('should decrease inventory when confirmed receipt is cancelled', async () => {
      const receipt = await purchaseReceiptService.create({
        supplier_id: 'supplier_123',
        warehouse_id: 'warehouse_123',
        receipt_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_cancel',
            quantity: 15,
            unit_price: 75,
            tracking_type: ProductTrackingType.SIMPLE,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Confirm and then cancel
      await purchaseReceiptService.confirm(receipt._id.toString(), {
        confirmed_by: 'user_123',
      } as any);

      const stockBefore = await inventoryService.getAvailableStock(
        'product_cancel',
        'warehouse_123',
      );
      expect(stockBefore).toBe(15);

      // Cancel it
      await purchaseReceiptService.cancel(receipt._id.toString(), {
        cancelled_by: 'user_123',
        cancellation_reason: 'Test cancellation',
      } as any);

      // Stock should be back to 0
      const stockAfter = await inventoryService.getAvailableStock(
        'product_cancel',
        'warehouse_123',
      );
      expect(stockAfter).toBe(0);
    });
  });

  describe('Serial Numbers - Validation', () => {
    it('should enforce serial count matches quantity', async () => {
      const receipt = {
        supplier_id: 'supplier_123',
        warehouse_id: 'warehouse_123',
        receipt_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_serial',
            quantity: 2,
            unit_price: 500,
            tracking_type: ProductTrackingType.SERIALIZED,
            serial_numbers: ['SN001'], // Only 1 serial for quantity of 2
          },
        ],
        created_by: 'user_123',
      };

      const createResult = () => purchaseReceiptService.create(receipt as any);
      expect(createResult()).rejects.toThrow(
        'Serial numbers count must match quantity',
      );
    });
  });

  describe('Cost Tracking', () => {
    it('should calculate and store cost on receipt lines', async () => {
      const receipt = await purchaseReceiptService.create({
        supplier_id: 'supplier_123',
        warehouse_id: 'warehouse_123',
        receipt_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_cost',
            quantity: 10,
            unit_price: 100,
            tracking_type: ProductTrackingType.SIMPLE,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Cost should be quantity * unit_price = 10 * 100 = 1000
      expect(receipt.lines[0].cost).toBe(1000);
      expect(receipt.total_amount).toBe(1000);
    });
  });
});
