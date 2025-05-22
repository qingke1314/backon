import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "user@example.com", description: "用户邮箱" })
  @IsEmail({}, { message: "邮箱格式不正确" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string;

  @ApiProperty({ example: "123456", description: "用户密码" })
  @IsString({ message: "密码必须是字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  password: string;
}
