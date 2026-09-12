import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../common/pagination';

/**
 * Query string is always strings; `@Type(() => Number)` is what makes the
 * global ValidationPipe (transform: true) coerce before `@IsInt` runs -
 * without it every `?page=2` is rejected as "must be an integer".
 */
export class ListRequestsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}
