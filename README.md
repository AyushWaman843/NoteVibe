# NOTEVIBE ⚡
> **Sync Your Frequency. Ace Your Grades.**

NoteVibe is a next-gen, high-aesthetic study hub designed for students who want to organize their academic life without the boring interface. Built with a "Gen-Z first" design philosophy, it combines powerful study tools with an immersive user experience.

![NoteVibe Aesthetic](https://img.shields.io/badge/Vibe-Immaculate-purple?style=for-the-badge) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)

## 🌟 Features

### 🎨 Immaculate UI/UX
- **Glassmorphism Design**: Sleek, translucent cards and vibrant gradients.
- **Dynamic Interactions**: Smooth animations and responsive elements.
- **Dark Mode Native**: Built for late-night study sessions.

### 🧠 Smart Study Tools
- **Sector Isolation**: Content is automatically filtered by your **Branch** (CS, IT, Data Sci, Mech) and **Semester**.
- **Role-Based Access**: 
  - **Admins**: Manage subjects, upload official notes, and maintain the hub.
  - **Students**: View resources, create personal notes, and sync with the hub.
- **Cloud Sync**: Real-time data synchronization using **Firebase Firestore**.

### 🤖 AI-Powered (Gemini)
- **Instant Summaries**: Get a TL;DR of any note with one click.
- **Quiz Generator**: Automatically generate practice quizzes from your study material to test your knowledge.

### 📁 Resource Management
- **File Uploads**: Support for PDFs, Docs, and Images (up to 20MB).
- **Secure Storage**: Powered by **Firebase Storage** with robust security rules.

### 🔌 Connectivity
- **WhatsApp Integration**: Direct line to sector admins for support.
- **Profile Management**: Update your branch/semester as you progress through your degree.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Vanilla CSS (for custom glass effects)
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **AI**: Google Gemini API (via `@google/genai`)
- **Fonts**: Space Grotesk & Inter via Google Fonts

---

## 🚀 Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/AyushWaman843/NoteVibe.git
   cd NoteVibe
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root with your credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   GEMINI_API_KEY=your_gemini_key
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## 📄 License
MIT License - created by **Ayush Waman**.
