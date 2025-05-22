import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe());

  // 配置 Swagger
  const config = new DocumentBuilder()
    .setTitle("SecNote API")
    .setDescription("SecNote API 文档")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // 启用 CORS
  app.enableCors();

  await app.listen(3000);
}
bootstrap();
