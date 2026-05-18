
import "dotenv/config";
import { defineConfig } from "prisma/config";
import getEnv from "./src/utils/env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getEnv("DIRECT_URL"),
  },
});
