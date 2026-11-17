import { IsIn } from 'class-validator';

// Nhân viên chỉ được đẩy đơn đi tiếp trong quy trình pha chế (FR-13).
// Hủy đơn / hoàn tiền không làm ở màn này.
export const STAFF_STATUSES = ['PREPARING', 'READY', 'COMPLETED'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export class UpdateStatusDto {
  @IsIn(STAFF_STATUSES, { message: 'status chỉ được là PREPARING, READY hoặc COMPLETED' })
  status: StaffStatus;
}
