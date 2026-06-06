from __future__ import annotations

import hashlib
from datetime import date

from django.conf import settings
from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, ArticleViewCount, ArticleViewEvent, Tag
from .serializers import ArticleDetailSerializer, ArticleListSerializer


def client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def visitor_hash(request, view_date: date) -> str:
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    raw = f"{settings.ARTICLE_VIEW_SALT}|{view_date.isoformat()}|{client_ip(request)}|{user_agent}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class ApiRootView(APIView):
    def get(self, request):
        return Response(
            {
                "articles": request.build_absolute_uri("/api/articles/"),
                "tags": request.build_absolute_uri("/api/articles/tags/"),
                "views": request.build_absolute_uri("/api/articles/views/"),
            }
        )


class ArticleListView(APIView):
    def get(self, request):
        queryset = Article.objects.published().prefetch_related("tags").select_related("view_count")
        tag = request.query_params.get("tag")
        category = request.query_params.get("category")
        if tag:
            queryset = queryset.filter(tags__name=tag)
        if category:
            queryset = queryset.filter(category=category)
        serializer = ArticleListSerializer(queryset.distinct(), many=True)
        return Response({"items": serializer.data})


class ArticleDetailView(APIView):
    def get(self, request, slug: str):
        article = get_object_or_404(Article.objects.published().prefetch_related("tags").select_related("view_count"), slug=slug)
        serializer = ArticleDetailSerializer(article)
        return Response(serializer.data)


class ArticleTagsView(APIView):
    def get(self, request):
        tags = (
            Tag.objects.filter(articles__draft=False)
            .annotate(count=Count("articles", distinct=True))
            .filter(count__gt=0)
            .order_by("name")
        )
        return Response({"items": [{"name": tag.name, "slug": tag.slug, "count": tag.count} for tag in tags]})


class ArticleViewsView(APIView):
    def get(self, request):
        raw_slugs = request.query_params.get("slugs", "")
        slugs = [slug.strip() for slug in raw_slugs.split(",") if slug.strip()]
        counts = ArticleViewCount.objects.filter(article__slug__in=slugs).select_related("article")
        payload = {item.article.slug: item.views for item in counts}
        for slug in slugs:
            payload.setdefault(slug, 0)
        return Response({"views": payload})


class ArticleViewEventView(APIView):
    def post(self, request, slug: str):
        article = get_object_or_404(Article.objects.published(), slug=slug)
        today = date.today()
        _, created = ArticleViewEvent.objects.get_or_create(
            article=article,
            visitor_hash=visitor_hash(request, today),
            view_date=today,
        )
        counter, _ = ArticleViewCount.objects.get_or_create(article=article)
        if created:
            ArticleViewCount.objects.filter(pk=counter.pk).update(views=F("views") + 1)
            counter.refresh_from_db()
        return Response({"slug": slug, "views": counter.views, "counted": created})
