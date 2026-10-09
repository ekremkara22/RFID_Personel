import "dotenv/config";
import { runAttendanceFinalizer } from "../src/lib/attendance-finalizer";
import { prisma } from "../src/lib/prisma";

async function main() {
  const summary = await runAttendanceFinalizer();
  console.log(JSON.stringify(summary));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
