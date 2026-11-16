import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

// UNIT-T01 – GET /health trả "ok" khi CSDL trả lời, 503 khi CSDL không kết nối được
describe('HealthController', () => {
  const makeController = (queryRaw: (...args: unknown[]) => Promise<unknown>) =>
    new HealthController({ $queryRaw: queryRaw } as unknown as PrismaService);

  it('CSDL hoạt động -> status ok, db up', async () => {
    const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue([{ ok: 1 }]);
    const result = await makeController(queryRaw).check();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(typeof result.version).toBe('string');
  });

  it('CSDL lỗi -> ném 503 Service Unavailable', async () => {
    const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockRejectedValue(new Error('connection refused'));
    await expect(makeController(queryRaw).check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
