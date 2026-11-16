import { BadRequestException, Body, Controller, Headers, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './payments.dto';

// Sau khi đăng nhập, JwtStrategy của TV5 gắn vào request: req.user = { sub: <id người dùng>, email }
type AuthRequest = { user: { sub: number; email: string } };

@Controller('payments')
@UseGuards(JwtAuthGuard) // chưa đăng nhập (không có / sai token) -> 401
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /payments – Task 8: thanh toán 1 đơn (Ví điện tử / Thẻ), chống trùng bằng Idempotency-Key
  @Post()
  async processPayment(
    @Req() req: AuthRequest,
    // Validate dữ liệu đầu vào (đề Mục 4.2): sai kiểu / thiếu / gửi thừa (vd amount) -> 400
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    dto: ProcessPaymentDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    // Bắt buộc có Idempotency-Key (ưu tiên header, cho phép gửi trong body)
    const idempotencyKey = (idempotencyKeyHeader ?? dto.idempotencyKey ?? '').trim();
    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu Idempotency-Key');
    }

    return this.paymentsService.processPayment(
      req.user.sub,
      dto.orderId,
      dto.method,
      idempotencyKey,
      dto.simulateFailure === true,
    );
  }
}
