import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Tự động kết nối DB khi NestJS app khởi động
    await this.$connect();
  }

  async onModuleDestroy() {
    // Tự động ngắt kết nối DB khi NestJS app bị shutdown
    await this.$disconnect();
  }
}