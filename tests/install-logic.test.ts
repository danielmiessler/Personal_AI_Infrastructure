import { expect, test, describe } from "bun:test";

function stripQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

function parseEnv(content: string) {
  const config: any = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      const cleanValue = stripQuotes(value.trim());
      config[key] = cleanValue;
    }
  }
  return config;
}

describe("install logic compatibility", () => {
  test("stripQuotes should handle various quote styles", () => {
    expect(stripQuotes('"hello"')).toBe("hello");
    expect(stripQuotes("'world'")).toBe("world");
    expect(stripQuotes("noquotes")).toBe("noquotes");
  });

  test("parseEnv should handle old .env formats", () => {
    const oldEnv = `DA=Kai\nTIME_ZONE=UTC\nELEVENLABS_API_KEY="sk_123"`;
    const parsed = parseEnv(oldEnv);
    expect(parsed.DA).toBe("Kai");
    expect(parsed.TIME_ZONE).toBe("UTC");
    expect(parsed.ELEVENLABS_API_KEY).toBe("sk_123");
  });

  test("parseEnv should handle PAI_USER_NAME and PAI_USER_EMAIL", () => {
    const env = `PAI_USER_NAME=TestUser\nPAI_USER_EMAIL=user@example.com`;
    const parsed = parseEnv(env);
    expect(parsed.PAI_USER_NAME).toBe("TestUser");
    expect(parsed.PAI_USER_EMAIL).toBe("user@example.com");
  });
});
