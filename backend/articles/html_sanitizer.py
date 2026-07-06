from __future__ import annotations

import re

import bleach


ALLOWED_TAGS = [
    "a",
    "abbr",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "figcaption",
    "figure",
    "h2",
    "h3",
    "h4",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "picture",
    "pre",
    "source",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
]

ALLOWED_ATTRIBUTES = {
    "*": ["class", "id"],
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height", "loading"],
    "source": ["src", "srcset", "media", "type", "sizes"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan", "scope"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto", "tel"]
UNSAFE_CONTENT_PATTERN = re.compile(
    r"<(?:script|style|iframe|object|embed|template|form)\b[^>]*>.*?</(?:script|style|iframe|object|embed|template|form)>",
    re.IGNORECASE | re.DOTALL,
)


def sanitize_article_html(value: str, *, linkify_text: bool = False) -> str:
    value = UNSAFE_CONTENT_PATTERN.sub("", value or "")
    cleaned = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    if not linkify_text:
        return cleaned
    return bleach.linkify(cleaned)
