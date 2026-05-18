# GitHub Actions CI/CD Workflows

## 📋 Overview

Your project now has **two automated workflows**:

### 1. **CI (Continuous Integration)** - `.github/workflows/ci.yml`
Runs **on every commit** to any branch
- ✅ Backend tests (pytest)
- ✅ Frontend tests (vitest)
- ✅ Code quality checks
- ✅ Docker image builds (cache only)
- ✅ Fails the workflow if tests fail

### 2. **Deploy** - `.github/workflows/deploy.yml`
Runs **only on Production branch**
- 🚀 Deploys to AWS EC2
- 🔄 Rebuilds Docker images
- 💪 Restarts services
- ✅ Health checks validation

---

## 🔄 Workflow: Development to Production

```
Your Local Work
  ↓
1. Commit & Push to develop/main/feature branch
  ↓
2. GitHub Actions: CI Workflow Runs
  ├─ Tests pass? ✅ → Continue
  └─ Tests fail? ❌ → Block merge
  ↓
3. Create Pull Request (optional)
  ├─ Runs CI again
  ├─ Shows test results
  └─ Requires approval
  ↓
4. Merge to Production branch
  ↓
5. GitHub Actions: Deploy Workflow Runs
  ├─ SSH into EC2
  ├─ Pull code
  ├─ Build Docker images
  ├─ Restart services
  ├─ Health checks
  └─ Deployment complete! 🎉
  ↓
6. Live on Production!
```

---

## 📊 CI Workflow Details

### Triggers
- **Push** to any branch
- **Pull requests** targeting main/develop/Production

### Jobs (run in parallel)

#### 1. **test-backend**
- Installs Python 3.10
- Installs dependencies from `Requirements.txt`
- Runs: `pytest -v --tb=short tests/backend tests/integration`
- Fails if tests fail ❌

#### 2. **test-frontend**
- Installs Node.js 18
- Installs dependencies from `frontend/package-lock.json`
- Runs: `npm run test`
- Fails if tests fail ❌

#### 3. **code-quality**
- Optional linting and import checks
- Ready to add pylint, black, flake8, etc.

#### 4. **build-docker-images**
- Builds Docker images without pushing
- Uses GitHub Actions cache for faster builds

#### 5. **test-results-summary**
- Waits for all tests to complete
- Fails workflow if any test failed ❌
- Comments on PR with results ✅

---

## 🚀 Deploy Workflow Details

### Triggers
- **Push to Production branch only**

### Jobs

#### 1. **deploy**
- Checks out Production branch
- SSH into EC2 with provided credentials
- Runs deployment script:
  ```bash
  git pull origin Production
  docker-compose down
  docker-compose build --no-cache
  docker-compose up -d
  ```
- Health check: `curl http://localhost:8000/health`
- Fails if health check fails ❌

#### 2. **Slack notification** (optional)
- Sends deployment status to Slack
- Requires `SLACK_WEBHOOK` secret

---

## 🎯 Using the Workflows

### For Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to trigger CI
git push origin feature/my-feature

# Check GitHub Actions
# Go to: Repo → Actions tab
# Wait for tests to pass ✅
```

### Before Production Deployment

```bash
# Merge to Production (after tests pass)
git checkout Production
git merge develop
git push origin Production

# Automatic deployment starts!
# Go to: Repo → Actions → Deploy to AWS EC2
# Monitor the deployment logs
```

---

## 🔍 Monitoring Workflows

### In GitHub UI
1. Go to your repo
2. Click **Actions** tab
3. See all workflow runs
4. Click on a run to see logs

### GitHub Badges (add to README)
```markdown
![CI Tests](https://github.com/YOUR_USERNAME/course-platform/workflows/CI%20-%20Run%20Tests/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/course-platform/workflows/Deploy%20to%20AWS%20EC2/badge.svg)
```

### View Status in Terminal
```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/course-platform.git

# View workflow status
gh run list --repo YOUR_USERNAME/course-platform

# View specific run logs
gh run view <run-id> --log
```

---

## 📋 Workflow Status Meanings

| Status | Meaning |
|--------|---------|
| ✅ **Success** | All jobs passed |
| ❌ **Failed** | At least one job failed |
| ⏳ **In Progress** | Jobs currently running |
| ⏭️ **Queued** | Waiting to start |
| ⊘ **Skipped** | Conditions not met |
| ⊗ **Cancelled** | Manually cancelled |

---

## 🆘 Troubleshooting Workflows

### CI Tests Fail
```bash
# 1. Check what failed
# Go to Actions → Failed run → View logs

# 2. Run tests locally to reproduce
pytest tests/
npm run test

# 3. Fix and push again
git add .
git commit -m "Fix tests"
git push
```

### Deploy Fails
```bash
# 1. Check deployment logs in Actions tab

# 2. Common issues:
# - EC2_HOST/EC2_USER/EC2_PRIVATE_KEY secrets incorrect
# - SSH key format wrong
# - EC2 instance not running
# - Docker daemon not running on EC2

# 3. SSH directly to debug
ssh -i your-key.pem ubuntu@EC2_IP
docker-compose logs backend
```

### Workflow Won't Trigger
```bash
# Check:
# ✓ Branch name matches (Production for deploy, any for CI)
# ✓ Commit pushed (not just local)
# ✓ Workflow file syntax correct (.yml format)
# ✓ Actions enabled in repo settings
```

---

## 🔑 Required Secrets

For deployment workflow, configure in: Repo → Settings → Secrets → Actions

| Secret | Used By | Example |
|--------|---------|---------|
| `EC2_HOST` | Deploy | `52.123.45.67` |
| `EC2_USER` | Deploy | `ubuntu` |
| `EC2_PRIVATE_KEY` | Deploy | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SLACK_WEBHOOK` | Deploy | `https://hooks.slack.com/...` (optional) |

---

## 📈 Best Practices

### ✅ DO
- Push feature branches before merging to Production
- Wait for CI tests to pass before merging
- Keep tests fast (< 5 minutes)
- Monitor GitHub Actions for failures

### ❌ DON'T
- Force push to Production branch
- Merge without running tests
- Commit failing tests
- Use Production branch for development

---

## 🎓 Learn More

- GitHub Actions Docs: https://docs.github.com/en/actions
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Events: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows

---

## 📞 Support

If workflows fail or behave unexpectedly:

1. **Check workflow logs** in GitHub Actions tab
2. **Run tests locally** to reproduce issues
3. **Verify secrets** are set correctly
4. **Check branch names** match workflow triggers
5. **Review `.yml` syntax** for errors

---

**Example Workflow Run Output:**
```
✅ test-backend: 4 passed in 7.76s
✅ test-frontend: 5 passed in 12.3s
✅ code-quality: No issues
✅ build-docker-images: Backend & Frontend built
✅ test-results-summary: All tests passed!
🚀 Ready to merge and deploy!
```
