import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Order } from './entities/order.entity';
import { OrderRepository } from './repositories/order.repository';
import { CartRepository } from '../cart/repositories/cart.repository';
import { applyDiscount, normalizeAmount } from '../common/pricing.util';
import { PromotionsService } from '../promotions/promotions.service';

@Injectable()
export class OrdersService {
  private readonly checkoutServiceUrl =
    process.env.CHECKOUT_SERVICE_URL || 'http://localhost:3002';

  constructor(
    private orderRepository: OrderRepository,
    private cartRepository: CartRepository,
    private promotionsService: PromotionsService,
  ) {}

  private async processCheckout(
    sessionId: string,
    totalAmount: number,
    items: { productId: number; quantity: number; price: number }[],
  ): Promise<void> {
    try {
      await axios.post(`${this.checkoutServiceUrl}/checkout`, {
        sessionId,
        totalAmount,
        items,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(
          {
            error: error.response.data?.error || 'Checkout failed',
            message: error.response.data?.message || 'Checkout service returned an error',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async createOrder(
    sessionId: string,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    totalAmount: number,
    items: { productId: number; quantity: number; price: number }[],
    promoCode?: string,
  ): Promise<Order> {
    // Apply a promotional discount when the order carries a valid promo code.
    let chargedTotal = totalAmount;
    if (promoCode) {
      const discount = this.promotionsService.findByCode(promoCode);
      if (discount) {
        chargedTotal = applyDiscount(normalizeAmount(totalAmount), discount);
      }
    }

    // Process checkout through external service
    await this.processCheckout(sessionId, chargedTotal, items);

    // Create order
    const savedOrder = await this.orderRepository.createOrder(
      sessionId,
      customerName,
      customerEmail,
      customerPhone,
      chargedTotal,
    );

    // Create order items
    for (const item of items) {
      await this.orderRepository.addOrderItem(
        savedOrder.id,
        item.productId,
        item.quantity,
        item.price,
      );
    }

    // Clear cart
    await this.cartRepository.clearCart(sessionId);

    return this.orderRepository.findById(savedOrder.id);
  }

  async getOrderHistory(sessionId: string): Promise<Order[]> {
    return this.orderRepository.findBySessionId(sessionId);
  }

  async getOrder(id: number): Promise<Order> {
    return this.orderRepository.findById(id);
  }
}
