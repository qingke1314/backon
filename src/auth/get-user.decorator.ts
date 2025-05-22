import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * 自定义装饰器 获取当前登录用户
 * @param data 可选参数，用于获取用户特定属性
 * @param ctx 执行上下文
 * @returns 当前登录用户或特定属性
 */
export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  }
);
