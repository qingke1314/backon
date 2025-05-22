import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com", description: "用户邮箱" })
  @IsEmail({}, { message: "邮箱格式不正确" })
  @IsNotEmpty({ message: "邮箱不能为空" })
  email: string;

  @ApiProperty({ example: "张三", description: "用户名称" })
  @IsString({ message: "名称必须是字符串" })
  name: string;

  @ApiProperty({ example: "123456", description: "用户密码" })
  @IsString({ message: "密码必须是字符串" })
  @MinLength(6, { message: "密码长度至少为6位" })
  @IsNotEmpty({ message: "密码不能为空" })
  password: string;
}
