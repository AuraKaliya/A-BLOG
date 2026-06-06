from __future__ import annotations

from django.urls import include, path
from django.views.generic import RedirectView

from .console_views import (
    ArticleEditView,
    ArticleListConsoleView,
    ArticlePreviewView,
    ConsoleLogoutView,
    ConsoleView,
    HomeEditView,
    HomePreviewView,
)

urlpatterns = [
    path("", RedirectView.as_view(url="/api/", permanent=False)),
    path("api/", include("articles.urls")),
    path("console/", ConsoleView.as_view(), name="console"),
    path("console/logout/", ConsoleLogoutView.as_view(), name="console-logout"),
    path("console/home/", HomeEditView.as_view(), name="console-home"),
    path("console/home/preview/", HomePreviewView.as_view(), name="console-home-preview"),
    path("console/writings/", ArticleListConsoleView.as_view(), name="console-writings"),
    path("console/writings/new/", ArticleEditView.as_view(), name="console-writing-new"),
    path("console/writings/<int:pk>/", ArticleEditView.as_view(), name="console-writing-edit"),
    path("console/writings/<int:pk>/preview/", ArticlePreviewView.as_view(), name="console-writing-preview"),
]
