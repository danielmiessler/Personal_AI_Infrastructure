import { test, expect, describe, beforeEach } from "bun:test";
import { homedir } from "os";
import {
  isGlobPattern,
  globToRegex,
  expandPath,
  matchPath,
  extractPathsFromCommand,
  detectOperation,
  checkCommand,
  type Config,
} from "../BashToolDamageControl";

describe("BashToolDamageControl", () => {
  describe("isGlobPattern", () => {
    test("returns true for patterns with *", () => {
      expect(isGlobPattern("*.txt")).toBe(true);
      expect(isGlobPattern("file*")).toBe(true);
      expect(isGlobPattern("**/test")).toBe(true);
    });

    test("returns true for patterns with ?", () => {
      expect(isGlobPattern("file?.txt")).toBe(true);
      expect(isGlobPattern("?test")).toBe(true);
    });

    test("returns true for patterns with []", () => {
      expect(isGlobPattern("[abc].txt")).toBe(true);
      expect(isGlobPattern("file[0-9]")).toBe(true);
    });

    test("returns false for plain paths", () => {
      expect(isGlobPattern("/etc/passwd")).toBe(false);
      expect(isGlobPattern("~/Documents")).toBe(false);
      expect(isGlobPattern("./file.txt")).toBe(false);
    });
  });

  describe("globToRegex", () => {
    test("converts * to match non-slash chars", () => {
      const regex = new RegExp(globToRegex("*.txt"), "i");
      expect(regex.test("file.txt")).toBe(true);
      expect(regex.test("test.txt")).toBe(true);
      expect(regex.test(".txt")).toBe(true);
    });

    test("converts ? to match single char", () => {
      const regex = new RegExp(globToRegex("file?.txt"), "i");
      expect(regex.test("file1.txt")).toBe(true);
      expect(regex.test("fileA.txt")).toBe(true);
      expect(regex.test("file.txt")).toBe(false);
    });

    test("escapes regex special chars", () => {
      const regex = new RegExp(globToRegex("file.txt"), "i");
      expect(regex.test("file.txt")).toBe(true);
      expect(regex.test("filextxt")).toBe(false); // . should be escaped
    });
  });

  describe("expandPath", () => {
    test("expands ~ to home directory", () => {
      const home = homedir();
      expect(expandPath("~")).toBe(home);
      expect(expandPath("~/Documents")).toBe(`${home}/Documents`);
      expect(expandPath("~/.ssh")).toBe(`${home}/.ssh`);
    });

    test("expands $PAI_DIR", () => {
      const paiDir = process.env.PAI_DIR || homedir() + "/.claude";
      expect(expandPath("$PAI_DIR")).toBe(paiDir);
      expect(expandPath("$PAI_DIR/hooks")).toBe(`${paiDir}/hooks`);
    });

    test("leaves absolute paths unchanged", () => {
      expect(expandPath("/etc/passwd")).toBe("/etc/passwd");
      expect(expandPath("/home/user/file")).toBe("/home/user/file");
    });

    test("leaves relative paths unchanged", () => {
      expect(expandPath("./file.txt")).toBe("./file.txt");
      expect(expandPath("../parent")).toBe("../parent");
    });
  });

  describe("matchPath", () => {
    const home = homedir();

    describe("exact matching", () => {
      test("matches exact path", () => {
        expect(matchPath("/etc/passwd", "/etc/passwd")).toBe(true);
        expect(matchPath("/etc/passwd", "/etc/shadow")).toBe(false);
      });

      test("matches path prefix", () => {
        expect(matchPath("/etc/nginx/nginx.conf", "/etc/")).toBe(true);
        expect(matchPath("/etc/passwd", "/etc")).toBe(true);
      });

      test("handles trailing slashes", () => {
        expect(matchPath("/etc/passwd", "/etc/")).toBe(true);
        expect(matchPath("/etc/nginx/test", "/etc")).toBe(true);
      });
    });

    describe("home directory matching", () => {
      test("matches ~ patterns", () => {
        expect(matchPath(`${home}/.ssh/id_rsa`, "~/.ssh/")).toBe(true);
        expect(matchPath("~/.bashrc", "~/.bashrc")).toBe(true);
      });

      test("matches home dir with full path", () => {
        expect(matchPath(`${home}/.env`, "~/.env")).toBe(true);
      });
    });

    describe("glob pattern matching", () => {
      test("matches *.ext patterns", () => {
        expect(matchPath("/path/to/file.env", "*.env")).toBe(true);
        expect(matchPath("/path/.env.local", "*.env.*")).toBe(true);
        expect(matchPath("/path/test.txt", "*.env")).toBe(false);
      });

      test("matches .env* patterns via glob", () => {
        // .env without glob chars uses prefix matching, not basename matching
        // So we need full path or glob pattern
        expect(matchPath("./.env", "./.env")).toBe(true);
        expect(matchPath("/path/.env.local", "*.env.*")).toBe(true);
      });
    });
  });

  describe("extractPathsFromCommand", () => {
    test("extracts absolute paths", () => {
      const paths = extractPathsFromCommand("cat /etc/passwd");
      expect(paths).toContain("/etc/passwd");
    });

    test("extracts home directory paths", () => {
      const paths = extractPathsFromCommand("ls ~/.ssh");
      expect(paths).toContain("~/.ssh");
    });

    test("extracts relative paths", () => {
      const paths = extractPathsFromCommand("cat ./file.txt");
      expect(paths).toContain("./file.txt");

      const paths2 = extractPathsFromCommand("cat ../parent/file");
      expect(paths2).toContain("../parent/file");
    });

    test("extracts quoted paths", () => {
      const paths = extractPathsFromCommand('cat "/path/with spaces/file"');
      expect(paths).toContain("/path/with spaces/file");

      const paths2 = extractPathsFromCommand("cat '/another/path'");
      expect(paths2).toContain("/another/path");
    });

    test("extracts multiple paths", () => {
      const paths = extractPathsFromCommand("cp /etc/hosts /tmp/hosts");
      expect(paths).toContain("/etc/hosts");
      expect(paths).toContain("/tmp/hosts");
    });

    test("deduplicates paths", () => {
      const paths = extractPathsFromCommand("cat /etc/passwd /etc/passwd");
      const passwdCount = paths.filter((p) => p === "/etc/passwd").length;
      expect(passwdCount).toBe(1);
    });

    test("ignores flags", () => {
      const paths = extractPathsFromCommand("ls -la /tmp");
      expect(paths).not.toContain("-la");
      expect(paths).toContain("/tmp");
    });
  });

  describe("detectOperation", () => {
    test("detects delete operations", () => {
      expect(detectOperation("rm file.txt")).toContain("delete");
      expect(detectOperation("rm -rf /tmp/test")).toContain("delete");
      expect(detectOperation("unlink file")).toContain("delete");
      expect(detectOperation("rmdir /tmp/dir")).toContain("delete");
    });

    test("detects write operations", () => {
      expect(detectOperation("echo test > file.txt")).toContain("write");
      expect(detectOperation("tee output.txt")).toContain("write");
    });

    test("detects edit operations", () => {
      expect(detectOperation("sed -i 's/a/b/' file")).toContain("edit");
      expect(detectOperation("perl -i -pe 's/x/y/' file")).toContain("edit");
    });

    test("detects move/copy as write", () => {
      expect(detectOperation("mv file1 file2")).toContain("write");
      expect(detectOperation("cp src dest")).toContain("write");
    });

    test("detects permission operations", () => {
      expect(detectOperation("chmod 755 file")).toContain("permission");
      expect(detectOperation("chown user:group file")).toContain("permission");
    });

    test("defaults to read for unknown operations", () => {
      expect(detectOperation("cat file")).toContain("read");
      expect(detectOperation("ls -la")).toContain("read");
      expect(detectOperation("grep pattern file")).toContain("read");
    });
  });

  describe("checkCommand", () => {
    // Create a test config
    // Note: Patterns must match how extractPathsFromCommand extracts paths
    // - ./.env extracts as "./.env"
    // - Use glob patterns (*.xxx) to match basenames
    const testConfig: Config = {
      bashToolPatterns: [
        { pattern: "rm\\s+-rf\\s+/", reason: "Catastrophic deletion" },
        { pattern: "git\\s+reset\\s+--hard", reason: "Git reset", ask: true },
      ],
      zeroAccessPaths: ["./.env", "~/.ssh/", "*.key"],
      readOnlyPaths: ["/etc/", "*lock.json"],
      noDeletePaths: ["~/.claude/", "./LICENSE"],
    };

    describe("bash pattern blocking", () => {
      test("blocks dangerous patterns", () => {
        const result = checkCommand("rm -rf /", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("Catastrophic deletion");
      });

      test("triggers ask for ask patterns", () => {
        const result = checkCommand("git reset --hard HEAD~1", testConfig);
        expect(result.blocked).toBe(false);
        expect(result.ask).toBe(true);
        expect(result.reason).toContain("Git reset");
      });
    });

    describe("zero-access path blocking", () => {
      test("blocks access to .env files with explicit path", () => {
        // Note: extractPathsFromCommand requires explicit path syntax
        const result = checkCommand("cat ./.env", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("zero-access");
      });

      test("blocks access to ~/.ssh/", () => {
        const result = checkCommand("cat ~/.ssh/id_rsa", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("zero-access");
      });

      test("blocks access to *.key files with explicit path", () => {
        // Note: extractPathsFromCommand requires explicit path syntax
        const result = checkCommand("cat /etc/ssl/server.key", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("zero-access");
      });
    });

    describe("read-only path blocking", () => {
      test("blocks writes to /etc/", () => {
        const result = checkCommand("echo test > /etc/passwd", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("read-only");
      });

      test("blocks edits to package-lock.json with explicit path", () => {
        // Note: extractPathsFromCommand requires explicit path syntax
        const result = checkCommand("sed -i 's/a/b/' ./package-lock.json", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("read-only");
      });

      test("allows reads from /etc/", () => {
        const result = checkCommand("cat /etc/passwd", testConfig);
        expect(result.blocked).toBe(false);
      });
    });

    describe("no-delete path blocking", () => {
      test("blocks deletion of ~/.claude/", () => {
        const result = checkCommand("rm -rf ~/.claude/hooks", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("no-delete");
      });

      test("blocks deletion of LICENSE with explicit path", () => {
        // Note: extractPathsFromCommand requires explicit path syntax
        const result = checkCommand("rm ./LICENSE", testConfig);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("no-delete");
      });

      test("allows reads from no-delete paths", () => {
        const result = checkCommand("cat LICENSE", testConfig);
        expect(result.blocked).toBe(false);
      });
    });

    describe("safe commands", () => {
      test("allows safe read commands", () => {
        const result = checkCommand("ls -la", testConfig);
        expect(result.blocked).toBe(false);
        expect(result.ask).toBe(false);
      });

      test("allows git status", () => {
        const result = checkCommand("git status", testConfig);
        expect(result.blocked).toBe(false);
      });

      test("allows safe file operations", () => {
        const result = checkCommand("cat README.md", testConfig);
        expect(result.blocked).toBe(false);
      });
    });
  });
});
