# HireHub — Job Board (Full CI/CD Deployment on AWS)

A job board where **companies** post jobs and **candidates** browse & apply. Matches the Sprint 3 Architecture: VPC (2 AZs, public + private subnets), ALB, Auto Scaling Group of EC2 instances, RDS MySQL (Multi-AZ), built via Packer + deployed via Terraform + automated with GitHub Actions.

**Not included:** Route 53 + ACM — these require an owned domain name, which this project doesn't have. The app is accessed via the ALB's own AWS-provided DNS name instead.

## Folder Structure

```
job-board/
├── backend/            # Express + MySQL API
├── frontend/            # React (Vite) frontend
├── packer/              # Builds the custom AMI
├── terraform/            # Provisions all AWS infrastructure
└── .github/workflows/    # CI/CD pipeline (GitHub Actions)
```

## Features

**Candidates:** browse all jobs, view details, apply with an optional cover note, see their submitted applications.

**Companies:** post new jobs, view their posted jobs, see who applied to each job.

## One-Time Setup

### 1. Create an IAM user for GitHub Actions
AWS Console → IAM → Users → Create user → `github-actions-deployer`
- Attach policy: `AdministratorAccess` (fine for a learning project)
- Security credentials → Create access key → "Application running outside AWS"
- Save the Access Key ID + Secret Access Key

### 2. Push to GitHub
```bash
cd job-board
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/job-board.git
git push -u origin main
```

### 3. Add GitHub Secrets
Repo → Settings → Secrets and variables → Actions → New repository secret:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DB_PASSWORD` — e.g. `JobBoard2026!Secure`

### 4. Push triggers the pipeline automatically
Watch it run under the repo's **Actions** tab. It will:
1. Install & test the backend
2. Build a fresh AMI with Packer
3. Deploy/update infrastructure with Terraform (VPC, ALB, ASG, RDS)
4. Print the live app URL

## After First Deploy

1. Get the ALB URL from the Actions log (last step), or `terraform output alb_dns_name`
2. Connect to the RDS endpoint (`terraform output rds_endpoint`) via MySQL Workbench and run `backend/schema.sql`
3. Update `frontend/src/api.js` — replace `YOUR_ALB_DNS_NAME` with the real ALB DNS name
4. `cd frontend && npm run build`, upload `dist/` to an S3 bucket (static website hosting)

## Local Testing

```bash
cd backend
cp .env.example .env   # fill in real DB values
npm install
npm start
```

## Cost Note

Not free-tier the way the serverless project was — 2x EC2 running 24/7, RDS Multi-AZ, ALB hourly charge. Destroy when done:
```bash
cd terraform
terraform destroy
```
