# COGNICODE — Deployment Guide (Docker & Kubernetes)

**Document Version**: 2.0.0  
**Target Environments**: Local Development (Docker Compose) & Production Cloud (Kubernetes)

---

## 1. Quickstart: Local Multi-Container Development

COGNICODE provides a containerized multi-service environment via `compose.yaml`.

### Services Included
- **Frontend**: Nginx serving compiled React/Vite assets on port `8080`
- **Backend API**: FastAPI application on port `8000`
- **Worker**: Background queue processor running `python -m app.worker` with `JUDGE0_ENABLE_PER_PROCESS_LIMITS=true`
- **PostgreSQL 16**: Relational storage on port `5432`
- **Redis 7**: Cache and session broker on port `6379`
- **Judge0 v1.13.1**: Isolated code execution engine on internal port `2358` (paired with `sandbox-db` and `sandbox-redis`)

### Host Requirements for Sandboxed Code Execution
- Docker Desktop or Linux Docker Engine running on kernel 5.10+.
- For cgroup v2 hosts (standard on modern Linux and WSL2), ensure `JUDGE0_ENABLE_PER_PROCESS_LIMITS=true` is set. This enables namespace and chroot sandboxing using POSIX limits without requiring legacy cgroup v1 mounts.
- For cgroup v1 hosts, `JUDGE0_ENABLE_PER_PROCESS_LIMITS=false` may be configured to use kernel cgroup accounting directly.

### Launch Instructions
```bash
# 1. Clone repository and navigate to workspace
cd /path/to/Kurushektra

# 2. Copy environment templates
cp backend/.env.example backend/.env
cp Kurushektra-main/.env.example Kurushektra-main/.env

# 3. Build and launch all services in detached mode
docker compose up --build -d

# 4. Follow backend API logs
docker compose logs -f backend

# 5. Access the application:
# Frontend Web App: http://localhost:8080
# Backend API Docs: http://localhost:8000/docs
# Health Endpoint:  http://localhost:8000/api/v1/health
```

---

## 2. Production Kubernetes Deployment

### Architecture Overview
In production, COGNICODE follows a zero-trust, horizontally scalable cloud topology:

```text
               Internet
                  │ (HTTPS / TLS 1.3)
                  ▼
         [Cloud Load Balancer]
                  │
        [NGINX Ingress Controller]
         ├── /api/  ──► [cognicode-backend Service] (Port 8000)
         │                   │ (Autoscaling: HPA 2..10 pods)
         │                   ├──► [Managed PostgreSQL 16 (AWS RDS / Cloud SQL)]
         │                   └──► [Managed Redis 7 (ElastiCache / Memorystore)]
         │
         └── /      ──► [cognicode-frontend Service] (Port 80)
                             │ (Autoscaling: HPA 2..8 pods)

       [cognicode-worker Pods] (2 replicas)
         ├── Polls DB for queued jobs
         └── Dispatches to [Judge0 Sandbox Cluster] (Isolated NetworkPolicy)
```

### Manifest Structure
All manifests are organized under `k8s/` and managed via Kustomize:
- `k8s/00-namespace.yaml`: Defines `cognicode` namespace.
- `k8s/01-configmap.yaml`: Non-sensitive application configuration.
- `k8s/02-secrets.template.yaml`: Secret specification for credential injection.
- `k8s/03-network-policy.yaml`: Zero-trust network segmentation.
- `k8s/04-backend-deployment.yaml`: Stateless FastAPI API deployment with health probes and PDB.
- `k8s/05-worker-deployment.yaml`: Background execution worker with graceful draining.
- `k8s/06-frontend-deployment.yaml`: High-performance Nginx SPA deployment.
- `k8s/07-hpa.yaml`: Horizontal Pod Autoscalers based on CPU and memory utilization.
- `k8s/08-ingress.yaml`: Ingress rules with TLS and rate-limiting annotations.
- `k8s/kustomization.yaml`: Manifest bundle.

### Deploying to a Kubernetes Cluster
```bash
# 1. Switch context to target cluster
kubectl config use-context production-cluster

# 2. Inject production secrets
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: cognicode-secrets
  namespace: cognicode
type: Opaque
stringData:
  DATABASE_URL: "postgresql+psycopg2://cognicode_admin:STRONG_PASSWORD@rds-host:5432/cognicode?sslmode=require"
  JWT_SECRET: "$(openssl rand -hex 32)"
  LLM_API_KEY: "sk-proj-YOUR_OPENAI_KEY"
  JUDGE0_AUTH_TOKEN: "$(openssl rand -hex 24)"
EOF

# 3. Apply the entire manifest stack via Kustomize
kubectl apply -k k8s/

# 4. Verify deployment rollouts
kubectl rollout status deployment/cognicode-backend -n cognicode
kubectl rollout status deployment/cognicode-frontend -n cognicode
kubectl rollout status deployment/cognicode-worker -n cognicode
```

---

## 3. Local Cluster Testing (Kind / Minikube)

```bash
# 1. Create a local Kind cluster
kind create cluster --name cognicode-dev

# 2. Validate manifest compilation
kubectl kustomize k8s/

# 3. Apply manifests to Kind cluster
kubectl apply -k k8s/

# 4. Port forward to test backend locally
kubectl port-forward svc/cognicode-backend 8000:8000 -n cognicode
```

---

## 4. Zero-Downtime Releases & Rollback Procedures

### Rolling Updates
Every Deployment defines `maxSurge: 1` and `maxUnavailable: 0` along with dedicated `startupProbe`, `livenessProbe`, and `readinessProbe`. Kubernetes ensures new pods are fully initialized and report HTTP 200 before removing old replicas from traffic.

### Emergency Rollback Runbook
If a defective release is detected:
```bash
# 1. Rollback backend deployment immediately
kubectl rollout undo deployment/cognicode-backend -n cognicode

# 2. Rollback frontend deployment
kubectl rollout undo deployment/cognicode-frontend -n cognicode

# 3. If a database migration caused issues, rollback to previous Alembic revision
kubectl exec -it deployment/cognicode-backend -n cognicode -- alembic downgrade -1

# 4. Verify rollback health
kubectl get pods -n cognicode
```
