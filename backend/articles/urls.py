from __future__ import annotations

from django.urls import path

from .views import ApiRootView, ArticleDetailView, ArticleListView, ArticleTagsView, ArticleViewEventView, ArticleViewsView, SitePageDetailView, SitePageListView

urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("pages/", SitePageListView.as_view(), name="site-page-list"),
    path("pages/<slug:key>/", SitePageDetailView.as_view(), name="site-page-detail"),
    path("articles/", ArticleListView.as_view(), name="article-list"),
    path("articles/tags/", ArticleTagsView.as_view(), name="article-tags"),
    path("articles/views/", ArticleViewsView.as_view(), name="article-views"),
    path("articles/<slug:slug>/", ArticleDetailView.as_view(), name="article-detail"),
    path("articles/<slug:slug>/view/", ArticleViewEventView.as_view(), name="article-view"),
]
