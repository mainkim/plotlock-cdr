import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { seedDemoStudy } from "../lib/study-service";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path.join(dataDir, ".gitkeep"), "");
  const result = await seedDemoStudy();
  console.log(
    JSON.stringify(
      {
        ok: true,
        studyId: result.study.id,
        joinCode: result.joinCode,
        versionId: result.version.id,
        status: result.study.status
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
