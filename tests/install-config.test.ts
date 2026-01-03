import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { gatherConfig, type InstallerIO } from "../Bundles/Kai/install.ts";

// Mock IO
class MockIO implements InstallerIO {
  public answers: Record<string, string | boolean> = {};
  public logs: string[] = [];
  public errors: string[] = [];

  ask(question: string): Promise<string> {
    return Promise.resolve(String(this.answers[question] || ""));
  }

  askWithDefault(question: string, defaultValue: string): Promise<string> {
    return Promise.resolve(String(this.answers[question] || defaultValue));
  }

  askYesNo(question: string, defaultYes = true): Promise<boolean> {
    if (this.answers[question] !== undefined) {
      return Promise.resolve(Boolean(this.answers[question]));
    }
    return Promise.resolve(defaultYes);
  }

  printHeader(title: string) { this.logs.push(`HEADER: ${title}`); }
  log(message: string = "") { this.logs.push(message); }
  error(message: string) { this.errors.push(message); }
  exit(code: number) { this.logs.push(`EXIT: ${code}`); }
}

describe("Installer Logic", () => {
  
  test("Update Mode: Should preserve existing configuration", async () => {
    const mockIO = new MockIO();
    mockIO.answers = {
      "Keep existing configuration?": true
    };

    const existingConfig = {
      daName: "OldKai",
      userName: "OldUser",
      timeZone: "Old/Zone",
      userEmail: "old@test.com",
      paiDir: "/old/path/pai"
    };

    const config = await gatherConfig(mockIO, true, existingConfig);

    expect(config.daName).toBe("OldKai");
    expect(config.userName).toBe("OldUser");
    expect(config.paiDir).toBe("/old/path/pai");
  });

  test("Update Mode: Should prompt for missing values even if keeping config", async () => {
    // Scenario: Config exists but userName is missing
    const mockIO = new MockIO();
    mockIO.answers = {
      "Keep existing configuration?": true,
      "What is your name? ": "NewUser"
    };

    const existingConfig = {
      daName: "OldKai",
      // userName missing
      paiDir: "/old/path/pai"
    };

    const config = await gatherConfig(mockIO, true, existingConfig);

    expect(config.userName).toBe("NewUser");
    expect(config.paiDir).toBe("/old/path/pai");
  });

  test("Fresh Install: Should use default PAI directory if not changed", async () => {
    const mockIO = new MockIO();
    mockIO.answers = {
      "Change installation directory?": false,
      "What is your name? ": "TestUser",
      "What is your email? ": "test@email.com"
    };

    const config = await gatherConfig(mockIO, false, {});

    // Should default to standard location
    expect(config.paiDir).toContain(".config/pai");
  });

  test("Fresh Install: Should allow custom PAI directory", async () => {
    const mockIO = new MockIO();
    mockIO.answers = {
      "Change installation directory?": true,
      "Enter installation path: ": "/custom/pai/path",
      "What is your name? ": "TestUser",
      "What is your email? ": "test@email.com"
    };

    const config = await gatherConfig(mockIO, false, {});

    expect(config.paiDir).toBe("/custom/pai/path");
  });
});
