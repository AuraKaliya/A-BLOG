from __future__ import annotations

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views import View
from django.views.generic import ListView

from articles.models import Article, ArticleViewCount, MediaAsset, SitePage, Tag
from articles.services import tag_slug

from .console_forms import ArticleForm, HomeContentForm, StaffAuthenticationForm


def home_page_defaults() -> dict:
    return {
        "kind": "home",
        "title": "A-BLOG",
        "description": "",
        "profile": {"name": "Aura Kaliye", "links": [], "tags": []},
        "recentStatus": {},
        "randomExplore": {},
        "intro": {"highlights": []},
    }


def get_home_page() -> SitePage:
    payload = home_page_defaults()
    page, _ = SitePage.objects.get_or_create(
        key=SitePage.HOME,
        defaults={
            "title": payload["title"],
            "description": payload["description"],
            "content": payload,
            "draft_content": payload,
            "is_published": True,
            "published_at": timezone.now(),
        },
    )
    return page


class StaffRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    login_url = "/console/"

    def test_func(self):
        return self.request.user.is_staff


class ConsoleView(View):
    template_name = "console/login.html"

    def get(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            return self.render_dashboard(request)
        if request.user.is_authenticated:
            logout(request)
            messages.error(request, "此账号没有后台访问权限。")
        return render(request, self.template_name, self.login_context(request))

    def post(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            return redirect("console")

        form = StaffAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect("console")

        return render(request, self.template_name, self.login_context(request, form), status=401)

    def login_context(self, request, form: StaffAuthenticationForm | None = None) -> dict:
        return {
            "form": form or StaffAuthenticationForm(request),
        }

    def render_dashboard(self, request):
        total_views = ArticleViewCount.objects.aggregate(total=Sum("views"))["total"] or 0
        recent_articles = (
            Article.objects.select_related("view_count")
            .prefetch_related("tags")
            .order_by("-updated_at", "-pub_date")[:8]
        )
        home_page = get_home_page()

        return render(
            request,
            "console/dashboard.html",
            {
                "active": "dashboard",
                "stats": [
                    {"label": "文字", "value": Article.objects.count()},
                    {"label": "已发布", "value": Article.objects.published().count()},
                    {"label": "草稿", "value": Article.objects.filter(draft=True).count()},
                    {"label": "访问", "value": total_views},
                    {"label": "首页状态", "value": "已发布" if home_page.is_published else "隐藏"},
                    {"label": "素材", "value": MediaAsset.objects.count()},
                    {"label": "标签", "value": Tag.objects.count()},
                ],
                "recent_articles": recent_articles,
                "home_page": home_page,
            },
        )


class ConsoleLogoutView(View):
    def post(self, request):
        logout(request)
        return redirect("console")

    def get(self, request):
        logout(request)
        return redirect("console")


class HomeEditView(StaffRequiredMixin, View):
    template_name = "console/home_form.html"

    def get(self, request):
        page = get_home_page()
        payload = page.draft_content or page.content or home_page_defaults()
        form = HomeContentForm(initial=HomeContentForm.initial_from_payload(payload))
        return render(request, self.template_name, self.context(form, page))

    def post(self, request):
        page = get_home_page()
        form = HomeContentForm(request.POST)
        if not form.is_valid():
            return render(request, self.template_name, self.context(form, page), status=400)

        payload = form.to_payload()
        page.title = payload["title"]
        page.description = payload["description"]
        page.draft_content = payload

        action = request.POST.get("action", "save")
        if action == "publish":
            page.content = payload
            page.is_published = True
            page.published_at = timezone.now()
            message = "首页已发布。"
        else:
            message = "首页草稿已保存。"
        page.save()
        messages.success(request, message)
        return redirect("console-home")

    def context(self, form: HomeContentForm, page: SitePage) -> dict:
        return {
            "active": "home",
            "form": form,
            "page": page,
        }


class HomePreviewView(StaffRequiredMixin, View):
    def get(self, request):
        page = get_home_page()
        return render(
            request,
            "console/home_preview.html",
            {
                "active": "home",
                "page": page,
                "payload": page.draft_content or page.content or home_page_defaults(),
            },
        )


class ArticleListConsoleView(StaffRequiredMixin, ListView):
    template_name = "console/article_list.html"
    context_object_name = "articles"
    paginate_by = 30

    def get_queryset(self):
        queryset = Article.objects.select_related("view_count").prefetch_related("tags").order_by("-updated_at", "-pub_date")
        status = self.request.GET.get("status", "all")
        source = self.request.GET.get("source", "all")
        query = self.request.GET.get("q", "").strip()
        if status == "published":
            queryset = queryset.filter(draft=False)
        elif status == "draft":
            queryset = queryset.filter(draft=True)
        if source in {Article.SOURCE_MANUAL, Article.SOURCE_RESOURCE}:
            queryset = queryset.filter(content_source=source)
        if query:
            queryset = queryset.filter(title__icontains=query) | queryset.filter(slug__icontains=query)
        return queryset.distinct()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(
            {
                "active": "writings",
                "status_filter": self.request.GET.get("status", "all"),
                "source_filter": self.request.GET.get("source", "all"),
                "query": self.request.GET.get("q", "").strip(),
            }
        )
        return context


class ArticleEditView(StaffRequiredMixin, View):
    template_name = "console/article_form.html"

    def get_article(self, pk: int | None) -> Article | None:
        if pk is None:
            return None
        return get_object_or_404(Article.objects.prefetch_related("tags"), pk=pk)

    def get(self, request, pk: int | None = None):
        article = self.get_article(pk)
        form = ArticleForm(instance=article)
        return render(request, self.template_name, self.context(form, article))

    def post(self, request, pk: int | None = None):
        article = self.get_article(pk)
        form = ArticleForm(request.POST, instance=article)
        if not form.is_valid():
            return render(request, self.template_name, self.context(form, article), status=400)

        target = form.save(commit=False)
        action = request.POST.get("action", "save")
        if action == "publish":
            target.draft = False
            if target.updated_date is None:
                target.updated_date = target.pub_date
            message = "文字已发布。"
        elif action == "unpublish":
            target.draft = True
            message = "文字已下架。"
        else:
            if article is None:
                target.draft = True
            message = "文字草稿已保存。"

        target.save()
        self.save_tags(target, form.cleaned_data["tags_text"])
        ArticleViewCount.objects.get_or_create(article=target)
        messages.success(request, message)
        return redirect("console-writing-edit", pk=target.pk)

    def save_tags(self, article: Article, tag_names: list[str]) -> None:
        tags = [Tag.objects.get_or_create(name=name, defaults={"slug": tag_slug(name)})[0] for name in tag_names]
        article.tags.set(tags)

    def context(self, form: ArticleForm, article: Article | None) -> dict:
        return {
            "active": "writings",
            "form": form,
            "article": article,
            "preview_url": reverse("console-writing-preview", kwargs={"pk": article.pk}) if article else "",
        }


class ArticlePreviewView(StaffRequiredMixin, View):
    def get(self, request, pk: int):
        article = get_object_or_404(Article.objects.prefetch_related("tags").select_related("view_count"), pk=pk)
        return render(
            request,
            "console/article_preview.html",
            {
                "active": "writings",
                "article": article,
            },
        )
