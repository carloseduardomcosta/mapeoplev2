import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResidentStatus } from '@prisma/client';

export class CreateResidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  address!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(ResidentStatus)
  status?: ResidentStatus;

  @IsOptional()
  @IsDateString()
  visitDate?: string;
}
