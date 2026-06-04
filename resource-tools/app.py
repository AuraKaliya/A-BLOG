from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, simpledialog, ttk
except Exception:  # pragma: no cover
    tk = None
    filedialog = None
    messagebox = None
    ttk = None

TK_AVAILABLE = tk is not None
if not TK_AVAILABLE:  # Keep CLI mode usable on minimal Python installations.
    class _TkStub:
        pass

    class _TkModuleStub:
        Tk = _TkStub

    tk = _TkModuleStub()


APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent
CONFIG_PATH = APP_DIR / "config.json"
MANIFEST_PATH = APP_DIR / "resource-manifest.json"

DEFAULT_CONFIG = {
    "paths": {
        "test_resource": "test-resource",
        "resource": "resource",
    },
    "resource": {
        "public_prefix": "/resource",
        "folders": ["images", "covers", "avatars", "files", "downloads"],
        "lowercase_names": True,
    },
    "remote": {
        "host": "49.232.167.68",
        "user": "ubuntu",
        "ssh_key": "~/.ssh/AuraKey.pem",
        "app_root": "/root/A-BLOG",
    },
}

STATUS_LABELS = {
    "same": "已同步",
    "changed": "有变更",
    "test-only": "仅测试资源",
    "resource-only": "仅正式资源",
}

CONTENT_TYPES = {
    "blog": {
        "label": "博客文章",
        "directory": "src/content/blog",
        "extension": ".md",
    },
    "works": {
        "label": "作品",
        "directory": "src/content/works",
        "extension": ".md",
    },
    "pages": {
        "label": "页面配置",
        "directory": "src/content/pages",
        "extension": ".json",
    },
    "topics": {
        "label": "主题配置",
        "directory": "src/content/topics",
        "extension": ".json",
    },
}

CONTENT_LABEL_TO_KEY = {value["label"]: key for key, value in CONTENT_TYPES.items()}


def deep_merge(base: dict, override: dict) -> dict:
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def load_config() -> dict:
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            return deep_merge(DEFAULT_CONFIG, json.load(f))
    return DEFAULT_CONFIG


def repo_path(value: str) -> Path:
    path = Path(os.path.expandvars(os.path.expanduser(value)))
    if path.is_absolute():
        return path
    return REPO_ROOT / path


def ensure_dirs(config: dict) -> None:
    for key in ("test_resource", "resource"):
        repo_path(config["paths"][key]).mkdir(parents=True, exist_ok=True)
    for folder in config["resource"]["folders"]:
        (repo_path(config["paths"]["test_resource"]) / folder).mkdir(parents=True, exist_ok=True)
        (repo_path(config["paths"]["resource"]) / folder).mkdir(parents=True, exist_ok=True)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_name(source: Path, lowercase: bool = True) -> str:
    stem = source.stem.strip()
    suffix = source.suffix.lower()
    if lowercase:
        stem = stem.lower()
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem)
    stem = re.sub(r"-{2,}", "-", stem).strip("-._")
    if not stem:
        stem = "asset"
    return f"{stem}{suffix}"


def safe_slug(value: str) -> str:
    slug = value.strip().lower()
    slug = re.sub(r"[^a-z0-9._-]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-._")
    if not slug:
        slug = datetime.now().strftime("item-%Y%m%d%H%M%S")
    return slug


def yaml_scalar(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_scalar(value: str):
    value = value.strip()
    if value == "":
        return ""
    if value in {"true", "false"}:
        return value == "true"
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    if value.startswith("[") or value.startswith("{"):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value[1:-1]
    return value


def split_frontmatter(text: str) -> tuple[dict, str, list[str]]:
    if not text.startswith("---"):
        return {}, text, []
    lines = text.splitlines()
    end_index = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end_index = index
            break
    if end_index is None:
        return {}, text, []
    frontmatter_lines = lines[1:end_index]
    body = "\n".join(lines[end_index + 1 :]).lstrip("\n")
    data: dict = {}
    current_key = ""
    current_list: list[dict] | None = None
    for raw_line in frontmatter_lines:
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if line.startswith("  - ") and current_key:
            if current_list is None:
                current_list = []
                data[current_key] = current_list
            item_text = line[4:]
            if ":" in item_text:
                key, value = item_text.split(":", 1)
                current_list.append({key.strip(): parse_scalar(value)})
            else:
                current_list.append({"value": parse_scalar(item_text)})
            continue
        if line.startswith("    ") and current_list:
            item = current_list[-1]
            if ":" in line:
                key, value = line.strip().split(":", 1)
                item[key.strip()] = parse_scalar(value)
            continue
        if ":" in line and not line.startswith(" "):
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()
            current_key = key
            current_list = None
            if value:
                data[key] = parse_scalar(value)
            else:
                data[key] = []
    return data, body, frontmatter_lines


def set_frontmatter_field(text: str, key: str, value: str) -> str:
    if not text.startswith("---"):
        return text
    lines = text.splitlines()
    end_index = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end_index = index
            break
    if end_index is None:
        return text

    frontmatter = lines[1:end_index]
    body = lines[end_index:]
    replacement = f"{key}: {yaml_scalar(value)}"
    found = False
    next_frontmatter = []
    for line in frontmatter:
        if re.match(rf"^{re.escape(key)}\s*:", line):
            if value:
                next_frontmatter.append(replacement)
            found = True
        else:
            next_frontmatter.append(line)
    if value and not found:
        next_frontmatter.append(replacement)
    return "\n".join(["---", *next_frontmatter, *body]) + "\n"


def md_template(kind: str, title: str) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    if kind == "works":
        return f"""---
title: {yaml_scalar(title)}
description: "请填写作品描述。"
year: {datetime.now().year}
role: "请填写角色"
category: "project"
status: "building"
priority: 0
techStack: []
featured: false
topics: []
relatedPosts: []
relatedWorks: []
links: []
---

请填写作品正文。
"""
    return f"""---
title: {yaml_scalar(title)}
description: "请填写文章摘要。"
pubDate: {today}
updatedDate: {today}
category: "engineering"
featured: false
relatedWorks: []
topics: []
tags: []
---

请填写文章正文。
"""


def json_template(kind: str, title: str) -> str:
    if kind == "topics":
        payload = {
            "title": title,
            "description": "请填写主题描述。",
            "accent": "cyan",
            "keywords": [],
            "featured": False,
            "order": 0,
        }
    else:
        payload = {
            "kind": "lab",
            "title": title,
            "description": "请填写页面描述。",
            "intro": {
                "title": title,
                "description": "请填写页面引导文案。",
            },
            "cards": [],
        }
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def unique_dest(dest_dir: Path, filename: str) -> Path:
    dest = dest_dir / filename
    if not dest.exists():
        return dest
    stem = dest.stem
    suffix = dest.suffix
    for index in range(2, 10000):
        candidate = dest_dir / f"{stem}-{index}{suffix}"
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"Cannot find free file name for {filename}")


def iter_files(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return (path for path in root.rglob("*") if path.is_file() and path.name != ".gitkeep")


@dataclass
class ResourceRow:
    rel: str
    url: str
    status: str
    test_path: Path | None
    resource_path: Path | None
    test_size: int
    resource_size: int
    updated: str


class ResourceService:
    def __init__(self, config: dict):
        self.config = config
        self.test_root = repo_path(config["paths"]["test_resource"])
        self.resource_root = repo_path(config["paths"]["resource"])
        self.public_prefix = config["resource"]["public_prefix"].rstrip("/")

    def public_url(self, rel: str) -> str:
        return f"{self.public_prefix}/{rel.replace(os.sep, '/')}"

    def scan(self) -> list[ResourceRow]:
        test_files = {p.relative_to(self.test_root).as_posix(): p for p in iter_files(self.test_root)}
        resource_files = {p.relative_to(self.resource_root).as_posix(): p for p in iter_files(self.resource_root)}
        rows = []
        for rel in sorted(set(test_files) | set(resource_files)):
            test_path = test_files.get(rel)
            resource_path = resource_files.get(rel)
            test_size = test_path.stat().st_size if test_path else 0
            resource_size = resource_path.stat().st_size if resource_path else 0
            if test_path and resource_path:
                status = "same" if sha256_file(test_path) == sha256_file(resource_path) else "changed"
            elif test_path:
                status = "test-only"
            else:
                status = "resource-only"
            updated_ts = max(
                [p.stat().st_mtime for p in (test_path, resource_path) if p is not None],
                default=0,
            )
            updated = datetime.fromtimestamp(updated_ts).strftime("%Y-%m-%d %H:%M:%S") if updated_ts else ""
            rows.append(
                ResourceRow(
                    rel=rel,
                    url=self.public_url(rel),
                    status=status,
                    test_path=test_path,
                    resource_path=resource_path,
                    test_size=test_size,
                    resource_size=resource_size,
                    updated=updated,
                )
            )
        return rows

    def import_files(self, files: Iterable[str], folder: str) -> list[Path]:
        dest_dir = self.test_root / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        imported = []
        for file_name in files:
            source = Path(file_name)
            filename = safe_name(source, self.config["resource"].get("lowercase_names", True))
            dest = unique_dest(dest_dir, filename)
            shutil.copy2(source, dest)
            imported.append(dest)
        return imported

    def promote(self, rel_paths: Iterable[str]) -> list[Path]:
        promoted = []
        for rel in rel_paths:
            source = self.test_root / rel
            if not source.exists():
                continue
            dest = self.resource_root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
            promoted.append(dest)
        return promoted

    def promote_all_changed(self) -> list[Path]:
        rows = self.scan()
        return self.promote(row.rel for row in rows if row.status in {"test-only", "changed"})

    def write_manifest(self) -> Path:
        rows = self.scan()
        payload = {
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "publicPrefix": self.public_prefix,
            "items": [],
        }
        for row in rows:
            path = row.resource_path or row.test_path
            payload["items"].append(
                {
                    "path": row.rel,
                    "url": row.url,
                    "status": row.status,
                    "size": path.stat().st_size if path else 0,
                    "sha256": sha256_file(path) if path else "",
                    "updated": row.updated,
                }
            )
        MANIFEST_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return MANIFEST_PATH

    def build_resource_archive(self) -> Path:
        temp_dir = Path(tempfile.mkdtemp(prefix="a-blog-resource-"))
        archive = temp_dir / "resource-sync.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for path in iter_files(self.resource_root):
                tar.add(path, arcname=path.relative_to(self.resource_root).as_posix())
        return archive

    def sync_remote(self, dry_run: bool = False) -> str:
        remote = self.config["remote"]
        host = remote["host"]
        user = remote["user"]
        ssh_key = str(Path(os.path.expanduser(remote["ssh_key"])))
        app_root = remote["app_root"].rstrip("/")
        remote_tmp = "/tmp/a-blog-resource-sync.tar.gz"
        remote_resource = f"{app_root}/resource"

        files = list(iter_files(self.resource_root))
        if dry_run:
            return "\n".join(
                [
                    f"远程目录：{user}@{host}:{remote_resource}",
                    f"待上传文件数：{len(files)}",
                    *[path.relative_to(self.resource_root).as_posix() for path in files[:200]],
                ]
            )

        archive = self.build_resource_archive()
        try:
            run_checked(["scp", "-i", ssh_key, str(archive), f"{user}@{host}:{remote_tmp}"])
            remote_cmd = (
                f"sudo mkdir -p '{remote_resource}' && "
                f"sudo tar -xzf '{remote_tmp}' -C '{remote_resource}' && "
                f"rm -f '{remote_tmp}'"
            )
            run_checked(["ssh", "-i", ssh_key, f"{user}@{host}", remote_cmd])
        finally:
            shutil.rmtree(archive.parent, ignore_errors=True)
        return f"已同步 {len(files)} 个文件到 {user}@{host}:{remote_resource}"


@dataclass
class ContentItem:
    kind: str
    slug: str
    label: str
    path: Path
    title: str
    description: str
    updated: str


class ContentService:
    def __init__(self):
        self.content_types = CONTENT_TYPES

    def type_info(self, kind: str) -> dict:
        return self.content_types[kind]

    def content_dir(self, kind: str) -> Path:
        return REPO_ROOT / self.type_info(kind)["directory"]

    def extension(self, kind: str) -> str:
        return self.type_info(kind)["extension"]

    def list_items(self, kind: str) -> list[ContentItem]:
        directory = self.content_dir(kind)
        extension = self.extension(kind)
        directory.mkdir(parents=True, exist_ok=True)
        items = []
        for path in sorted(directory.glob(f"*{extension}")):
            title = path.stem
            description = ""
            try:
                text = path.read_text(encoding="utf-8")
                if extension == ".json":
                    payload = json.loads(text)
                    title = str(payload.get("title", title))
                    description = str(payload.get("description", ""))
                else:
                    data, _body, _lines = split_frontmatter(text)
                    title = str(data.get("title", title))
                    description = str(data.get("description", ""))
            except Exception:
                description = "读取失败"
            updated = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            items.append(
                ContentItem(
                    kind=kind,
                    slug=path.stem,
                    label=f"{path.stem}{extension}",
                    path=path,
                    title=title,
                    description=description,
                    updated=updated,
                )
            )
        return items

    def item_path(self, kind: str, slug: str) -> Path:
        return self.content_dir(kind) / f"{safe_slug(slug)}{self.extension(kind)}"

    def read_item(self, item: ContentItem) -> str:
        return item.path.read_text(encoding="utf-8")

    def create_item(self, kind: str, slug: str, title: str) -> ContentItem:
        slug = safe_slug(slug or title)
        title = title.strip() or slug
        path = self.item_path(kind, slug)
        if path.exists():
            raise RuntimeError(f"文件已存在：{path}")
        if self.extension(kind) == ".json":
            text = json_template(kind, title)
        else:
            text = md_template(kind, title)
        path.write_text(text, encoding="utf-8")
        return self.get_item(kind, slug)

    def get_item(self, kind: str, slug: str) -> ContentItem:
        for item in self.list_items(kind):
            if item.slug == slug:
                return item
        raise RuntimeError(f"找不到内容：{kind}/{slug}")

    def save_item(
        self,
        kind: str,
        old_slug: str,
        new_slug: str,
        raw_text: str,
        title: str = "",
        description: str = "",
        cover: str = "",
    ) -> ContentItem:
        old_path = self.item_path(kind, old_slug)
        new_slug = safe_slug(new_slug or old_slug)
        new_path = self.item_path(kind, new_slug)
        extension = self.extension(kind)
        text = raw_text.rstrip() + "\n"

        if extension == ".json":
            payload = json.loads(text)
            if title:
                payload["title"] = title
            if description:
                payload["description"] = description
            text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        else:
            if title:
                text = set_frontmatter_field(text, "title", title)
            if description:
                text = set_frontmatter_field(text, "description", description)
            text = set_frontmatter_field(text, "cover", cover)

        if new_path != old_path and new_path.exists():
            raise RuntimeError(f"目标 slug 已存在：{new_path.name}")
        new_path.write_text(text, encoding="utf-8")
        if new_path != old_path and old_path.exists():
            old_path.unlink()
        return self.get_item(kind, new_slug)

    def delete_item(self, kind: str, slug: str) -> None:
        path = self.item_path(kind, slug)
        if path.exists():
            path.unlink()

    def format_json_text(self, raw_text: str) -> str:
        payload = json.loads(raw_text)
        return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    def build_check(self) -> str:
        return run_checked(["npm", "run", "build"])


def run_checked(command: list[str]) -> str:
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(command)}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return result.stdout + result.stderr


class ResourceManagerApp(tk.Tk):
    def __init__(self, service: ResourceService):
        super().__init__()
        self.service = service
        self.content_service = ContentService()
        self.title("A-BLOG 资源管理器")
        self.geometry("1180x760")
        self.rows: dict[str, ResourceRow] = {}
        self.folder_var = tk.StringVar(value=self.service.config["resource"]["folders"][0])
        self.status_var = tk.StringVar(value="就绪")
        self.content_kind_var = tk.StringVar(value=CONTENT_TYPES["blog"]["label"])
        self.content_slug_var = tk.StringVar(value="")
        self.content_title_var = tk.StringVar(value="")
        self.content_description_var = tk.StringVar(value="")
        self.content_cover_var = tk.StringVar(value="")
        self.current_content_kind = "blog"
        self.current_content_slug = ""
        self._build_ui()
        self.refresh()
        self.refresh_content_list()

    def _build_ui(self) -> None:
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True)

        self.resource_tab = ttk.Frame(self.notebook)
        self.content_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.resource_tab, text="资源管理")
        self.notebook.add(self.content_tab, text="内容编辑")

        self._build_resource_tab(self.resource_tab)
        self._build_content_tab(self.content_tab)

        status = ttk.Label(self, textvariable=self.status_var, anchor="w", padding=(10, 4))
        status.pack(fill="x")

    def _build_resource_tab(self, parent) -> None:
        toolbar = ttk.Frame(parent, padding=10)
        toolbar.pack(fill="x")

        ttk.Label(toolbar, text="目标目录").pack(side="left")
        folder = ttk.Combobox(
            toolbar,
            textvariable=self.folder_var,
            values=self.service.config["resource"]["folders"],
            width=16,
            state="readonly",
        )
        folder.pack(side="left", padx=(6, 12))

        ttk.Button(toolbar, text="导入到测试资源", command=self.import_files).pack(side="left", padx=4)
        ttk.Button(toolbar, text="复制链接", command=self.copy_url).pack(side="left", padx=4)
        ttk.Button(toolbar, text="提升选中项", command=self.promote_selected).pack(side="left", padx=4)
        ttk.Button(toolbar, text="提升全部变更", command=self.promote_all).pack(side="left", padx=4)
        ttk.Button(toolbar, text="生成清单", command=self.write_manifest).pack(side="left", padx=4)
        ttk.Button(toolbar, text="同步预览", command=lambda: self.sync_remote(True)).pack(side="left", padx=4)
        ttk.Button(toolbar, text="同步服务器", command=lambda: self.sync_remote(False)).pack(side="left", padx=4)
        ttk.Button(toolbar, text="刷新", command=self.refresh).pack(side="right", padx=4)

        columns = ("status", "url", "test_size", "resource_size", "updated")
        self.tree = ttk.Treeview(self, columns=columns, show="tree headings", selectmode="extended")
        self.tree.heading("#0", text="资源路径")
        self.tree.heading("status", text="状态")
        self.tree.heading("url", text="公开链接")
        self.tree.heading("test_size", text="测试大小")
        self.tree.heading("resource_size", text="正式大小")
        self.tree.heading("updated", text="更新时间")
        self.tree.column("#0", width=280)
        self.tree.column("status", width=110, anchor="center")
        self.tree.column("url", width=300)
        self.tree.column("test_size", width=90, anchor="e")
        self.tree.column("resource_size", width=100, anchor="e")
        self.tree.column("updated", width=150)
        self.tree.pack(fill="both", expand=True, padx=10, pady=(0, 8))
        self.tree.bind("<Double-1>", lambda _event: self.copy_url())

    def _build_content_tab(self, parent) -> None:
        shell = ttk.Frame(parent, padding=10)
        shell.pack(fill="both", expand=True)

        left = ttk.Frame(shell)
        left.pack(side="left", fill="y", padx=(0, 10))

        type_row = ttk.Frame(left)
        type_row.pack(fill="x", pady=(0, 8))
        ttk.Label(type_row, text="内容类型").pack(side="left")
        type_box = ttk.Combobox(
            type_row,
            textvariable=self.content_kind_var,
            values=[value["label"] for value in CONTENT_TYPES.values()],
            state="readonly",
            width=16,
        )
        type_box.pack(side="left", padx=(8, 0))
        type_box.bind("<<ComboboxSelected>>", lambda _event: self.on_content_type_changed())

        list_buttons = ttk.Frame(left)
        list_buttons.pack(fill="x", pady=(0, 8))
        ttk.Button(list_buttons, text="新建", command=self.new_content_item).pack(side="left", padx=(0, 4))
        ttk.Button(list_buttons, text="删除", command=self.delete_content_item).pack(side="left", padx=4)
        ttk.Button(list_buttons, text="刷新", command=self.refresh_content_list).pack(side="left", padx=4)

        self.content_tree = ttk.Treeview(left, columns=("title", "updated"), show="tree headings", height=22)
        self.content_tree.heading("#0", text="Slug")
        self.content_tree.heading("title", text="标题")
        self.content_tree.heading("updated", text="更新时间")
        self.content_tree.column("#0", width=180)
        self.content_tree.column("title", width=220)
        self.content_tree.column("updated", width=150)
        self.content_tree.pack(fill="y", expand=True)
        self.content_tree.bind("<<TreeviewSelect>>", lambda _event: self.load_selected_content())

        right = ttk.Frame(shell)
        right.pack(side="left", fill="both", expand=True)

        form = ttk.Frame(right)
        form.pack(fill="x", pady=(0, 8))
        ttk.Label(form, text="Slug").grid(row=0, column=0, sticky="w", padx=(0, 6), pady=3)
        ttk.Entry(form, textvariable=self.content_slug_var, width=32).grid(row=0, column=1, sticky="ew", pady=3)
        ttk.Label(form, text="标题").grid(row=0, column=2, sticky="w", padx=(12, 6), pady=3)
        ttk.Entry(form, textvariable=self.content_title_var, width=36).grid(row=0, column=3, sticky="ew", pady=3)
        ttk.Label(form, text="摘要").grid(row=1, column=0, sticky="w", padx=(0, 6), pady=3)
        ttk.Entry(form, textvariable=self.content_description_var).grid(row=1, column=1, columnspan=3, sticky="ew", pady=3)
        ttk.Label(form, text="封面").grid(row=2, column=0, sticky="w", padx=(0, 6), pady=3)
        ttk.Entry(form, textvariable=self.content_cover_var).grid(row=2, column=1, columnspan=2, sticky="ew", pady=3)
        ttk.Button(form, text="使用选中资源链接", command=self.use_selected_resource_as_cover).grid(row=2, column=3, sticky="e", padx=(8, 0), pady=3)
        form.columnconfigure(1, weight=1)
        form.columnconfigure(3, weight=1)

        editor_buttons = ttk.Frame(right)
        editor_buttons.pack(fill="x", pady=(0, 8))
        ttk.Button(editor_buttons, text="保存", command=self.save_content_item).pack(side="left", padx=(0, 4))
        ttk.Button(editor_buttons, text="格式化 JSON", command=self.format_content_json).pack(side="left", padx=4)
        ttk.Button(editor_buttons, text="构建校验", command=self.run_build_check).pack(side="left", padx=4)

        editor_frame = ttk.Frame(right)
        editor_frame.pack(fill="both", expand=True)
        self.content_text = tk.Text(editor_frame, wrap="word", undo=True, font=("Consolas", 10))
        y_scroll = ttk.Scrollbar(editor_frame, orient="vertical", command=self.content_text.yview)
        self.content_text.configure(yscrollcommand=y_scroll.set)
        self.content_text.pack(side="left", fill="both", expand=True)
        y_scroll.pack(side="right", fill="y")

    def selected_rels(self) -> list[str]:
        return [self.tree.item(item, "text") for item in self.tree.selection()]

    def refresh(self) -> None:
        self.tree.delete(*self.tree.get_children())
        self.rows = {row.rel: row for row in self.service.scan()}
        for row in self.rows.values():
            self.tree.insert(
                "",
                "end",
                text=row.rel,
                values=(STATUS_LABELS.get(row.status, row.status), row.url, row.test_size, row.resource_size, row.updated),
            )
        self.status_var.set(f"共 {len(self.rows)} 个资源")

    def import_files(self) -> None:
        files = filedialog.askopenfilenames(title="导入资源文件")
        if not files:
            return
        try:
            imported = self.service.import_files(files, self.folder_var.get())
            self.refresh()
            self.status_var.set(f"已导入 {len(imported)} 个文件")
        except Exception as exc:
            messagebox.showerror("导入失败", str(exc))

    def copy_url(self) -> None:
        rels = self.selected_rels()
        if not rels:
            return
        url = self.service.public_url(rels[0])
        self.clipboard_clear()
        self.clipboard_append(url)
        self.status_var.set(f"已复制 {url}")

    def promote_selected(self) -> None:
        rels = self.selected_rels()
        if not rels:
            return
        try:
            promoted = self.service.promote(rels)
            self.refresh()
            self.status_var.set(f"已提升 {len(promoted)} 个文件")
        except Exception as exc:
            messagebox.showerror("提升失败", str(exc))

    def promote_all(self) -> None:
        if not messagebox.askyesno("提升全部变更", "是否将所有“仅测试资源/有变更”的文件复制到正式 resource 目录？"):
            return
        try:
            promoted = self.service.promote_all_changed()
            self.refresh()
            self.status_var.set(f"已提升 {len(promoted)} 个文件")
        except Exception as exc:
            messagebox.showerror("提升失败", str(exc))

    def write_manifest(self) -> None:
        try:
            manifest = self.service.write_manifest()
            self.status_var.set(f"已生成清单 {manifest}")
        except Exception as exc:
            messagebox.showerror("生成清单失败", str(exc))

    def sync_remote(self, dry_run: bool) -> None:
        try:
            result = self.service.sync_remote(dry_run=dry_run)
            if dry_run:
                messagebox.showinfo("同步预览", result)
            self.status_var.set(result.splitlines()[0] if result else "同步完成")
        except Exception as exc:
            messagebox.showerror("同步失败", str(exc))

    def selected_content_kind(self) -> str:
        return CONTENT_LABEL_TO_KEY.get(self.content_kind_var.get(), "blog")

    def on_content_type_changed(self) -> None:
        self.current_content_kind = self.selected_content_kind()
        self.current_content_slug = ""
        self.clear_content_editor()
        self.refresh_content_list()

    def clear_content_editor(self) -> None:
        self.content_slug_var.set("")
        self.content_title_var.set("")
        self.content_description_var.set("")
        self.content_cover_var.set("")
        self.content_text.delete("1.0", "end")

    def refresh_content_list(self) -> None:
        if not hasattr(self, "content_tree"):
            return
        kind = self.selected_content_kind()
        self.content_tree.delete(*self.content_tree.get_children())
        items = self.content_service.list_items(kind)
        for item in items:
            self.content_tree.insert("", "end", iid=item.slug, text=item.slug, values=(item.title, item.updated))
        self.status_var.set(f"{CONTENT_TYPES[kind]['label']}：共 {len(items)} 项")

    def load_selected_content(self) -> None:
        selection = self.content_tree.selection()
        if not selection:
            return
        kind = self.selected_content_kind()
        slug = selection[0]
        try:
            item = self.content_service.get_item(kind, slug)
            text = self.content_service.read_item(item)
            self.current_content_kind = kind
            self.current_content_slug = slug
            self.content_slug_var.set(slug)
            self.content_text.delete("1.0", "end")
            self.content_text.insert("1.0", text)
            self.populate_content_fields(kind, text, item.title, item.description)
            self.status_var.set(f"已加载 {item.label}")
        except Exception as exc:
            messagebox.showerror("加载失败", str(exc))

    def populate_content_fields(self, kind: str, text: str, fallback_title: str, fallback_description: str) -> None:
        title = fallback_title
        description = fallback_description
        cover = ""
        if self.content_service.extension(kind) == ".json":
            try:
                payload = json.loads(text)
                title = str(payload.get("title", title))
                description = str(payload.get("description", description))
            except json.JSONDecodeError:
                pass
        else:
            data, _body, _lines = split_frontmatter(text)
            title = str(data.get("title", title))
            description = str(data.get("description", description))
            cover = str(data.get("cover", ""))
        self.content_title_var.set(title)
        self.content_description_var.set(description)
        self.content_cover_var.set(cover)

    def new_content_item(self) -> None:
        kind = self.selected_content_kind()
        title = simpledialog.askstring("新建内容", "标题：", parent=self)
        if not title:
            return
        slug = simpledialog.askstring("新建内容", "Slug：", initialvalue=safe_slug(title), parent=self)
        if not slug:
            return
        try:
            item = self.content_service.create_item(kind, slug, title)
            self.refresh_content_list()
            self.content_tree.selection_set(item.slug)
            self.content_tree.focus(item.slug)
            self.load_selected_content()
            self.status_var.set(f"已新建 {item.label}")
        except Exception as exc:
            messagebox.showerror("新建失败", str(exc))

    def save_content_item(self) -> None:
        kind = self.selected_content_kind()
        if not self.current_content_slug:
            messagebox.showwarning("无法保存", "请先选择或新建一个内容文件。")
            return
        raw_text = self.content_text.get("1.0", "end")
        try:
            item = self.content_service.save_item(
                kind=kind,
                old_slug=self.current_content_slug,
                new_slug=self.content_slug_var.get(),
                raw_text=raw_text,
                title=self.content_title_var.get().strip(),
                description=self.content_description_var.get().strip(),
                cover=self.content_cover_var.get().strip(),
            )
            self.current_content_slug = item.slug
            self.refresh_content_list()
            self.content_tree.selection_set(item.slug)
            self.content_tree.focus(item.slug)
            self.load_selected_content()
            self.status_var.set(f"已保存 {item.label}")
        except json.JSONDecodeError as exc:
            messagebox.showerror("保存失败", f"JSON 格式错误：{exc}")
        except Exception as exc:
            messagebox.showerror("保存失败", str(exc))

    def delete_content_item(self) -> None:
        selection = self.content_tree.selection()
        if not selection:
            return
        kind = self.selected_content_kind()
        slug = selection[0]
        if not messagebox.askyesno("删除内容", f"确定删除 {slug}{self.content_service.extension(kind)}？"):
            return
        try:
            self.content_service.delete_item(kind, slug)
            self.current_content_slug = ""
            self.clear_content_editor()
            self.refresh_content_list()
            self.status_var.set(f"已删除 {slug}")
        except Exception as exc:
            messagebox.showerror("删除失败", str(exc))

    def format_content_json(self) -> None:
        kind = self.selected_content_kind()
        if self.content_service.extension(kind) != ".json":
            messagebox.showinfo("无需格式化", "当前内容不是 JSON 文件。")
            return
        try:
            formatted = self.content_service.format_json_text(self.content_text.get("1.0", "end"))
            self.content_text.delete("1.0", "end")
            self.content_text.insert("1.0", formatted)
            self.populate_content_fields(kind, formatted, "", "")
            self.status_var.set("JSON 已格式化")
        except json.JSONDecodeError as exc:
            messagebox.showerror("格式化失败", f"JSON 格式错误：{exc}")

    def use_selected_resource_as_cover(self) -> None:
        rels = self.selected_rels()
        if not rels:
            messagebox.showinfo("未选择资源", "请先在“资源管理”标签页选中一个资源。")
            return
        url = self.service.public_url(rels[0])
        self.content_cover_var.set(url)
        self.status_var.set(f"已设置封面 {url}")

    def run_build_check(self) -> None:
        try:
            output = self.content_service.build_check()
            tail = "\n".join(output.splitlines()[-20:])
            messagebox.showinfo("构建校验通过", tail or "npm run build 通过")
            self.status_var.set("构建校验通过")
        except Exception as exc:
            messagebox.showerror("构建校验失败", str(exc))


def main() -> int:
    parser = argparse.ArgumentParser(description="A-BLOG resource manager")
    parser.add_argument("--promote-all", action="store_true", help="Copy changed files from test-resource to resource")
    parser.add_argument("--manifest", action="store_true", help="Write resource-tools/resource-manifest.json")
    parser.add_argument("--sync", action="store_true", help="Sync resource to the remote server")
    parser.add_argument("--dry-run", action="store_true", help="Preview remote sync")
    args = parser.parse_args()

    config = load_config()
    ensure_dirs(config)
    service = ResourceService(config)

    if args.promote_all:
        promoted = service.promote_all_changed()
        print(f"Promoted {len(promoted)} file(s)")
    if args.manifest:
        print(f"Wrote {service.write_manifest()}")
    if args.sync or args.dry_run:
        print(service.sync_remote(dry_run=args.dry_run))
    if args.promote_all or args.manifest or args.sync or args.dry_run:
        return 0

    if not TK_AVAILABLE:
        print("Tkinter is not available in this Python environment.", file=sys.stderr)
        return 1
    app = ResourceManagerApp(service)
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
