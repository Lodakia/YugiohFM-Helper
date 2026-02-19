# Raspberry Pi Zero 2 W Setup Guide

This guide will help you set up YGOFM Helper to run on your Raspberry Pi Zero 2 W, accessible on your local network.

## Prerequisites

- Raspberry Pi Zero 2 W with Raspberry Pi OS installed
- Pi-hole and PiVPN already configured (as mentioned)
- SSH access to your Pi

## Step 1: Install Node.js

The Raspberry Pi Zero 2 W uses **ARM64 (64-bit)** architecture, which supports modern Node.js versions. We'll install the latest Node.js version (v25.6.1 or latest LTS).

### Option A: Using Node Version Manager (NVM) - Recommended

This method gives you the most control and access to the latest versions:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell configuration
source ~/.bashrc

# Install the latest Node.js version (v25.6.1 or latest)
nvm install node

# Or install the latest LTS version (v24.x) for production stability
# nvm install --lts

# Set as default
nvm use node
nvm alias default node

# Verify installation
node --version
npm --version
```

### Option B: Using NodeSource Repository

For a system-wide installation:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 24.x (LTS) or 25.x (Current)
# For LTS (recommended for production):
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -

# Or for latest Current version:
# curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -

sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Option C: Direct Binary Installation (ARM64)

If the above methods don't work, you can download the ARM64 binary directly:

```bash
# Download Node.js v25.6.1 for ARM64
cd /tmp
wget https://nodejs.org/dist/v25.6.1/node-v25.6.1-linux-arm64.tar.xz

# Extract
tar -xf node-v25.6.1-linux-arm64.tar.xz

# Move to /usr/local
sudo mv node-v25.6.1-linux-arm64 /usr/local/nodejs

# Add to PATH (add to ~/.bashrc)
echo 'export PATH=/usr/local/nodejs/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify installation
node --version
npm --version
```

**Note:** If you're running a 32-bit OS on your Pi Zero 2 W (unlikely but possible), you'll need to use unofficial builds or compile from source. Check your architecture first:
```bash
uname -m
# Should show 'aarch64' for 64-bit ARM
```

**Install pnpm (recommended, no npm required):** This guide and the update script use pnpm. Install it after Node.js:

```bash
# Using Corepack (bundled with Node 16.13+)
corepack enable
corepack prepare pnpm@latest

# Or standalone install script
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
```

Verify: `pnpm --version`

## Step 2: Clone and Setup the Project

```bash
# Navigate to your preferred directory (e.g., /home/pi)
cd /home/pi

# Clone the repository (or transfer files via SCP/SFTP)
git clone <your-repo-url> yugiohfm-helper
cd yugiohfm-helper

# Install dependencies (pnpm recommended on Pi; npm works too)
pnpm install
# Or: npm install
```

## Step 3: Get Your Pi's Local IP Address

```bash
# Find your Pi's IP address on the local network
hostname -I
```

Note this IP address (e.g., `192.168.1.100`). You'll need it for the next steps.

## Step 4: Configure for Local Network Access

### Option A: Production Build with Node Server (Recommended)

This is the most efficient approach for a Pi Zero 2 W and **persists decks on the server** (decks survive app restarts and browser closes):

1. **Update `index.html` to use your Pi's IP:**
   Edit `index.html` and change the `siteUrl` line (around line 18):
   ```html
   <script type="text/javascript">
     var siteUrl = "http://YOUR_PI_IP:3000"
   </script>
   ```
   Replace `YOUR_PI_IP` with your Pi's IP (e.g., `192.168.1.100`). Omit the trailing slash.

2. **Build the project:**
   ```bash
   pnpm run build
   ```
   (or `npm run build`)

3. **Start the server:**
   ```bash
   pnpm start
   ```
   (or `npm start`)  
   This runs the included Node server (port 3000), which serves the app and saves userdata (decks, game-assist state) to `data/userdata.json` in the project folder. That file is created automatically and is listed in `.gitignore`.

### Option B: Development Mode with Vite (Easier, but less efficient)

1. **Update `vite.config.js`** to allow network access:
   ```javascript
   export default defineConfig({
     plugins: [vue()],
     server: {
       host: '0.0.0.0',  // Allow access from network
       port: 5173,
     },
     // ... rest of config
   })
   ```

2. **Update `index.html`** to use your Pi's IP:
   ```html
   <script type="text/javascript">
     var siteUrl = "http://YOUR_PI_IP:5173/"
   </script>
   ```

## Step 5: Run Without Keeping the Terminal Open

**Option 5a – Run in background (until you log out or reboot):**  
From the project directory:

```bash
nohup node server.js > yugiohfm.log 2>&1 &
```

The app keeps running and output goes to `yugiohfm.log`. To stop it later: `pkill -f "node server.js"` (or find the process with `ps aux | grep server.js` and kill it).

**Option 5b – Start on boot and keep running (recommended):**  
Use the systemd service below so the app starts automatically and restarts if it crashes.

---

### Set Up Auto-Start Service (systemd)

### For Production Build (Option A):

```bash
sudo nano /etc/systemd/system/yugiohfm.service
```

Add this content (replace `YOUR_USER` with your Pi username, e.g. `pi` or `lodakia`, and `YOUR_PROJECT_PATH` with the full path to the project, e.g. `/home/pi/yugiohfm-helper`):

```ini
[Unit]
Description=YGOFM Helper Web App
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=YOUR_PROJECT_PATH
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Deck and game-assist data are stored in `YOUR_PROJECT_PATH/data/userdata.json`. Back up that file if you want to keep your decks when updating the app.

**Updating the app:** A script is included to pull changes, install deps, build, and restart the service (and to back up `data/userdata.json` before updating):

```bash
cd /home/lodakia/YugiohFM-Helper   # or your project path
chmod +x scripts/update-on-pi.sh
./scripts/update-on-pi.sh
```

The script uses **pnpm** (no npm required). It runs `git pull`, `pnpm install`, `pnpm run build`, then `sudo systemctl restart yugiohfm.service`. If you use npm instead, edit the script and replace `pnpm` with `npm`.

If you installed Node via NVM, systemd may not have `node` in PATH. Use the full path to `node` in `ExecStart`, for example:  
`ExecStart=/home/pi/.nvm/versions/node/v25.6.1/bin/node server.js` (replace with your NVM node path; run `which node` in your shell to see it).

### For Development Mode (Option B):

```bash
sudo nano /etc/systemd/system/yugiohfm.service
```

Add this content:
```ini
[Unit]
Description=YGOFM Helper Web App
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/yugiohfm-helper
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

### Enable and Start the Service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable yugiohfm.service

# Start the service
sudo systemctl start yugiohfm.service

# Check status
sudo systemctl status yugiohfm.service
```

## Step 6: Verify It's Working

1. **Check if the service is running:**
   ```bash
   sudo systemctl status yugiohfm.service
   ```

2. **Check if the port is listening:**
   ```bash
   netstat -tlnp | grep :3000
   # or for dev mode:
   netstat -tlnp | grep :5173
   ```

3. **Access from another device on your network:**
   - Open a browser on any device connected to the same network
   - Navigate to `http://YOUR_PI_IP:3000` (or `:5173` for dev mode)
   - You should see the YGOFM Helper app

## Step 7: Firewall Configuration (if needed)

If you have a firewall enabled, allow the port:

```bash
# For UFW (if installed)
sudo ufw allow 3000/tcp
# or for dev mode:
sudo ufw allow 5173/tcp

# For iptables (if used)
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## Troubleshooting

### "curl http://localhost:3000 hangs" or "192.168.1.x:3000 does nothing"

**Ports:** The app uses different ports depending on how you run it:

| How you run it | Port | Command / requirement |
|----------------|------|-------------------------|
| Production (recommended on Pi) | **3000** | Build first: `npm run build` or `pnpm run build`, then run `serve dist -l tcp://0.0.0.0:3000` or use the systemd service / `./pi-start.sh` |
| Development (Vite dev server) | **5173** | `npm run dev` or `pnpm run dev` — use `http://YOUR_PI_IP:5173` in the browser and in `index.html` siteUrl |

If nothing is listening on 3000, `curl http://localhost:3000` will hang and the browser will show nothing. Run these on the Pi to diagnose:

```bash
# Is anything listening on 3000 or 5173?
ss -tlnp | grep -E ':3000|:5173'
# or: netstat -tlnp | grep -E ':3000|:5173'

# If using the systemd service, is it running?
sudo systemctl status yugiohfm.service

# If production: do you have a built dist folder?
ls -la /home/pi/yugiohfm-helper/dist
```

**Quick fix to get something on port 3000:** From the project directory on the Pi, run:

```bash
pnpm run build   # or: npm run build
pnpm exec serve dist -l tcp://0.0.0.0:3000   # or: npx serve dist -l tcp://0.0.0.0:3000
```

Then try `curl http://localhost:3000` again. To use the Pi’s IP from another device, open `http://192.168.1.164:3000` (replace with your Pi’s IP).

**Pi-hole / PiVPN / Unbound:** DNS (e.g. Unbound on `127.0.0.1#5335`) does not use port 3000. It won’t block the app. If you still can’t connect, check firewall rules (see Step 7).

### Using pnpm instead of npm

If you installed with pnpm, use `pnpm run build`, `pnpm run dev`, and `pnpm exec serve ...` (or `pnpm run serve` for Vite preview on 3000 after building). The included `pi-start.sh` uses pnpm automatically if it’s in your PATH. For the systemd service, if Node is installed via NVM, `/usr/bin/npx` or `/usr/bin/npm` may not see your Node. Use a wrapper script that loads NVM and runs the app, or set `ExecStart` to the full path of `node`/`serve` as seen by `which serve` after loading NVM.

### Service won't start:
- Check logs: `sudo journalctl -u yugiohfm.service -f`
- Verify Node.js is in PATH: `which node` and `which npm` (or `which pnpm`)
- Check file permissions: `ls -la /home/pi/yugiohfm-helper`
- If you use NVM/pnpm, ensure the service runs in a shell that has them in PATH (e.g. use a small script that sources `~/.nvm/nvm.sh` and then runs the start command)

### Can't access from network:
- Verify the service is binding to `0.0.0.0`, not `127.0.0.1`
- Check firewall rules
- Try accessing from the Pi itself: `curl http://localhost:3000` (or `:5173` if in dev mode)

### Performance issues:
- The Pi Zero 2 W has limited resources. Production build (Option A) is recommended.
- Consider using a reverse proxy like nginx if you need better performance
- Monitor resource usage: `htop` or `top`

### Port conflicts:
- If port 3000 is in use, change it in the service file and `index.html`
- Check what's using the port: `sudo lsof -i :3000`

## Optional: Set Up a Reverse Proxy with Nginx

If you want a cleaner URL (like `http://pi.local/yugiohfm`) or better performance:

```bash
# Install nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/yugiohfm
```

Add:
```nginx
server {
    listen 80;
    server_name pi.local;  # or your Pi's hostname

    location /yugiohfm {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/yugiohfm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Updating the App After You Change the Repo

### Manual update (when you push changes from your PC)

**On your PC:** edit, commit, and push to GitHub as usual.

**On the Pi:** whenever you want to pull the latest and redeploy (e.g. right after pushing so you can test), run:

```bash
~/YugiohFM-Helper/update-and-restart.sh
```

(If you haven’t created that script yet, see “Option B” under automatic updates, or run the steps by hand: `cd ~/YugiohFM-Helper`, then `git pull`, `pnpm install`, `pnpm run build`, `sudo systemctl restart yugiohfm.service`.)

**From your PC (one command after you push):** to update the Pi without opening a Pi terminal, SSH in and run the script:

```bash
ssh lodakia@192.168.1.164 "~/YugiohFM-Helper/update-and-restart.sh"
```

Replace `lodakia` and `192.168.1.164` with your Pi username and IP. Then refresh the app in your browser to test.

If you use a different branch (e.g. `main`), make sure you’re on it before pulling: `git checkout main` then run the script (or `git pull`) again.

### Optional: automatic updates on the Pi

You can have the Pi periodically pull from the repo, rebuild, and restart the app. Two simple options:

**Option A – Cron (e.g. every day at 4:00)**  
Run `crontab -e` and add one line (replace the path with yours):

```cron
0 4 * * * cd /home/lodakia/YugiohFM-Helper && git pull && pnpm install && pnpm run build && sudo systemctl restart yugiohfm.service
```

**Option B – Script + cron (cleaner)**  
Create a script so you can also run updates by hand:

```bash
nano ~/YugiohFM-Helper/update-and-restart.sh
```

Paste (adjust paths if needed):

```bash
#!/bin/bash
set -e
cd /home/lodakia/YugiohFM-Helper
git pull
pnpm install
pnpm run build
sudo systemctl restart yugiohfm.service
echo "YGOFM Helper updated and restarted."
```

Make it executable and run it when you want an update:

```bash
chmod +x ~/YugiohFM-Helper/update-and-restart.sh
~/YugiohFM-Helper/update-and-restart.sh
```

To run it automatically (e.g. daily at 4:00), run `crontab -e` and add:

```cron
0 4 * * * /home/lodakia/YugiohFM-Helper/update-and-restart.sh
```

**Notes:**
- For `git pull` to work without typing a password, use HTTPS with a [personal access token](https://github.com/settings/tokens) or set up [SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) and clone via SSH (`git@github.com:...`). Public repos often allow read-only pull over HTTPS without a token.
- If the cron job asks for a password when running `sudo systemctl restart`, allow passwordless restart for the service once: `sudo visudo` and add a line: `lodakia ALL=(ALL) NOPASSWD: /bin/systemctl restart yugiohfm.service` (replace `lodakia` with your username). Or run the cron as root (e.g. `sudo crontab -e`) and use the same script without `sudo` in the systemctl command.

---

## Maintenance Commands

- **Stop the service:** `sudo systemctl stop yugiohfm.service`
- **Start the service:** `sudo systemctl start yugiohfm.service`
- **Restart the service:** `sudo systemctl restart yugiohfm.service`
- **View logs:** `sudo journalctl -u yugiohfm.service -f`
- **Disable auto-start:** `sudo systemctl disable yugiohfm.service`

## Notes

- The app will be accessible on your local network only (not exposed to the internet)
- Make sure your Pi has a static IP or DHCP reservation so the IP doesn't change
- The Pi Zero 2 W should handle this app fine, but if you notice slowdowns, consider the production build option
- Since you have Pi-hole running, you can optionally add a local DNS entry for easier access
