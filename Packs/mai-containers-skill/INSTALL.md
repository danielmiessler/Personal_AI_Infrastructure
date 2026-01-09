# mai-containers-skill Installation

User-facing skill for container and deployment management across Docker and Kubernetes. Provides CLI tools and workflows for managing containers, pods, deployments, namespaces, and services.

## Prerequisites

- **Bun** v1.0.0 or later
- **mai-containers-core** pack installed (provides core interfaces)
- **At least one containers adapter** installed:
  - `mai-docker-adapter` for Docker environments
  - `mai-k8s-adapter` for Kubernetes environments
  - `mai-mock-containers-adapter` for testing
- **Container runtime** running:
  - Docker Desktop or Docker Engine
  - OR Kubernetes cluster (k3s, minikube, etc.)

---

## Step 1: Install Core Dependencies

Ensure `mai-containers-core` is installed first:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun install
```

---

## Step 2: Install a Container Adapter

Install at least one adapter for your container environment:

### For Docker:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-docker-adapter"
bun install
```

### For Kubernetes:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-k8s-adapter"
bun install
```

---

## Step 3: Copy Skill to PAI Skills Directory

Unlike core packs and adapters, skill packs are installed to the PAI skills directory:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
SKILL_NAME="Containers"

# Create skills directory if needed
mkdir -p "$PAI_DIR/skills/$SKILL_NAME"

# Copy skill files
cp -r "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-skill/"* "$PAI_DIR/skills/$SKILL_NAME/"

echo "Skill installed to: $PAI_DIR/skills/$SKILL_NAME"
```

---

## Step 4: Configure Provider

Create or update the providers configuration file:

```bash
mkdir -p ~/.config/kai

cat > ~/.config/kai/providers.yaml << 'EOF'
domains:
  containers:
    primary: kubernetes    # or 'docker'
    fallback: docker       # optional
    adapters:
      kubernetes:
        kubeconfig: ~/.kube/config
        context: home-cluster    # optional: specific context
        namespace: default       # optional: default namespace
      docker:
        socketPath: /var/run/docker.sock
        # Or for remote Docker:
        # host: tcp://remote-docker:2375
        composeProject: myapp    # optional: filter by Compose project
EOF
```

---

## Step 5: Configure Skill Settings (Optional)

Edit the platform configuration for skill-specific settings:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

cat > "$PAI_DIR/skills/Containers/Config/platform.yaml" << 'EOF'
default_provider: kubernetes

defaults:
  namespace: default

output:
  format: table
  timestamps: false
  tail: 100

safety:
  warn_scale_to_zero: true
  max_replicas_warning: 10
  confirm_delete: true
EOF
```

---

## Step 6: Verify Installation

See `VERIFY.md` for comprehensive verification steps, or run the quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Containers/Tools"

# Health check
bun run "$TOOLS/Health.ts"

# List namespaces
bun run "$TOOLS/Namespaces.ts" list

# List deployments
bun run "$TOOLS/Deployments.ts" list
```

---

## Troubleshooting

### "Cannot find package 'mai-containers-core'"

Ensure the core pack is installed and dependencies are linked:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-containers-core"
bun install
```

### Health check fails

1. Verify the container runtime is running:
   ```bash
   # For Docker
   docker info

   # For Kubernetes
   kubectl cluster-info
   ```

2. Check provider configuration in `providers.yaml`

3. Ensure kubeconfig or Docker socket is accessible

### "Provider does not support X" errors

Some operations are provider-specific:
- `createNamespace`, `deleteNamespace`: Kubernetes only
- `portForward`: Kubernetes only
- `execInContainer`: Both, but may require additional permissions

### Permission denied errors

**Docker:**
```bash
# Add user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Or adjust socket permissions (temporary)
sudo chmod 666 /var/run/docker.sock
```

**Kubernetes:**
```bash
# Check RBAC permissions
kubectl auth can-i --list
```

### No adapters found

Verify adapters are installed:
```bash
ls "${PAI_PACKS:-$HOME/PAI/Packs}"/mai-*-adapter/
```

---

## File Locations

After installation, the skill structure should be:

```
$PAI_DIR/skills/Containers/
├── Tools/                    # CLI tools
│   ├── Namespaces.ts         # Namespace operations
│   ├── Deployments.ts        # Deployment operations
│   ├── Containers.ts         # Container/pod operations
│   ├── Services.ts           # Service operations
│   └── Health.ts             # Health check
├── Workflows/                # Workflow documentation
│   ├── DeploymentStatus.md
│   ├── ServiceHealth.md
│   ├── ContainerLogs.md
│   ├── ScaleDeployment.md
│   └── NamespaceOverview.md
├── Config/
│   └── platform.yaml         # Skill configuration
├── SKILL.md                  # Skill definition
├── README.md
├── INSTALL.md
└── VERIFY.md
```

---

## Usage Examples

After installation, use the CLI tools:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Containers/Tools"

# Check platform health
bun run "$TOOLS/Health.ts"

# List namespaces
bun run "$TOOLS/Namespaces.ts" list

# List deployments in a namespace
bun run "$TOOLS/Deployments.ts" list default

# View container logs
bun run "$TOOLS/Containers.ts" logs default my-pod --tail 100

# Scale a deployment
bun run "$TOOLS/Deployments.ts" scale default my-app 3

# Check service health
bun run "$TOOLS/Services.ts" list default

# JSON output
bun run "$TOOLS/Namespaces.ts" list --json
```

---

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `namespaces list` | List all namespaces |
| `deployments list [ns]` | List deployments in namespace |
| `containers list [ns]` | List containers/pods in namespace |
| `containers logs [ns] [name]` | View container logs |
| `deployments scale [ns] [name] [replicas]` | Scale a deployment |
| `deployments restart [ns] [name]` | Restart a deployment |
| `services list [ns]` | List services in namespace |
| `health` | Check platform health |

---

## Next Steps

After installation:

1. **Test with your cluster/daemon**: Run `Health.ts` to verify connectivity
2. **Explore workflows**: Read the workflow docs in `Workflows/` for common use cases
3. **Integrate with PAI**: The skill will be automatically discovered by Claude Code when triggered by container-related keywords
