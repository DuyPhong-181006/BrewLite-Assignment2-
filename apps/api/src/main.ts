import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// TV1 – Đào Duy Phong: khởi động API, đọc cấu hình từ biến môi trường (xem .env.example)
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: FRONTEND_URL là danh sách domain được gọi API, cách nhau bởi dấu phẩy.
  // Không đặt (chạy local) thì cho phép mọi nguồn để điện thoại trong cùng mạng Wi-Fi gọi được.
  const origins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : true });

  // Render/Docker gửi SIGTERM khi dừng container -> đóng kết nối CSDL gọn gàng
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API chạy ở cổng ${port}, phiên bản ${process.env.APP_VERSION ?? 'dev'}`, 'Bootstrap');
}
void bootstrap();
