# Docker deployment

This project is packaged as an Astro frontend served by Nginx plus a Django API backend.

## Local Docker test

```powershell
docker compose -f docker-tools/docker-compose.local.yml up --build
```

Open `http://127.0.0.1:8080`.

Development resource files should be placed under `test-resource`. They are served at `/resource/`.

## Build release package

```powershell
.\docker-tools\build-release.ps1
```

Upload while building:

```powershell
.\docker-tools\build-release.ps1 -Remote user@your-server-ip
```

The default server upload folder is `/root/A-BLOG/releases`.

The release package includes both Docker images:

```text
aura-blog:<version>
aura-blog-backend:<version>
```

`release.env` is generated at build time and carries the image tags plus deployment-only Django/Postgres secrets, including `A_BLOG_VIEW_SALT` for view-count de-duplication. Do not commit generated release packages.

## First server proxy setup

Copy `docker-tools/deploy/nginx-aurakaliye.com.conf` to the server Nginx config directory, enable it, then use Certbot to issue HTTPS certificates for `aurakaliye.com` and `www.aurakaliye.com`.

## Server update

```sh
cd /root/A-BLOG/releases
tar -xzf aura-blog-*.tar.gz
cd aura-blog-*
APP_ROOT=/root/A-BLOG sh ./update.sh
```

Or place `update-latest.sh` under `/root/A-BLOG`, upload release archives to `/root/A-BLOG` or `/root/A-BLOG/releases`, then run:

```sh
cd /root/A-BLOG
sh ./update-latest.sh
```

Production resource files should be placed under `/root/A-BLOG/resource`. They are served at `/resource/`. The update script seeds `/resource/default/default_image.png` if it is missing so fallback images do not break when the resource directory is bind-mounted.
