# Local Deployment Configuration

**⚠️ This file contains sensitive deployment information and is NOT tracked by git.**

## Production Infrastructure Details

### DigitalOcean Droplet

- **Droplet Name**: `b-mono-new`
- **Droplet ID**: `507491966`
- **IP Address**: `137.184.190.9`
- **Region**: San Francisco (sfo3)
- **Specs**: 512MB RAM, 1 vCPU, 10GB disk
- **OS**: Ubuntu 24.10 x64
- **SSH Username**: `root` (for Docker operations)
- **SSH Username (alternative)**: `bokeefe` (if using non-root user)

### Domain Configuration

- **Domain**: `antigogglin.org`
- **DNS Provider**: DigitalOcean
- **Nameservers**: Pointing to DigitalOcean from name.com
- **A Record**: Points to `137.184.190.9`

### Docker Hub Registry

- **Docker Hub Username**: `bokeefe96`
- **Repository**: `bokeefe96/b-mono-image`
- **Tag**: `latest`

### SSH Access

- **SSH Key Name**: `github-actions`
- **SSH Key Path**: `~/.ssh/github_actions_key`
- **SSH Key Permissions**: `chmod 600 ~/.ssh/github_actions_key`
- **Connection Command**: 
  ```bash
  ssh -i ~/.ssh/github_actions_key root@137.184.190.9
  ```

### SSL Certificates

- **Certificate Location**: `/etc/ssl/antigogglin/`
- **Certificate Files**: 
  - `public.pem` - Public certificate
  - `private.pem` - Private key
- **Certificate Provider**: Let's Encrypt (via Certbot)

### Volume Mounts on Droplet

The following files/directories must exist on the droplet for container volume mounts:

- `/etc/ssl/antigogglin/` - SSL certificates directory
- `/root/b-mono-default.conf` - Custom nginx configuration
- `/root/startup-no-certbot.sh` - Startup script override

### GitHub Secrets Required

The following secrets must be configured in GitHub repository settings:

- `SSH_PRIVATE_KEY` - Contents of `~/.ssh/github_actions_key` file
- `DOCKER_USERNAME` - Docker Hub username: `bokeefe96`
- `DOCKER_PASSWORD` - Docker Hub access token or password

### Manual Deployment Command

If automated deployment fails, use this command on the droplet:

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

### Quick Reference Commands

**Connect to droplet**:
```bash
ssh -i ~/.ssh/github_actions_key root@137.184.190.9
```

**Check container status**:
```bash
docker ps -a
docker logs b-mono
```

**Restart container**:
```bash
docker restart b-mono
```

**View container logs**:
```bash
docker logs -f b-mono
```

**Clean up Docker resources**:
```bash
docker container prune -f
docker image prune -af
docker volume prune -f
docker builder prune -af
```

