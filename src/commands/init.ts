import { mkdir } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import type { CommandContext } from "../cli-types";
import { createInitTemplate } from "../templates/init-template";
import { readBooleanFlag, readStringFlag } from "../utils/args";
import { toTitleCaseFromName } from "../utils/strings";

function printInitHelp(): void {
  console.log("Usage: docia init [directory] [--title <name>] [--force]");
  console.log("");
  console.log("Create a new docia project scaffold.");
}

async function writeTemplateFile(
  absolutePath: string,
  contents: string,
): Promise<void> {
  await mkdir(dirname(absolutePath), { recursive: true });
  await Bun.write(absolutePath, contents);
}

export async function runInitCommand(context: CommandContext): Promise<number> {
  if (readBooleanFlag(context.flags, "help", "h")) {
    printInitHelp();
    return 0;
  }

  const targetArg = context.positionals[0] ?? ".";
  const targetDirectory = resolve(context.cwd, targetArg);
  const directoryName = basename(targetDirectory);
  const force = readBooleanFlag(context.flags, "force", "f");
  const language = readStringFlag(context.flags, "lang", "language") ?? "en";

  const title =
    readStringFlag(context.flags, "title", "t") ?? toTitleCaseFromName(directoryName);

  const description =
    readStringFlag(context.flags, "description", "d") ??
    `${title} documentation built with docia.`;

  const templateFiles = createInitTemplate({
    title,
    description,
    language,
  });

  if (!force) {
    const conflicts: string[] = [];
    for (const file of templateFiles) {
      const absolutePath = resolve(targetDirectory, file.path);
      const exists = await Bun.file(absolutePath).exists();
      if (exists) {
        conflicts.push(file.path);
      }
    }

    if (conflicts.length > 0) {
      console.error("Cannot initialize project because files already exist:");
      for (const filePath of conflicts) {
        console.error(`- ${filePath}`);
      }
      console.error("Use --force to overwrite these files.");
      return 1;
    }
  }

  for (const file of templateFiles) {
    const absolutePath = resolve(targetDirectory, file.path);
    await writeTemplateFile(absolutePath, file.contents);
  }

  const displayDirectory = relative(context.cwd, targetDirectory) || ".";

  console.log(`Initialized docia project in ${displayDirectory}.`);
  console.log("Next steps:");
  console.log(`- cd ${displayDirectory}`);
  console.log("- docia dev");

  return 0;
}
