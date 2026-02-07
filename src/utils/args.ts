import type { CliFlagValue } from "../cli-types";

export interface ParsedCliInput {
  command: string | null;
  rawArgs: string[];
  positionals: string[];
  flags: Record<string, CliFlagValue>;
}

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

export function parseCliInput(argv: string[]): ParsedCliInput {
  const flags: Record<string, CliFlagValue> = {};
  const positionals: string[] = [];
  let command: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }

    if (token.startsWith("--")) {
      const pair = token.slice(2);
      if (pair.length === 0) {
        continue;
      }

      const equalsIndex = pair.indexOf("=");
      if (equalsIndex >= 0) {
        const key = pair.slice(0, equalsIndex);
        const value = pair.slice(equalsIndex + 1);
        if (key.length > 0) {
          flags[key] = value;
        }
        continue;
      }

      const nextToken = argv[index + 1];
      if (nextToken && !nextToken.startsWith("-")) {
        flags[pair] = nextToken;
        index += 1;
      } else {
        flags[pair] = true;
      }

      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const shorthand = token.slice(1);

      if (shorthand.length === 1) {
        const nextToken = argv[index + 1];
        if (nextToken && !nextToken.startsWith("-")) {
          flags[shorthand] = nextToken;
          index += 1;
        } else {
          flags[shorthand] = true;
        }
      } else {
        for (const key of shorthand) {
          flags[key] = true;
        }
      }

      continue;
    }

    if (command === null) {
      command = token;
      continue;
    }

    positionals.push(token);
  }

  return {
    command,
    rawArgs: argv,
    positionals,
    flags,
  };
}

function findFlagValue(
  flags: Record<string, CliFlagValue>,
  names: readonly string[],
): CliFlagValue | undefined {
  for (const name of names) {
    const value = flags[name];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function readStringFlag(
  flags: Record<string, CliFlagValue>,
  ...names: string[]
): string | undefined {
  const value = findFlagValue(flags, names);
  return typeof value === "string" ? value : undefined;
}

export function readBooleanFlag(
  flags: Record<string, CliFlagValue>,
  ...names: string[]
): boolean {
  const value = findFlagValue(flags, names);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) {
      return true;
    }

    if (FALSE_VALUES.has(normalized)) {
      return false;
    }
  }

  return false;
}

export function readNumberFlag(
  flags: Record<string, CliFlagValue>,
  ...names: string[]
): number | undefined {
  const value = readStringFlag(flags, ...names);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}
