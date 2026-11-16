import { Controller, Get, Param, Query } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

@Controller('coupons')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // API lấy thông tin cơ bản của mã
  @Get(':code')
  async getCoupon(@Param('code') code: string) {
    return this.promotionsService.getCouponByCode(code);
  }

  // API kiểm tra mã hợp lệ và tính tiền giảm
  @Get(':code/validate')
  async validateCoupon(
    @Param('code') code: string,
    @Query('subtotal') subtotal: string,
  ) {
    return this.promotionsService.validateCoupon(code, Number(subtotal) || 0);
  }
}
