# Sarvatra AI

A cross-platform desktop application that provides AI-powered text processing capabilities through contextual menus and keyboard shortcuts.

## Features

🔐 **Personal OpenAI API Key Management**
- Each user maintains their own encrypted OpenAI API key
- Secure AES-256-GCM encryption with authentication
- API key validation and testing

👥 **User Management System**
- Role-based access control (Administrator vs. User permissions)
- Admin approval workflow for new user registrations
- Real-time admin dashboard with database statistics

🎛️ **Customizable Command System**
- Users can show/hide published commands from their workspace
- NEW badges for recently published commands
- Command management interface with search and filtering

🔒 **Enhanced Security**
- Strong password policy (8+ chars, uppercase, number, special character)
- Secure session management with PostgreSQL session store
- Protected API endpoints with proper authentication

🎤 **Speech-to-Text Integration**
- Browser-native Web Speech API for voice input capture
- OpenAI Whisper API integration for accurate transcription
- Real-time audio recording with visual feedback

🛠️ **Built With**
- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express.js, PostgreSQL
- **Security**: bcrypt, AES-256-GCM encryption, JWT sessions
- **AI Integration**: OpenAI GPT-3.5-turbo and Whisper APIs

## Getting Started

1. Install dependencies: `npm install`
2. Set up your environment variables
3. Run the development server: `npm run dev`
4. Access the application at `http://localhost:5000`

## Architecture

The application follows a modern full-stack architecture with:
- Type-safe database operations using Drizzle ORM
- React Query for efficient state management
- Secure API design with proper error handling
- Modular component architecture with consistent design system

---

**Sarvatra AI** - Empowering users with personalized AI workflows and secure, scalable text processing capabilities.
