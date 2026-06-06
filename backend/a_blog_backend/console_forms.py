from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

import bleach
import markdown
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.utils.text import slugify

from articles.models import Article


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
    "pre",
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
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan", "scope"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def render_markdown(value: str) -> str:
    raw_html = markdown.markdown(
        value or "",
        extensions=["extra", "sane_lists"],
        output_format="html5",
    )
    cleaned = bleach.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return bleach.linkify(cleaned)


def split_tags(value: str) -> list[str]:
    tags = []
    for item in value.replace("\n", ",").split(","):
        tag = item.strip()
        if tag and tag not in tags:
            tags.append(tag)
    return tags


def default_slug(value: str) -> str:
    slug = slugify(value, allow_unicode=False)
    return slug or f"article-{datetime.now().strftime('%Y%m%d%H%M%S')}"


class StaffAuthenticationForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if not user.is_staff:
            raise forms.ValidationError("此账号没有后台访问权限。", code="not_staff")


class HomeContentForm(forms.Form):
    title = forms.CharField(label="页面标题", max_length=240)
    description = forms.CharField(label="页面描述", widget=forms.Textarea(attrs={"rows": 3}), required=False)

    profile_eyebrow = forms.CharField(label="Profile eyebrow", max_length=120, required=False)
    profile_name = forms.CharField(label="名称", max_length=160)
    profile_role = forms.CharField(label="身份", max_length=240, required=False)
    profile_status = forms.CharField(label="状态", max_length=240, required=False)
    profile_location = forms.CharField(label="位置", max_length=240, required=False)
    profile_bio = forms.CharField(label="简介", widget=forms.Textarea(attrs={"rows": 4}), required=False)
    profile_image_index = forms.CharField(label="头像资源索引", max_length=240, required=False)
    profile_image_alt = forms.CharField(label="头像替代文本", max_length=240, required=False)
    profile_tags = forms.CharField(label="标签", required=False, help_text="用逗号分隔")
    profile_links_json = forms.CharField(label="链接 JSON", widget=forms.Textarea(attrs={"rows": 4}), required=False)

    recent_eyebrow = forms.CharField(label="Recent eyebrow", max_length=120, required=False)
    recent_title = forms.CharField(label="近期标题", max_length=240, required=False)
    recent_description = forms.CharField(label="近期描述", widget=forms.Textarea(attrs={"rows": 3}), required=False)
    recent_image_index = forms.CharField(label="近期图片资源索引", max_length=240, required=False)
    recent_image_alt = forms.CharField(label="近期图片替代文本", max_length=240, required=False)
    recent_href = forms.CharField(label="近期链接", max_length=300, required=False)

    random_eyebrow = forms.CharField(label="Explore eyebrow", max_length=120, required=False)
    random_title = forms.CharField(label="随机探索标题", max_length=240, required=False)
    random_description = forms.CharField(label="随机探索描述", widget=forms.Textarea(attrs={"rows": 3}), required=False)
    random_action_label = forms.CharField(label="按钮文案", max_length=120, required=False)

    intro_eyebrow = forms.CharField(label="Intro eyebrow", max_length=120, required=False)
    intro_title = forms.CharField(label="介绍标题", widget=forms.Textarea(attrs={"rows": 2}), required=False)
    intro_lead = forms.CharField(label="介绍引导", widget=forms.Textarea(attrs={"rows": 3}), required=False)
    highlights_json = forms.CharField(label="Highlight JSON", widget=forms.Textarea(attrs={"rows": 8}), required=False)

    def clean_profile_links_json(self):
        return self.clean_json_list("profile_links_json")

    def clean_highlights_json(self):
        return self.clean_json_list("highlights_json")

    def clean_json_list(self, field_name: str) -> list[dict[str, Any]]:
        value = self.cleaned_data.get(field_name) or "[]"
        try:
            payload = json.loads(value)
        except json.JSONDecodeError as exc:
            raise forms.ValidationError("请输入有效的 JSON 数组。") from exc
        if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
            raise forms.ValidationError("请输入对象数组。")
        return payload

    def to_payload(self) -> dict[str, Any]:
        data = self.cleaned_data
        payload = {
            "kind": "home",
            "title": data["title"],
            "description": data["description"],
            "profile": {
                "eyebrow": data["profile_eyebrow"],
                "name": data["profile_name"],
                "role": data["profile_role"],
                "status": data["profile_status"],
                "location": data["profile_location"],
                "bio": data["profile_bio"],
                "imageIndex": data["profile_image_index"],
                "imageAlt": data["profile_image_alt"],
                "tags": split_tags(data["profile_tags"]),
                "links": data["profile_links_json"],
            },
            "recentStatus": {
                "eyebrow": data["recent_eyebrow"],
                "title": data["recent_title"],
                "description": data["recent_description"],
                "imageIndex": data["recent_image_index"],
                "imageAlt": data["recent_image_alt"],
            },
            "randomExplore": {
                "eyebrow": data["random_eyebrow"],
                "title": data["random_title"],
                "description": data["random_description"],
                "actionLabel": data["random_action_label"],
            },
            "intro": {
                "eyebrow": data["intro_eyebrow"],
                "title": data["intro_title"],
                "lead": data["intro_lead"],
                "highlights": data["highlights_json"],
            },
        }
        if data["recent_href"]:
            payload["recentStatus"]["href"] = data["recent_href"]
        return payload

    @classmethod
    def initial_from_payload(cls, payload: dict[str, Any]) -> dict[str, Any]:
        profile = payload.get("profile") or {}
        recent = payload.get("recentStatus") or {}
        random_explore = payload.get("randomExplore") or {}
        intro = payload.get("intro") or {}
        return {
            "title": payload.get("title") or "",
            "description": payload.get("description") or "",
            "profile_eyebrow": profile.get("eyebrow") or "",
            "profile_name": profile.get("name") or "",
            "profile_role": profile.get("role") or "",
            "profile_status": profile.get("status") or "",
            "profile_location": profile.get("location") or "",
            "profile_bio": profile.get("bio") or "",
            "profile_image_index": profile.get("imageIndex") or "",
            "profile_image_alt": profile.get("imageAlt") or "",
            "profile_tags": ", ".join(profile.get("tags") or []),
            "profile_links_json": json.dumps(profile.get("links") or [], ensure_ascii=False, indent=2),
            "recent_eyebrow": recent.get("eyebrow") or "",
            "recent_title": recent.get("title") or "",
            "recent_description": recent.get("description") or "",
            "recent_image_index": recent.get("imageIndex") or "",
            "recent_image_alt": recent.get("imageAlt") or "",
            "recent_href": recent.get("href") or "",
            "random_eyebrow": random_explore.get("eyebrow") or "",
            "random_title": random_explore.get("title") or "",
            "random_description": random_explore.get("description") or "",
            "random_action_label": random_explore.get("actionLabel") or "",
            "intro_eyebrow": intro.get("eyebrow") or "",
            "intro_title": intro.get("title") or "",
            "intro_lead": intro.get("lead") or "",
            "highlights_json": json.dumps(intro.get("highlights") or [], ensure_ascii=False, indent=2),
        }


class ArticleForm(forms.ModelForm):
    tags_text = forms.CharField(label="标签", required=False, help_text="用逗号分隔")

    class Meta:
        model = Article
        fields = [
            "title",
            "slug",
            "summary",
            "body_markdown",
            "cover_url",
            "category",
            "pub_date",
            "updated_date",
            "featured",
            "tags_text",
        ]
        labels = {
            "title": "标题",
            "slug": "Slug",
            "summary": "摘要",
            "body_markdown": "正文 Markdown",
            "cover_url": "封面 URL",
            "category": "分类",
            "pub_date": "发布时间",
            "updated_date": "更新时间",
            "featured": "精选",
        }
        widgets = {
            "summary": forms.Textarea(attrs={"rows": 3}),
            "body_markdown": forms.Textarea(attrs={"rows": 18}),
            "pub_date": forms.DateInput(attrs={"type": "date"}),
            "updated_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["slug"].required = False
        if not self.instance.pk and not self.initial.get("pub_date"):
            self.initial["pub_date"] = date.today()
        if self.instance.pk:
            self.fields["tags_text"].initial = ", ".join(tag.name for tag in self.instance.tags.all())

    def clean_slug(self):
        value = self.cleaned_data["slug"].strip()
        return value or default_slug(self.cleaned_data.get("title") or "")

    def clean_tags_text(self):
        return split_tags(self.cleaned_data.get("tags_text") or "")

    def save(self, commit=True):
        article = super().save(commit=False)
        article.content_source = Article.SOURCE_MANUAL
        article.body_html = render_markdown(article.body_markdown)
        if commit:
            article.save()
            self.save_m2m()
        return article
