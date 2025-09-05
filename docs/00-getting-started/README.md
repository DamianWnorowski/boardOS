---
title: BoardOS Quick Start
category: getting-started
tags: [setup, installation, quickstart]
related: [/00-getting-started/installation.md, /00-getting-started/configuration.md]
last-updated: 2025-01-28
---

# BoardOS Quick Start Guide

## Quick Answer
BoardOS is a real-time drag-and-drop construction job scheduling application built with React 18, TypeScript, and Supabase. Get started in 5 minutes with local development setup.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 8+ or **yarn** 1.22+
- **Git** for version control
- **Modern browser** with drag-and-drop support

## 🚀 5-Minute Setup

### 1. Clone & Install
```bash
git clone <repository-url> boardOS
cd boardOS
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Add your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Development Server
```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. Verify Setup
- ✅ Application loads without errors
- ✅ Can see resource pool on left side
- ✅ Can create a test job
- ✅ Can drag resources to jobs

## 📋 First Steps Checklist

After setup, try these actions to verify everything works:

- [ ] **Create a Job**: Click "Add Job" button
- [ ] **Add Resources**: Drag an operator from the pool
- [ ] **Test Attachments**: Drop operator on equipment (should attach)
- [ ] **Mobile Test**: Open on mobile device, test touch drag
- [ ] **Real-time**: Open in two browser tabs, verify sync

## 🏗️ What You Just Installed

### Core Technologies
- **React 18** - UI framework with concurrent features
- **TypeScript** - Type safety and developer experience
- **Vite** - Lightning-fast build tool
- **Supabase** - Real-time PostgreSQL backend
- **Tailwind CSS** - Utility-first styling
- **react-dnd** - Drag and drop functionality

### Key Features
- **Real-time synchronization** across multiple users
- **Drag-and-drop scheduling** with touch support
- **Magnet system** for automatic resource attachments
- **Multi-shift support** (day/night scheduling)
- **Mobile-responsive** design

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server (port 5173)
npm run build           # Production build
npm run preview         # Preview production build

# Testing  
npm test               # Run test suite
npm run test:ui        # Run tests with UI
npm run test:e2e       # End-to-end tests

# Code Quality
npm run lint           # ESLint check
npm run type-check     # TypeScript check
npm run format         # Prettier format
```

## 📁 Project Structure Overview

```
src/
├── components/         # React components
│   ├── board/         # Main scheduling board
│   ├── resources/     # Resource cards and pools
│   ├── modals/        # Modal dialogs
│   └── mobile/        # Mobile-specific components
├── context/           # React Context providers
├── hooks/             # Custom React hooks
├── services/          # Database and API services
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── classes/           # Object-oriented classes
```

## 🎯 Next Steps

**New to the project?**
1. Read [Installation Guide](installation.md) for detailed setup
2. Check [First Steps Tutorial](first-steps.md) for guided walkthrough
3. Review [Configuration Guide](configuration.md) for advanced setup

**Ready to develop?**
1. Study [Architecture Overview](../01-architecture/overview.md)
2. Explore [Component Library](../03-components/index.md)
3. Review [Development Workflow](../05-development/workflow.md)

**Need help?**
- Check [Troubleshooting Guide](../06-deployment/troubleshooting.md)
- Review [Common Issues](../06-deployment/troubleshooting.md#common-issues)
- See [Performance Tips](../05-development/performance.md)

## ⚠️ Common Setup Issues

### Database Connection Issues
```bash
# Check Supabase credentials
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Test connection
npm run test:db
```

### Port Already in Use
```bash
# Use different port
npm run dev -- --port 5174

# Or kill existing process
lsof -ti:5173 | xargs kill
```

### Node Version Issues
```bash
# Check version
node --version  # Should be 18+

# Use Node Version Manager
nvm use 18
nvm install 18.18.0
```

---

**Ready to build construction schedules?** 🚀

Continue with the [detailed installation guide](installation.md) or jump into the [first steps tutorial](first-steps.md).