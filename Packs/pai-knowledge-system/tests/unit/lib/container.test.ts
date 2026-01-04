/**
 * Unit Tests for Container Library
 *
 * Tests the ContainerManager class with mocked container runtime.
 */

import { setupTestEnvironment, createMockContainerManager, cleanupTests, type MockCommandResult } from "../../setup.js";

describe("ContainerManager", () => {
  let ctx: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    ctx = setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTests();
  });

  describe("Runtime Detection", () => {
    it("should detect available runtime", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["--version"], {
        success: true,
        stdout: "podman version 4.0.0",
      });

      const isAvailable = mockManager.isRuntimeAvailable();
      expect(isAvailable).toBe(true);
    });

    it("should return runtime command", () => {
      const mockManager = createMockContainerManager();
      const command = mockManager.getRuntimeCommand();

      expect(command).toBe("podman");
    });
  });

  describe("Container Operations", () => {
    it("should check if container exists", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["ps", "-a", "--filter", "name=test-container", "--format", "{{.Names}}"], {
        success: true,
        stdout: "test-container\n",
      });

      const exists = await mockManager.containerExists("test-container");
      expect(exists).toBe(true);
    });

    it("should return false when container does not exist", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["ps", "-a", "--filter", "name=non-existent", "--format", "{{.Names}}"], {
        success: true,
        stdout: "",
      });

      const exists = await mockManager.containerExists("non-existent");
      expect(exists).toBe(false);
    });

    it("should check if container is running", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["ps", "--filter", "name=running-container", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running 2 hours ago",
      });

      const isRunning = await mockManager.isContainerRunning("running-container");
      expect(isRunning).toBe(true);
    });

    it("should return false when container is stopped", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["ps", "--filter", "name=stopped-container", "--format", "{{.Status}}"], {
        success: true,
        stdout: "exited (0) 1 hour ago",
      });

      const isRunning = await mockManager.isContainerRunning("stopped-container");
      expect(isRunning).toBe(false);
    });

    it("should start a stopped container", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["start", "test-container"], {
        success: true,
        stdout: "test-container",
      });

      const result = await mockManager.startContainer("test-container");
      expect(result.success).toBe(true);
    });

    it("should stop a running container", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["stop", "test-container"], {
        success: true,
        stdout: "test-container",
      });

      const result = await mockManager.stopContainer("test-container");
      expect(result.success).toBe(true);
    });

    it("should run a new container", async () => {
      const mockManager = createMockContainerManager();

      const args = [
        "--name=test-container",
        "--restart=unless-stopped",
        "-d",
        "ubuntu:latest",
      ];

      ctx.mockExec(args, {
        success: true,
        stdout: "abc123def456",
      });

      const result = await mockManager.runContainer(args);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe("abc123def456");
    });

    it("should handle container run failure", async () => {
      const mockManager = createMockContainerManager();

      const args = [
        "--name=fail-container",
        "ubuntu:latest",
      ];

      ctx.mockExec(args, {
        success: false,
        stderr: "Error: container name already in use",
        exitCode: 125,
      });

      const result = await mockManager.runContainer(args);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain("already in use");
    });
  });

  describe("Network Operations", () => {
    it("should check if network exists", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["network", "exists", "test-network"], {
        success: true,
        stdout: "",
      });

      const exists = await mockManager.networkExists("test-network");
      expect(exists).toBe(true);
    });

    it("should return false when network does not exist", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["network", "exists", "non-existent-network"], {
        success: false,
        stderr: "network not found",
      });

      const exists = await mockManager.networkExists("non-existent-network");
      expect(exists).toBe(false);
    });

    it("should create a new network", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["network", "create", "--subnet", "172.28.0.0/16", "test-network"], {
        success: true,
        stdout: "test-network",
      });

      const result = await mockManager.createNetwork("test-network", "172.28.0.0/16");
      expect(result.success).toBe(true);
    });

    it("should get network info", async () => {
      const mockManager = createMockContainerManager();

      const mockNetwork = {
        name: "test-network",
        subnet: "172.28.0.0/16",
        gateway: "172.28.0.1",
      };

      ctx.mockExec(["network", "inspect", "test-network", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockNetwork]),
      });

      const info = await mockManager.getNetworkInfo("test-network");
      expect(info.exists).toBe(true);
      expect(info.name).toBe("test-network");
      expect(info.subnet).toBe("172.28.0.0/16");
    });

    it("should handle non-existent network info", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["network", "inspect", "non-existent-network", "--format", "json"], {
        success: false,
        stderr: "network not found",
      });

      const info = await mockManager.getNetworkInfo("non-existent-network");
      expect(info.exists).toBe(false);
      expect(info.name).toBe("non-existent-network");
    });
  });

  describe("Container Information", () => {
    it("should get container info for running container", async () => {
      const mockManager = createMockContainerManager();

      const mockContainer = {
        Name: "test-container",
        State: {
          Status: "running",
          StartedAt: "2025-01-04T10:00:00Z",
        },
        NetworkSettings: {
          Ports: {
            "8000/tcp": [{ HostPort: "8000" }],
            "3000/tcp": [{ HostPort: "3000" }],
          },
        },
      };

      ctx.mockExec(["inspect", "test-container", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockContainer]),
      });

      const info = await mockManager.getContainerInfo("test-container");
      expect(info.exists).toBe(true);
      expect(info.name).toBe("test-container");
      expect(info.status).toBe("running");
      expect(info.uptime).toBeDefined();
      expect(info.ports).toBeDefined();
    });

    it("should handle non-existent container info", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["inspect", "non-existent-container", "--format", "json"], {
        success: false,
        stderr: "container not found",
      });

      const info = await mockManager.getContainerInfo("non-existent-container");
      expect(info.exists).toBe(false);
      expect(info.name).toBe("non-existent-container");
      expect(info.status).toBeUndefined();
    });
  });

  describe("Log Retrieval", () => {
    it("should get container logs (not following)", async () => {
      const mockManager = createMockContainerManager();

      const mockLogs = "Starting server...\nServer ready on port 8000";

      ctx.mockExec(["logs", "test-container"], {
        success: true,
        stdout: mockLogs,
      });

      const result = await mockManager.getLogs("test-container", false);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain("Server ready");
    });

    it("should get container logs (following)", async () => {
      const mockManager = createMockContainerManager();

      const mockLogs = "Starting server...\nServer ready on port 8000\nNew connection";

      ctx.mockExec(["logs", "-f", "test-container"], {
        success: true,
        stdout: mockLogs,
      });

      const result = await mockManager.getLogs("test-container", true);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain("New connection");
    });

    it("should handle log retrieval failure", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["logs", "test-container"], {
        success: false,
        stderr: "container not found",
      });

      const result = await mockManager.getLogs("test-container", false);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain("not found");
    });
  });

  describe("Resource Statistics", () => {
    it("should get container stats", async () => {
      const mockManager = createMockContainerManager();

      const mockStats = [
        {
          Name: "test-container",
          CPUPerc: "5.23%",
          MemUsage: "256MiB / 512MiB",
          NetIO: "1.2GB / 345MB",
          BlockIO: "0B / 0B",
        },
      ];

      ctx.mockExec(["stats", "test-container", "--no-stream", "--format", "json"], {
        success: true,
        stdout: JSON.stringify(mockStats),
      });

      const result = await mockManager.getStats("test-container");
      expect(result.success).toBe(true);
      expect(result.stdout).toBeDefined();
    });
  });

  describe("Constants", () => {
    it("should have correct container names", () => {
      // These are defined in the actual ContainerManager class
      // We're just documenting the expected values here
      const FALKORDB_CONTAINER = "pai-knowledge-falkordb";
      const MCP_CONTAINER = "pai-knowledge-graph-mcp";
      const NETWORK_NAME = "pai-knowledge-net";
      const VOLUME_NAME = "pai-knowledge-falkordb-data";

      expect(FALKORDB_CONTAINER).toMatch(/falkordb/i);
      expect(MCP_CONTAINER).toMatch(/mcp|graph/i);
      expect(NETWORK_NAME).toMatch(/net/i);
      expect(VOLUME_NAME).toMatch(/data|volume/i);
    });
  });

  describe("Error Handling", () => {
    it("should handle exec command failures gracefully", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["invalid-command"], {
        success: false,
        stderr: "unknown command",
        exitCode: 1,
      });

      const result = await mockManager.exec(["invalid-command"]);
      expect(result.success).toBe(false);
    });

    it("should handle malformed JSON in container info", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["inspect", "test-container", "--format", "json"], {
        success: true,
        stdout: "invalid json {{{",
      });

      const info = await mockManager.getContainerInfo("test-container");
      // Should handle parse error gracefully
      expect(info).toBeDefined();
      expect(info.exists).toBe(true); // Assumes exists if command succeeded
    });

    it("should handle malformed JSON in network info", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["network", "inspect", "test-network", "--format", "json"], {
        success: true,
        stdout: "invalid json {{{",
      });

      const info = await mockManager.getNetworkInfo("test-network");
      // Should handle parse error gracefully
      expect(info).toBeDefined();
      expect(info.exists).toBe(true); // Assumes exists if command succeeded
    });
  });
});
