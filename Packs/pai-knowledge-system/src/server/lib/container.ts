/**
 * Container Runtime Abstraction Layer
 *
 * Provides a unified interface for Podman and Docker container operations.
 * Automatically detects available runtime and handles compatibility differences.
 */

// Using Bun.spawn and Bun.spawnSync for container operations

// Container runtime types
export type ContainerRuntime = "podman" | "docker" | "none";

// Container status
export type ContainerStatus = "running" | "stopped" | "not-found";

// Container info
export interface ContainerInfo {
  name: string;
  status: ContainerStatus;
  exists: boolean;
  ports: string | undefined;
  uptime: string | undefined;
}

// Network info
export interface NetworkInfo {
  name: string;
  exists: boolean;
  subnet: string | undefined;
}

// Execution options
export interface ExecOptions {
  silent?: boolean;
  timeout?: number;
}

// Command result
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Container Manager class
 */
export class ContainerManager {
  private runtime: ContainerRuntime;
  private runtimeCommand: string;

  // Default container names
  static readonly FALKORDB_CONTAINER = "pai-knowledge-falkordb";
  static readonly MCP_CONTAINER = "pai-knowledge-graph-mcp";
  static readonly NETWORK_NAME = "pai-knowledge-net";
  static readonly VOLUME_NAME = "pai-knowledge-falkordb-data";

  constructor(runtime?: ContainerRuntime) {
    if (runtime) {
      this.runtime = runtime;
      this.runtimeCommand = runtime;
    } else {
      const detected = this.detectRuntime();
      this.runtime = detected;
      this.runtimeCommand = detected;
    }
  }

  /**
   * Detect available container runtime (synchronous)
   */
  detectRuntime(): ContainerRuntime {
    // Use Bun.spawnSync for synchronous detection
    try {
      const podmanCheck = Bun.spawnSync(["which", "podman"]);
      if (podmanCheck.exitCode === 0) {
        return "podman";
      }
    } catch {
      // Podman not found, try Docker
    }

    try {
      const dockerCheck = Bun.spawnSync(["which", "docker"]);
      if (dockerCheck.exitCode === 0) {
        return "docker";
      }
    } catch {
      // Docker not found
    }

    return "none";
  }

  /**
   * Get the detected runtime
   */
  getRuntime(): ContainerRuntime {
    return this.runtime;
  }

  /**
   * Get the runtime command for display purposes
   */
  getRuntimeCommand(): string {
    return this.runtimeCommand;
  }

  /**
   * Check if runtime is available
   */
  isRuntimeAvailable(): boolean {
    return this.runtime !== "none";
  }

  /**
   * Execute a container command
   */
  async exec(args: string[], options: ExecOptions = {}): Promise<CommandResult> {
    if (!this.isRuntimeAvailable()) {
      return {
        success: false,
        stdout: "",
        stderr: "No container runtime found",
        exitCode: 1,
      };
    }

    try {
      // Use Bun.spawn for proper async execution
      const proc = Bun.spawn([this.runtimeCommand, ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      return {
        success: exitCode === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error?.message || "Unknown error",
        exitCode: error?.exitCode || 1,
      };
    }
  }

  /**
   * Check if a network exists
   */
  async networkExists(networkName: string): Promise<boolean> {
    const result = await this.exec(["network", "inspect", networkName], {
      silent: true,
    });
    return result.success;
  }

  /**
   * Create a network
   */
  async createNetwork(
    networkName: string,
    subnet?: string
  ): Promise<CommandResult> {
    const args = ["network", "create", "--driver", "bridge"];

    if (subnet) {
      args.push("--subnet", subnet);
    }

    args.push(networkName);

    return await this.exec(args);
  }

  /**
   * Get network information
   */
  async getNetworkInfo(networkName: string): Promise<NetworkInfo> {
    const exists = await this.networkExists(networkName);

    if (!exists) {
      return { name: networkName, exists: false, subnet: undefined };
    }

    // Try to get subnet info
    const result = await this.exec(
      ["network", "inspect", "--format", "{{range .IPAM.Config}}{{.Subnet}}{{end}}", networkName],
      { silent: true }
    );

    return {
      name: networkName,
      exists: true,
      subnet: result.success ? result.stdout : undefined,
    };
  }

  /**
   * Check if a container exists
   */
  async containerExists(containerName: string): Promise<boolean> {
    const result = await this.exec(["ps", "-a", "--format", "{{.Names}}"], {
      silent: true,
    });

    if (!result.success) {
      return false;
    }

    const containers = result.stdout.split("\n").filter((line) => line.trim());
    return containers.includes(containerName);
  }

  /**
   * Check if a container is running
   */
  async isContainerRunning(containerName: string): Promise<boolean> {
    const result = await this.exec(["ps", "--format", "{{.Names}}"], {
      silent: true,
    });

    if (!result.success) {
      return false;
    }

    const runningContainers = result.stdout.split("\n").filter((line) => line.trim());
    return runningContainers.includes(containerName);
  }

  /**
   * Get container information
   */
  async getContainerInfo(containerName: string): Promise<ContainerInfo> {
    const exists = await this.containerExists(containerName);

    if (!exists) {
      return {
        name: containerName,
        status: "not-found",
        exists: false,
        ports: undefined,
        uptime: undefined,
      };
    }

    const isRunning = await this.isContainerRunning(containerName);

    // Get detailed status
    const statusResult = await this.exec(
      ["ps", "-a", "--filter", `name=${containerName}`, "--format", "{{.Status}}"],
      { silent: true }
    );

    // Get port mappings
    const portsResult = await this.exec(
      ["ps", "--filter", `name=${containerName}`, "--format", "{{.Ports}}"],
      { silent: true }
    );

    return {
      name: containerName,
      status: isRunning ? "running" : "stopped",
      exists: true,
      ports: portsResult.success ? portsResult.stdout : undefined,
      uptime: statusResult.success ? statusResult.stdout : undefined,
    };
  }

  /**
   * Start a container
   */
  async startContainer(containerName: string): Promise<CommandResult> {
    return await this.exec(["start", containerName]);
  }

  /**
   * Stop a container
   */
  async stopContainer(containerName: string): Promise<CommandResult> {
    return await this.exec(["stop", containerName]);
  }

  /**
   * Restart a container
   */
  async restartContainer(containerName: string): Promise<CommandResult> {
    return await this.exec(["restart", containerName]);
  }

  /**
   * Remove a container
   */
  async removeContainer(containerName: string): Promise<CommandResult> {
    return await this.exec(["rm", containerName]);
  }

  /**
   * Stop and remove a container
   */
  async stopAndRemoveContainer(containerName: string): Promise<CommandResult> {
    await this.stopContainer(containerName);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await this.removeContainer(containerName);
  }

  /**
   * Run a new container
   */
  async runContainer(args: string[]): Promise<CommandResult> {
    return await this.exec(["run", "-d", ...args]);
  }

  /**
   * Get container logs
   */
  async getLogs(containerName: string, follow = false): Promise<CommandResult> {
    const args = ["logs"];
    if (follow) {
      args.push("-f");
    }
    args.push(containerName);

    // Note: For follow=true, this will hang until interrupted
    // Caller should handle streaming appropriately
    return await this.exec(args);
  }

  /**
   * Get container stats (resource usage)
   */
  async getStats(containerName: string): Promise<CommandResult> {
    return await this.exec(
      ["stats", containerName, "--no-stream", "--format", "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"],
      { silent: true }
    );
  }

  /**
   * Create a volume
   */
  async createVolume(volumeName: string): Promise<CommandResult> {
    return await this.exec(["volume", "create", volumeName]);
  }

  /**
   * Check if a volume exists
   */
  async volumeExists(volumeName: string): Promise<boolean> {
    const result = await this.exec(["volume", "inspect", volumeName], {
      silent: true,
    });
    return result.success;
  }

  /**
   * List all containers (including stopped)
   */
  async listContainers(all = true): Promise<CommandResult> {
    return await this.exec(["ps", all ? "-a" : "", "--format", "{{.Names}}"], {
      silent: true,
    });
  }

  /**
   * Export a container to a tar file
   */
  async exportContainer(containerName: string, outputPath: string): Promise<CommandResult> {
    return await this.exec(["export", containerName, "-o", outputPath]);
  }

  /**
   * Parse container name from various formats
   */
  static normalizeContainerName(name: string): string {
    return name.replace(/^[\/*]/, "").replace(/\/$/, "");
  }
}

/**
 * Create a container manager instance with auto-detected runtime
 */
export function createContainerManager(): ContainerManager {
  return new ContainerManager();
}

/**
 * Create a container manager instance with specific runtime
 */
export function createContainerManagerWithRuntime(
  runtime: ContainerRuntime
): ContainerManager {
  if (runtime === "none") {
    throw new Error("Cannot create container manager with runtime 'none'");
  }
  return new ContainerManager(runtime);
}
