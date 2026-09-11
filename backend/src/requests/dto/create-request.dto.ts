import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  /** How many pieces the lawyer expects (drives the "2 sur 4" progress). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  requiredCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}
