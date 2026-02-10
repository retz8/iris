# IRIS Backend — Deployment State

> Last updated: 2026-02-10

## Overview

The IRIS backend is deployed on **AWS EC2** and serves production traffic at `https://api.iris-codes.com`.

---

## Architecture

```
Client (VS Code Extension)
    │  HTTPS + x-api-key header
    ▼
Nginx (:443, SSL termination via Let's Encrypt)
    │  proxy_pass
    ▼
Gunicorn (:8080, 2 sync workers, 120s timeout)
    │
    ▼
Flask App (routes.py → IrisAgent)
    │
    ├──► Cache (memory LRU → disk at /var/iris/cache)
    │
    └──► OpenAI API (gpt-5-nano, single-shot inference)
```

---

## Infrastructure

| Component        | Detail                                               |
|------------------|------------------------------------------------------|
| **Instance**     | EC2 `t3.micro` (1 vCPU, 1 GB RAM, free tier)         |
| **OS**           | Amazon Linux 2023                                    |
| **AMI**          | `amazon/al2023-ami-2023` (us-east-2)                 |
| **Storage**      | 30 GB gp3 EBS (free tier)                            |
| **Static IP**    | Elastic IP associated to instance                    |
| **Domain**       | `api.iris-codes.com` → A record to Elastic IP        |
| **SSL**          | Let's Encrypt via Certbot (auto-renewal)             |
| **Region**       | us-east-2 (Ohio)                                     |

**Security Group rules:**

| Port  | Source      | Purpose                |
|-------|-------------|------------------------|
| 22    | My IP only  | SSH management         |
| 80    | 0.0.0.0/0   | HTTP → HTTPS redirect  |
| 443   | 0.0.0.0/0   | HTTPS (public)         |

**IAM Role** (attached as instance profile):

| Policy                            | Purpose                                      |
|-----------------------------------|----------------------------------------------|
| `AmazonSSMManagedInstanceCore`    | SSM Session Manager access (SSH alternative) |
| `CloudWatchAgentServerPolicy`     | CloudWatch agent: push logs and metrics      |

**AWS Agents on instance:**

| Agent              | Purpose                                                    |
|--------------------|------------------------------------------------------------|
| **SSM Agent**      | Enables AWS Systems Manager Session Manager (browser-based terminal, no SSH needed) |
| **CloudWatch Agent** | Forwards application logs to CloudWatch Logs             |

---

## Application Stack

### Gunicorn (WSGI server)

Config at `/opt/iris/backend/gunicorn_config.py`:

- Bind: `127.0.0.1:8080` (localhost only, Nginx proxies)
- Workers: 2 (sync)
- Timeout: 120s (LLM calls can be slow)
- Logs: `/var/log/iris/access.log`, `/var/log/iris/error.log`

### Nginx (reverse proxy)

Config at `/etc/nginx/conf.d/iris.conf`:

- Proxies `/api/iris/` → `http://127.0.0.1:8080`
- SSL termination with Certbot-managed certs
- `client_max_body_size 10M`
- Proxy timeouts: connect 60s, send/read 120s

### systemd (process management)

Service file at `/etc/systemd/system/iris-backend.service`:

- Runs as `ec2-user`
- Working directory: `/opt/iris/backend`
- Loads env vars from `/opt/iris/backend/.env`
- Auto-restarts on failure (`RestartSec=10`)
- Enabled at boot

---

## Authentication

Simple API key validation via the `require_api_key` decorator in `routes.py`:

1. Client sends `x-api-key` header with every request
2. Backend compares against `IRIS_API_KEY` environment variable
3. If `IRIS_API_KEY` is not set, auth is skipped (development mode)
4. Returns `401` on missing or invalid key

**Client-side:** VS Code extension reads `iris.apiKey` from user settings and passes it in the header. The extension hot-reloads when the setting changes.

---

## Cache Configuration

Two-tier cache with environment-aware paths (configured in `config.py`):

| Setting                | Production (EC2)           | Development (local)            |
|------------------------|----------------------------|--------------------------------|
| **Base path**          | `/var/iris/` (via `IRIS_CACHE_DIR` env var) | `backend/.iris/` (default) |
| **Disk cache**         | `{base}/cache/`            | `{base}/cache/`                |
| **Metrics file**       | `{base}/metrics.json`      | `{base}/metrics.json`          |
| **Memory LRU entries** | 500                        | 500                            |
| **Disk TTL**           | 30 days                    | 30 days                        |

Cache is content-addressed by SHA-256 hash of source code.

---

## Environment Variables

| Variable         | Purpose                                | Storage          | Required |
|------------------|----------------------------------------|------------------|----------|
| `OPENAI_API_KEY` | OpenAI API access for LLM inference    | AWS Secrets Manager | Yes    |
| `IRIS_API_KEY`   | API key for client authentication      | `.env` on EC2    | Yes (prod) |
| `IRIS_CACHE_DIR` | Override cache base path (default: `.iris/`) | `.env` on EC2 | No  |
| `IRIS_ENV`       | Environment label for CloudWatch EMF (`dev` / `prod`) | `.env` on EC2 | No |

`OPENAI_API_KEY` is retrieved from AWS Secrets Manager rather than stored in the `.env` file for security as "iris/openai-api-key". Other variables are set in `/opt/iris/backend/.env` and loaded by systemd.

---

## Monitoring

### CloudWatch Agent

Installed on the EC2 instance. Currently forwarding **application logs** (Gunicorn/Flask output) to CloudWatch Logs.

### CloudWatch EMF (Embedded Metric Format)

> **Status:** EMF events are being emitted to application logs, but are **not yet fully ingesting** into CloudWatch metrics. Will fix soon.

The `/analyze` endpoint emits structured EMF events via `analytics_emf.py`. These are JSON logs written to stdout, intended to be parsed by CloudWatch agent into metrics.

**Namespace:** `IRIS/Analysis`
**Dimensions:** `Environment`, `Endpoint`, `ErrorType` (failures only)

Events emitted per request:

| Event                  | Metrics                                                        |
|------------------------|----------------------------------------------------------------|
| `analysis_requested`   | `CodeLengthChars`, `EstimatedInputTokens`                      |
| `analysis_started`     | `TotalPromptTokens`, `CacheHit`                                |
| `analysis_completed`   | `TotalLatencyMs`, `InputTokens`, `OutputTokens`, `EstimatedCostUsd`, `ResponsibilityBlockCount` |
| `analysis_failed`      | `FailureCount`, `LatencyUntilFailureMs`                        |

### SSM Session Manager

Available as an SSH alternative. Connect via AWS Console or CLI:

```bash
aws ssm start-session --target <INSTANCE_ID> --region us-east-2
```

### Other log sources

- **Application logs:** `sudo journalctl -u iris-backend -f`
- **Nginx access/error:** `/var/log/nginx/`
- **Gunicorn logs:** `/var/log/iris/`
- **Cache metrics:** `/var/iris/metrics.json` (local hit/miss stats tracked by `CacheMonitor`)

---

## Operations

### Common commands

```bash
# SSH into instance
ssh -i ~/.ssh/iris-key.pem ec2-user@<ELASTIC_IP>

# Service management
sudo systemctl status iris-backend
sudo systemctl restart iris-backend
sudo journalctl -u iris-backend -f        # tail logs

# Nginx
sudo systemctl status nginx
sudo nginx -t                             # test config

# Health check
curl https://api.iris-codes.com/api/iris/health

# Cache inspection
du -sh /var/iris/cache
ls /var/iris/cache | wc -l                # cached file count

# SSL certificate status
sudo certbot certificates
```

### Deploy new code

```bash
ssh -i ~/.ssh/<key>.pem ec2-user@<ELASTIC_IP>
cd /opt/iris
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart iris-backend
curl https://api.iris-codes.com/api/iris/health   # verify
```

or just run scripts

```bash
/opt/iris/deploy.sh
```

---

## File Locations (on EC2)

| Path                                      | Purpose                  |
|-------------------------------------------|--------------------------|
| `/opt/iris/`                              | Application root (git)   |
| `/opt/iris/backend/venv/`                 | Python virtual environment |
| `/opt/iris/backend/.env`                  | Environment variables    |
| `/opt/iris/backend/gunicorn_config.py`    | Gunicorn configuration   |
| `/var/iris/cache/`                        | Disk cache (persistent)  |
| `/var/iris/metrics.json`                  | Cache monitor metrics    |
| `/var/log/iris/`                          | Gunicorn logs            |
| `/var/log/nginx/`                         | Nginx logs               |
| `/etc/systemd/system/iris-backend.service`| systemd service unit     |
| `/etc/nginx/conf.d/iris.conf`            | Nginx site config        |

---

## Migration History

| Date       | Change                     | Reason                                                |
|------------|----------------------------|-------------------------------------------------------|
| 2026-02-08 | **Lambda (Mangum + API Gateway + ECR container + Docker) → EC2 migration** | Lambda's ephemeral `/tmp` broke cache persistence; cold starts added latency; ElastiCache Redis (~$15/mo) was needed to work around it. EC2 gives persistent local cache at $0 (free tier). |
| 2026-02-10 | **EC2 instance terminated** (dev pause) | VPC charges ~$0.15/day during idle dev period. Reconstruction guide added to this doc. |

The deprecated Lambda setup is preserved for reference in [deprecated-lambda-setup.md](./deprecated-lambda-setup.md).

## EC2 Instance Recreation Guide

> Use this checklist when spinning up a fresh EC2 instance after terminating the previous one.
> The OpenAI secret in AWS Secrets Manager (`iris/openai-api-key`) and the Squarespace domain (`api.iris-codes.com`) survive instance termination — you only need to wire them back up.

### Before you terminate

- **Release the Elastic IP** (or keep it — an unassociated EIP costs ~$0.005/hr).
- Note your current `IRIS_API_KEY` value if you want to reuse it (or generate a new one later).

### 1. Create the EC2 instance

| Setting          | Value                                              |
|------------------|----------------------------------------------------|
| Region           | `us-east-2` (Ohio)                                 |
| AMI              | Amazon Linux 2023 (`amazon/al2023-ami-2023`)       |
| Instance type    | `t3.micro` (free-tier eligible)                    |
| Storage          | 30 GB gp3 (free-tier eligible)                     |
| Key pair         | Create or reuse an SSH key pair                    |
| Security group   | See rules below                                    |
| IAM instance profile | Attach a role with `AmazonSSMManagedInstanceCore` + `CloudWatchAgentServerPolicy` |

**Security group rules:**

| Port | Source    | Purpose               |
|------|-----------|------------------------|
| 22   | My IP     | SSH                    |
| 80   | 0.0.0.0/0 | HTTP → HTTPS redirect |
| 443  | 0.0.0.0/0 | HTTPS (public)        |

### 2. Elastic IP + DNS

```bash
# Allocate a new Elastic IP and associate it to the instance (or do this in the console)
aws ec2 allocate-address --region us-east-2
aws ec2 associate-address --instance-id <INSTANCE_ID> --allocation-id <ALLOC_ID> --region us-east-2
```

Then go to **Squarespace DNS** and update the **A record** for `api.iris-codes.com` to the new Elastic IP.

### 3. SSH in and install system packages

```bash
ssh -i ~/.ssh/<key>.pem ec2-user@<ELASTIC_IP>

# System packages
sudo dnf update -y
sudo dnf install -y python3 python3-pip git nginx

# Create application directories
sudo mkdir -p /opt/iris /var/iris/cache /var/log/iris
sudo chown ec2-user:ec2-user /opt/iris /var/iris /var/iris/cache /var/log/iris
```

### 4. Clone the repo and set up Python

```bash
cd /opt/iris
git clone https://github.com/<your-org>/iris.git .    # or your actual repo URL
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### 5. Create the `.env` file

Retrieve the OpenAI key from Secrets Manager:

```bash
OPENAI_KEY=$(aws secretsmanager get-secret-value \
  --secret-id iris/openai-api-key \
  --region us-east-2 \
  --query SecretString --output text)
```

Write the env file:

```bash
cat > /opt/iris/backend/.env << 'EOF'
OPENAI_API_KEY=<paste or use $OPENAI_KEY>
IRIS_API_KEY=<your-api-key>
IRIS_CACHE_DIR=/var/iris
IRIS_ENV=prod
EOF
```

### 6. Create `gunicorn_config.py`

```bash
cat > /opt/iris/backend/gunicorn_config.py << 'EOF'
bind = "127.0.0.1:8080"
workers = 2
timeout = 120
accesslog = "/var/log/iris/access.log"
errorlog = "/var/log/iris/error.log"
EOF
```

### 7. Create the systemd service

```bash
sudo tee /etc/systemd/system/iris-backend.service > /dev/null << 'EOF'
[Unit]
Description=IRIS Backend (Gunicorn)
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/opt/iris/backend
EnvironmentFile=/opt/iris/backend/.env
ExecStart=/opt/iris/backend/venv/bin/gunicorn -c gunicorn_config.py "src.server:create_app()"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable iris-backend
sudo systemctl start iris-backend
```

> **Note:** Verify the `ExecStart` `create_app()` entry point matches your `server.py`. Check with `grep "def create_app\|app = Flask" /opt/iris/backend/src/server.py`.

### 8. Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/iris.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.iris-codes.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.iris-codes.com;

    # Certbot will fill these in (step 9)
    # ssl_certificate     /etc/letsencrypt/live/api.iris-codes.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.iris-codes.com/privkey.pem;

    client_max_body_size 10M;

    location /api/iris/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 9. SSL with Certbot

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.iris-codes.com
# Follow prompts — Certbot auto-edits the nginx config with cert paths

# Verify auto-renewal timer
sudo systemctl status certbot-renew.timer
```

### 10. Install CloudWatch Agent (optional)

```bash
sudo dnf install -y amazon-cloudwatch-agent

# Create or copy the CloudWatch agent config
# (configure it to forward /var/log/iris/*.log to CloudWatch Logs)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

> SSM Agent comes pre-installed on Amazon Linux 2023 — no action needed.

### 11. Verify everything

```bash
# Service running?
sudo systemctl status iris-backend
sudo systemctl status nginx

# Health check (local)
curl http://127.0.0.1:8080/api/iris/health

# Health check (public, after DNS propagates)
curl https://api.iris-codes.com/api/iris/health

# Tail logs
sudo journalctl -u iris-backend -f
```

### Quick-reference: things that survive termination

| Resource                  | Survives? | Notes                                         |
|---------------------------|-----------|-----------------------------------------------|
| Secrets Manager secret    | Yes       | `iris/openai-api-key` — account-level         |
| Squarespace domain        | Yes       | Just update the A record IP                   |
| IAM role / policies       | Yes       | Reattach as instance profile                  |
| Security group            | Yes       | Reuse by name/ID (same VPC)                   |
| Elastic IP                | No*       | Released on termination unless you keep it     |
| EBS volume                | No*       | Deleted by default (unless "Delete on Termination" is off) |
| Disk cache (`/var/iris/`) | No        | Lost — cache rebuilds organically             |
| CloudWatch log groups     | Yes       | Historical logs remain in CloudWatch           |

---

## Notes for Dev
- custom domain is bought from Squarespace (~$5 per year, maybe only for the first year, bought at 26.02.08)
