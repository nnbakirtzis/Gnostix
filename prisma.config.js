const path = require("path");
require("dotenv").config({ path: ".env.local" });

/** @type {import('@prisma/config').PrismaConfig} */
module.exports = {
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
