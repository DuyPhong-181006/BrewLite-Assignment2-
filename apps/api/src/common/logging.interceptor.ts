import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

type HttpReq = { method: string; originalUrl?: string; url: string };
type HttpRes = { statusCode: number };

// TV1 – Ghi 1 dòng log cho mỗi request: "GET /products 200 12ms".
// Không ghi body hay header Authorization để log CI/production không lộ token, mật khẩu.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<HttpReq>();
    const started = Date.now();
    const line = (status: number) =>
      `${req.method} ${req.originalUrl ?? req.url} ${status} ${Date.now() - started}ms`;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(line(http.getResponse<HttpRes>().statusCode)),
        error: (err: { status?: number }) => this.logger.warn(line(err?.status ?? 500)),
      }),
    );
  }
}
