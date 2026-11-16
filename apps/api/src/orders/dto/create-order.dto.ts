import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// Một món trong giỏ gửi lên
export class OrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1)
  productId: number;

  @IsIn(['S', 'M', 'L'], { message: 'size chỉ được là S, M hoặc L' })
  size: 'S' | 'M' | 'L';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toppings?: string[];

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(20, { message: 'Số lượng tối đa là 20' })
  qty: number;
}

// Cả giỏ hàng gửi lên
export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng phải có ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}