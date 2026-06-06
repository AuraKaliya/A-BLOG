from __future__ import annotations

from django.contrib import admin

from .models import Article, ArticleViewCount, ArticleViewEvent, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "category", "pub_date", "word_count", "draft", "featured")
    list_filter = ("draft", "featured", "category", "tags")
    search_fields = ("title", "slug", "summary")
    readonly_fields = ("source_hash", "created_at", "updated_at")
    filter_horizontal = ("tags",)


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
