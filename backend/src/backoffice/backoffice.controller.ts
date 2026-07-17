import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { BackofficeService } from './backoffice.service';
import { PromotionsService } from '../promotions/promotions.service';

@Controller('backoffice')
@UseGuards(AdminGuard)
export class BackofficeController {
  constructor(
    private readonly backofficeService: BackofficeService,
    private readonly promotionsService: PromotionsService,
  ) {}

  @Get('inventory')
  async getInventory() {
    return this.backofficeService.getLowStockInventory();
  }

  @Get('promotions')
  async getPromotionsPreview() {
    return this.promotionsService.previewActive();
  }

  @Get('report/sales')
  async getSalesReport(@Query('days') days?: string) {
    return this.backofficeService.getSalesReport(days ? parseInt(days, 10) : 1);
  }

  @Post('refund')
  async processRefund(
    @Body()
    body: {
      orderId: number;
      items?: { quantity: number; price: number }[];
      override?: number;
    },
  ) {
    return this.backofficeService.processRefund(
      body.orderId,
      body.items,
      body.override,
    );
  }
}
