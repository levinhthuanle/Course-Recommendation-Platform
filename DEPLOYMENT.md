# AWS EC2 + GitHub Actions CI/CD Setup Guide

## Overview
This guide walks you through setting up automated deployment to AWS EC2 using GitHub Actions. When you push code to the `Production` branch, the workflow will automatically deploy to your EC2 instance.

## Prerequisites
- AWS account with EC2 instance running Ubuntu 22.04 LTS
- GitHub repository with admin access
- SSH key pair for EC2 access

## Step 1: AWS EC2 Instance Setup

### 1.1 Launch EC2 Instance
1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu 22.04 LTS** AMI
3. Instance type: **t3.medium** or larger (for Docker + app)
4. Security Group: Allow inbound traffic on:
   - Port 22 (SSH) - from your IP
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 8000 (Backend) - optional, for testing
   - Port 7700 (Meilisearch) - optional, for testing
5. Create/download SSH key pair
6. Launch instance

### 1.2 Connect & Setup
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/course-platform/Production/scripts/ec2-setup.sh | bash

# Or download and run locally
wget https://raw.githubusercontent.com/YOUR_USERNAME/course-platform/Production/scripts/ec2-setup.sh
bash ec2-setup.sh

# Edit .env with your secrets
nano /home/ubuntu/course-platform/.env
```

### 1.3 Manual First Deployment
```bash
cd /home/ubuntu/course-platform
docker-compose up -d
docker-compose logs -f backend
```

## Step 2: GitHub Secrets Configuration

### 2.1 Add Secrets to GitHub
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Create these secrets:

| Secret Name | Value |
|---|---|
| `EC2_HOST` | Your EC2 public IP address |
| `EC2_USER` | `ubuntu` (or your SSH user) |
| `EC2_PRIVATE_KEY` | Contents of your SSH private key file |
| `SLACK_WEBHOOK` | (Optional) Slack webhook URL for notifications |

### 2.2 SSH Key Format
Make sure your private key is in the correct format:
```bash
# If your key is in OpenSSH format, convert it:
ssh-keygen -p -N "" -m pem -f your-key.pem
```

## Step 3: Repository Setup

### 3.1 Create Production Branch
```bash
git checkout -b Production
git push -u origin Production
```

### 3.2 Workflow File
The workflow file is already in `.github/workflows/deploy.yml`. It will:
- Trigger on push to `Production` branch
- SSH into EC2 instance
- Pull latest code
- Rebuild Docker images
- Restart services
- Run health check

## Step 4: First Deployment

### 4.1 Trigger Deployment
```bash
# Make a change and push to Production
git add .
git commit -m "Initial deployment"
git push origin Production
```

### 4.2 Monitor Workflow
1. Go to GitHub repo → Actions
2. Click on the running workflow to see logs
3. Check EC2 services:
   ```bash
   docker-compose ps
   docker-compose logs backend
   ```

## Step 5: Ongoing Deployments

### 5.1 Development Workflow
```bash
# Work on main/develop branch
git checkout main
git add .
git commit -m "Add feature"
git push origin main

# When ready for production
git checkout Production
git merge main
git push origin Production
# Automatic deployment happens!
```

### 5.2 Monitor Deployments
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# View logs
cd /home/ubuntu/course-platform
docker-compose logs -f

# Restart if needed
docker-compose restart backend
```

## Step 6: Environment Variables & Secrets

### 6.1 Manage Secrets on EC2
The `.env` file on EC2 should contain:
- `GEMINI_API_KEY` - Google Gemini API key
- `MEILI_MASTER_KEY` - Meilisearch master key
- `JWT_SECRET` - JWT signing secret
- `ADMIN_EMAIL` & `ADMIN_PASSWORD` - Bootstrap admin user
- `DATABASE_URL` - PostgreSQL URL (if using)

### 6.2 Update Secrets
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Edit .env
nano /home/ubuntu/course-platform/.env

# Restart services
docker-compose restart backend
```

## Step 7: Monitoring & Troubleshooting

### 7.1 Health Checks
```bash
# Check backend health
curl http://your-ec2-public-ip:8000/health

# Check Meilisearch
curl http://your-ec2-public-ip:7700/health
```

### 7.2 View Logs
```bash
# SSH into EC2
cd /home/ubuntu/course-platform

# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs meilisearch

# Follow logs
docker-compose logs -f backend
```

### 7.3 Common Issues

**Deployment fails in GitHub Actions:**
- Check EC2 host is reachable: `ssh -i key.pem ubuntu@IP` works
- Verify SSH private key is correctly added to secrets
- Check workflow logs in GitHub Actions tab

**Services not starting:**
```bash
# Check Docker daemon
sudo systemctl status docker

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Out of disk space:**
```bash
# Clean up old Docker images/containers
docker system prune -a --volumes
```

## Step 8: Optional - Domain & SSL (Nginx)

### 8.1 Setup Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/course-platform
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/course-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8.2 Setup SSL with Let's Encrypt
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Step 9: Rollback Procedure

### 9.1 Emergency Rollback
```bash
# SSH into EC2
cd /home/ubuntu/course-platform

# View git history
git log --oneline -10

# Rollback to previous commit
git reset --hard <commit-hash>
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Step 10: Monitoring & Alerts (Optional)

### 10.1 CloudWatch Monitoring
1. Go to AWS CloudWatch
2. Create alarms for EC2 metrics (CPU, memory, disk)
3. Set SNS notifications

### 10.2 Slack Notifications
The workflow already supports Slack notifications if you add `SLACK_WEBHOOK` secret.

## Checklist

- [ ] EC2 instance launched and security group configured
- [ ] SSH key pair created and stored safely
- [ ] Setup script executed on EC2
- [ ] `.env` file configured with secrets
- [ ] GitHub secrets added (EC2_HOST, EC2_USER, EC2_PRIVATE_KEY)
- [ ] Production branch created in GitHub
- [ ] First manual deployment successful
- [ ] First automated deployment triggered and successful
- [ ] Health checks passing
- [ ] Logs monitored for errors
- [ ] (Optional) Domain and SSL configured
- [ ] (Optional) Slack notifications working

## Support

For issues or questions:
1. Check EC2 logs: `docker-compose logs`
2. Check GitHub Actions workflow logs
3. Verify `.env` file has all required variables
4. Ensure SSH connection works: `ssh -i key.pem ubuntu@EC2_IP`
