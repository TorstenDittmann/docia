export type CliFlagValue = string | boolean;

export interface CommandContext {
  cwd: string;
  command: string;
  rawArgs: string[];
  positionals: string[];
  flags: Record<string, CliFlagValue>;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  run: (context: CommandContext) => Promise<number>;
}
