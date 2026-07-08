<div align="center">
  <img src="public/globe.svg" alt="Odyssey Logo" width="120" height="120" />
  <h1>🥾 Odyssey</h1>
  <p><strong>Your highly personalized, AI-powered travel and hiking companion.</strong></p>
</div>

<br />

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/LangGraph-AI-blue?style=for-the-badge" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Claude-3.5-purple?style=for-the-badge" alt="Claude AI" />
</div>

<br />

**Odyssey** moves far beyond simple keyword searches. It uses a **LangGraph-based routing architecture** to intelligently decide when to fetch fast results and when to perform deep, personalized AI analysis based on your group dynamics, live weather, and specific hobbies.

---

## ✨ Features

### 🧠 Intelligent Search Routing (LangGraph)
- **Fast Path:** Simple queries (e.g., *"hikes in SF"*) are instantly routed to Google Places for blazing-fast results.
- **Deep AI Path:** Complex queries (e.g., *"I want an epic hike for my dog"*) are routed to Claude Opus. It cross-references live weather, your saved hobbies, and group dynamics to write personalized reasoning for each trail.
- **Cost & Latency Optimized:** Uses Claude Haiku as the gatekeeper node (capped at 150 tokens) to make routing decisions in milliseconds without burning tokens.

### 🌐 Complete Offline Mode (PWA)
- **Installable:** Functions as a Progressive Web App (PWA) that can be installed directly to your phone's home screen.
- **Local-First Storage:** Uses `Dexie.js` (IndexedDB) to save hikes locally to your device.
- **Offline Maps & GPS:** When you save a trail, the app downloads high-res static satellite maps. On the trail without cell service, the app tracks your live location via satellite GPS (`watchPosition`) and renders a pulsing dot over your saved offline map.

### 💬 AI Trail Guide
- Tap **"Ask AI"** on any trail to open an interactive chat drawer.
- Claude acts as a local guide who knows the trail intimately, answering questions about packing, parking, crowds, and difficult sections.
- Features quick-tap suggestion chips for common questions to save time on mobile.

### 🗺️ Immersive Map Experience
- Embedded Google Maps with dynamic, interactive markers.
- **In-App Street View:** Drag around a 360° street view panorama of the trailhead directly within the app—no redirecting to the external Google Maps app!

---

## 🛠️ Tech Stack

- **Framework:** [Next.js (App Router)](https://nextjs.org/)
- **AI Engine:** [LangGraph](https://langchain-ai.github.io/langgraphjs/) & Anthropic SDK (Claude 3.5 Sonnet / Opus / Haiku)
- **Maps:** `@vis.gl/react-google-maps`, Google Maps Javascript API, Google Places API
- **Offline & PWA:** `Serwist`, `Dexie.js` (IndexedDB)
- **Styling:** Tailwind CSS (Modern Glassmorphism UI)
- **Auth:** NextAuth (Prisma Adapter)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/your-username/odyssey.git
cd odyssey
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root of the project:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3007` to view the app.

---

## 📱 Testing Offline Mode Locally
1. Run the app and go to `/search`.
2. Find a hike and click **"💾 Save Offline"**.
3. Open your browser's Developer Tools -> **Network** tab.
4. Change throttling from "No throttling" to **"Offline"**.
5. Refresh the page or click **"💾 Offline Hikes"** in the header.
6. The app will load instantly, display your saved hikes, and show the static map images with your simulated live GPS location!

---

## 📄 License
This project is proprietary. All Rights Reserved. You may not use, copy, distribute, or modify this code without explicit written permission.
