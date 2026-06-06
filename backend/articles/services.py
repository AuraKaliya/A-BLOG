from __future__ import annotations

import hashlib
import html
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path, PurePosixPath
from typing import Iterable

from django.conf import settings
from django.utils.text import slugify

INDEX_FILE = "index.json"
HTML_FILE = "index.html"
DEFAULT_COVER_URL = "/resource/default/default_image.png"

ATTR_PATTERN = re.compile(r'(?P<prefix>\b(?:src|href|poster)\s*=\s*)(?P<quote>["\'])(?P<value>.*?)(?P=quote)', re.IGNORECASE)
SRCSET_PATTERN = re.compile(r'(?P<prefix>\bsrcset\s*=\s*)(?P<quote>["\'])(?P<value>.*?)(?P=quote)', re.IGNORECASE)
SCRIPT_STYLE_PATTERN = re.compile(r"<(?:script|style)\b[^>]*>.*?</(?:script|style)>", re.IGNORECASE | re.DOTALL)
TAG_PATTERN = re.compile(r"<[^>]+>")


@dataclass(frozen=True)
class ArticleResource:
    slug: str
    title: str
    summary: str
    pub_date: date
    updated_date: date | None
    cover_url: str
    category: str
    tags: list[str]
    featured: bool
    draft: bool
    html_path: str
    html: str
    word_count: int
    source_hash: str


def article_root() -> Path:
    return Path(settings.ARTICLE_RESOURCE_ROOT).resolve()


def safe_slug(value: str) -> str:
    normalized = slugify(value, allow_unicode=False)
    if normalized:
        return normalized
    fallback = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip().lower())
    fallback = re.sub(r"-{2,}", "-", fallback).strip("-._")
    return fallback or "article"


def tag_slug(value: str) -> str:
    normalized = slugify(value, allow_unicode=True)
    if normalized:
        return normalized[:100]
    return safe_slug(value)[:100]


def parse_date(value: object, field_name: str) -> date | None:
    if value in {None, ""}:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a YYYY-MM-DD string")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a YYYY-MM-DD string") from exc


def is_external_ref(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        not normalized
        or normalized.startswith(("/", "#", "http://", "https://", "mailto:", "tel:", "data:", "javascript:"))
    )


def normalize_relative_asset(value: str) -> str:
    path = value.strip()
    if "?" in path:
        raw_path, query = path.split("?", 1)
        suffix = f"?{query}"
    else:
        raw_path, suffix = path, ""
    if "#" in raw_path:
        raw_path, fragment = raw_path.split("#", 1)
        suffix = f"#{fragment}{suffix}"
    normalized = PurePosixPath(raw_path.replace("\\", "/")).as_posix()
    normalized = normalized.removeprefix("./").lstrip("/")
    parts = [part for part in normalized.split("/") if part not in {"", "."}]
    if any(part == ".." for part in parts):
        raise ValueError(f"Article asset paths cannot escape the article folder: {value}")
    return "/".join(parts) + suffix


def article_asset_url(slug: str, value: str) -> str:
    if is_external_ref(value):
        return value
    normalized = normalize_relative_asset(value)
    return f"/resource/article/{slug}/{normalized}"


def rewrite_srcset(slug: str, value: str) -> str:
    candidates = []
    for raw_candidate in value.split(","):
        candidate = raw_candidate.strip()
        if not candidate:
            continue
        parts = candidate.split()
        parts[0] = article_asset_url(slug, parts[0])
        candidates.append(" ".join(parts))
    return ", ".join(candidates)


def rewrite_html_asset_urls(slug: str, raw_html: str) -> str:
    def replace_attr(match: re.Match[str]) -> str:
        value = match.group("value")
        return f"{match.group('prefix')}{match.group('quote')}{article_asset_url(slug, value)}{match.group('quote')}"

    def replace_srcset(match: re.Match[str]) -> str:
        value = match.group("value")
        return f"{match.group('prefix')}{match.group('quote')}{rewrite_srcset(slug, value)}{match.group('quote')}"

    html_with_srcset = SRCSET_PATTERN.sub(replace_srcset, raw_html)
    return ATTR_PATTERN.sub(replace_attr, html_with_srcset)


def text_from_html(raw_html: str) -> str:
    without_code = SCRIPT_STYLE_PATTERN.sub(" ", raw_html)
    without_tags = TAG_PATTERN.sub(" ", without_code)
    return html.unescape(re.sub(r"\s+", " ", without_tags)).strip()


def count_text_units(raw_html: str) -> int:
    text = text_from_html(raw_html)
    cjk_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    words = len([item for item in re.sub(r"[\u4e00-\u9fff]", " ", text).split() if item])
    return cjk_chars + words


def source_hash(paths: Iterable[Path]) -> str:
    hasher = hashlib.sha256()
    for path in paths:
        hasher.update(path.name.encode("utf-8"))
        hasher.update(path.read_bytes())
    return hasher.hexdigest()


def read_article_resource(article_dir: Path) -> ArticleResource:
    root = article_root()
    article_dir = article_dir.resolve()
    if article_dir.parent != root:
        raise ValueError(f"Article directory must be a direct child of {root}: {article_dir}")

    index_path = article_dir / INDEX_FILE
    html_path = article_dir / HTML_FILE
    if not index_path.is_file() or not html_path.is_file():
        raise ValueError(f"{article_dir.name} must contain {INDEX_FILE} and {HTML_FILE}")

    payload = json.loads(index_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{index_path} must contain a JSON object")

    slug = safe_slug(str(payload.get("slug") or article_dir.name))
    title = str(payload.get("title") or "").strip()
    summary = str(payload.get("summary") or payload.get("description") or "").strip()
    if not title:
        raise ValueError(f"{index_path} is missing title")
    if not summary:
        raise ValueError(f"{index_path} is missing summary")

    pub_date = parse_date(payload.get("pubDate") or payload.get("pub_date"), "pubDate")
    if pub_date is None:
        raise ValueError(f"{index_path} is missing pubDate")
    updated_date = parse_date(payload.get("updatedDate") or payload.get("updated_date"), "updatedDate")

    tags = payload.get("tags") or []
    if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
        raise ValueError(f"{index_path} tags must be a string array")

    raw_html = html_path.read_text(encoding="utf-8")
    rewritten_html = rewrite_html_asset_urls(slug, raw_html)
    word_count = payload.get("wordCount") or payload.get("word_count") or count_text_units(raw_html)
    cover = str(payload.get("cover") or "").strip()

    return ArticleResource(
        slug=slug,
        title=title,
        summary=summary,
        pub_date=pub_date,
        updated_date=updated_date,
        cover_url=article_asset_url(slug, cover) if cover else DEFAULT_COVER_URL,
        category=str(payload.get("category") or "").strip(),
        tags=[tag.strip() for tag in tags if tag.strip()],
        featured=bool(payload.get("featured", False)),
        draft=bool(payload.get("draft", False)),
        html_path=f"article/{article_dir.name}/{HTML_FILE}",
        html=rewritten_html,
        word_count=int(word_count),
        source_hash=source_hash([index_path, html_path]),
    )


def iter_article_resources() -> list[ArticleResource]:
    root = article_root()
    if not root.exists():
        return []
    resources = []
    for article_dir in sorted(path for path in root.iterdir() if path.is_dir()):
        resources.append(read_article_resource(article_dir))
    return sorted(resources, key=lambda item: (item.pub_date, item.updated_date or item.pub_date, item.title), reverse=True)


def read_article_html(slug: str) -> str:
    article_dir = article_root() / safe_slug(slug)
    return read_article_resource(article_dir).html
