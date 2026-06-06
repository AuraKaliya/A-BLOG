from __future__ import annotations

from django.contrib import admin

from .models import Article, ArticleViewCount, ArticleViewEvent, MediaAsset, SitePage, Tag


@admin.register(SitePage)
class SitePageAdmin(admin.ModelAdmin):
    list_display = ("key", "title", "is_published", "published_at", "updated_at")
    list_filter = ("is_published",)
    search_fields = ("key", "title", "description")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("key", "title", "description", "is_published", "published_at")}),
        ("Content", {"fields": ("content", "draft_content")}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "resource_url", "updated_at")
    list_filter = ("kind",)
    search_fields = ("title", "resource_url", "alt_text", "caption")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "content_source", "category", "pub_date", "word_count", "draft", "featured")
    list_filter = ("content_source", "draft", "featured", "category", "tags")
    search_fields = ("title", "slug", "summary")
    readonly_fields = ("source_hash", "created_at", "updated_at")
    filter_horizontal = ("tags",)
    prepopulated_fields = {"slug": ("title",)}
    fieldsets = (
        (None, {"fields": ("title", "slug", "summary", "cover_url")}),
        ("Publishing", {"fields": ("content_source", "pub_date", "updated_date", "category", "tags", "featured", "draft")}),
        ("Body", {"fields": ("body_html", "body_markdown")}),
        ("Resource import", {"fields": ("html_path", "source_hash")}),
        ("Stats", {"fields": ("word_count",)}),
        ("System", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(ArticleViewCount)
class ArticleViewCountAdmin(admin.ModelAdmin):
    list_display = ("article", "views", "updated_at")
    search_fields = ("article__title", "article__slug")
    readonly_fields = ("updated_at",)


@admin.register(ArticleViewEvent)
class ArticleViewEventAdmin(admin.ModelAdmin):
    list_display = ("article", "view_date", "visitor_hash", "created_at")
    list_filter = ("view_date",)
    search_fields = ("article__title", "article__slug", "visitor_hash")
    readonly_fields = ("created_at",)
