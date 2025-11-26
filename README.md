# Brendan's exegenesis monorepo

I'll be trying to store all app ideas, personal projects, and resume examples here

**Live Application**: [https://antigogglin.org](https://antigogglin.org)

## Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **SCSS** - Styling with Sass
- **Socket.IO Client** - Real-time WebSocket communication

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **Express** - HTTP server (via NestJS)
- **Socket.IO** - WebSocket server for real-time features

### Infrastructure & DevOps
- **Docker** - Containerization
- **Docker Hub** - Container registry (`bokeefe96/b-mono-image`)
- **GitHub Actions** - CI/CD pipelines
- **DigitalOcean Droplet** - Cloud hosting
- **Nginx** - Reverse proxy and static file server
- **Certbot** - SSL certificate management (Let's Encrypt)

### Development Tools
- **Node.js** (v20) - Runtime environment
- **npm** - Package manager
- **Concurrently** - Run multiple processes in development

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
├── nest-server/              # NestJS backend application
│   ├── src/                 # Source code
│   │   ├── main.ts          # Application entry point
│   │   ├── app.module.ts    # Root module
│   │   ├── faker/           # Faker service module
│   │   ├── health/          # Health check endpoints
│   │   ├── lunch/           # Lunch WebSocket gateway
│   │   └── text-corpse/     # Text corpse WebSocket gateway
│   ├── dist/                # Compiled JavaScript (production)
│   └── package.json         # Backend dependencies
├── react-fe/                # React frontend application
│   ├── src/
│   │   ├── main.tsx         # React entry point
│   │   ├── App.tsx          # Root component
│   │   ├── components/      # Reusable UI components
│   │   ├── domains/         # Feature modules (Lobby, Lunch, TextCorpse, etc.)
│   │   ├── services/        # API and WebSocket services
│   │   └── style/           # Global styles and themes
│   ├── dist/                # Built static files (production)
│   └── package.json         # Frontend dependencies
├── models/                  # Shared TypeScript models/utilities
│   ├── index.ts             # Shared type definitions
│   └── dist/                # Compiled models
├── deps/                    # Shared dependencies
├── .github/
│   └── workflows/
│       ├── ci.yml           # CI: Build and push Docker image
│       └── cd.yml           # CD: Deploy to DigitalOcean
├── Dockerfile               # Multi-stage Docker build
├── startup.sh               # Container startup script
└── package.json             # Root package.json with scripts
```

### Development Notes

- The backend serves the frontend static files in production
- CORS is enabled for development
- Hot reload is enabled for both frontend and backend
- The backend runs on port 4171, frontend on port 5173

## Production Deployment

### Cloud Infrastructure

**Platform**: DigitalOcean Droplet

- **Droplet Name**: `b-mono-new`
- **Droplet ID**: `507491966`
- **IP Address**: `137.184.190.9`
- **Region**: San Francisco (sfo3)
- **Specs**: 512MB RAM, 1 vCPU, 10GB disk
- **OS**: Ubuntu 24.10 x64
- **SSH Username**: `root` (for Docker operations)

**Domain Configuration**: `antigogglin.org`

- **DNS Provider**: DigitalOcean
- **Nameservers**: Pointing to DigitalOcean from name.com
- **A Record**: Points to `137.184.190.9`
- **SSL Certificates**: Managed via Let's Encrypt (Certbot)
  - Certificate location: `/etc/ssl/antigogglin/`
  - Files: `public.pem`, `private.pem`

**Docker Hub Registry**:

- **Repository**: `bokeefe96/b-mono-image`
- **Tag**: `latest`
- **Build**: Automated via GitHub Actions CI pipeline

### Container Configuration

The production container runs with the following setup:

**Ports Exposed**:
- `80` - HTTP traffic
- `443` - HTTPS traffic
- `4171` - NestJS backend API (also accessible via nginx proxy)

**Environment Variables**:
- `DOMAIN=antigogglin.org` - Primary domain for nginx configuration

**Volume Mounts**:
- `/etc/ssl/antigogglin:/etc/ssl/antigogglin:ro` - SSL certificates (read-only)
- `/root/b-mono-default.conf:/etc/nginx/http.d/default.conf:ro` - Custom nginx configuration (read-only)
- `/root/startup-no-certbot.sh:/usr/src/app/startup.sh:ro` - Startup script override (read-only)

**Container Behavior**:
- **Restart Policy**: `unless-stopped` - Container automatically restarts on failure or server reboot
- **Processes**: 
  - NestJS backend runs on port 4171
  - Nginx serves frontend static files and proxies API requests
  - Both processes managed by the startup script

### SSH Access

**Local SSH Key**:

- **Key Name**: `github-actions`
- **Path**: `~/.ssh/github_actions_key`
- **Permissions**: `chmod 600 ~/.ssh/github_actions_key`

### SSH Instructions

#### Connect to Droplet

```bash
ssh -i ~/.ssh/github_actions_key root@137.184.190.9
```

#### Check Running Containers

```bash
docker ps
```

#### View Application Logs

```bash
docker logs b-mono
```

#### Restart Application

```bash
docker restart b-mono
```

#### Pull Latest Image and Deploy Manually

If you need to manually deploy (e.g., if automated pipeline fails):

```bash
# Pull latest image
docker pull bokeefe96/b-mono-image:latest

# Stop and remove old container
docker rm -f b-mono || true

# Run new container with all required mounts and environment
docker run -d --name b-mono --restart unless-stopped \
  -e DOMAIN=antigogglin.org \
  -p 80:80 -p 443:443 -p 4171:4171 \
  -v /etc/ssl/antigogglin:/etc/ssl/antigogglin:ro \
  -v /root/b-mono-default.conf:/etc/nginx/http.d/default.conf:ro \
  -v /root/startup-no-certbot.sh:/usr/src/app/startup.sh:ro \
  bokeefe96/b-mono-image:latest
```

**Note**: The automated CD pipeline should handle this automatically. Only use manual deployment if the pipeline fails.

#### Clean Up Docker

```bash
docker container prune -f
docker image prune -af
docker volume prune -f
```

### CI/CD Pipeline

The application uses a two-stage GitHub Actions pipeline for continuous integration and deployment.

#### CI Pipeline (`.github/workflows/ci.yml`)

**Trigger**: Push to `main` or `feature/pipeline-fix` branches

**Steps**:
1. Checkout repository code
2. Login to Docker Hub using credentials
3. Build Docker image with tag: `{DOCKER_USERNAME}/b-mono-image:latest`
4. Push image to Docker Hub

**Required GitHub Secrets**:
- `DOCKER_USERNAME` - Docker Hub username (e.g., `bokeefe96`)
- `DOCKER_PASSWORD` - Docker Hub access token or password

#### CD Pipeline (`.github/workflows/cd.yml`)

**Trigger**: Runs after CI Pipeline completes successfully

**Branch Filter**: Only runs for `main`, `develop`, or branches starting with `feature/`

**Steps**:
1. Connect to DigitalOcean droplet via SSH
2. Clean up old Docker containers, images, volumes, and build cache
3. Pull latest Docker image from Docker Hub
4. Stop and remove existing `b-mono` container
5. Run new container with:
   - Environment variables (DOMAIN)
   - Port mappings (80, 443, 4171)
   - Volume mounts (SSL certs, nginx config, startup script)
   - Restart policy
6. Clean up unused Docker images

**Required GitHub Secrets**:
- `SSH_PRIVATE_KEY` - Contents of the SSH private key file (`~/.ssh/github_actions_key`)
- `DOCKER_USERNAME` - Docker Hub username (must match CI pipeline)

**Deployment Command** (automated):
```bash
docker run -d --name b-mono --restart unless-stopped \
  -e DOMAIN=antigogglin.org \
  -p 80:80 -p 443:443 -p 4171:4171 \
  -v /etc/ssl/antigogglin:/etc/ssl/antigogglin:ro \
  -v /root/b-mono-default.conf:/etc/nginx/http.d/default.conf:ro \
  -v /root/startup-no-certbot.sh:/usr/src/app/startup.sh:ro \
  {DOCKER_USERNAME}/b-mono-image:latest
```

**Pipeline Flow**:
```
Push to main/feature branch
    ↓
CI Pipeline: Build & Push Docker Image
    ↓
CD Pipeline: Deploy to DigitalOcean
    ↓
Container Running at antigogglin.org
```

### Environment Configuration

#### Development Environment

- **Backend API**: `http://localhost:4171`
- **Frontend**: `http://localhost:5173`
- **API Endpoint**: `http://localhost:4171/api`
- **WebSocket**: `ws://localhost:4171` (Socket.IO)
- **CORS**: Enabled for cross-origin requests

#### Production Environment

- **Domain**: `https://antigogglin.org`
- **Backend API**: `https://antigogglin.org/api`
- **Frontend**: Served by nginx from `/usr/src/app/react-fe/dist`
- **WebSocket**: `wss://antigogglin.org/socket.io/` (via nginx proxy)
- **SSL/TLS**: HTTPS enabled with Let's Encrypt certificates

#### Nginx Configuration

Nginx serves two roles:
1. **Static File Server**: Serves React frontend build files
2. **Reverse Proxy**: Proxies `/api/` and `/socket.io/` requests to NestJS backend

**Configuration Files**:
- **Container Default**: Generated at runtime by `startup.sh` based on environment variables
- **Production Override**: `/root/b-mono-default.conf` (mounted as read-only volume)

**SSL Certificate Management**:
- Certificates stored in `/etc/ssl/antigogglin/` on the droplet
- Mounted into container as read-only volume
- Managed by Certbot (Let's Encrypt)
- Startup script checks for certificates and configures HTTPS if available

### Troubleshooting

#### CI/CD Pipeline Issues

**Pipeline doesn't trigger**:
- Verify branch name matches trigger conditions (`main`, `develop`, or `feature/*`)
- Check that CI pipeline completes successfully before CD runs
- Review GitHub Actions workflow logs

**CD pipeline fails to deploy**:
- **Check SSH connection**: Verify `SSH_PRIVATE_KEY` secret is correctly set in GitHub
- **Verify Docker Hub access**: Ensure `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are set
- **Check droplet status**: Ensure droplet is running and accessible
- **Review deployment logs**: Check GitHub Actions logs for specific error messages

**Container doesn't start after deployment**:
- **Check container logs**: `docker logs b-mono` on the droplet
- **Verify volume mounts exist**: Ensure `/etc/ssl/antigogglin`, `/root/b-mono-default.conf`, and `/root/startup-no-certbot.sh` exist on the droplet
- **Check port conflicts**: Ensure ports 80, 443, and 4171 are not in use by other services
- **Manual deployment**: Use the manual deployment command above to test

**Image not updating**:
- Verify CD pipeline is pulling the correct image: `docker pull {DOCKER_USERNAME}/b-mono-image:latest`
- Check that CI pipeline successfully pushed the new image
- Ensure Docker Hub credentials are correct

#### SSH Connection Issues

**If SSH fails**:

```bash
# Check key permissions
chmod 600 ~/.ssh/github_actions_key

# Test connection
ssh -i ~/.ssh/github_actions_key root@137.184.190.9 "echo 'test'"

# If connection fails, verify:
# - Key file exists and has correct permissions
# - Droplet firewall allows SSH (port 22)
# - SSH key is added to droplet's authorized_keys
```

#### Docker Issues on Droplet

**Check container status**:
```bash
docker ps -a  # List all containers
docker logs b-mono  # View container logs
docker inspect b-mono  # Inspect container configuration
```

**Restart container**:
```bash
docker restart b-mono
```

**Remove and redeploy**:
```bash
docker rm -f b-mono
# Then use manual deployment command above
```

**Check Docker image**:
```bash
docker images | grep b-mono-image  # Verify image exists
docker pull bokeefe96/b-mono-image:latest  # Pull latest
```

#### Domain and SSL Issues

**If domain doesn't work**:
- Check DigitalOcean DNS settings - A record should point to `137.184.190.9`
- Wait for DNS propagation (up to 24 hours for new records)
- Test with `curl` or `dig antigogglin.org` to verify DNS resolution

**If HTTPS doesn't work**:
- Verify SSL certificates exist: `ls -la /etc/ssl/antigogglin/`
- Check certificate validity: `openssl x509 -in /etc/ssl/antigogglin/public.pem -text -noout`
- Review nginx configuration: `docker exec b-mono cat /etc/nginx/http.d/default.conf`
- Check container logs for SSL-related errors

#### Application Issues

**Backend not responding**:
- Check NestJS logs: `docker logs b-mono | grep -i nest`
- Verify backend is running: `docker exec b-mono ps aux | grep node`
- Test backend directly: `curl http://localhost:4171/api/health` (from droplet)

**Frontend not loading**:
- Verify frontend files exist: `docker exec b-mono ls -la /usr/src/app/react-fe/dist`
- Check nginx configuration: `docker exec b-mono cat /etc/nginx/http.d/default.conf`
- Review nginx error logs: `docker exec b-mono tail -f /var/log/nginx/error.log`

**WebSocket connection fails**:
- Verify Socket.IO is configured in both frontend and backend
- Check nginx proxy configuration for `/socket.io/` location
- Review browser console for WebSocket errors
- Test WebSocket connection: `wscat -c wss://antigogglin.org/socket.io/`

## Docker Image Details

### Image Structure

The Docker image is built using a multi-stage build process:

**Stage 1: Build**
- Builds shared models package
- Compiles NestJS backend TypeScript to JavaScript
- Builds React frontend with Vite (produces static files)

**Stage 2: Production**
- Uses `node:20-alpine` for smaller image size
- Installs nginx and certbot
- Copies compiled backend and frontend builds
- Sets up startup script

### Startup Script Behavior

The `startup.sh` script (or its override) performs:

1. **Backend Startup**: Starts NestJS application in background on port 4171
2. **Nginx Configuration**: Generates nginx config based on:
   - `DOMAIN` environment variable
   - Presence of SSL certificates
   - `SKIP_CERTBOT` flag (defaults to `true`)
3. **SSL Certificate Handling**:
   - Checks for existing certificates in `/etc/ssl/antigogglin/`
   - If missing and `SKIP_CERTBOT=false`, attempts to obtain via Certbot
   - Configures HTTPS server block if certificates are available
4. **Nginx Startup**: Starts nginx in foreground (required for Docker)

### Volume Mounts Explained

- **SSL Certificates** (`/etc/ssl/antigogglin`): Persistent storage for Let's Encrypt certificates, mounted read-only to prevent container from modifying them
- **Nginx Config** (`/root/b-mono-default.conf`): Custom nginx configuration override, allows fine-tuning without rebuilding image
- **Startup Script** (`/root/startup-no-certbot.sh`): Override startup script that skips Certbot (useful when certificates are managed externally)

## Additional Resources

### GitHub Repository
- Repository contains both CI and CD workflow files
- Workflows are triggered automatically on push to specified branches

### Docker Hub
- Image repository: `bokeefe96/b-mono-image`
- Tag strategy: `latest` (always points to most recent build)
- Images are public or private based on Docker Hub repository settings

### Monitoring
- Application health check: `https://antigogglin.org/api/health`
- Container logs accessible via `docker logs b-mono` on droplet
- GitHub Actions provides build and deployment logs
