import { PromotionsService } from '../src/promotions/promotions.service';

describe('PromotionsService', () => {
  const service = new PromotionsService();

  describe('findByCode', () => {
    it('resolves an active promo code to its discount', () => {
      expect(service.findByCode('WELCOME10')).toEqual({
        type: 'percentage',
        value: 10,
      });
    });

    it('returns undefined for an unknown code', () => {
      expect(service.findByCode('NOPE')).toBeUndefined();
    });
  });

  describe('previewActive', () => {
    it('previews active promotions with formatted payable amounts', () => {
      const preview = service.previewActive(100);
      expect(preview).toHaveLength(2);
      expect(preview[0]).toMatchObject({ code: 'WELCOME10', samplePayable: '$90.00' });
      expect(preview[1]).toMatchObject({ code: 'SAVE5', samplePayable: '$95.00' });
    });
  });
});
