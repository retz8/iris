# EC2 Deployment Plan: IRIS Backend with Local Cache

## Overview
Deploy IRIS Flask backend to AWS EC2 t3.micro instance (free tier eligible) with persistent local cache on EBS storage. This replaces the current Lambda + API Gateway architecture to solve cache persistence issues and reduce costs.

**Target Architecture:**
- EC2 t3.micro instance (1 vCPU, 1GB RAM, free tier eligible)
- Direct Flask deployment (no Docker for MVP)
- Gunicorn WSGI server (production-grade)
- Nginx reverse proxy (SSL termination, static file serving)
- Persistent cache on EBS volume (30GB gp3, free tier eligible)
- Optional: Custom domain with Let's Encrypt SSL

**Cost Estimate:**
- Free tier (10 months remaining): $0/month
- Post free tier: ~$10-11/month (t3.micro + EBS + data transfer)

---

## Phase 1: EC2 Instance Setup

### 1.1 Launch EC2 Instance
```bash
# Via AWS Console or CLI
# Instance type: t3.micro
# AMI: Amazon Linux 2023 or Ubuntu 22.04 LTS
# Storage: 30GB gp3 EBS volume (free tier: 30GB)
# Key pair: Create or use existing SSH key
```

**Security Group Configuration:**
- **SSH (22)**: Your IP only (for management)
- **HTTP (80)**: 0.0.0.0/0 (public access)
- **HTTPS (443)**: 0.0.0.0/0 (public access)
- **Custom (8080)**: Optional, for testing Flask directly

**Elastic IP:**
- Allocate and associate Elastic IP (static public address)
- Prevents IP changes on instance restart
- Free while instance is running

### 1.2 Initial Server Configuration
```bash
# SSH into instance
ssh -i ~/.ssh/your-key.pem ec2-user@<ELASTIC_IP>

# Update system packages
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install required packages
sudo yum install -y python3.11 python3-pip git nginx  # Amazon Linux
# OR
sudo apt install -y python3.11 python3-pip python3-venv git nginx  # Ubuntu
```

---

## Phase 2: Application Deployment

### 2.1 Clone Repository and Setup Environment
```bash
# Create application directory
sudo mkdir -p /opt/iris
sudo chown ec2-user:ec2-user /opt/iris  # Adjust user if Ubuntu
cd /opt/iris

# Clone repository (use HTTPS or SSH with deploy key)
git clone https://github.com/your-username/iris.git .

# Navigate to backend
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install Gunicorn (production WSGI server)
pip install gunicorn
```

### 2.2 Configure Environment Variables
```bash
# Create environment file
sudo nano /etc/environment.d/iris.conf  # systemd method
# OR
nano /opt/iris/backend/.env  # local .env file

# Add variables:
OPENAI_API_KEY=sk-...
FLASK_ENV=production
CACHE_DIR=/var/iris/cache
CACHE_TTL_DAYS=30
```

**Load environment variables:**
```bash
# For .env file, use python-dotenv (already in requirements.txt)
# For systemd, variables are loaded automatically
```

### 2.3 Setup Persistent Cache Directory
```bash
# Create cache directory on EBS volume
sudo mkdir -p /var/iris/cache
sudo chown ec2-user:ec2-user /var/iris/cache
sudo chmod 755 /var/iris/cache

# Verify EBS volume is mounted (should be at /dev/xvda1 or similar)
df -h

# Update backend/src/config.py if needed to point to /var/iris/cache
# (Current config uses .iris/ relative path - may need adjustment)
```

### 2.4 Test Flask Application
```bash
# Activate venv
cd /opt/iris/backend
source venv/bin/activate

# Test with development server (DO NOT use in production)
python -m src.server
# Should start on localhost:8080

# Test health endpoint from another terminal
curl http://localhost:8080/api/iris/health

# Stop dev server (Ctrl+C)
```

---

## Phase 3: Production Server Setup (Gunicorn)

### 3.1 Create Gunicorn Configuration
```bash
# Create Gunicorn config file
nano /opt/iris/backend/gunicorn_config.py
```

**gunicorn_config.py:**
```python
# Gunicorn configuration for IRIS backend

bind = "127.0.0.1:8080"  # Bind to localhost (Nginx will proxy)
workers = 2  # 2x CPU cores (t3.micro has 1 vCPU, so 2 workers)
worker_class = "sync"  # Synchronous workers (Flask default)
timeout = 120  # 2 minutes (LLM API calls can be slow)
keepalive = 5
loglevel = "info"
accesslog = "/var/log/iris/access.log"
errorlog = "/var/log/iris/error.log"
```

```bash
# Create log directory
sudo mkdir -p /var/log/iris
sudo chown ec2-user:ec2-user /var/log/iris
```

### 3.2 Create systemd Service
```bash
# Create systemd service file
sudo nano /etc/systemd/system/iris-backend.service
```

**iris-backend.service:**
```ini
[Unit]
Description=IRIS Backend Flask Application
After=network.target

[Service]
Type=notify
User=ec2-user
Group=ec2-user
WorkingDirectory=/opt/iris/backend
Environment="PATH=/opt/iris/backend/venv/bin"
EnvironmentFile=/opt/iris/backend/.env  # Load env variables

ExecStart=/opt/iris/backend/venv/bin/gunicorn \
    --config /opt/iris/backend/gunicorn_config.py \
    src.server:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3.3 Start Gunicorn Service
```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable iris-backend

# Start service
sudo systemctl start iris-backend

# Check status
sudo systemctl status iris-backend

# View logs
sudo journalctl -u iris-backend -f  # Follow logs
```

---

## Phase 4: Nginx Reverse Proxy Setup

### 4.1 Configure Nginx
```bash
# Create Nginx site configuration
sudo nano /etc/nginx/conf.d/iris.conf  # Amazon Linux
# OR
sudo nano /etc/nginx/sites-available/iris  # Ubuntu
```

**nginx configuration (HTTP only for testing):**
```nginx
server {
    listen 80;
    server_name _;  # Accept any hostname (or use your domain)

    # Max upload size (for large source files)
    client_max_body_size 10M;

    # Proxy to Gunicorn
    location /api/iris/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for LLM API calls
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check endpoint
    location /api/iris/health {
        proxy_pass http://127.0.0.1:8080;
    }

    # Optional: serve static files if needed later
    # location /static/ {
    #     alias /opt/iris/backend/static/;
    # }
}
```

### 4.2 Enable and Start Nginx
```bash
# For Ubuntu: enable site
sudo ln -s /etc/nginx/sites-available/iris /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4.3 Test Public Access
```bash
# From your local machine:
curl http://<ELASTIC_IP>/api/iris/health

# Should return: {"status": "healthy", "agent": "ready"}
```

---

## Phase 5: SSL/HTTPS Setup (Optional but Recommended)

### 5.1 Domain Configuration (if using custom domain)
```bash
# Point your domain's A record to EC2 Elastic IP
# Example: api.iris.example.com -> <ELASTIC_IP>

# Wait for DNS propagation (use dig or nslookup to verify)
dig api.iris.example.com
```

### 5.2 Install Certbot (Let's Encrypt)
```bash
# Amazon Linux
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu
sudo apt install -y certbot python3-certbot-nginx
```

### 5.3 Obtain SSL Certificate
```bash
# Update Nginx config with your domain
sudo nano /etc/nginx/conf.d/iris.conf
# Change: server_name _; -> server_name api.iris.example.com;

# Reload Nginx
sudo systemctl reload nginx

# Run Certbot (interactive setup)
sudo certbot --nginx -d api.iris.example.com

# Certbot will:
# 1. Verify domain ownership
# 2. Obtain certificate
# 3. Automatically update Nginx config for HTTPS
# 4. Setup auto-renewal cron job

# Test auto-renewal
sudo certbot renew --dry-run
```

### 5.4 Update Security Group
```bash
# If using HTTPS, optionally restrict HTTP:
# - HTTP (80): Redirect to HTTPS only (Certbot handles this)
# - HTTPS (443): 0.0.0.0/0 (public access)
```

---

## Phase 6: VS Code Extension Configuration

### 6.1 Update API Endpoint
```typescript
// packages/iris-vscode/src/api/irisClient.ts
// Change API endpoint from Lambda URL to EC2 domain

const API_BASE_URL = process.env.IRIS_API_URL || 'https://api.iris.example.com';
// OR for testing: 'http://<ELASTIC_IP>'
```

### 6.2 Remove API Key Header (temporary)
```typescript
// Since we're skipping auth for MVP, remove x-api-key header
// In irisClient.ts analyze() method:

const response = await fetch(`${API_BASE_URL}/api/iris/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Remove: 'x-api-key': API_KEY
  },
  body: JSON.stringify(payload),
  signal: timeoutSignal,
});
```

### 6.3 Test Extension
```bash
# Rebuild extension
cd packages/iris-vscode
npm run compile

# Test in VS Code Extension Development Host
# Open a Python/JS/TS file and trigger analysis
# Verify it connects to EC2 endpoint
```

---

## Phase 7: Migration Cutover

### 7.1 Pre-Migration Checklist
- [ ] EC2 instance running and accessible
- [ ] Gunicorn service healthy (`systemctl status iris-backend`)
- [ ] Nginx proxying correctly (`curl http://<ELASTIC_IP>/api/iris/health`)
- [ ] SSL configured (if using custom domain)
- [ ] VS Code extension updated and tested against EC2
- [ ] Cache directory exists at `/var/iris/cache`
- [ ] Environment variables loaded (check `sudo systemctl status iris-backend`)

### 7.2 Cutover Steps
1. **Deploy updated VS Code extension** with new API endpoint
2. **Test analysis** with real files (Python, JS, TS)
3. **Monitor logs** on EC2:
   ```bash
   # Application logs
   sudo journalctl -u iris-backend -f

   # Nginx access logs
   sudo tail -f /var/log/nginx/access.log

   # Gunicorn logs
   sudo tail -f /var/log/iris/error.log
   ```
4. **Verify cache persistence**:
   ```bash
   # Check cache files created
   ls -lh /var/iris/cache/

   # Restart Gunicorn
   sudo systemctl restart iris-backend

   # Re-analyze same file, should be instant (cache hit)
   ```

### 7.3 Decommission Lambda (after validation)
1. **Stop routing traffic**: Delete API Gateway routes
2. **Delete Lambda function** (or keep as backup for rollback)
3. **Delete ECR images** (optional, frees storage)
4. **Remove Lambda authorizer** (if not reusing)
5. **Update documentation**: Mark Lambda setup as deprecated

---

## Phase 8: Monitoring and Maintenance

### 8.1 Log Rotation
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/iris
```

**logrotate config:**
```
/var/log/iris/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ec2-user ec2-user
    postrotate
        systemctl reload iris-backend
    endscript
}
```

### 8.2 Automated Deployments (optional)
```bash
# Create deployment script
nano /opt/iris/deploy.sh
```

**deploy.sh:**
```bash
#!/bin/bash
set -e

echo "Pulling latest code..."
cd /opt/iris
git pull origin main

echo "Installing dependencies..."
cd backend
source venv/bin/activate
pip install -r requirements.txt

echo "Restarting service..."
sudo systemctl restart iris-backend

echo "Deployment complete!"
sudo systemctl status iris-backend
```

```bash
chmod +x /opt/iris/deploy.sh

# Run deployment
/opt/iris/deploy.sh
```

### 8.3 Monitoring Checklist
- [ ] **Gunicorn health**: `sudo systemctl status iris-backend`
- [ ] **Nginx health**: `sudo systemctl status nginx`
- [ ] **Disk usage**: `df -h` (monitor EBS storage)
- [ ] **Cache size**: `du -sh /var/iris/cache`
- [ ] **Error logs**: `sudo journalctl -u iris-backend --since "1 hour ago"`
- [ ] **SSL expiration**: `sudo certbot certificates` (Let's Encrypt auto-renews)

### 8.4 Backup Strategy
```bash
# Backup cache (optional, can rebuild from LLM)
tar -czf iris-cache-backup.tar.gz /var/iris/cache

# Backup environment config
cp /opt/iris/backend/.env /opt/iris/backend/.env.backup
```

---

## Phase 9: Future Enhancements

### 9.1 Authentication (GitHub OAuth)
- Implement OAuth flow in Flask backend
- Update VS Code extension to use OAuth tokens
- Remove API key validation

### 9.2 Horizontal Scaling (if needed)
- Add Application Load Balancer (ALB)
- Launch multiple t3.micro instances
- Use ElastiCache Redis for shared cache across instances

### 9.3 Docker Migration
- Containerize Flask app with Docker
- Use docker-compose for multi-service orchestration
- Simplifies scaling and blue-green deployments

### 9.4 CI/CD Pipeline
- GitHub Actions workflow to:
  1. Run tests
  2. Build artifact
  3. SSH into EC2 and run deploy.sh
  4. Notify on success/failure

---

## Troubleshooting

### Gunicorn won't start
```bash
# Check logs
sudo journalctl -u iris-backend -n 50

# Common issues:
# - Missing .env file: Create /opt/iris/backend/.env
# - Port already in use: Check with `sudo lsof -i :8080`
# - Import errors: Verify venv activated and dependencies installed
```

### Nginx 502 Bad Gateway
```bash
# Verify Gunicorn is running
sudo systemctl status iris-backend

# Check Gunicorn is listening on 127.0.0.1:8080
sudo netstat -tlnp | grep 8080

# Test direct connection
curl http://127.0.0.1:8080/api/iris/health
```

### SSL certificate issues
```bash
# Verify domain resolves to EC2 IP
dig api.iris.example.com

# Check Nginx config
sudo nginx -t

# Re-run Certbot
sudo certbot --nginx -d api.iris.example.com --force-renewal
```

### Cache not persisting
```bash
# Verify cache directory exists and is writable
ls -ld /var/iris/cache
sudo chown ec2-user:ec2-user /var/iris/cache

# Check config.py points to correct cache path
grep -r "cache" /opt/iris/backend/src/config.py

# Verify environment variables loaded
sudo systemctl show iris-backend | grep CACHE_DIR
```

---

## Cost Monitoring

### Free Tier Limits (first 12 months, 10 months remaining)
- **EC2**: 750 hours/month of t3.micro (enough for 1 instance 24/7)
- **EBS**: 30GB gp3 storage
- **Data Transfer**: 100GB/month outbound

### Post-Free Tier Costs
- **t3.micro**: ~$0.0104/hour × 730 hours = ~$7.60/month
- **EBS 30GB**: ~$2.40/month
- **Data Transfer**: ~$0.09/GB after 100GB free
- **Elastic IP**: $0 while attached to running instance

**Total**: ~$10-11/month after free tier expires

### Cost Optimization Tips
- Stop instance during extended non-use (free tier hours still count)
- Delete unused EBS snapshots
- Monitor data transfer (cache hits reduce LLM API costs)

---

## Appendix

### A. Useful Commands
```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@<ELASTIC_IP>

# View Gunicorn logs
sudo journalctl -u iris-backend -f

# Restart services
sudo systemctl restart iris-backend
sudo systemctl restart nginx

# Check disk usage
df -h
du -sh /var/iris/cache

# Check open ports
sudo netstat -tlnp

# Test API endpoints
curl http://<ELASTIC_IP>/api/iris/health
```

### B. File Locations
- **Application**: `/opt/iris/`
- **Virtual env**: `/opt/iris/backend/venv/`
- **Cache**: `/var/iris/cache/`
- **Logs**: `/var/log/iris/` (app), `/var/log/nginx/` (web server)
- **Config**: `/opt/iris/backend/.env`, `/opt/iris/backend/gunicorn_config.py`
- **systemd service**: `/etc/systemd/system/iris-backend.service`
- **Nginx config**: `/etc/nginx/conf.d/iris.conf`

### C. Security Best Practices
- Use SSH key authentication (disable password auth)
- Restrict SSH to your IP in security group
- Keep system packages updated (`sudo yum update -y`)
- Use HTTPS with valid SSL certificate
- Store secrets in environment variables, not code
- Implement authentication (GitHub OAuth planned)
- Enable CloudWatch monitoring (optional)

---

## Summary

This plan provides a complete path from Lambda + API Gateway to EC2 + local cache:
1. **Phase 1-2**: Instance setup and application deployment
2. **Phase 3-4**: Production-grade WSGI server (Gunicorn) and reverse proxy (Nginx)
3. **Phase 5**: Optional SSL/HTTPS with Let's Encrypt
4. **Phase 6-7**: Extension update and migration cutover
5. **Phase 8-9**: Monitoring, maintenance, and future enhancements

**Key Benefits:**
- ✅ Persistent cache (solves Lambda ephemeral storage issue)
- ✅ Cost savings ($0 with free tier vs $15-17/month Lambda + Redis)
- ✅ Faster cache access (local filesystem vs network storage)
- ✅ Simpler architecture (no Mangum adapter, no containerization)
- ✅ Full control over environment and configuration

**Timeline Estimate:**
- Phase 1-4 (core deployment): 2-3 hours
- Phase 5 (SSL): 30 minutes
- Phase 6-7 (extension update + migration): 1 hour
- **Total**: ~4 hours for complete migration
