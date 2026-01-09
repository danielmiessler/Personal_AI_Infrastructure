# mai-docker-adapter Installation

Docker Engine adapter for the KAI Containers domain. Provides container management via the Docker Engine API, implementing the `PlatformProvider` interface from `mai-containers-core`.

## Prerequisites

- **Bun** v1.0.0 or later
- **mai-containers-core** pack installed (provides core interfaces)
- **Docker Engine** installed and running
  - Docker Desktop (macOS/Windows)
  - Docker Engine (Linux)
- Access to the Docker socket (default: `/var/run/docker.sock`)

---

## Step 1: Install Core Dependencies

Ensure `mai-containers-core` is installed first:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun install
```

---

## Step 2: Install the Adapter

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-docker-adapter"
bun install
```

This installs:
- `mai-containers-core` (linked from local Packs directory)
- `bun-types` - TypeScript types for Bun runtime
- `typescript` - TypeScript compiler

---

## Step 3: Verify Docker is Running

```bash
docker info >/dev/null 2>&1 && echo "Docker is running" || echo "Docker is NOT running"
```

If Docker is not running:
- **macOS**: Start Docker Desktop from Applications
- **Linux**: `sudo systemctl start docker`
- **Windows**: Start Docker Desktop

---

## Step 4: Verify Docker Socket Access

```bash
# Check socket exists
ls -la /var/run/docker.sock

# Test access (should show docker version)
docker version
```

If you get permission errors, see the Troubleshooting section.

---

## Step 5: Configure Provider (Optional)

If using non-default Docker configuration, create or update `providers.yaml`:

```bash
mkdir -p ~/.config/kai

cat > ~/.config/kai/providers.yaml << 'EOF'
domains:
  containers:
    primary: docker
    adapters:
      docker:
        socketPath: /var/run/docker.sock  # Default
        # Or for remote Docker:
        # host: tcp://remote-docker:2375
        composeProject: myapp  # Optional: filter by Compose project
EOF
```

---

## Step 6: Run Unit Tests

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-docker-adapter"
bun test
```

Expected: All tests pass (constructor, type exports, etc.)

---

## Step 7: Verify Installation

See `VERIFY.md` for comprehensive verification steps, or run the quick test:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-docker-adapter"

# Test health check
bun -e "
import { DockerAdapter } from './src/index.ts';

const adapter = new DockerAdapter();
const health = await adapter.healthCheck();

console.log(JSON.stringify(health, null, 2));
process.exit(health.healthy ? 0 : 1);
"
```

Expected output:
```json
{
  "healthy": true,
  "message": "Docker Engine is accessible",
  "latencyMs": <number>,
  "details": {
    "socketPath": "/var/run/docker.sock"
  }
}
```

---

## Troubleshooting

### Docker socket not found

```
Docker socket not found at /var/run/docker.sock. Is Docker running?
```

**Solutions:**
1. Start Docker Desktop or Docker Engine
2. Check socket location: `docker context ls`
3. For non-standard socket, configure in `providers.yaml`:
   ```yaml
   adapters:
     docker:
       socketPath: /path/to/docker.sock
   ```

### Permission denied on Docker socket

**Linux (permanent fix):**
```bash
# Add user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Then log out and back in, or:
newgrp docker
```

**Quick fix (temporary):**
```bash
sudo chmod 666 /var/run/docker.sock
```

### "Cannot find package 'mai-containers-core'"

Ensure the core pack is installed and the workspace is linked:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun install

cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-docker-adapter"
bun install
```

### TypeScript errors

Ensure Bun and TypeScript are up to date:
```bash
bun upgrade
```

### Health check shows unhealthy

1. Verify Docker is running: `docker info`
2. Check socket permissions: `ls -la /var/run/docker.sock`
3. Try a direct Docker command: `docker ps`

---

## File Locations

After installation, the pack structure should be:

```
mai-docker-adapter/
├── src/
│   ├── DockerAdapter.ts      # Main adapter implementation
│   └── index.ts              # Exports
├── tests/
│   └── DockerAdapter.test.ts # Unit tests
├── adapter.yaml              # Adapter metadata
├── package.json
├── tsconfig.json
├── README.md
├── INSTALL.md
└── VERIFY.md
```

---

## Namespace Mapping

Docker doesn't have native namespaces. The adapter uses these conventions:

| Source | Namespace Value |
|--------|-----------------|
| Docker Compose project | `com.docker.compose.project` label |
| Custom label | `kai.namespace` label |
| Default | `default` |

---

## Deployment Mapping

Docker doesn't have native deployments. The adapter maps:

| Source | Deployment Value |
|--------|------------------|
| Compose services | `com.docker.compose.service` label |
| Docker Swarm services | Swarm service name |
| Custom label | `kai.deployment` label |
| Standalone | Container name |

---

## Scaling Behavior

- **Compose services**: Uses `docker compose scale`
- **Standalone containers**: Cannot be scaled (returns error)

---

## Usage Examples

After installation, use the adapter programmatically:

```typescript
import { DockerAdapter } from 'mai-docker-adapter';

const adapter = new DockerAdapter();

// List all containers
const containers = await adapter.listContainers('default');

// Get container logs
const logs = await adapter.getContainerLogs('default', 'my-container', {
  tail: 100
});

// Execute command in container
const result = await adapter.execInContainer('default', 'my-container', ['ls', '-la']);

// Health check
const health = await adapter.healthCheck();
```

---

## Remote Docker Configuration

For connecting to a remote Docker daemon:

```yaml
# In providers.yaml
domains:
  containers:
    primary: docker
    adapters:
      docker:
        host: tcp://remote-docker:2375
```

**Security Note**: Only use unencrypted TCP for trusted networks. For production, use TLS:
```yaml
docker:
  host: tcp://remote-docker:2376
  tlsVerify: true
  tlsCert: ~/.docker/cert.pem
  tlsKey: ~/.docker/key.pem
  tlsCa: ~/.docker/ca.pem
```

---

## Next Steps

After installing `mai-docker-adapter`:

1. **Install the containers skill** - `mai-containers-skill` for user-facing CLI tools
2. **Test with your containers** - Run the health check and list containers
3. **Configure fallback** - Consider installing `mai-k8s-adapter` as a fallback
