# mai-k8s-adapter Installation

Kubernetes adapter for container orchestration via the Kubernetes API.

## Prerequisites

- **Kubernetes cluster** (k3s, k8s, EKS, GKE, etc.)
- **kubectl** installed and configured
- **Valid kubeconfig** at `~/.kube/config` or via `KUBECONFIG` env
- **Bun** runtime installed
- **metrics-server** (optional, for resource metrics)

---

## Step 1: Verify kubectl Access

```bash
# Check kubectl is installed
kubectl version --client

# Verify cluster connectivity
kubectl cluster-info

# List available contexts
kubectl config get-contexts
```

---

## Step 2: Install the Package

```bash
cd ${PAI_DIR:-$HOME/.config/pai}/Packs/mai-k8s-adapter
bun install
```

---

## Step 3: Configure providers.yaml

Add to your `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  containers:
    primary: kubernetes
    adapters:
      kubernetes:
        kubeconfig: ~/.kube/config     # Default location
        context: my-cluster             # Optional: specific context
        namespace: default              # Optional: default namespace
        insecureSkipTlsVerify: false    # Optional: skip TLS verification
```

### Alternative: Direct Token Authentication

```yaml
domains:
  containers:
    primary: kubernetes
    adapters:
      kubernetes:
        server: https://k8s.example.com:6443
        token: ${K8S_TOKEN}            # From env or secrets provider
```

---

## Step 4: (Optional) Install metrics-server

For resource usage metrics, install metrics-server in your cluster:

```bash
# For k3s (usually pre-installed)
kubectl get deployment metrics-server -n kube-system

# For standard k8s
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## Step 5: Verify Installation

See [VERIFY.md](./VERIFY.md) for verification steps.

Quick check:

```bash
# Verify cluster access
kubectl get namespaces
```

---

## Troubleshooting

### "Unable to connect to the server"

**Cause:** Cluster is unreachable or kubeconfig is invalid.

**Solution:**
```bash
# Check kubeconfig path
echo $KUBECONFIG

# Verify config exists
cat ~/.kube/config

# Test with verbose output
kubectl cluster-info --v=8
```

### "Unauthorized" or "Forbidden"

**Cause:** Token expired or insufficient permissions.

**Solution:**
```bash
# Check current context
kubectl config current-context

# View user info
kubectl auth whoami

# For token-based auth, regenerate token
```

### "metrics not available"

**Cause:** metrics-server not installed or not ready.

**Solution:**
```bash
# Check if metrics-server is running
kubectl get pods -n kube-system | grep metrics

# Check metrics-server logs
kubectl logs -n kube-system deployment/metrics-server
```

### k3s-specific: Permission denied on kubeconfig

**Cause:** k3s config at `/etc/rancher/k3s/k3s.yaml` requires elevated permissions.

**Solution:**
```bash
# Copy config to user directory
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config
chmod 600 ~/.kube/config

# Update server address if needed (replace 127.0.0.1 with actual IP)
sed -i 's/127.0.0.1/<your-server-ip>/g' ~/.kube/config
```

---

## File Locations

```
${PAI_DIR:-$HOME/.config/pai}/
├── Packs/
│   └── mai-k8s-adapter/
│       ├── package.json
│       ├── src/
│       │   └── index.ts
│       ├── README.md
│       ├── INSTALL.md
│       └── VERIFY.md
└── providers.yaml

~/.kube/
└── config                    # Default kubeconfig location
```
