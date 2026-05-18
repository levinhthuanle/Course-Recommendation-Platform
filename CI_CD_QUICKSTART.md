# GitHub Actions CI/CD Quick Start

## 🎯 What You Get

Two automated workflows are now configured:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI Tests** | Every commit to any branch | Run backend & frontend tests |
| **Deploy** | Push to `Production` branch only | Deploy to AWS EC2 |

---

## 📋 Setup (2 minutes)

### 1. Nothing Extra to Setup! ✨
The workflows are already in place:
- `.github/workflows/ci.yml` - Tests on every commit
- `.github/workflows/deploy.yml` - Deploy on Production push

### 2. Verify Your Repo Settings
Go to: **Settings → Actions → General**
- ✅ "Allow all actions and reusable workflows" (or select GitHub-provided)
- ✅ Workflow permissions: "Read and write permissions"

### 3. Add GitHub Secrets (if not done)
Only needed for the **Deploy** workflow.

Go to: **Settings → Secrets and variables → Actions**

Add these secrets:
```
EC2_HOST         = Your EC2 public IP (e.g., 52.123.45.67)
EC2_USER         = ubuntu
EC2_PRIVATE_KEY  = [Your SSH private key content]
```

---

## 🚀 Your Development Workflow

### 1. Make Changes on Develop/Feature Branch
```bash
git checkout develop
# Make changes...
git add .
git commit -m "Add feature"
git push origin develop
```

### 2. CI Workflow Runs Automatically ✅
- Tests run on your branch
- Check status: **GitHub → Actions tab**
- Tests must pass to merge

### 3. When Ready for Production
```bash
git checkout Production
git merge develop
git push origin Production
```

### 4. Deploy Workflow Runs Automatically 🚀
- Deploys to EC2
- Check status: **GitHub → Actions tab**
- Live in minutes!

---

## 📊 Monitor Your Workflows

### In GitHub Web UI
1. Go to your repo
2. Click **Actions** tab
3. See all workflow runs
4. Click any run to see detailed logs

### Command Line (with GitHub CLI)
```bash
# Install: https://cli.github.com/

# List recent workflows
gh run list

# View specific run
gh run view <run-id> --log

# Check latest status
gh run list --limit 1
```

---

## 🔍 Common Scenarios

### Scenario 1: Tests Fail on Your Branch
```
❌ CI Tests failed
├─ Backend tests: ✗
├─ Frontend tests: ✓
└─ Cannot merge until fixed
```

**Fix it:**
```bash
# Run tests locally
pytest tests/
npm run test

# Fix the code
git add .
git commit -m "Fix failing tests"
git push origin develop

# CI runs again automatically
```

### Scenario 2: Need to Rollback Production
```bash
# Revert to previous commit
git checkout Production
git log --oneline -5
git revert <commit-hash>
git push origin Production

# Deploy workflow runs with previous version
```

### Scenario 3: Emergency Production Fix
```bash
# Create hotfix branch from Production
git checkout Production
git checkout -b hotfix/critical-fix

# Make fix
git add .
git commit -m "Fix critical issue"

# Merge back
git checkout Production
git merge hotfix/critical-fix
git push origin Production

# Deploy runs automatically
```

---

## 📈 Best Practices

✅ **DO:**
- Create feature branches for new work
- Let CI tests pass before merging
- Merge to Production only when ready
- Review GitHub Actions logs for failures

❌ **DON'T:**
- Push to Production without CI passing
- Force push to Production
- Commit failing tests
- Ignore workflow failures

---

## 🆘 Troubleshooting

### Workflows Not Running
**Check:**
```bash
# Verify Actions are enabled
# Settings → Actions → check "Allow actions"

# Verify .yml syntax
# Check .github/workflows/*.yml for errors

# Verify branch name
# CI triggers on any branch
# Deploy triggers only on "Production"
```

### CI Tests Fail but Pass Locally
```bash
# Common causes:
# - Different Python/Node version
# - Missing environment variables
# - Race conditions

# Solution:
# 1. Check GitHub Actions logs
# 2. Match local environment to CI
# 3. Run tests exactly like CI does
```

### Deploy Fails to EC2
**Check:**
```bash
# 1. Verify secrets are set correctly
#    Settings → Secrets → Check EC2_HOST, EC2_USER, EC2_PRIVATE_KEY

# 2. SSH works manually
ssh -i your-key.pem ubuntu@EC2_IP

# 3. Check GitHub Actions logs for exact error

# 4. SSH to EC2 and check services
docker-compose ps
docker-compose logs backend
```

---

## 📝 Workflow Files Reference

### CI Workflow (`.github/workflows/ci.yml`)
```yaml
on:
  push:
    branches: [main, develop, '**']
  pull_request:
    branches: [main, develop, Production]

jobs:
  test-backend:    # pytest tests
  test-frontend:   # npm test
  code-quality:    # linting (optional)
  build-docker:    # docker build (cache only)
  test-summary:    # fails if any job failed
```

### Deploy Workflow (`.github/workflows/deploy.yml`)
```yaml
on:
  push:
    branches: [Production]  # ONLY Production!

jobs:
  deploy:
    - SSH to EC2
    - git pull
    - docker-compose rebuild
    - Health check
```

---

## 🎓 Next Steps

1. ✅ Workflows are ready to use
2. → Push to develop and watch CI run
3. → Merge to Production and watch deploy
4. → Monitor GitHub Actions logs
5. → Celebrate! 🎉

---

## 📚 More Information

- Full CI/CD Guide: [CI_CD_WORKFLOWS.md](CI_CD_WORKFLOWS.md)
- Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- GitHub Actions Docs: https://docs.github.com/en/actions

---

## ✨ Example: Push Feature to Production

```bash
# 1. Create and work on feature
git checkout -b feature/new-search
echo "New feature code" >> app/main.py
git add .
git commit -m "Add new search feature"
git push origin feature/new-search

# GitHub Actions CI runs ✅
# Tests pass? Yes!

# 2. Merge to develop
git checkout develop
git merge feature/new-search
git push origin develop

# GitHub Actions CI runs ✅
# Tests pass? Yes!

# 3. Prepare for production
git checkout Production
git merge develop

# 4. Deploy!
git push origin Production

# GitHub Actions Deploy runs 🚀
# Health checks pass? Yes!
# 🎉 LIVE ON PRODUCTION!

# 5. Check your live app
curl https://yourdomain.com/api/health
# ✅ Service running!
```

---

**You're all set! Happy coding! 🚀**
