import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { emptyDb } from "../lib/store";
import { seedDemoStudy } from "../lib/study-service";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path.join(dataDir, "haebom.json"), JSON.stringify(emptyDb(), null, 2));
  const result = await seedDemoStudy();
  console.log("Demo reset complete:", result.study.id, result.joinCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
