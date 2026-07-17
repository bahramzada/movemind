import fs from "node:fs/promises";
import path from "node:path";

export default async function globalSetup() {
  await fs.rm(path.resolve(process.cwd(), "data/test-checkpoints"), {
    recursive: true,
    force: true,
  });
}
