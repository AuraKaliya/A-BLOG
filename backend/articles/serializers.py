from __future__ import annotations

from rest_framework import serializers

from .models import Article, SitePage
from .services import read_article_html


class ArticleListSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    views = serializers.SerializerMethodField()
    pubDate = serializers.DateField(source="pub_date")
    updatedDate = serializers.DateField(source="updated_date", allow_null=True)
    cover = serializers.CharField(source="cover_url")
    wordCount = serializers.IntegerField(source="word_count")

    class Meta:
        model = Article
        fields = [
            "slug",
            "title",
            "summary",
            "cover",
            "category",
            "tags",
            "pubDate",
            "updatedDate",
            "featured",
            "wordCount",
            "views",
        ]

    def get_tags(self, obj: Article) -> list[str]:
        return [tag.name for tag in obj.tags.all()]

    def get_views(self, obj: Article) -> int:
        return getattr(getattr(obj, "view_count", None), "views", 0)


class ArticleDetailSerializer(ArticleListSerializer):
    html = serializers.SerializerMethodField()

    class Meta(ArticleListSerializer.Meta):
        fields = [*ArticleListSerializer.Meta.fields, "html"]

    def get_html(self, obj: Article) -> str:
        if obj.body_html:
            return obj.body_html
        if obj.content_source == Article.SOURCE_MANUAL:
            return ""
        return read_article_html(obj.slug)


class SitePageSerializer(serializers.ModelSerializer):
    data = serializers.SerializerMethodField()
    updatedAt = serializers.DateTimeField(source="updated_at")

    class Meta:
        model = SitePage
        fields = ["key", "title", "description", "data", "updatedAt"]

    def get_data(self, obj: SitePage) -> dict:
        return obj.content
