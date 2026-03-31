const path = require("path");

function resolveDbUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (raw.startsWith("file:./") || raw.startsWith("file:../")) {
    return "file:" + path.resolve(process.cwd(), raw.replace("file:", ""));
  }
  return raw;
}

/** @type {import('@prisma/config').PrismaConfig} */
module.exports = {
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: resolveDbUrl(),
  },
};
