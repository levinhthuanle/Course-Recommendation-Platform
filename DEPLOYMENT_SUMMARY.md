# AWS EC2 + GitHub Actions Deployment - Summary

## 📦 What Was Created

### GitHub Actions Workflows (New! 🎉)

#### 1. **CI Workflow** - `.github/workflows/ci.yml`
- **Triggers**: Every commit to any branch
- **Purpose**: Automated testing
- **Tests**:
  - Backend: pytest
  - Frontend: vitest
  - Code quality checks
  - Docker image builds
- **Fails workflow** if tests fail ❌

#### 2. **Deploy Workflow** - `.github/workflows/deploy.yml`
- **Triggers**: Push to `Production` branch only
- **Purpose**: Automated deployment to EC2
- **Actions**: SSH, git pull, docker rebuild, health checks
- **Fails deployment** if health check fails ❌

### Deployment Scripts
1. **`scripts/ec2-setup.sh`** - One-time EC2 initialization
   - Installs Docker, Git, required tools
   - Creates deployment directory
   - Sets up .env template
   
2. **`scripts/health-check.sh`** - Service health verification
   - Checks if backend is responding
   - Retries with exponential backoff
   
3. **`scripts/switch-env.sh`** - Dev/Prod environment switcher
   - Generate docker-compose.override.yml
   - Toggle between DEBUG mode and production settings

### Configuration Files
- **`.env.example`** - Updated with production and deployment notes
- **`docker-compose.yml`** - Enhanced with:
  - Health checks for all services
  - Logging configuration (max-size, max-file)
  - Environment variable substitution
  - Restart policies

### Documentation (Pick One)
1. **`CI_CD_WORKFLOWS.md`** - Comprehensive CI/CD guide with workflow details
2. **`CI_CD_QUICKSTART.md`** - Quick start guide for the workflows
3. **`DEPLOYMENT.md`** - Comprehensive EC2 setup guide (10 steps)
4. **`DEPLOYMENT_QUICKSTART.md`** - Quick reference (TL;DR version)
5. **`DEPLOYMENT_SUMMARY.md`** - Quick reference with commands (this file)
6. **`Makefile`** - Development workflow automation
7. **`README.md`** - Updated with deployment section and workflow badges

## 🔄 CI/CD Pipeline Overview

```
Every Commit (any branch)
    ↓
CI Workflow (.github/workflows/ci.yml)
    ├─ Backend tests (pytest)
    ├─ Frontend tests (vitest)
    ├─ Code quality checks
    └─ Docker build cache

Production Branch Push
    ↓
Deploy Workflow (.github/workflows/deploy.yml)
    ├─ SSH to EC2
    ├─ Pull latest code
    ├─ Rebuild Docker
    ├─ Restart services
    └─ Health checks

Live on EC2! 🎉
```

### Key Points
- **CI tests**: Run on **every commit** (any branch)
- **Deploy**: Runs **only on Production branch**
- **Tests must pass** before deploying
- **Health checks** validate deployment success

See [CI_CD_WORKFLOWS.md](CI_CD_WORKFLOWS.md) for detailed workflow documentation.

---

## 🚀 Quick Setup Steps

### Step 1: AWS EC2 Instance (5 min)
```bash
# AWS Console
1. Launch Instance → Ubuntu 22.04 LTS
2. Instance Type: t3.medium or larger
3. Security Group: Allow ports 22, 80, 443, 8000
4. Create/download SSH key pair
5. Launch instance
```

### Step 2: Initialize EC2 (2 min)
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/course-platform/Production/scripts/ec2-setup.sh | bash

# Edit .env with your secrets
nano /home/ubuntu/course-platform/.env
```

### Step 3: GitHub Secrets (2 min)
Go to: GitHub Repo → Settings → Secrets → Actions

Add 3 secrets:
| Name | Value |
|------|-------|
| `EC2_HOST` | Your EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_PRIVATE_KEY` | Contents of your `.pem` file |

### Step 4: Trigger First Deployment (1 min)
```bash
# Create Production branch
git checkout -b Production
git push origin Production

# Watch deployment
Go to: GitHub Repo → Actions → Monitor workflow
```

### Step 5: Verify Deployment (1 min)
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Check services
docker-compose ps

# Test API
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## 🔑 Essential Environment Variables

**Must Update in `.env`:**

```bash
# API Keys (get from providers)
GEMINI_API_KEY=your-google-api-key
MEILI_MASTER_KEY=strong-random-string-here

# Security (generate new ones)
JWT_SECRET=strong-random-string-here

# Admin User (for bootstrap)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=strong-password

# Your Domain (for CORS)
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

Generate strong secrets:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📊 Service Ports & URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `:3000` or `:80` | React UI |
| Backend API | `:8000` | FastAPI server |
| Meilisearch | `:7700` | Search engine (internal) |
| PostgreSQL | `:5432` | Database (internal) |
| API Docs | `:8000/docs` | Swagger UI |

---

## 🔄 Development Workflow

### For Active Development
```bash
# Work on develop branch
git checkout develop
# Make changes...
git add .
git commit -m "Add feature"
git push origin develop

# When ready for production
git checkout Production
git merge develop
git push origin Production
# ✅ Automatic deployment!
```

### Useful Commands
```bash
# View deployment logs
ssh -i key.pem ubuntu@EC2_IP
cd /home/ubuntu/course-platform
docker-compose logs -f backend

# Restart if needed
docker-compose restart backend

# Update .env
nano .env
docker-compose restart
```

---

## ⚙️ Make Commands

Simplify development with Makefile:

```bash
make help        # Show all commands
make dev         # Start dev environment
make up          # Start services
make down        # Stop services
make logs        # View logs
make test        # Run all tests
make health      # Check service health
make rebuild     # Rebuild without cache
make clean       # Stop and remove containers
```

---

## 🆘 Troubleshooting

### Deployment fails in GitHub Actions
```bash
✓ Check: SSH works from local
  ssh -i your-key.pem ubuntu@EC2_IP

✓ Check: EC2_HOST and EC2_USER are correct in secrets

✓ Check: Private key format is correct
  ssh-keygen -p -N "" -m pem -f your-key.pem
```

### Services not starting
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@EC2_IP

# Check services
docker-compose ps

# View logs
docker-compose logs backend

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Out of disk space
```bash
# Clean Docker
docker system prune -a --volumes

# Check disk
df -h

# Check app directory size
du -sh /home/ubuntu/course-platform/
```

---

## ✅ Deployment Checklist

- [ ] EC2 instance created (Ubuntu 22.04 LTS)
- [ ] Security group allows SSH, HTTP, HTTPS
- [ ] SSH key downloaded and tested
- [ ] SSH key permissions: `chmod 600 your-key.pem`
- [ ] EC2 setup script executed
- [ ] `.env` file populated with secrets
- [ ] GitHub secrets added (EC2_HOST, EC2_USER, EC2_PRIVATE_KEY)
- [ ] `Production` branch created in GitHub
- [ ] Code pushed to `Production` branch
- [ ] GitHub Action workflow completed successfully
- [ ] Services running: `docker-compose ps` shows 4 services
- [ ] Health checks passing
- [ ] Frontend accessible: `http://EC2_IP:3000`
- [ ] API accessible: `http://EC2_IP:8000/health`

---

## 📞 Support & Documentation

- **Quick Start**: [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md)
- **Full Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Documentation**: http://EC2_IP:8000/docs
- **GitHub Actions**: https://github.com/YOUR_USERNAME/course-platform/actions

---

## 🎯 Next Steps After Deployment

1. **Monitor Deployments**
   - Check GitHub Actions on each push
   - Monitor EC2 resources (CloudWatch)

2. **Add Domain & SSL**
   - Purchase domain (optional)
   - Configure DNS records
   - Use Let's Encrypt for free SSL certificate
   - Setup Nginx reverse proxy

3. **Setup Backups**
   - Backup PostgreSQL daily
   - Backup Meilisearch index
   - Store on S3 or external storage

4. **Security Hardening**
   - Restrict security group rules
   - Use AWS Systems Manager Session Manager instead of SSH
   - Enable VPC security
   - Setup AWS WAF

5. **Monitoring & Alerts**
   - CloudWatch alarms for CPU/Memory
   - Log aggregation (CloudWatch Logs)
   - Error tracking (Sentry, etc.)
   - Performance monitoring (DataDog, etc.)

---

## 🎓 Learn More

- Docker: https://docs.docker.com/
- GitHub Actions: https://docs.github.com/en/actions
- AWS EC2: https://docs.aws.amazon.com/ec2/
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/

---

**Happy Deploying! 🚀**
