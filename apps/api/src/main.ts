import { mkdirSync } from "node:fs";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { resolveUploadRoot } from "./modules/admin/upload-storage";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    rawBody: true,
  });

  mkdirSync(resolveUploadRoot(), { recursive: true });
  app.useStaticAssets(resolveUploadRoot(), {
    prefix: "/api/uploads",
  });
  app.setGlobalPrefix("api");

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
