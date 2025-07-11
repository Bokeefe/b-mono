# Brendan's exegenesis monorepo
I'll be trying to store all app ideas, personal projects, and resume examples here

currently running on an AWS EC2 instance here:
<a href="https://bverse.world">bverse.world</a>

Stack:
* Nest
* React
* Next
* Tailwind
* Typescript
* Docker
* AWS
* CI/CD

## Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. **Install Node.js** (if not already installed):
   ```bash
   brew install node
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```
   This will install dependencies for the root project, backend, and frontend.

### Running the Application

#### Option 1: Run Both Services Together (Recommended)
```bash
npm run dev
```
This will start both the backend and frontend concurrently.

#### Option 2: Run Services Separately

**Backend (NestJS)**:
```bash
cd nest-server
npm run start:dev
```
Backend will be available at: http://localhost:4171

**Frontend (React + Vite)**:
```bash
cd react-fe
npm run dev
```
Frontend will be available at: http://localhost:5173

### Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4171/api
- **Health Check**: http://localhost:4171/api/health

### Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only the backend
- `npm run dev:frontend` - Start only the frontend
- `npm run build` - Build both backend and frontend for production
- `npm run install:all` - Install dependencies for all projects
- `npm run docker:test` - Build and run the Docker container

### Project Structure

```
b-mono/
├── nest-server/     # NestJS backend
├── react-fe/        # React frontend (Vite)
├── deps/           # Shared dependencies
└── package.json    # Root package.json with scripts
```

### Development Notes

- The backend serves the frontend static files in production
- CORS is enabled for development
- Hot reload is enabled for both frontend and backend
- The backend runs on port 4171, frontend on port 5173
