require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db");
(async () => {
  const dir = path.resolve("migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const client = await pool.connect();
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      console.log("Applying", f);
      await client.query(sql);
    }
    console.log("Migrations applied");
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
