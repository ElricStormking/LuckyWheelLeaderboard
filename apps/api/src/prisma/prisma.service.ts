import path from "node:path";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const cwd = process.cwd().replace(/\\/g, "/");
const defaultDbPath = cwd.endsWith("/apps/api")
  ? path.join(cwd, "prisma", "dev.db")
  : path.join(cwd, "apps", "api", "prisma", "dev.db");

process.env.DATABASE_URL ??= `file:${defaultDbPath.replace(/\\/g, "/")}`;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
