import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "user@example.com", description: "用户邮箱" })
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string;

  @ApiProperty({ example: "123456", description: "用户密码" })
  @IsString()
  @MinLength(6, { message: "密码长度不能少于6个字符" })
  @IsNotEmpty({ message: "密码不能为空" })
  password: string;
}
