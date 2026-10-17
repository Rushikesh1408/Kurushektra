# COGNICODE — Code Execution Sandbox Security & Architecture

**Document Version**: 2.0.0  
**Security Classification**: Critical Architectural Seam  
**Decision Outcome**: **RETAIN & HARDEN (Case B/C Production Architecture)**

---

## 1. Architectural Sandbox Evaluation & Decision

### Evaluation Context
COGNICODE is an automated programming learning platform. Evaluating untrusted student code is a core capability.

After comprehensive inspection of the entire execution flow:
```text
Learner Workspace (Monaco Editor)
      │
      ▼  POST /api/v1/challenges/{id}/submissions
FastAPI Backend (Enforces Auth, Rate Limit: 20/min, Concurrency Cap: <= 3 active)
      │
      ▼  DB Transaction: Inserts Submission + ExecutionJob (status: QUEUED)
PostgreSQL Database
      │
      ▼  Claimed via SELECT ... FOR UPDATE SKIP LOCKED
Background Worker (`python -m app.worker`)
      │
      ▼  Executor Seam Protocol (`Executor.run(...)`)
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  Mode 1: Production Isolated Sandbox (`Judge0Executor`)   │
│  - Executes over internal HTTP to Judge0 v1.13            │
│  - Linux `isolate` cgroups v2 sandbox container           │
│  - Zero network egress (`internal: true`)                 │
│  - Strict memory (256MB) and CPU (2.0s) enforcement       │
│                                                           │
│  Mode 2: Local & Test Simulation (`DemoSimulationExecutor`)│
│  - Deterministic AST analysis and test evaluation         │
│  - Zero `eval()`, zero `exec()`, zero `subprocess`        │
│  - Explicitly labeled in output headers                   │
└───────────────────────────────────────────────────────────┘
```

### The Architectural Decision
1. **Never Execute on Host**: Student code is **NEVER** run inside the web backend process or worker process. There are zero instances of `exec()`, `eval()`, or host shell execution of user code.
2. **Retain Seam Protocol**: The `Executor` protocol decouples the backend from the execution provider. Fakes and simulation engines are retained for fast, offline unit testing without requiring an active Linux kernel daemon in CI.
3. **Hardened Production Sandbox**: In production environments, Judge0 v1.13 with Linux `isolate` containerization is deployed with cgroup v2 resource limits, unprivileged user namespaces, read-only root filesystems, and zero network access.
4. **Failure Safety**: If the sandbox service becomes unreachable or returns an error, the submission status transitions to `FAILED` with a generic, student-safe message. The system never grants accidental passes or partial grades during infrastructure outages.

---

## 2. Sandbox Boundary & Resource Limits

| Resource / Parameter | Limit Enforced | Enforcement Mechanism | Failure Verdict |
| :--- | :--- | :--- | :--- |
| **CPU Time** | `2.0 seconds` | `isolate --time 2.0` | `Outcome.TIMEOUT` (`timeout`) |
| **Wall-Clock Time** | `5.0 seconds` | `isolate --wall-time 5.0` | `Outcome.TIMEOUT` (`timeout`) |
| **Memory (RAM)** | `262,144 KB (256 MB)` | `isolate --mem 262144` (cgroups) | `Outcome.MEMORY_LIMIT` (`memory_limit`) |
| **Process Count** | `64 processes` | `isolate --processes 64` | `Outcome.RUNTIME_ERROR` (Blocks fork-bombs) |
| **Standard Output** | `65,536 bytes (64 KB)` | `max_file_size` & backend sanitizer | `Outcome.OUTPUT_LIMIT` (`output_limit`) |
| **Compiler Stderr** | `65,536 bytes (64 KB)` | Sanitized path scrubber | `Outcome.COMPILE_ERROR` (`compile_error`) |
| **Network Egress** | **Blocked (0.0.0.0/0 denied)** | Docker internal network / NetworkPolicy | Socket creation denied |
| **Filesystem Access** | Ephemeral chroot directory | Unprivileged user, read-only root | Access Denied |

---

## 3. Threat Modeling & Attack Mitigation

### Attack Vector 1: Host File Extraction (`/etc/passwd`, `.env`, database credentials)
- **Mitigation**: Code runs inside an isolated `isolate` directory sandbox. It cannot see host files, parent directories, or host environment variables. Database credentials exist exclusively within the API and worker pods, which reside in a separate network.

### Attack Vector 2: Fork Bombs & CPU Exhaustion (`while True: os.fork()`)
- **Mitigation**: Judge0 limits the process count to 64 via cgroup `pids.max`. Fork attempts exceeding the limit fail immediately with `EAGAIN` / `BlockingIOError`. Wall-clock timers forcibly terminate stubborn processes with `SIGKILL`.

### Attack Vector 3: Memory Flooding (`x = [0] * 10**9`)
- **Mitigation**: Memory limits (256 MB) are enforced at the Linux cgroup level (`memory.max`). When user code attempts to allocate beyond the bound, the kernel OOM killer terminates the sandbox process immediately, returning `Outcome.MEMORY_LIMIT`.

### Attack Vector 4: Data Exfiltration via Network Sockets (`urllib.request.urlopen`)
- **Mitigation**: In both Docker Compose and Kubernetes configurations, sandbox containers reside on an internal network (`sandbox_net` / NetworkPolicy `cognicode-sandbox-isolation`) with no outbound gateway route. Any attempted network connection results in immediate `ConnectionRefusedError` or `ETIMEDOUT`.

### Attack Vector 5: Terminal & Output Flooding (`while True: print("A")`)
- **Mitigation**: Judge0 sets `max_file_size` limits (SIGXFSZ). Furthermore, the COGNICODE worker truncates and sanitizes standard output to 600 characters before persisting to the database.

---

## 4. Production Deployment & Verification Runbook

### Prerequisites
- Host machine running Linux kernel 5.10+ with `cgroup v2` enabled.
- Docker Engine with unprivileged user namespace support, or Kubernetes cluster with gVisor (`runsc`) runtime class.

### Deployment Procedure
1. Deploy Judge0 sandbox containers within internal network boundary:
   ```bash
   docker compose up -d sandbox sandbox-db sandbox-redis
   ```
2. Verify sandbox health and runtime availability:
   ```bash
   curl -s http://localhost:2358/about | jq .
   ```
3. Configure COGNICODE environment variables:
   ```env
   JUDGE0_URL=http://sandbox:2358
   JUDGE0_AUTH_TOKEN=your-internal-cluster-token
   DEMO_MODE=false
   ```
4. Start background worker:
   ```bash
   python -m app.worker
   ```
5. Observe worker logs:
   ```text
   INFO worker started (mode: LIVE_JUDGE0)
   ```
