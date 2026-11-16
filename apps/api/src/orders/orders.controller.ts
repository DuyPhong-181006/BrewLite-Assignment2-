import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

// Sau khi đăng nhập, JwtStrategy của TV5 gắn vào request: req.user = { sub: <id người dùng>, email }
type AuthRequest = { user: { sub: number; email: string } };

@Controller('orders')
@UseGuards(JwtAuthGuard) // Task 7: chưa đăng nhập (không có / sai token) -> 401, áp dụng cho cả 4 API
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Task 6: POST /orders – nhận giỏ hàng, validate, lưu đơn PENDING, trả mã đơn
  @Post()
  create(
    @Req() req: AuthRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    dto: CreateOrderDto,
  ) {
    return this.orders.create(req.user.sub, dto);
  }

  // GET /orders/me – lịch sử đơn của người đang đăng nhập
  // PHẢI đặt TRƯỚC GET /orders/:id, nếu không chữ "me" bị hiểu là :id
  @Get('me')
  mine(@Req() req: AuthRequest) {
    return this.orders.findMine(req.user.sub);
  }

  // GET /orders/:id – chi tiết 1 đơn (màn Xác nhận của TV5 dùng)
  // ParseIntPipe: id không phải số (vd "abc") -> 400
  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(req.user.sub, id);
  }

  // PATCH /orders/:id/cancel – hủy đơn (đổi trạng thái sang CANCELLED, không xóa)
  @Patch(':id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.cancel(req.user.sub, id);
  }
}
