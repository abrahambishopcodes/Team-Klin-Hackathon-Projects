import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import getEnv from "../utils/env";

const pool = new pg.Pool({ 
  connectionString: getEnv("DATABASE_URL") 
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;