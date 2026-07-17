import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { AdminGuard } from './admin.guard';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order, OrderItem]), PromotionsModule],
  controllers: [BackofficeController],
  providers: [BackofficeService, AdminGuard],
})
export class BackofficeModule {}
