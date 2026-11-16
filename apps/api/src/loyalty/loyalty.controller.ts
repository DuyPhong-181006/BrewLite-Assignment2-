import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = {
  user: { sub: number };
};

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  getMyPoints(@Req() req: AuthenticatedRequest) {
    return this.loyaltyService.getMyPoints(req.user.sub);
  }
}
