import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

type HttpReq = { headers: Record<string, string | string[] | undefined> };

// TV3 – Phạm Tuấn (FR-13): màn quầy pha chế không dùng tài khoản khách.
// Nhân viên gửi header X-Staff-Key; khóa thật đặt ở biến môi trường STAFF_KEY (Render), không ghi vào repo.
// Chưa đặt STAFF_KEY thì khóa luôn mọi request (an toàn mặc định).
@Injectable()
export class StaffKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.STAFF_KEY ?? '';
    const sent = context.switchToHttp().getRequest<HttpReq>().headers['x-staff-key'];
    const key = Array.isArray(sent) ? sent[0] : (sent ?? '');

    const a = Buffer.from(key);
    const b = Buffer.from(expected);
    // So sánh thời gian không đổi để không đoán được khóa qua tốc độ phản hồi
    if (expected === '' || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Sai mã nhân viên');
    }
    return true;
  }
}
