import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export interface TestProjectFixture {
  rootDir: string;
  write: (relativePath: string, contents: string) => Promise<void>;
  cleanup: () => Promise<void>;
}

export async function createTestProjectFixture(): Promise<TestProjectFixture> {
  const rootDir = await mkdtemp(join(tmpdir(), "good-docs-test-"));

  const write = async (relativePath: string, contents: string): Promise<void> => {
    const absolutePath = resolve(rootDir, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await Bun.write(absolutePath, contents);
  };

  const cleanup = async (): Promise<void> => {
    await rm(rootDir, { recursive: true, force: true });
  };

  return {
    rootDir,
    write,
    cleanup,
  };
}
