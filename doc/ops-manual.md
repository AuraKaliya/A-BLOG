# A-BLOG 运维手册

本文档用于指导后续 Agent 对 A-BLOG 进行版本构建、服务器上传、更新、验证和故障处理。

## 基础信息

项目类型：

```text
Astro 前端 + Django API 后端 + PostgreSQL + Docker + Nginx 容器托管
```

线上域名：

```text
https://aurakaliye.com
https://www.aurakaliye.com
```

服务器：

```text
公网 IP：49.232.167.68
系统：Ubuntu
应用目录：/root/A-BLOG
发布包目录：/root/A-BLOG/releases
线上资源目录：/root/A-BLOG/resource
容器名：aura-blog
后端容器名：aura-blog-backend
数据库容器名：a-blog-db
容器本机端口：127.0.0.1:8080 -> 80
宿主机入口：Nginx 80/443 -> 127.0.0.1:8080
```

本地开发资源目录：

```text
test-resource
```

线上资源访问前缀：

```text
https://aurakaliye.com/resource/
```

敏感信息要求：

```text
不要把 root 密码、SSH 私钥内容、证书私钥写入仓库或文档。
当前推荐使用 SSH key 登录 ubuntu 用户，再 sudo 操作 /root/A-BLOG。
```

## 本地构建发布包

在项目根目录执行：

```powershell
.\docker-tools\build-release.ps1 -NoUpload
```

构建成功后会生成：

```text
output/docker-release/aura-blog-版本号.tar.gz
output/docker-release/aura-blog-版本号.tar.gz.sha256
```

发布包中包含：

```text
image.tar（前端镜像 + Django 后端镜像）
docker-compose.prod.yml
release.env
update.sh
update-latest.sh
nginx-aurakaliye.com.conf
README.md
```

构建后建议检查最新包：

```powershell
Get-ChildItem output\docker-release\aura-blog-*.tar.gz |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 FullName,Length,LastWriteTime
```

## 上传并更新服务器

当前服务器 root SSH 密码登录可能不可用，建议使用本机 SSH key 登录 `ubuntu` 用户，再通过 sudo 写入 `/root/A-BLOG`。

默认 key 路径：

```powershell
$key = "$env:USERPROFILE\.ssh\AuraKey.pem"
```

如果 key 权限过宽，先修复：

```powershell
icacls $key /inheritance:r
icacls $key /grant:r "$($env:USERNAME):R"
```

确认能登录：

```powershell
ssh -i $key -o BatchMode=yes ubuntu@49.232.167.68 "echo ok && sudo -n true && echo sudo-ok"
```

上传最新发布包并执行更新：

```powershell
$key = "$env:USERPROFILE\.ssh\AuraKey.pem"
$archive = Get-ChildItem output\docker-release\aura-blog-*.tar.gz |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$checksum = Get-Item "$($archive.FullName).sha256"

ssh -i $key -o BatchMode=yes ubuntu@49.232.167.68 "mkdir -p /tmp/a-blog-upload"
scp -i $key $archive.FullName ubuntu@49.232.167.68:/tmp/a-blog-upload/
scp -i $key $checksum.FullName ubuntu@49.232.167.68:/tmp/a-blog-upload/
scp -i $key .\docker-tools\deploy\update-latest.sh ubuntu@49.232.167.68:/tmp/a-blog-upload/update-latest.sh

ssh -i $key -o BatchMode=yes ubuntu@49.232.167.68 "sudo mkdir -p /root/A-BLOG/releases /root/A-BLOG/resource && sudo cp /tmp/a-blog-upload/aura-blog-*.tar.gz /root/A-BLOG/releases/ && sudo cp /tmp/a-blog-upload/aura-blog-*.tar.gz.sha256 /root/A-BLOG/releases/ && sudo cp /tmp/a-blog-upload/update-latest.sh /root/A-BLOG/update-latest.sh && sudo sh -c 'cd /root/A-BLOG && sh ./update-latest.sh'"
```

更新脚本会自动：

```text
查找 /root/A-BLOG 或 /root/A-BLOG/releases 下最新 aura-blog-*.tar.gz
校验 sha256
解压到 /root/A-BLOG/releases/版本目录
docker load image.tar 中的前端和后端镜像
移除旧 aura-blog 容器
用 docker compose 启动前端、Django 后端和 PostgreSQL
保留资源目录 /root/A-BLOG/resource
保留运行时密钥 /root/A-BLOG/runtime.env，避免 PostgreSQL 持久化卷的密码随发布包轮换
```

## 服务器手动更新

如果发布包已经在服务器上：

```sh
cd /root/A-BLOG
sh ./update-latest.sh
```

如果只想更新某个指定版本：

```sh
cd /root/A-BLOG/releases/aura-blog-具体版本
APP_ROOT=/root/A-BLOG sh ./update.sh
```

## 更新后验证

服务器内验证：

```sh
sudo docker ps --filter name=aura-blog
curl -fsSI http://127.0.0.1:8080/ | head -n 1
curl -fsSI -H 'Host: aurakaliye.com' http://127.0.0.1/ | head -n 1
```

本机验证：

```powershell
curl.exe -I --max-time 15 http://49.232.167.68/
curl.exe -I --max-time 15 https://aurakaliye.com/
curl.exe -I --max-time 15 https://www.aurakaliye.com/
```

端口检查：

```powershell
Test-NetConnection 49.232.167.68 -Port 80
Test-NetConnection 49.232.167.68 -Port 443
```

期望结果：

```text
80：可连通，并 301 跳转到 https
443：可连通
https://aurakaliye.com：200 OK
https://www.aurakaliye.com：200 OK
```

## DNS 检查

期望解析：

```text
aurakaliye.com      A      49.232.167.68
www.aurakaliye.com  CNAME  aurakaliye.com
```

检查命令：

```powershell
Resolve-DnsName aurakaliye.com
Resolve-DnsName www.aurakaliye.com
Resolve-DnsName aurakaliye.com -Server 8.8.8.8
Resolve-DnsName aurakaliye.com -Server 1.1.1.1
Resolve-DnsName aurakaliye.com -Server 223.5.5.5
Resolve-DnsName aurakaliye.com -Server 119.29.29.29
```

说明：

```text
不同递归 DNS 生效时间可能不同。
本机默认 DNS 如果仍返回旧 IP，可以先 ipconfig /flushdns。
如果公共 DNS 已正确但本机 DNS 未更新，通常等待缓存刷新即可。
```

刷新本机 DNS 缓存：

```powershell
ipconfig /flushdns
```

## HTTPS 和 Nginx

宿主机 Nginx 配置位置：

```text
/etc/nginx/sites-available/aurakaliye.com
/etc/nginx/sites-enabled/aurakaliye.com
```

当前逻辑：

```text
80 端口：Certbot 已配置跳转到 HTTPS
443 端口：Nginx 使用 Let's Encrypt 证书
反向代理：127.0.0.1:8080
```

证书位置：

```text
/etc/letsencrypt/live/aurakaliye.com/fullchain.pem
/etc/letsencrypt/live/aurakaliye.com/privkey.pem
```

证书续期：

```sh
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

重新签发或补配 HTTPS：

```sh
sudo certbot --nginx -d aurakaliye.com -d www.aurakaliye.com --redirect
```

检查 Nginx：

```sh
sudo nginx -t
sudo systemctl reload nginx
sudo ss -ltnp | grep -E ':(80|443|8080)\b'
```

## 资源目录约定

开发环境：

```text
test-resource
```

生产环境：

```text
/root/A-BLOG/resource
```

容器映射：

```text
/root/A-BLOG/resource -> /usr/share/nginx/html/resource:ro
/root/A-BLOG/resource -> Django backend /resource:ro
```

线上 URL：

```text
https://aurakaliye.com/resource/文件名
```

注意：

```text
resource 和 test-resource 下的实际资源文件不提交 Git。
只保留 .gitkeep。
```

## Resource Tools

资源管理工具位于：

```text
resource-tools/app.py
```

推荐资源流转：

```text
导入/编辑资源 -> test-resource -> 本地预览 -> promote 到 resource -> 同步服务器
```

启动 GUI：

```powershell
python .\resource-tools\app.py
```

常用 CLI：

```powershell
python .\resource-tools\app.py --promote-all
python .\resource-tools\app.py --manifest
python .\resource-tools\app.py --dry-run
python .\resource-tools\app.py --sync
```

工具约定：

```text
导入资源默认写入 test-resource。
代码和内容中统一引用 /resource/...。
Promote 会把 test-resource 中变更的文件复制到 resource。
Sync 会把 resource 上传到 /root/A-BLOG/resource。
Sync 只新增/覆盖，不删除服务器文件。
```

GUI 还包含“内容编辑”标签页，可编辑：

```text
博客文章：src/content/blog/*.md
作品：src/content/works/*.md
世界档案：src/content/world/*.md
短动态：src/content/notes/*.md
站外信号：src/content/links/*.md
更新记录：src/content/changelog/*.md
页面配置：src/content/pages/*.json
主题配置：src/content/topics/*.json
```

作品链接支持 `demo / source / article / external` 四种类型；世界档案支持类型、状态、关联条目和虚构事件日期；短动态支持随想、状态、分享和碎片四种类型；站外信号支持友链、阅读、工具、灵感和资料五种类型。

编辑内容后，先在 GUI 中点击“构建校验”，通过后再执行 Docker 发布流程。

站点会根据主题和内容引用自动生成：

```text
/map：可视化内容星图
/graph.json：机器可读关系图数据
/links：可筛选的友链与推荐目录
/links.json：机器可读站外信号数据
```

## 回滚

查看服务器已上传版本：

```sh
ls -lt /root/A-BLOG/releases/*.tar.gz
```

回滚到指定版本：

```sh
cd /root/A-BLOG/releases
tar -xzf aura-blog-指定版本.tar.gz
cd aura-blog-指定版本
APP_ROOT=/root/A-BLOG sh ./update.sh
```

回滚后验证：

```sh
sudo docker ps --filter name=aura-blog
curl -fsSI http://127.0.0.1:8080/ | head -n 1
```

## 常见故障

### release.env 报 not found

现象：

```text
release.env: ﻿A_BLOG_IMAGE=...: not found
```

原因：

```text
旧版本 PowerShell 生成了带 BOM 的 UTF-8 文件。
```

处理：

```sh
sed -i '1s/^\xEF\xBB\xBF//' /root/A-BLOG/releases/版本目录/release.env
APP_ROOT=/root/A-BLOG sh /root/A-BLOG/releases/版本目录/update.sh
```

当前脚本已修复，新发布包不应再出现。

### 容器名 aura-blog 冲突

现象：

```text
Conflict. The container name "/aura-blog" is already in use
```

原因：

```text
不同版本目录导致 Docker Compose 项目名变化，但容器名固定。
```

处理：

```sh
sudo docker rm -f aura-blog
cd /root/A-BLOG
sh ./update-latest.sh
```

当前 `update.sh` 已设置稳定 `COMPOSE_PROJECT_NAME=aura-blog`，并会主动移除旧容器。

### 443 端口不通

检查：

```sh
sudo ss -ltnp | grep ':443'
sudo nginx -t
sudo systemctl status nginx --no-pager
```

如果没有监听 443：

```sh
sudo certbot --nginx -d aurakaliye.com -d www.aurakaliye.com --redirect
```

如果服务器监听 443，但外部不通：

```text
检查云服务器安全组是否开放 443/tcp。
```

### Ping 不通

说明：

```text
Ping 使用 ICMP，不代表网站不可访问。
以 80/443 端口和 HTTP/HTTPS 状态码为准。
```

检查：

```powershell
Test-NetConnection 49.232.167.68 -Port 80
Test-NetConnection 49.232.167.68 -Port 443
curl.exe -I https://aurakaliye.com/
```

### 本地 DNS 仍是旧 IP

处理：

```powershell
ipconfig /flushdns
Resolve-DnsName aurakaliye.com -Server 8.8.8.8
Resolve-DnsName aurakaliye.com -Server 119.29.29.29
```

如果公共 DNS 正确但本地默认 DNS 不正确，等待递归 DNS 缓存刷新，或临时切换本机 DNS。

## Agent 操作原则

执行更新前：

```text
确认当前分支和工作区状态。
确认 Docker Desktop 正在运行。
确认最新发布包是刚构建出来的。
不要覆盖 /root/A-BLOG/resource。
不要把私钥、密码、证书私钥写入仓库。
```

执行更新后：

```text
检查 docker ps。
检查 http://127.0.0.1:8080。
检查 https://aurakaliye.com。
检查 https://www.aurakaliye.com。
记录发布包版本号。
```
