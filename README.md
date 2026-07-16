# 🚀 OrderOrbit

**OrderOrbit** is a modern, fast, and interactive college canteen pre-order system built with Next.js and Firebase. It streamlines the dining experience for students, kitchen staff, and administrators by bringing food ordering into a unified ecosystem.

## 🌟 Live Demo

You can view and interact with the live application here:
👉 **[Launch OrderOrbit](https://order-orbit-neo.vercel.app/)**

**Video Demo**: [View the demo video here](https://drive.google.com/drive/folders/1eJVe5XpLWlCA7WMKbgDndZ55mKbvbQDz?usp=drive_link)

> **Note**: As a guest or new user, you will need to register and have an admin approve your account before accessing all features. 

---

## ✨ Key Features

- **🎓 For Students**:
  - Pre-order food and drinks to avoid waiting in long lines.
  - Interactive, dynamic menu with real-time updates.
  - In-app wallet for quick and secure payments using UPI or manual top-ups.
  - Track order status from preparation to pickup.

- **👨‍🍳 For Kitchen Staff**:
  - Live kitchen dashboard for tracking incoming orders.
  - Update order statuses (Pending, Preparing, Ready, Delivered) instantly.
  - View detailed stats on daily revenue and order volume.
  
- **🛡️ For Administrators**:
  - Manage user registrations, roles, and account approvals.
  - Control the menu by adding, updating, or hiding food items.
  - Generate daily QR codes for secure manual wallet top-ups.
  - Comprehensive oversight of the entire ecosystem.

---

## 🛠️ Technology Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS, Framer Motion, Three.js
- **Backend & Database**: Firebase (Authentication, Firestore, Admin SDK)
- **Deployment**: [Vercel](https://vercel.com/)
- **UI Components**: Custom design system, Radix UI primitives, Lucide Icons

---

## 🚀 Getting Started Locally

If you want to run this project on your local machine, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/OverdrivePhoenix/OrderOrbit--NEO.git
cd OrderOrbit--NEO
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory and add your Firebase credentials and other configuration keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

---

## 📄 License
© 2026 OrderOrbit · B.Tech S3 Engineering Project

## Demo login credentials
**For student section**
```
--student@college.edu 
--password
**For admin section**
--admin@college.edu
--admin123
**For staff section**
--staff@college.edu
--password
```
