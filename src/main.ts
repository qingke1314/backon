import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe());

  // 配置 Swagger 可通过3000/api访问
  /**
   * 自动扫描你的控制器和 DTO
   * 根据装饰器（如 @ApiTags、@ApiOperation 等）生成文档
   * 包含请求/响应示例
   * 包含参数说明
   */
  const config = new DocumentBuilder()
    .setTitle("SecNote API")
    .setDescription("SecNote API 文档")
    .setVersion("1.0")
    .addBearerAuth() // 在api页面中添加JWT认证支持
    .build();
  const document = SwaggerModule.createDocument(app, config); // 创建Swagger文档
  SwaggerModule.setup("api", app, document); // 设置Swagger文档的路径和应用

  // 启用 CORS
  app.enableCors({
    origin: ["http://localhost:3000", "http://118.178.197.208:9982"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // 使用环境变量中的端口，默认使用 3001
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`应用已启动，监听端口: ${port}`);
}
bootstrap();
