# 🚀 OrderOrbit Multi-Platform Deployment Guide

This document provides detailed step-by-step instructions for deploying the **OrderOrbit College Canteen Ecosystem** across various cloud and self-hosted environments.

---

## 🔑 Environment Variables Setup

Before configuring your platform, gather the following environment variables:

- **`STRIPE_SECRET_KEY`**: Found on your Stripe Dashboard under `Developers > API Keys` (`sk_test_...` or `sk_live_...`).
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**: Found on your Stripe Dashboard under `Developers > API Keys` (`pk_test_...` or `pk_live_...`).
- **`STRIPE_WEBHOOK_SECRET`**: Found when configuring Stripe Webhooks (`whsec_...`).
- **`GEMINI_API_KEY`**: Obtained from [Google AI Studio](https://aistudio.google.com/).
- **`JWT_SECRET`**: Run `openssl rand -base64 32` (or a similar random key generator) to generate a secure secret.
- **`NEXT_PUBLIC_APP_URL`**: The fully qualified URL where your app is hosted (e.g. `https://orderorbit.vercel.app` or `http://localhost:3000`).

---

## 💳 Stripe Webhook Configuration (Production)

Stripe needs to send notifications to your application (such as `checkout.session.completed` and `checkout.session.expired`) to finalize orders.

1. Go to **Stripe Dashboard > Developers > Webhooks**.
2. Click **Add Endpoint**.
3. Set the Endpoint URL to:
   `https://<yourdomain.com>/api/webhooks/stripe`
4. Select the following events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Click **Add Endpoint** and copy the generated **Signing Secret** (`whsec_...`). Set this as `STRIPE_WEBHOOK_SECRET` in your environment.

---

## 📦 Deployment Platform Guides

Choose one of the following deployment paths:

### Option 1: Vercel (Recommended - Next.js Native)

Vercel is the easiest platform for deploying Next.js applications.

1. **Import Project**:
   - Push your code to a GitHub/GitLab/Bitbucket repository.
   - Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.

2. **Configure Settings**:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./`

3. **Configure Environment Variables**:
   Add all environment variables listed in the setup section.

4. **Deploy**:
   - Click **Deploy**. Vercel will automatically compile, optimize, and deploy the application.

> [!CAUTION]
> **Database Reset Warning**
> Since Vercel uses ephemeral, read-only serverless functions, the local `db.json` database will reset every time a function goes idle or cold-starts. This option is **only recommended for testing, styling checks, and visual demonstrations**. For real use, consider Option 2 or Option 3.

---

### Option 2: Docker (Self-Hosted or Any VPS)

A pre-configured production-grade `Dockerfile` is provided in the repository root. It uses Next.js standalone output tracing to create a compact (~150MB) container image.

#### 1. Build the Docker Image
Navigate to the root directory of the project and build the container:
```bash
docker build -t orderorbit .
```

#### 2. Run the Container (with Data Volume Persistence)
To prevent database resets upon container restart, mount a host directory to `/app/src/data`:

**Linux / macOS:**
```bash
docker run -d \
  -p 3000:3000 \
  --name orderorbit \
  -v /var/lib/orderorbit/data:/app/src/data \
  --env-file .env \
  orderorbit
```

**Windows (PowerShell):**
```powershell
docker run -d `
  -p 3000:3000 `
  --name orderorbit `
  -v C:\orderorbit\data:/app/src/data `
  --env-file .env `
  orderorbit
```

*Note: Ensure your local `.env` file contains all the production key-value pairs.*

---

### Option 3: Railway (Cloud Containers with Volumes)

Railway makes it easy to run Docker-based workloads with persistent disks.

1. **Create Project**:
   - Go to [Railway.app](https://railway.app/) and start a new project.
   - Select **Deploy from GitHub repo** and connect your OrderOrbit repository.

2. **Configure Variables**:
   - Navigate to the **Variables** tab of the service.
   - Click **Raw Editor** and paste your environment variables.

3. **Set Up Database Volume (Crucial)**:
   - Navigate to the **Settings** tab of your service.
   - Under **Volumes**, click **Add Volume**.
   - Set the mount path to: `/app/src/data`.
   - This ensures your `db.json` file survives app updates and container restarts.

4. **Deploy**:
   - Railway will detect the `Dockerfile` automatically and build/deploy your application.

---

### Option 4: Render (Managed Web Services)

Render is another cloud platform that supports persistent disks for Docker containers.

1. **Create Web Service**:
   - Log in to [Render](https://render.com/).
   - Click **New > Web Service** and connect your repository.

2. **Configure Web Service Options**:
   - **Environment**: `Docker`
   - **Region**: Select a region close to your target users.

3. **Configure Disk (Crucial)**:
   - Expand the **Advanced** section.
   - Click **Add Disk**.
   - **Name**: `orderorbit-data`
   - **Mount Path**: `/app/src/data`
   - **Size**: `1 GiB` (more than enough for local JSON DB logs)

4. **Configure Environment Variables**:
   - Under the Environment Variables section, add all required keys.

5. **Deploy**:
   - Click **Create Web Service**. Render will build and deploy the Docker image.

---

### Option 5: Netlify

Netlify supports Next.js via Next.js Runtime, utilizing Netlify Functions.

1. **Import Project**:
   - Go to the Netlify dashboard and click **Add new site > Import an existing project**.
   - Authorize Git and select your repository.

2. **Build Settings**:
   - Netlify will auto-detect Next.js:
     - **Build command**: `npm run build`
     - **Publish directory**: `.next`

3. **Environment Variables**:
   - Under Site configuration > Environment variables, add the environment variables.

4. **Deploy**:
   - Click **Deploy site**.

> [!CAUTION]
> **Database Reset Warning**
> Like Vercel, Netlify utilizes serverless execution environments, meaning your local database (`db.json`) is ephemeral. User sessions and data updates will reset frequently.

---

## 🔒 Post-Deployment Security Audit

After deploying, perform the following validation tests:

1. **JWT Secret strength**: Double check that `JWT_SECRET` is set to a long cryptographically secure random string.
2. **Stripe Test Mode vs. Live Mode**: Ensure that you use production credentials (`sk_live_...`) and actual webhook endpoints for a live launch.
3. **Webhooks Check**: Place a test transaction on the deployed URL to make sure the endpoint redirects successfully, and check that the canteen token (e.g. `#T-1024`) is generated in the order confirmation screen.
