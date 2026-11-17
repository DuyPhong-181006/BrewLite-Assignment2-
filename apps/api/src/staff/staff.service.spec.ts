import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';

type Fn = (args?: unknown) => Promise<unknown>;

// UNIT-T17 – Nhân viên cập nhật trạng thái pha chế theo đúng máy trạng thái (FR-13, FR-08)
describe('StaffService.updateStatus', () => {
  const findUnique = jest.fn<Fn>();
  const updateMany = jest.fn<Fn>();
  const service = new StaffService({ order: { findUnique, updateMany } } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('PAID -> PREPARING: đổi được, chỉ cập nhật khi trạng thái vẫn là PAID', async () => {
    findUnique.mockResolvedValue({ status: 'PAID' });
    updateMany.mockResolvedValue({ count: 1 });

    await expect(service.updateStatus(5, 'PREPARING')).resolves.toEqual({ id: 5, from: 'PAID', status: 'PREPARING' });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 5, status: 'PAID' }, data: { status: 'PREPARING' } });
  });

  it('nhảy bước PAID -> COMPLETED bị chặn (400)', async () => {
    findUnique.mockResolvedValue({ status: 'PAID' });
    await expect(service.updateStatus(5, 'COMPLETED')).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('đơn chưa trả tiền (PENDING) không được đưa vào pha chế (400)', async () => {
    findUnique.mockResolvedValue({ status: 'PENDING' });
    await expect(service.updateStatus(6, 'PREPARING')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('đơn không tồn tại -> 404', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.updateStatus(999, 'PREPARING')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('2 nhân viên bấm cùng lúc: người sau nhận 409', async () => {
    findUnique.mockResolvedValue({ status: 'PREPARING' });
    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updateStatus(7, 'READY')).rejects.toBeInstanceOf(ConflictException);
  });
});
