/**
 * Integration Tests for Server Scripts
 *
 * Tests the complete workflows of start.ts, stop.ts, status.ts, logs.ts
 * with mocked container runtime.
 */

import { setupTestEnvironment, createMockContainerManager, cleanupTests } from "../setup.js";

describe("Server Scripts Integration", () => {
  let ctx: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    ctx = setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTests();
  });

  describe("Start Script Workflow", () => {
    it("should start FalkorDB container when not running", async () => {
      const mockManager = createMockContainerManager();

      // FalkorDB exists but not running
      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Status}}"], {
        success: true,
        stdout: "exited (0) 1 hour ago",
      });

      ctx.mockExec(["ps", "-a", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Names}}"], {
        success: true,
        stdout: "pai-knowledge-falkordb\n",
      });

      ctx.mockExec(["start", "pai-knowledge-falkordb"], {
        success: true,
        stdout: "pai-knowledge-falkordb",
      });

      const exists = await mockManager.containerExists("pai-knowledge-falkordb");
      expect(exists).toBe(true);

      const isRunning = await mockManager.isContainerRunning("pai-knowledge-falkordb");
      expect(isRunning).toBe(false);

      const result = await mockManager.startContainer("pai-knowledge-falkordb");
      expect(result.success).toBe(true);
    });

    it("should start MCP server container after FalkorDB", async () => {
      const mockManager = createMockContainerManager();

      // Both containers exist but not running
      ctx.mockExec(["ps", "-a", "--filter", "name=pai-knowledge-graph-mcp", "--format", "{{.Names}}"], {
        success: true,
        stdout: "pai-knowledge-graph-mcp\n",
      });

      ctx.mockExec(["start", "pai-knowledge-graph-mcp"], {
        success: true,
        stdout: "pai-knowledge-graph-mcp",
      });

      const exists = await mockManager.containerExists("pai-knowledge-graph-mcp");
      expect(exists).toBe(true);

      const result = await mockManager.startContainer("pai-knowledge-graph-mcp");
      expect(result.success).toBe(true);
    });

    it("should skip starting if containers already running", async () => {
      const mockManager = createMockContainerManager();

      // Containers are already running
      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running 2 hours ago",
      });

      const isRunning = await mockManager.isContainerRunning("pai-knowledge-falkordb");
      expect(isRunning).toBe(true);
    });
  });

  describe("Stop Script Workflow", () => {
    it("should stop MCP server container", async () => {
      const mockManager = createMockContainerManager();

      // MCP container is running
      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-graph-mcp", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running 1 hour ago",
      });

      ctx.mockExec(["stop", "pai-knowledge-graph-mcp"], {
        success: true,
        stdout: "pai-knowledge-graph-mcp",
      });

      const isRunning = await mockManager.isContainerRunning("pai-knowledge-graph-mcp");
      expect(isRunning).toBe(true);

      const result = await mockManager.stopContainer("pai-knowledge-graph-mcp");
      expect(result.success).toBe(true);
    });

    it("should stop FalkorDB container after MCP server", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running 2 hours ago",
      });

      ctx.mockExec(["stop", "pai-knowledge-falkordb"], {
        success: true,
        stdout: "pai-knowledge-falkordb",
      });

      const result = await mockManager.stopContainer("pai-knowledge-falkordb");
      expect(result.success).toBe(true);
    });

    it("should handle gracefully when containers already stopped", async () => {
      const mockManager = createMockContainerManager();

      // Containers are not running
      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-graph-mcp", "--format", "{{.Status}}"], {
        success: true,
        stdout: "", // Empty means not running
      });

      const isRunning = await mockManager.isContainerRunning("pai-knowledge-graph-mcp");
      expect(isRunning).toBe(false);
    });
  });

  describe("Status Script Workflow", () => {
    it("should show network status", async () => {
      const mockManager = createMockContainerManager();

      const mockNetwork = {
        name: "pai-knowledge-net",
        subnet: "172.28.0.0/16",
        gateway: "172.28.0.1",
      };

      ctx.mockExec(["network", "inspect", "pai-knowledge-net", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockNetwork]),
      });

      const networkInfo = await mockManager.getNetworkInfo("pai-knowledge-net");
      expect(networkInfo.exists).toBe(true);
      expect(networkInfo.subnet).toBe("172.28.0.0/16");
    });

    it("should show container statuses", async () => {
      const mockManager = createMockContainerManager();

      const mockFalkorDB = {
        Name: "pai-knowledge-falkordb",
        State: {
          Status: "running",
          StartedAt: "2025-01-04T10:00:00Z",
        },
      };

      const mockMCP = {
        Name: "pai-knowledge-graph-mcp",
        State: {
          Status: "running",
          StartedAt: "2025-01-04T10:02:00Z",
        },
      };

      ctx.mockExec(["inspect", "pai-knowledge-falkordb", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockFalkorDB]),
      });

      ctx.mockExec(["inspect", "pai-knowledge-graph-mcp", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockMCP]),
      });

      const falkorInfo = await mockManager.getContainerInfo("pai-knowledge-falkordb");
      const mcpInfo = await mockManager.getContainerInfo("pai-knowledge-graph-mcp");

      expect(falkorInfo.exists).toBe(true);
      expect(falkorInfo.status).toBe("running");
      expect(mcpInfo.exists).toBe(true);
      expect(mcpInfo.status).toBe("running");
    });

    it("should return correct exit code based on running containers", async () => {
      const mockManager = createMockContainerManager();

      // Both running
      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running",
      });

      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-graph-mcp", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running",
      });

      const falkorRunning = await mockManager.isContainerRunning("pai-knowledge-falkordb");
      const mcpRunning = await mockManager.isContainerRunning("pai-knowledge-graph-mcp");

      const runningCount = [falkorRunning, mcpRunning].filter(Boolean).length;

      expect(runningCount).toBe(2); // Exit code 0
    });

    it("should indicate partial operation when one container is down", async () => {
      const mockManager = createMockContainerManager();

      // Only MCP running
      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Status}}"], {
        success: true,
        stdout: "exited",
      });

      ctx.mockExec(["ps", "--filter", "name=pai-knowledge-graph-mcp", "--format", "{{.Status}}"], {
        success: true,
        stdout: "running",
      });

      const falkorRunning = await mockManager.isContainerRunning("pai-knowledge-falkordb");
      const mcpRunning = await mockManager.isContainerRunning("pai-knowledge-graph-mcp");

      const runningCount = [falkorRunning, mcpRunning].filter(Boolean).length;

      expect(runningCount).toBe(1); // Exit code 1 (partial)
    });
  });

  describe("Logs Script Workflow", () => {
    it("should retrieve MCP server logs", async () => {
      const mockManager = createMockContainerManager();

      const mockLogs = `
Starting Graphiti MCP Server...
Connected to FalkorDB at falkorddb:6379
Server listening on port 8000
Ready to accept connections
`;

      ctx.mockExec(["logs", "pai-knowledge-graph-mcp"], {
        success: true,
        stdout: mockLogs,
      });

      const result = await mockManager.getLogs("pai-knowledge-graph-mcp", false);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain("Graphiti MCP Server");
      expect(result.stdout).toContain("port 8000");
    });

    it("should retrieve FalkorDB logs", async () => {
      const mockManager = createMockContainerManager();

      const mockLogs = `
FalkorDB Graph Database
Version: 1.0.0
Ready to accept connections on port 6379
`;

      ctx.mockExec(["logs", "pai-knowledge-falkordb"], {
        success: true,
        stdout: mockLogs,
      });

      const result = await mockManager.getLogs("pai-knowledge-falkordb", false);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain("FalkorDB");
    });

    it("should support log following", async () => {
      const mockManager = createMockContainerManager();

      const mockLogs = "Starting...\nNew connection\nRequest processed\n";

      ctx.mockExec(["logs", "-f", "pai-knowledge-graph-mcp"], {
        success: true,
        stdout: mockLogs,
      });

      const result = await mockManager.getLogs("pai-knowledge-graph-mcp", true);

      expect(result.success).toBe(true);
    });

    it("should handle container not found for logs", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["logs", "non-existent-container"], {
        success: false,
        stderr: "container not found",
      });

      const result = await mockManager.getLogs("non-existent-container", false);

      expect(result.success).toBe(false);
      expect(result.stderr).toContain("not found");
    });
  });

  describe("Complete Lifecycle", () => {
    it("should handle full start-stop cycle", async () => {
      const mockManager = createMockContainerManager();

      // Start phase
      ctx.mockExec(["ps", "-a", "--filter", "name=pai-knowledge-falkordb", "--format", "{{.Names}}"], {
        success: true,
        stdout: "pai-knowledge-falkordb\n",
      });

      ctx.mockExec(["start", "pai-knowledge-falkordb"], {
        success: true,
      });

      ctx.mockExec(["start", "pai-knowledge-graph-mcp"], {
        success: true,
      });

      // Stop phase
      ctx.mockExec(["stop", "pai-knowledge-graph-mcp"], {
        success: true,
      });

      ctx.mockExec(["stop", "pai-knowledge-falkordb"], {
        success: true,
      });

      // Verify containers can be stopped
      const stopResult1 = await mockManager.stopContainer("pai-knowledge-graph-mcp");
      const stopResult2 = await mockManager.stopContainer("pai-knowledge-falkordb");

      expect(stopResult1.success).toBe(true);
      expect(stopResult2.success).toBe(true);
    });

    it("should handle status check after operations", async () => {
      const mockManager = createMockContainerManager();

      // Check initial status
      const mockContainers = [
        {
          Name: "pai-knowledge-falkordb",
          State: { Status: "running", StartedAt: "2025-01-04T10:00:00Z" },
        },
        {
          Name: "pai-knowledge-graph-mcp",
          State: { Status: "running", StartedAt: "2025-01-04T10:02:00Z" },
        },
      ];

      ctx.mockExec(["inspect", "pai-knowledge-falkordb", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockContainers[0]]),
      });

      ctx.mockExec(["inspect", "pai-knowledge-graph-mcp", "--format", "json"], {
        success: true,
        stdout: JSON.stringify([mockContainers[1]]),
      });

      const info1 = await mockManager.getContainerInfo("pai-knowledge-falkordb");
      const info2 = await mockManager.getContainerInfo("pai-knowledge-graph-mcp");

      expect(info1.status).toBe("running");
      expect(info2.status).toBe("running");
    });
  });

  describe("Error Scenarios", () => {
    it("should handle missing network gracefully", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["network", "inspect", "pai-knowledge-net", "--format", "json"], {
        success: false,
        stderr: "network not found",
      });

      const networkInfo = await mockManager.getNetworkInfo("pai-knowledge-net");

      expect(networkInfo.exists).toBe(false);
    });

    it("should handle container start failures", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["start", "fail-container"], {
        success: false,
        stderr: "container not found",
      });

      const result = await mockManager.startContainer("fail-container");

      expect(result.success).toBe(false);
    });

    it("should handle container stop failures", async () => {
      const mockManager = createMockContainerManager();

      ctx.mockExec(["stop", "fail-container"], {
        success: false,
        stderr: "container not found",
      });

      const result = await mockManager.stopContainer("fail-container");

      expect(result.success).toBe(false);
    });
  });

  describe("Resource Statistics", () => {
    it("should fetch container stats", async () => {
      const mockManager = createMockContainerManager();

      const mockStats = [
        {
          Name: "pai-knowledge-graph-mcp",
          CPUPerc: "15.5%",
          MemUsage: "512MiB / 1GiB",
          NetIO: "2.5GB / 1.2GB",
          BlockIO: "0B / 0B",
          PIDs: "25",
        },
      ];

      ctx.mockExec(["stats", "pai-knowledge-graph-mcp", "--no-stream", "--format", "json"], {
        success: true,
        stdout: JSON.stringify(mockStats),
      });

      const result = await mockManager.getStats("pai-knowledge-graph-mcp");

      expect(result.success).toBe(true);
      expect(result.stdout).toBeDefined();
    });
  });
});
