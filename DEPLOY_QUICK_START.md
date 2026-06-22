# 🎯 OrderOrbit Deployment: Quick Start Guide

Welcome to the **OrderOrbit** Deployment Guide! OrderOrbit is a college canteen pre-ordering ecosystem utilizing **Stripe Checkout** for payment processing and **Google Gemini AI (Gemini 1.5 Flash)** for kitchen insights and adjustments.

This guide helps you gather your credentials, set up your environment, and select your target deployment platform.

---

## 📋 Environment Variables Checklist

To run OrderOrbit in production or testing, you will need the following environment variables. Copy `.env.example` to `.env` or set these in your deployment platform's dashboard:

| Variable Name | Description | Source / How to Obtain | Example Value |
| :--- | :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | Stripe Secret API Key (Server-side) | [Stripe Dashboard (API Keys)](https://dashboard.stripe.com/apikeys) | `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable API Key (Client-side) | [Stripe Dashboard (API Keys)](https://dashboard.stripe.com/apikeys) | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret for signature verification | [Stripe Webhook Dashboard / CLI](https://dashboard.stripe.com/webhooks) | `whsec_...` |
| `GEMINI_API_KEY` | Google Generative AI API Key | [Google AI Studio](https://aistudio.google.com/) | `AIzaSy...` |
| `JWT_SECRET` | Secret key for signing session tokens | Generate 32+ random characters | `your-long-random-jwt-secret-string` |
| `NEXT_PUBLIC_APP_URL` | Canonical URL of your deployment | Your public domain (or localhost for dev) | `https://yourdomain.com` |

---

## 🏗️ Architectural Warning: Database Persistence

> [!IMPORTANT]
> **OrderOrbit Database Model**
> OrderOrbit uses a local file-based database (`src/data/db.json`). 
> - **Vercel & Netlify (Serverless)**: Serverless environments have an ephemeral, read-only filesystem. Any writes to `db.json` (such as placing orders, registering accounts, or writing reviews) will **fail or reset** when functions scale down or recycle. For a robust production launch, you will need to replace `src/data/db.ts` with a real database connector (e.g., PostgreSQL, MongoDB, or Supabase).
> - **Docker, Railway, & Render (Persistent Containers)**: You must configure a **Persistent Volume/Disk** mapped to the database directory (`/app/src/data`) to prevent your data from resetting when the container restarts or redeploys.

---

## 🚀 Quick Deployment Options

Pick your target platform and refer to [DEPLOYMENT.md](file:///c:/Users/jkbsa/Downloads/NEO-OrderOrbit/DEPLOYMENT.md) for step-by-step instructions.

### Option 1: Vercel (Next.js Native)
- **Time to Deploy**: ~5 minutes
- **Best for**: Rapid frontend prototyping and demonstration.
- **Caveat**: Database writes will not persist due to serverless execution.

### Option 2: Self-Hosted Docker
- **Time to Deploy**: ~10 minutes
- **Best for**: Hosting on VPS (DigitalOcean, AWS EC2, Hetzner, etc.) or a private server.
- **Benefits**: Simplifies dependency management and leverages persistent Docker volumes.

### Option 3: Railway / Render
- **Time to Deploy**: ~7 minutes
- **Best for**: Cloud-managed containers.
- **Benefits**: Fully managed deployments with easy persistent volume attachment.

---

## 🛠️ Step 1: Pre-Deployment Verification

Before pushing to production, verify that your application builds and runs correctly:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Local Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and verify the landing page.

3. **Verify Production Build**:
   ```bash
   npm run build
   ```
   Ensure Next.js compiles all 18 routes successfully without compile-time errors.
