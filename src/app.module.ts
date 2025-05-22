import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { PrismaService } from "./prisma/prisma.service";
import { AuthModule } from "./auth/auth.module";
import { PostsModule } from "./posts/posts.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    PostsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
