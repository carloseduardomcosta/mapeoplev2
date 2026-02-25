import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class PolygonPointDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class CreateTerritoryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  number!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolygonPointDto)
  polygon!: PolygonPointDto[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
