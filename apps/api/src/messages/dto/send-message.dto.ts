import { IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @IsString()
  @IsNotEmpty()
  encryptedContent!: string;

  @IsString()
  @IsNotEmpty()
  iv!: string;
}
