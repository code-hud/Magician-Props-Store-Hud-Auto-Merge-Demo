import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Product } from '../src/products/entities/product.entity';
import { Order } from '../src/orders/entities/order.entity';
import { BackofficeService } from '../src/backoffice/backoffice.service';

describe('BackofficeService', () => {
  let service: BackofficeService;
  const productRepo = { find: jest.fn() };
  const orderRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackofficeService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
      ],
    }).compile();

    service = module.get<BackofficeService>(BackofficeService);
  });

  describe('getLowStockInventory', () => {
    it('formats unit price and restock value', async () => {
      productRepo.find.mockResolvedValue([
        { id: 1, name: 'Trick Deck', stock: 3, price: '9.99' },
      ]);

      const rows = await service.getLowStockInventory();

      expect(rows).toHaveLength(1);
      expect(rows[0].unitPrice).toBe('$9.99');
      // (10 - 3) * 9.99 = 69.93
      expect(rows[0].restockValue).toBe('$69.93');
    });
  });

  describe('getSalesReport', () => {
    it('aggregates gross and average from string decimals', async () => {
      orderRepo.find.mockResolvedValue([
        { total_amount: '100.00' },
        { total_amount: '50.00' },
      ]);

      const report = await service.getSalesReport(7);

      expect(report.periodDays).toBe(7);
      expect(report.orderCount).toBe(2);
      expect(report.grossRevenue).toBe('$150.00');
      expect(report.averageOrderValue).toBe('$75.00');
    });

    it('handles an empty window without dividing by zero', async () => {
      orderRepo.find.mockResolvedValue([]);
      const report = await service.getSalesReport();
      expect(report.averageOrderValue).toBe('$0.00');
    });
  });

  describe('processRefund', () => {
    it('refunds the full order total when no items are given', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 5, total_amount: '42.00', status: 'completed' });
      orderRepo.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.processRefund(5);

      expect(result.refundAmount).toBe(42);
      expect(result.refundAmountFormatted).toBe('$42.00');
      expect(result.status).toBe('refunded');
      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'refunded' }),
      );
    });

    it('refunds only the provided line items', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 6, total_amount: '99.00', status: 'completed' });
      orderRepo.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.processRefund(6, [{ quantity: 2, price: 10 }]);

      expect(result.refundAmount).toBe(20);
    });

    it('honors a staff-supplied override amount', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 7, total_amount: '99.00', status: 'completed' });
      orderRepo.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.processRefund(7, undefined, 15);

      expect(result.refundAmount).toBe(15);
      expect(result.refundAmountFormatted).toBe('$15.00');
    });

    it('throws when the order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.processRefund(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
