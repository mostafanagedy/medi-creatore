# Medi Creator

Medi Creator is an AI-powered content creation operating system. It provides a robust backend and a modern frontend dashboard for generating and managing creative media and scripts.

## Tech Stack

This project is structured as a Monorepo using [Turborepo](https://turbo.build/repo).

### Apps
- **`web`**: A modern [Next.js](https://nextjs.org/) frontend application. Uses Tailwind CSS and shadcn/ui.
- **`api`**: A robust [NestJS](https://nestjs.com/) backend application.

### Packages
- **`database`**: Contains the Prisma ORM schema and client exports.
- **`types`**: Shared TypeScript definitions and interfaces used across the workspace.
- **`tsconfig`**: Shared base TypeScript configurations.

## Prerequisites

- Node.js (v18+)
- pnpm (v8+)
- Docker & Docker Compose (optional, for local database)
- PostgreSQL (if not using Docker)

## Getting Started

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   Copy the example environment file and configure your credentials (Database URL, Google/Facebook OAuth client IDs, API keys, etc.):
   ```bash
   cp .env.example .env
   ```

3. **Start the Database**
   You can spin up a local PostgreSQL instance via Docker:
   ```bash
   docker-compose up -d
   ```

4. **Initialize the Database**
   Push the schema to the database and generate the Prisma client:
   ```bash
   npx turbo run db:push
   ```
   *(Optional)* Run the seed script to populate initial data:
   ```bash
   npx turbo run db:seed
   ```

5. **Start the Development Servers**
   To start both the `web` and `api` servers simultaneously:
   ```bash
   npx turbo run dev
   ```
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:3001

## Architecture

For more details on the system design and architecture, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).
