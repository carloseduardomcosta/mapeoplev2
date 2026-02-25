import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class ChangeRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;
}
