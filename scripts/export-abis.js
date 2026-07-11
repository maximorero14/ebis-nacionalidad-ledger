import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const artifactsRoot = path.join(projectRoot, "artifacts", "contracts");
const outputRoot = path.join(projectRoot, "generated", "abis");

async function findArtifactFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return findArtifactFiles(entryPath);
      }
      if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.endsWith(".dbg.json")) {
        return [entryPath];
      }
      return [];
    })
  );

  return files.flat();
}

async function main() {
  await mkdir(outputRoot, { recursive: true });

  let artifactFiles = [];
  try {
    artifactFiles = await findArtifactFiles(artifactsRoot);
  } catch (error) {
    console.warn("No Hardhat artifacts found. Run `npm run compile` before exporting ABIs.");
    return;
  }

  for (const artifactFile of artifactFiles) {
    const artifact = JSON.parse(await readFile(artifactFile, "utf8"));
    const exportPayload = {
      contractName: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode ?? "0x",
      deployedBytecode: artifact.deployedBytecode ?? "0x"
    };
    const outputFile = path.join(outputRoot, `${artifact.contractName}.json`);
    await writeFile(outputFile, `${JSON.stringify(exportPayload, null, 2)}\n`);
    console.log(`Exported ${path.relative(projectRoot, outputFile)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
