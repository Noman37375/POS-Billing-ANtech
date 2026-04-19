# Deployment Guide — Hostinger KVM2 VPS (Docker)

**Server:** Hostinger KVM2  
**Port:** 3000 (available)  
**Method:** Docker + docker-compose  
**Static IP:** Yes (VPS has static IP — good for FBR whitelisting later)

---

## Prerequisites on Server

SSH into your VPS first:
```bash
ssh root@YOUR_SERVER_IP
```

Install Docker (if not installed):
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

Verify:
```bash
docker --version
docker compose version
```

---

## Step 1: Push Code to Server

**Option A — Git (recommended):**
```bash
# On server
git clone https://github.com/YOUR_USERNAME/POS-Billing.git /var/www/pos-billing
cd /var/www/pos-billing
```

**Option B — Direct file transfer (if no git):**
```bash
# On your local machine (Windows):
scp -r "C:\Users\user\Documents\POS-Billing" root@YOUR_SERVER_IP:/var/www/pos-billing
```

---

## Step 2: Create Environment File on Server

```bash
cd /var/www/pos-billing
cp .env.example .env.production
nano .env.production
```

Fill in your actual values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-random-secret
```

Save: `Ctrl+X` → `Y` → Enter

---

## Step 3: Build and Run

```bash
cd /var/www/pos-billing
docker compose up -d --build
```

This will:
1. Build the Docker image (takes 3-5 minutes first time)
2. Start the container on port 3000
3. `-d` runs it in background

Check if running:
```bash
docker compose ps
docker compose logs -f pos-app
```

App is now at: `http://YOUR_SERVER_IP:3000`

---

## Step 4: Setup Auto-start on Reboot

docker-compose already has `restart: unless-stopped` — container will auto-restart if it crashes or server reboots.

Verify:
```bash
systemctl is-enabled docker  # should say "enabled"
```

---

## Common Commands

```bash
# View live logs
docker compose logs -f pos-app

# Stop app
docker compose down

# Restart app
docker compose restart pos-app

# Rebuild after code changes
docker compose up -d --build

# Check container status
docker compose ps

# Enter container shell (for debugging)
docker exec -it pos-billing sh
```

---

## Updating the App (After Code Changes)

```bash
cd /var/www/pos-billing

# Pull latest code (if using git)
git pull origin main

# Rebuild and restart (zero-downtime isn't needed for now)
docker compose up -d --build
```

---

## Setup Weekly Cron (Replaces Vercel Cron)

Vercel cron won't work on VPS. Use system cron instead:

```bash
crontab -e
```

Add this line (runs every Sunday at 11:59 PM PKT = 6:59 PM UTC):
```
59 18 * * 0 curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/weekly-backup
```

Replace `YOUR_CRON_SECRET` with the value from `.env.production`.

---

## Optional: Nginx Reverse Proxy + SSL

If you want `https://yourdomain.com` instead of `http://IP:3000`:

### Install Nginx
```bash
apt update && apt install -y nginx certbot python3-certbot-nginx
```

### Create Nginx Config
```bash
nano /etc/nginx/sites-available/pos-billing
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/pos-billing /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Get SSL Certificate (free)
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Done — app runs at `https://yourdomain.com`

---

## Firewall Setup (Important)

```bash
# Allow SSH (don't lock yourself out!)
ufw allow 22

# Allow port 3000 (if accessing directly)
ufw allow 3000

# Allow HTTP/HTTPS (if using nginx)
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable
```

---

## FBR Integration Note

Your VPS has a **static IP address** — this is what FBR/PRAL needs for API whitelisting.

When you're ready to implement FBR:
1. Get your server's static IP: `curl ifconfig.me`
2. Send this IP to PRAL for whitelisting: `sales@pral.com.pk`
3. FBR API calls from this server will work without proxy

---

## Troubleshooting

**Container won't start:**
```bash
docker compose logs pos-app
# Check for missing env vars or build errors
```

**Port 3000 already in use:**
```bash
lsof -i :3000
# Kill whatever is using it, or change port in docker-compose.yml
```

**Out of disk space:**
```bash
docker system prune -f  # Remove unused images/containers
df -h                    # Check disk space
```

**App crashes on startup:**
```bash
docker compose logs pos-app --tail=50
# Usually missing environment variables
```
