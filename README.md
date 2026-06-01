# Civic Resolve: AI-Powered Citizen Issue Resolution & Governance Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)]()
[![React Version](https://img.shields.io/badge/react-v18.x-blueviolet.svg)]()
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.x-blue.svg)]()
[![Google Gemini API](https://img.shields.io/badge/AI-Google_Gemini_API-orange.svg)]()
[![Database](https://img.shields.io/badge/database-MongoDB_Atlas-green.svg)]()

A flagship full-stack Civic-Tech SaaS application designed to connect citizens, department officers, and municipal administrators for transparent and efficient local governance. 

---

## 📖 Project Overview

Civic Resolve is a modern governance platform that empowers citizens to report public issues, track resolutions in real-time, support nearby issues to avoid duplicate complaints, and earn reputation badges. In parallel, it equips municipal department officers and administrators with intelligent routing tools, analytics dashboards, automated SLA escalations, and audit logs.

### The Problem
Traditional civic complaint systems are opaque, slow, and lack engagement. Duplicate issues clog system queues, routing to relevant departments is slow or manual, and citizens feel disconnected because they rarely see updates on their reports.

### The Solution
Civic Resolve provides a transparent, gamified, and AI-optimized issue tracking loop:
- **AI Automation**: Auto-summarizes, categorizes, and prioritizes incoming complaints using Google Gemini API.
- **SLA Guardrails**: SLA background daemon escalates tickets exceeding response thresholds (15/30 days) or critical unassigned queues.
- **Crowdsourced Priority**: Geolocation proximity checks prevent duplicate reports, while community support (upvoting) dynamically influences ticket priority.
- **Role-Based Experience**: Tailored interfaces for Citizens (gamified dashboard), Officers (productivity queue), and Admins (city-wide analytics and audit desk).

---

## 🚀 Key Features

### 👤 Citizen Portal
- **Interactive Issue Reporting**: Upload multiple hazard images, select location via Leaflet Map, and provide descriptions.
- **Geolocation Proximity Alerts**: Automatic alerts notify users if there are unresolved issues within 100 meters of their current location.
- **Gamified Rewards Desk**: Earn XP points and dynamic badges (e.g., *First Reporter*, *Voice of Community*, *Civic Champion*) for reporting and supporting issues.
- **Interactive Timelines**: Visually inspect the progressive status history of reports.

### 👮 Department Officer Console
- **Workload Dashboard**: Manage assigned tasks, track performance metrics (resolution efficiency), and filter high-priority queues.
- **Resolution Proof Submission**: Upload post-resolution images and completion notes, sending alerts to administrators for final validation.
- **Spatial Department Heatmap**: Locate assigned tickets and density zones on an interactive Leaflet Map.

### 👑 Governance Administration Control
- **Officer & Department Directory**: Register new departments, allocate officers, reset credentials, or suspend profiles.
- **Resolution Review Queue**: Review submitted resolution notes and side-by-side (Before/After) proof photos to Accept & Close or Reject and return tickets to the queue.
- **SLA Escalation Desk**: Monitor warning, severe, and unassigned breach queues with immediate re-assignment drawers.
- **Audit Trails**: Security logs recording administrative edits, profile updates, and SLA escalations.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Libraries / Services |
| :--- | :--- | :--- |
| **Frontend** | React (Vite), JavaScript | React Router DOM, React Leaflet, Recharts, Lucide Icons, Axios |
| **Styling** | Vanilla CSS, Tailwind CSS | Tailwind CSS (v3.x), PostCSS, Autoprefixer |
| **Backend** | Node.js, Express.js | Express-Validator, JWT & Bcryptjs, Multer, Cloudinary, PDFKit, ExcelJS |
| **Database** | MongoDB Atlas | Mongoose (ODM), Mongoose post-save middleware hooks |
| **AI Integration** | Google GenAI SDK | Google Gemini 2.5 Flash model (automatic summaries & tags) |
| **Email/Alerts** | Nodemailer | Asynchronous post-save trigger on Notification saves |

---

## 🏗️ Project Architecture

### Folder Structure
```
CivicResolve/
├── frontend/                  # React Client Application
│   ├── public/                # Static public assets
│   ├── src/
│   │   ├── components/        # Sidebar, Navbar, and Reusable UI Library
│   │   │   └── common/        # Table, Modal, Select, StatsCard, ChartCard, MapCard...
│   │   ├── context/           # React Auth Context state management
│   │   ├── hooks/             # Authentication & custom API hooks
│   │   ├── layouts/           # Role-based DashboardLayout routing frames
│   │   ├── pages/             # View pages (Citizen, Officer, Admin dashboards & forms)
│   │   ├── services/          # Axios HTTP service instances
│   │   ├── styles/            # Tailwind layers & global styling
│   │   └── utils/             # Formatters, calculators, maps calculations
│   ├── tailwind.config.js     # Tailwind setup (Outfit font family priority)
│   ├── vercel.json            # Vercel SPA routing rewrites
│   └── vite.config.js         # Vite dev configuration & backend proxy mapping
│
├── backend/                   # Node.js API Service
│   ├── public/                # Temporary local storage for static uploads/reports
│   ├── src/
│   │   ├── config/            # Mongoose MongoDB connectivity setup
│   │   ├── controllers/       # HTTP request handlers (Auth, Complaints, Support...)
│   │   ├── jobs/              # SLA Escalation daemon cron processes
│   │   ├── middleware/        # JWT auth filters, role authorizations, upload limits
│   │   ├── models/            # Mongoose Schemas (User, Complaint, Notification, AuditLog...)
│   │   ├── routes/            # Express router mapping
│   │   ├── services/          # Isolated service layers (complaintService, userService...)
│   │   └── validations/       # Schema validators using express-validator
│   ├── server.js              # Entrypoint (Port binding, DB boot, cron schedule loader)
│   └── package.json           # Backend dependency configuration
```

### Database Collections (MongoDB Schemas)
1. **Users**: Credentials, hashed passwords, roles (`Citizen`, `Department Officer`, `Admin`), points, level, and earned badge arrays.
2. **Complaints**: Ticket tracking parameters, reporter, category, priority, status timeline events, coordinate floats, assigned officer, resolution images, and proof notes.
3. **Supports**: Compound unique indices mapping `user` to `complaint` to restrict multi-upvoting.
4. **Departments**: Municipal divisions (e.g., Roads, Sanitation), active heads, and operational status.
5. **Notifications**: Recipient alerts with read status indicators.
6. **Badges**: Title, target rules (e.g., points threshold, streak minimum), and XP point rewards.
7. **AuditLogs**: Immutable trails capturing admin user actions and automated SLA events.

---

## 💻 Installation & Execution

### Prerequisites
- Node.js (version `>=18.0.0`)
- npm (version `>=9.0.0`)
- MongoDB (Local instance or Atlas Connection URI)

### Environment Variables Config

Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/civic_resolve?retryWrites=true&w=majority
JWT_SECRET=your_jwt_super_secret_key_here

# Third Party Integrations (Optional / Graceful fallbacks provided)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GEMINI_API_KEY=your_google_gemini_api_key_here

EMAIL_USER=your_email_sender@gmail.com
EMAIL_PASS=your_email_password_or_app_password
```

---

### Step-by-Step Launch

#### 1. Start Backend API Server
```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Run backend in development mode (launches Node and background SLA cron)
npm run dev
```
The backend server will run on `http://localhost:5000` with the background cron daemon starting dynamically.

#### 2. Start Frontend App
```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
The frontend application will be hosted on `http://localhost:5173`. Requests to `/api/*` will automatically be proxied to the backend port.

---

## ☁️ Deployment Guide

### Frontend (Vercel)
The client application is configured to deploy directly to Vercel. 
- **Vercel SPA Routing Configuration**: The [vercel.json](file:///d:/Projects/CivicResolve/frontend/vercel.json) file executes routing rewrites, preventing `404 Not Found` errors when refreshing deep pages.
- **Build Settings**:
  - Build Command: `npm run build`
  - Output Directory: `dist`

### Backend (Render)
The API server is ready for deployment on Render.
- **Render Web Service Configuration**:
  - Environment: `Node`
  - Build Command: `npm install`
  - Start Command: `npm start`
- Ensure all env variables in `.env` are loaded into Render's Environment dashboard settings.

---

## 📷 Screenshots

*Below are UI placeholders representing the platform interfaces:*

### Landing page
![Landing Page](https://via.placeholder.com/800x450/0f172a/f1f5f9?text=Civic+Resolve+Landing+Page)

### Citizen Dashboard (XP Levels & Timeline)
![Citizen Dashboard](https://via.placeholder.com/800x450/0f172a/f1f5f9?text=Citizen+Dashboard+Overview)

### Officer Console (Assigned Tickets & Maps)
![Officer Dashboard](https://via.placeholder.com/800x450/0f172a/f1f5f9?text=Officer+Task+Manager)

### Admin Panel & Analytics Dashboard
![Admin Dashboard](https://via.placeholder.com/800x450/0f172a/f1f5f9?text=Admin+City+Analytics)

### Proximity Maps & Nearby Issues
![Public Map](https://via.placeholder.com/800x450/0f172a/f1f5f9?text=Proximity+Issues+Map)

### Rewards & Achievement Desk
![Rewards Page](https://via.placeholder.com/800x450/0f172a/f1f5f9?text=Citizen+Badges+and+Rewards)

---

## 📈 Future Enhancements
1. **Offline Mode**: Support ticket drafting and caching via Service Workers for reporting in remote areas with poor internet connection.
2. **Predictive Analytics**: Machine learning forecasting models to foresee municipal asset failures (e.g., street light failures, sanitation logs) based on historical incident density.
3. **SMS Alerts Gateway**: Alternative alerting routes for older or non-smartphone municipal users.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE details.
