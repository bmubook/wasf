# Wasf

Wasf is an AI-powered application built with React, Vite, and Supabase. It integrates advanced Artificial Intelligence services to provide features like Text-to-Speech (TTS), Speech-to-Text (STT), and content generation.

## Features
- **Text-to-Speech (TTS):** High-quality voice generation (supporting multiple voices including Azure Speech Services and ElevenLabs).
- **Speech-to-Text (STT):** Voice recording and accurate transcription.
- **AI Content Generation:** Integration with Google Gemini AI for smart text generation and processing.
- **Cloud Database:** Powered by Supabase for secure data storage, authentication, and Row Level Security (RLS).
- **Responsive UI:** Modern, user-friendly interface built with React.

## Tech Stack
- Frontend: React + Vite + Vanilla CSS
- Backend/BaaS: Supabase (PostgreSQL, Auth, Edge Functions)
- AI Services: Google Gemini AI, Azure Speech Services
- Deployment: Vercel / Cloudflare / Netlify (Recommended)

## Prerequisites
Before running the project locally, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/bmubook/wasf.git
   cd wasf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup Environment Variables:
   Copy `.env.example` to `.env` and fill in your API keys (Supabase, Gemini, Azure, etc.).
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev`: Starts the local development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Locally preview the production build.
- `npm run lint`: Runs ESLint to find and fix problems.

## License
MIT License
