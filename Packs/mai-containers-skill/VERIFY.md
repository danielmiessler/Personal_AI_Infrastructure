# Containers Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `$PAI_DIR/skills/Containers/` exists
- [ ] `$PAI_DIR/skills/Containers/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Containers/Tools/` contains 5 .ts files
- [ ] `$PAI_DIR/skills/Containers/Workflows/` contains 5 .md files
- [ ] `$PAI_DIR/skills/Containers/Config/` contains platform.yaml

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Checking directories..."
ls -la "$PAI_DIR/skills/Containers/"
echo ""
echo "Tools:"
ls "$PAI_DIR/skills/Containers/Tools/"
echo ""
echo "Workflows:"
ls "$PAI_DIR/skills/Containers/Workflows/"
echo ""
echo "Config:"
ls "$PAI_DIR/skills/Containers/Config/"
```

---

## Dependencies

- [ ] `mai-containers-core` package is installed
- [ ] At least one adapter is available (`mai-docker-adapter` or `mai-k8s-adapter`)

```bash
# Check for core package
bun pm ls 2>/dev/null | grep -q "mai-containers-core" && echo "✓ mai-containers-core found" || echo "✗ mai-containers-core not found"

# Check for adapters
bun pm ls 2>/dev/null | grep -q "mai-docker-adapter" && echo "✓ mai-docker-adapter found"
bun pm ls 2>/dev/null | grep -q "mai-k8s-adapter" && echo "✓ mai-k8s-adapter found"
```

---

## Platform Configuration

- [ ] Platform configuration exists

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cat "$PAI_DIR/skills/Containers/Config/platform.yaml"
```

---

## Health Check

- [ ] Provider health check succeeds

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Health.ts"
```

**Expected:**
```
Provider: kubernetes v1.x.x (or docker vX.X)
Status:   ✓ Healthy
Message:  Connected to cluster/daemon
```

---

## Tool Tests

### Namespaces Tool
- [ ] Can list namespaces

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Namespaces.ts" list
```

### Deployments Tool
- [ ] Can list deployments

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Deployments.ts" list
```

### Containers Tool
- [ ] Can list containers/pods

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Containers.ts" list
```

### Services Tool
- [ ] Can list services

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Services.ts" list
```

---

## Functional Tests

### View Container Logs
- [ ] Can retrieve container logs

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
# First, get a container name from the list
bun run "$PAI_DIR/skills/Containers/Tools/Containers.ts" list
# Then view logs (replace with actual namespace and container name)
# bun run "$PAI_DIR/skills/Containers/Tools/Containers.ts" logs default <container-name> --tail 10
```

### Resource Usage
- [ ] Can view resource usage

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Health.ts" resources default
```

### JSON Output
- [ ] Tools support JSON output

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Containers/Tools/Namespaces.ts" list --json | head -20
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | [ ] |
| Dependencies installed | [ ] |
| Platform configuration | [ ] |
| Health check passes | [ ] |
| Namespaces tool works | [ ] |
| Deployments tool works | [ ] |
| Containers tool works | [ ] |
| Services tool works | [ ] |
| Container logs work | [ ] |
| Resource usage works | [ ] |
| JSON output works | [ ] |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Containers/Tools"

echo "=== Containers Skill Verification ==="
echo ""

echo "1. Health check..."
bun run "$TOOLS/Health.ts" && echo "✓ Health OK" || echo "✗ Health FAILED"
echo ""

echo "2. Namespaces..."
bun run "$TOOLS/Namespaces.ts" list | head -5 && echo "✓ Namespaces OK" || echo "✗ Namespaces FAILED"
echo ""

echo "3. Deployments..."
bun run "$TOOLS/Deployments.ts" list | head -5 && echo "✓ Deployments OK" || echo "✗ Deployments FAILED"
echo ""

echo "4. Containers..."
bun run "$TOOLS/Containers.ts" list | head -5 && echo "✓ Containers OK" || echo "✗ Containers FAILED"
echo ""

echo "5. Services..."
bun run "$TOOLS/Services.ts" list | head -5 && echo "✓ Services OK" || echo "✗ Services FAILED"
echo ""

echo "6. Resources..."
bun run "$TOOLS/Health.ts" resources default && echo "✓ Resources OK" || echo "✗ Resources FAILED"
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### Health check fails
1. Verify the container runtime is running:
   - Docker: `docker info`
   - Kubernetes: `kubectl cluster-info`
2. Check provider configuration in `Config/platform.yaml`
3. Ensure kubeconfig or Docker socket is accessible

### "Provider does not support X" errors
Some operations are provider-specific:
- `createNamespace`, `deleteNamespace`: Kubernetes only
- `portForward`: Kubernetes only
- `execInContainer`: Both, but may require additional permissions

### Permission errors
- Docker: Ensure user is in the `docker` group
- Kubernetes: Check RBAC permissions with `kubectl auth can-i --list`
