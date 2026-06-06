from __future__ import annotations

import html
import re

from django.db import models
from django.utils import timezone


class ArticleQuerySet(models.QuerySet):
    def published(self):
        return self.filter(draft=False)


class SitePageQuerySet(models.QuerySet):
    def published(self):
        return self.filter(is_published=True)


class SitePage(models.Model):
    HOME = "home"
    ABOUT = "about"
    LAB = "lab"
    NOW = "now"
    PAGE_CHOICES = [
        (HOME, "Home"),
        (ABOUT, "About"),
        (LAB, "Lab"),
        (NOW, "Now"),
    ]

    key = models.SlugField("Key", max_length=80, choices=PAGE_CHOICES, unique=True)
    title = models.CharField("Title", max_length=240)
    description = models.TextField("Description", blank=True)
    content = models.JSONField("Published content", default=dict)
    draft_content = models.JSONField("Draft content", default=dict, blank=True)
    is_published = models.BooleanField("Published", default=True)
    published_at = models.DateTimeField("Published at", null=True, blank=True)
    created_at = models.DateTimeField("Created at", auto_now_add=True)
    updated_at = models.DateTimeField("Updated at", auto_now=True)

    objects = SitePageQuerySet.as_manager()

    class Meta:
        ordering = ["key"]
        verbose_name = "Site page"
        verbose_name_plural = "Site pages"

    def __str__(self) -> str:
        return self.key

    def save(self, *args, **kwargs):
        if self.is_published and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class MediaAsset(models.Model):
    title = models.CharField("Title", max_length=240)
    resource_url = models.CharField("Resource URL", max_length=500, help_text="Use /resource/... or an absolute URL.")
    alt_text = models.CharField("Alt text", max_length=240, blank=True)
    caption = models.TextField("Caption", blank=True)
    kind = models.CharField("Kind", max_length=80, blank=True)
    created_at = models.DateTimeField("Created at", auto_now_add=True)
    updated_at = models.DateTimeField("Updated at", auto_now=True)

    class Meta:
        ordering = ["title"]
        verbose_name = "Media asset"
        verbose_name_plural = "Media assets"

    def __str__(self) -> str:
        return self.title


class Tag(models.Model):
    name = models.CharField("名称", max_length=80, unique=True)
    slug = models.SlugField("Slug", max_length=100, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "标签"
        verbose_name_plural = "标签"

    def __str__(self) -> str:
        return self.name


class Article(models.Model):
    SOURCE_RESOURCE = "resource"
    SOURCE_MANUAL = "manual"
    SOURCE_CHOICES = [
        (SOURCE_RESOURCE, "Resource folder"),
        (SOURCE_MANUAL, "Manual entry"),
    ]

    slug = models.SlugField("Slug", max_length=160, unique=True)
    title = models.CharField("标题", max_length=240)
    summary = models.TextField("摘要")
    cover_url = models.CharField("封面 URL", max_length=500, blank=True)
    html_path = models.CharField("HTML 相对路径", max_length=500, blank=True)
    body_html = models.TextField("HTML 正文", blank=True)
    body_markdown = models.TextField("Markdown 草稿", blank=True)
    content_source = models.CharField("内容来源", max_length=20, choices=SOURCE_CHOICES, default=SOURCE_RESOURCE)
    pub_date = models.DateField("发布时间")
    updated_date = models.DateField("更新时间", null=True, blank=True)
    category = models.CharField("分类", max_length=80, blank=True)
    featured = models.BooleanField("精选", default=False)
    draft = models.BooleanField("草稿", default=False)
    word_count = models.PositiveIntegerField("文本字数", default=0)
    source_hash = models.CharField("源文件哈希", max_length=64, blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="articles", verbose_name="标签")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("同步时间", auto_now=True)

    objects = ArticleQuerySet.as_manager()

    class Meta:
        ordering = ["-pub_date", "-updated_date", "title"]
        verbose_name = "文章"
        verbose_name_plural = "文章"

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if self.body_html and self.word_count == 0:
            self.word_count = self.count_text_units(self.body_html)
        super().save(*args, **kwargs)

    @staticmethod
    def count_text_units(raw_html: str) -> int:
        text = re.sub(r"<(?:script|style)\b[^>]*>.*?</(?:script|style)>", " ", raw_html, flags=re.IGNORECASE | re.DOTALL)
        text = html.unescape(re.sub(r"<[^>]+>", " ", text))
        text = re.sub(r"\s+", " ", text).strip()
        cjk_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
        words = len([item for item in re.sub(r"[\u4e00-\u9fff]", " ", text).split() if item])
        return cjk_chars + words


class ArticleViewCount(models.Model):
    article = models.OneToOneField(Article, on_delete=models.CASCADE, related_name="view_count", verbose_name="文章")
    views = models.PositiveIntegerField("浏览量", default=0)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "文章浏览量"
        verbose_name_plural = "文章浏览量"

    def __str__(self) -> str:
        return f"{self.article.slug}: {self.views}"


class ArticleViewEvent(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="view_events", verbose_name="文章")
    visitor_hash = models.CharField("访客哈希", max_length=64)
    view_date = models.DateField("浏览日期")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["article", "visitor_hash", "view_date"], name="unique_article_visitor_per_day"),
        ]
        indexes = [
            models.Index(fields=["article", "view_date"]),
        ]
        verbose_name = "文章浏览事件"
        verbose_name_plural = "文章浏览事件"

    def __str__(self) -> str:
        return f"{self.article.slug} {self.view_date}"
