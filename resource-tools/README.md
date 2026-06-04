# Resource Tools

Local resource manager for A-BLOG.

## Flow

```text
Import files -> test-resource -> local preview -> promote to resource -> sync server
```

The website should reference resources with public URLs like:

```text
/resource/images/example.webp
/resource/files/example.pdf
```

Local Docker maps:

```text
test-resource -> /usr/share/nginx/html/resource
```

Production maps:

```text
/root/A-BLOG/resource -> /usr/share/nginx/html/resource
```

## GUI

```powershell
python .\resource-tools\app.py
```

GUI includes two tabs:

```text
资源管理：import -> test-resource, promote -> resource, sync server
内容编辑：edit blog, works, pages, and topics under src/content
```

The content editor supports:

```text
博客文章：src/content/blog/*.md
作品：src/content/works/*.md
页面配置：src/content/pages/*.json
主题配置：src/content/topics/*.json
```

Use `构建校验` before packaging a release.

## CLI

Promote all changed files from `test-resource` to `resource`:

```powershell
python .\resource-tools\app.py --promote-all
```

Generate a local manifest:

```powershell
python .\resource-tools\app.py --manifest
```

Preview remote sync:

```powershell
python .\resource-tools\app.py --dry-run
```

Sync `resource` to the server:

```powershell
python .\resource-tools\app.py --sync
```

Remote sync uploads a tar archive through `scp`, then extracts it into:

```text
/root/A-BLOG/resource
```

It adds or overwrites files. It does not delete remote files.
