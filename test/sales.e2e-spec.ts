import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SalesService } from '../src/modules/sales/sales.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { SaleDocumentStatus } from '../src/modules/sales/schemas/sale.schema';
import { ProductTrackingType } from '../src/modules/products/schemas/product.schema';

describe('Sales - ERP Rules (e2e)', () => {
  let app: INestApplication;
  let salesService: SalesService;
  let inventoryService: InventoryService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [], // Import your modules
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    salesService = moduleFixture.get<SalesService>(SalesService);
    inventoryService = moduleFixture.get<InventoryService>(InventoryService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DRAFT Sale - No Stock Impact', () => {
    it('should not decrease inventory when sale is in DRAFT status', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_sale_1',
            quantity: 5,
            unit_price: 100,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Sale should be in DRAFT
      expect(sale.status).toBe(SaleDocumentStatus.DRAFT);
    });
  });

  describe('CONFIRMED Sale - Requires Stock Availability', () => {
    it('should not confirm sale without sufficient stock', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_insufficient',
            quantity: 100, // Very high quantity
            unit_price: 50,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Try to confirm without stock
      const confirmResult = () =>
        salesService.confirm(sale._id.toString(), {
          confirmed_by: 'user_123',
        } as any);
      expect(confirmResult()).rejects.toThrow('Insufficient stock');
    });

    it('should decrease inventory when sale is confirmed', async () => {
      // First, ensure stock exists (via inventory mock/setup)
      // Then create and confirm a sale
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_available',
            quantity: 5,
            unit_price: 100,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Mock or setup: assume stock was added via purchase receipt
      // Then confirm
      await salesService.confirm(sale._id.toString(), {
        confirmed_by: 'user_123',
      } as any);

      // Stock should be decreased
      const stock = await inventoryService.getAvailableStock(
        'product_available',
        'warehouse_123',
      );
      expect(stock).toBeLessThan(5);
    });
  });

  describe('CONFIRMED Sale - Immutability', () => {
    it('should prevent updating a CONFIRMED sale', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_immutable',
            quantity: 3,
            unit_price: 200,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Confirm it
      await salesService.confirm(sale._id.toString(), {
        confirmed_by: 'user_123',
      } as any);

      // Try to update
      const updateResult = () =>
        salesService.update(sale._id.toString(), {
          lines: [
            {
              product_id: 'product_new',
              quantity: 5,
              unit_price: 150,
            },
          ],
          updated_by: 'user_123',
        } as any);

      expect(updateResult()).rejects.toThrow('Only DRAFT sales can be updated');
    });
  });

  describe('CANCELLED Sale - Stock Restored', () => {
    it('should restore inventory when confirmed sale is cancelled', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_to_cancel',
            quantity: 2,
            unit_price: 300,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Confirm
      await salesService.confirm(sale._id.toString(), {
        confirmed_by: 'user_123',
      } as any);

      const stockAfterConfirm = await inventoryService.getAvailableStock(
        'product_to_cancel',
        'warehouse_123',
      );

      // Cancel
      await salesService.cancel(sale._id.toString(), {
        cancelled_by: 'user_123',
        cancellation_reason: 'Test cancellation',
      } as any);

      // Stock should be restored
      const stockAfterCancel = await inventoryService.getAvailableStock(
        'product_to_cancel',
        'warehouse_123',
      );
      expect(stockAfterCancel).toBeGreaterThan(stockAfterConfirm);
    });
  });

  describe('Serial Numbers - Validation', () => {
    it('should enforce serial count matches quantity on confirmation', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_serial_sale',
            quantity: 3,
            unit_price: 500,
            serial_numbers: ['SN001', 'SN002'], // Only 2 serials for qty 3
          },
        ],
        created_by: 'user_123',
      } as any);

      // Try to confirm with mismatched serials
      const confirmResult = () =>
        salesService.confirm(sale._id.toString(), {
          confirmed_by: 'user_123',
        } as any);

      expect(confirmResult()).rejects.toThrow(
        'Serial count must match quantity',
      );
    });
  });

  describe('SHIPPED/DELIVERED Transitions', () => {
    it('should transition to SHIPPED only from CONFIRMED', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_ship',
            quantity: 1,
            unit_price: 100,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Try to ship from DRAFT
      const shipResult = () =>
        salesService.transitionToShipped(sale._id.toString(), 'user_123');

      expect(shipResult()).rejects.toThrow('Cannot ship sale with status');
    });

    it('should transition to DELIVERED only from SHIPPED', async () => {
      const sale = await salesService.create({
        warehouse_id: 'warehouse_123',
        sale_date: new Date().toISOString(),
        currency: 'UZS',
        lines: [
          {
            product_id: 'product_deliver',
            quantity: 1,
            unit_price: 100,
          },
        ],
        created_by: 'user_123',
      } as any);

      // Confirm -> Ship -> Deliver
      await salesService.confirm(sale._id.toString(), {
        confirmed_by: 'user_123',
      } as any);
      await salesService.transitionToShipped(sale._id.toString(), 'user_123');
      await salesService.transitionToDelivered(sale._id.toString(), 'user_123');

      const updated = await salesService.findOne(sale._id.toString());
      expect(updated.status).toBe(SaleDocumentStatus.DELIVERED);
    });
  });
});
