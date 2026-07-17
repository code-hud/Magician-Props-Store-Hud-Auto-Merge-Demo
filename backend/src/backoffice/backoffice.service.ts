import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import {
  applyPriceOverride,
  formatCurrency,
  normalizeAmount,
  roundCurrency,
  sumLineItems,
} from '../common/pricing.util';

const LOW_STOCK_THRESHOLD = 10;

export interface InventoryRow {
  id: number;
  name: string;
  stock: number;
  unitPrice: string;
  restockValue: string;
}

export interface SalesReport {
  periodDays: number;
  orderCount: number;
  grossRevenue: string;
  averageOrderValue: string;
}

export interface RefundResult {
  orderId: number;
  refundAmount: number;
  refundAmountFormatted: string;
  status: string;
}

/**
 * Internal back-office operations: inventory review, sales reporting and
 * manual refunds. Staff-only — see {@link AdminGuard}.
 */
@Injectable()
export class BackofficeService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  /** Products at or below the low-stock threshold, ordered most-urgent first. */
  async getLowStockInventory(): Promise<InventoryRow[]> {
    const products = await this.productRepo.find({
      where: { stock: LessThan(LOW_STOCK_THRESHOLD) },
      order: { stock: 'ASC' },
    });
    console.log(`[BackofficeService] ${products.length} products below low-stock threshold`);

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      unitPrice: formatCurrency(p.price),
      restockValue: formatCurrency(
        roundCurrency(p.price) * Math.max(LOW_STOCK_THRESHOLD - p.stock, 0),
      ),
    }));
  }

  /** Aggregate revenue over the trailing `sinceDays` window. */
  async getSalesReport(sinceDays = 1): Promise<SalesReport> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const orders = await this.orderRepo.find({
      where: { created_at: MoreThanOrEqual(since) },
    });

    const gross = orders.reduce(
      (acc, order) => acc + normalizeAmount(order.total_amount),
      0,
    );
    console.log(`[BackofficeService] Sales report: ${orders.length} orders, gross ${gross}`);

    return {
      periodDays: sinceDays,
      orderCount: orders.length,
      grossRevenue: formatCurrency(gross),
      averageOrderValue: formatCurrency(orders.length ? gross / orders.length : 0),
    };
  }

  /**
   * Refund an order in full, a subset of line items, or a staff-supplied
   * override amount.
   */
  async processRefund(
    orderId: number,
    items?: { quantity: number; price: number }[],
    override?: number,
  ): Promise<RefundResult> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const baseAmount =
      items && items.length > 0
        ? sumLineItems(items)
        : normalizeAmount(order.total_amount);
    const refundAmount = applyPriceOverride(baseAmount, override);

    order.status = 'refunded';
    await this.orderRepo.save(order);
    console.log(`[BackofficeService] Refunded order ${orderId}: ${refundAmount}`);

    return {
      orderId,
      refundAmount,
      refundAmountFormatted: formatCurrency(refundAmount),
      status: order.status,
    };
  }
}
