import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// TV1 – GET /health: pipeline CD gọi sau khi deploy (smoke test), Render dùng làm health check.
// version = commit SHA của image đang chạy -> biết bản mới đã lên production chưa.
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const base = {
      version: process.env.APP_VERSION ?? 'dev',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // 503: API sống nhưng không nói chuyện được với CSDL -> coi như chưa sẵn sàng
      throw new ServiceUnavailableException({ status: 'error', db: 'down', ...base });
    }
    return { status: 'ok', db: 'up', ...base };
  }
}
