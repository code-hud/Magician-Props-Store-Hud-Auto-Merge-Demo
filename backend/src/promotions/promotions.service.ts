import { Injectable } from '@nestjs/common';
import { applyDiscount, Discount, formatCurrency } from '../common/pricing.util';

export interface Promotion {
  code: string;
  description: string;
  discount: Discount;
}

export interface PromotionPreview {
  code: string;
  description: string;
  samplePayable: string;
}

/**
 * Active promotional campaigns. In production these are managed via the
 * marketing admin; kept as configuration here for the demo.
 */
const ACTIVE_PROMOTIONS: Promotion[] = [
  {
    code: 'WELCOME10',
    description: '10% off your first order',
    discount: { type: 'percentage', value: 10 },
  },
  {
    code: 'SAVE5',
    description: '$5 off any order',
    discount: { type: 'fixed', value: 5 },
  },
];

@Injectable()
export class PromotionsService {
  /** Resolve a promo code to its discount, or undefined if not active. */
  findByCode(code: string): Discount | undefined {
    return ACTIVE_PROMOTIONS.find((promo) => promo.code === code)?.discount;
  }

  /**
   * Preview the effect of each active promotion on a representative basket,
   * for the marketing dashboard. Read-only.
   */
  previewActive(sampleSubtotal = 100): PromotionPreview[] {
    return ACTIVE_PROMOTIONS.map((promo) => ({
      code: promo.code,
      description: promo.description,
      samplePayable: formatCurrency(applyDiscount(sampleSubtotal, promo.discount)),
    }));
  }
}
