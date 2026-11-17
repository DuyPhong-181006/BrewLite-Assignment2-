import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards, ValidationPipe } from '@nestjs/common';
import { StaffKeyGuard } from './staff-key.guard';
import { StaffService } from './staff.service';
import { UpdateStatusDto } from './dto/update-status.dto';

// TV3 – Phạm Tuấn (FR-13): API cho màn quầy pha chế /staff. Mọi route cần header X-Staff-Key.
@Controller('staff/orders')
@UseGuards(StaffKeyGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  // GET /staff/orders – đơn PAID, PREPARING, READY (cũ nhất trước)
  @Get()
  list() {
    return this.staff.listActive();
  }

  // PATCH /staff/orders/:id/status { status: "PREPARING" | "READY" | "COMPLETED" }
  @Patch(':id/status')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: UpdateStatusDto,
  ) {
    return this.staff.updateStatus(id, dto.status);
  }
}
