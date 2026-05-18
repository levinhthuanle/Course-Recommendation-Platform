# Quick Start: AWS EC2 + GitHub Actions Deployment

## 🚀 TL;DR - Thiết lập nhanh (5 phút)

### 1. Launch EC2 Instance
```bash
# AWS Console → EC2 → Launch Instance
# Choose: Ubuntu 22.04 LTS, t3.medium+
# Security Group: Allow SSH (22), HTTP (80), HTTPS (443), port 8000
# Download SSH key
```

### 2. SSH & Setup
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
curl -fsSL https://raw.githubusercontent.com/USERNAME/course-platform/Production/scripts/ec2-setup.sh | bash
nano /home/ubuntu/course-platform/.env  # Edit with your secrets
```

### 3. GitHub Secrets
Go to repo → Settings → Secrets → Add:
- `EC2_HOST` = Your EC2 public IP
- `EC2_USER` = `ubuntu`
- `EC2_PRIVATE_KEY` = Content of your .pem file

### 4. Push to Production
```bash
git checkout -b Production
git push origin Production
# 🎉 Auto deployment starts!
```

---

## 📋 Environment Variables

Essential .env values for EC2:

```env
# Secrets (CHANGE THESE!)
MEILI_MASTER_KEY=your-random-string-32-chars
JWT_SECRET=your-random-string-32-chars
GEMINI_API_KEY=your-google-api-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=strong-password-here

# Service URLs (use Docker service names)
MEILISEARCH_URL=http://meilisearch:7700

# Deployment flags
DEBUG=false
MEILI_ENV=production
```

Generate strong secrets:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🔧 Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Rebuild without cache
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Health check
curl http://localhost:8000/health
curl http://localhost:7700/health
curl http://localhost:3000
```

---

## 📊 Health Checks

```bash
# Backend API
curl http://EC2_IP:8000/health

# Meilisearch
curl http://EC2_IP:7700/health

# Frontend (if port 80/443)
curl http://EC2_IP/

# Docker containers
docker-compose ps
```

---

## 🆘 Troubleshooting

### GitHub Action fails
```bash
# Check SSH works
ssh -i your-key.pem ubuntu@EC2_IP

# Check Docker is running
sudo systemctl status docker

# Check services
docker-compose logs backend
```

### Out of disk space
```bash
# Clean Docker
docker system prune -a --volumes

# Check disk
df -h
du -sh /home/ubuntu/course-platform/
```

### Services won't start
```bash
# Rebuild completely
cd /home/ubuntu/course-platform
docker-compose down
rm -rf meili_data postgres_data  # WARNING: Data loss!
docker-compose build --no-cache
docker-compose up -d
```

---

## 🔐 SSH Key Issues

### If getting "Permission denied"

```bash
# Check key permissions
ls -la your-key.pem
# Should show: -rw------- (600)

# Fix permissions
chmod 600 your-key.pem

# Test SSH
ssh -i your-key.pem -vv ubuntu@EC2_IP

# If OpenSSH format issue
ssh-keygen -p -N "" -m pem -f your-key.pem
```

---

## 📈 Deployment Monitoring

### Watch GitHub Actions
1. Go to repo → Actions tab
2. Click running workflow
3. View logs in real-time

### Monitor EC2
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@EC2_IP

# Watch logs
docker-compose logs -f backend --tail 100

# CPU/Memory
docker stats

# Disk usage
df -h /
```

---

## 🔄 Update Workflow

Your development workflow:

```bash
# 1. Work on develop/main branch
git checkout develop
# Make changes...
git add .
git commit -m "Add feature"
git push origin develop

# 2. When ready for production
git checkout Production
git merge develop
git push origin Production
# ✅ Automatic deployment!

# 3. Check status
# Go to: https://github.com/USERNAME/repo/actions
```

---

## 📝 Environment Setup Checklist

- [ ] EC2 instance created (Ubuntu 22.04 LTS)
- [ ] Security group allows: SSH (22), HTTP (80), HTTPS (443)
- [ ] SSH key downloaded and `chmod 600 key.pem`
- [ ] SSH access tested
- [ ] Setup script executed on EC2
- [ ] .env file created with all secrets
- [ ] GitHub secrets added (3 required)
- [ ] Production branch created
- [ ] Pushed code to Production branch
- [ ] GitHub Action completed successfully
- [ ] Services running on EC2: `docker-compose ps`
- [ ] Health checks passing
- [ ] Frontend accessible at http://EC2_IP:3000
- [ ] API accessible at http://EC2_IP:8000

---

## 🎯 Next Steps

1. ✅ Deployment working?
2. → Add domain name & SSL
3. → Setup monitoring & alerts
4. → Configure automated backups
5. → Plan disaster recovery

See [DEPLOYMENT.md](DEPLOYMENT.md) for full documentation.
