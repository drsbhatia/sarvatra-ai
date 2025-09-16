# Sarvatra AI - Desktop Application

## Overview

Sarvatra AI is a cross-platform desktop application that provides AI-powered text processing capabilities through contextual menus and keyboard shortcuts. The application enables users to execute pre-configured AI commands on selected text while maintaining centralized administrative control. Key features include role-based access control (Administrator vs. User permissions), customizable command management, flexible output handling, and integrated speech-to-text for capturing spoken conversations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessibility and consistency
- **Styling**: Tailwind CSS with Material Design 3 principles adapted for desktop use
- **State Management**: TanStack Query for server state management and local React state for UI interactions
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: CSS custom properties with light/dark mode support and Inter/JetBrains Mono typography

### Backend Architecture
- **Runtime**: Node.js with Express.js for the REST API server
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **Build System**: Vite for development and esbuild for production bundling

### Authentication & Authorization
- **Role-Based Access**: Two distinct user roles (Administrator and User) with different capabilities
- **Session-Based Auth**: Server-side session management with secure cookie handling
- **User Management**: Centralized user creation and management through admin interface

### Database Design
- **Primary Database**: PostgreSQL for reliable data persistence
- **Schema Management**: Drizzle migrations for version-controlled database changes
- **Connection**: Neon serverless PostgreSQL for scalable cloud deployment
- **User Storage**: Basic user table with username/password authentication and role assignment

### Component Architecture
- **Design System**: Consistent component library following Material Design 3 guidelines
- **Layout Structure**: Card-based layouts with proper spacing and visual hierarchy
- **Interactive Elements**: Form handling with React Hook Form and Zod validation
- **Modal System**: Dialog and popover components for contextual interactions

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client for database connectivity
- **drizzle-orm**: TypeScript ORM for database operations and migrations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility and interaction patterns

### Development Tools
- **Vite**: Fast development server and build tool with HMR support
- **TypeScript**: Static type checking and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework for consistent styling
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

### UI Components
- **Lucide React**: Consistent icon library for interface elements
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation for form data and API responses
- **Class Variance Authority**: Type-safe component variant management

### Speech & AI Integration
- **Speech-to-Text**: Browser-native Web Speech API for voice input capture
- **AI Processing**: External AI service integration for text processing commands
- **Command System**: Configurable AI commands with customizable output handling

### Production Infrastructure
- **Session Store**: connect-pg-simple for PostgreSQL session persistence
- **Environment Management**: dotenv for configuration management
- **Error Handling**: Structured error responses with proper HTTP status codes