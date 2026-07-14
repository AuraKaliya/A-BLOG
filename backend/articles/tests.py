from __future__ import annotations

import io
import json
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import Article, ArticleViewCount, SitePage, Tag
from .services import normalize_relative_asset, read_article_resource, rewrite_html_asset_urls


class ArticleResourceServiceTests(TestCase):
    def write_resource(self, root: Path, slug: str = "demo") -> Path:
        article_dir = root / slug
        article_dir.mkdir(parents=True)
        (article_dir / "index.json").write_text(
            json.dumps(
                {
                    "title": "测试文章",
                    "summary": "用于验证资源读取。",
                    "pubDate": "2026-06-06",
                    "updatedDate": "2026-06-07",
                    "cover": "cover.png",
                    "category": "随笔",
                    "tags": ["测试", "资源"],
                    "featured": True,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        (article_dir / "index.html").write_text(
            '<h2>标题</h2><p><img src="images/a.png"></p><a href="./doc.pdf">文档</a>'
            '<img src="/resource/keep.png"><source srcset="a.png 1x, images/b.png 2x">',
            encoding="utf-8",
        )
        return article_dir

    def test_article_resource_rewrites_relative_assets(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            article_dir = self.write_resource(root)

            with override_settings(ARTICLE_RESOURCE_ROOT=root):
                resource = read_article_resource(article_dir)

        self.assertEqual(resource.slug, "demo")
        self.assertEqual(resource.cover_url, "/resource/article/demo/cover.png")
        self.assertIn('/resource/article/demo/images/a.png', resource.html)
        self.assertIn('/resource/article/demo/doc.pdf', resource.html)
        self.assertIn('/resource/article/demo/a.png 1x', resource.html)
        self.assertIn('/resource/keep.png', resource.html)
        self.assertEqual(resource.tags, ["测试", "资源"])
        self.assertGreater(resource.word_count, 0)

    def test_article_resource_sanitizes_unsafe_html(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            article_dir = self.write_resource(root)
            (article_dir / "index.html").write_text(
                '<h2 onclick="alert(1)">标题</h2>'
                '<script>alert(1)</script>'
                '<p><img src="javascript:alert(1)" onerror="alert(1)"></p>'
                '<a href="javascript:alert(1)">恶意链接</a>'
                '<iframe src="https://example.com"></iframe>',
                encoding="utf-8",
            )

            with override_settings(ARTICLE_RESOURCE_ROOT=root):
                resource = read_article_resource(article_dir)

        self.assertIn("<h2>标题</h2>", resource.html)
        self.assertNotIn("<script", resource.html)
        self.assertNotIn("onclick", resource.html)
        self.assertNotIn("onerror", resource.html)
        self.assertNotIn("javascript:", resource.html)
        self.assertNotIn("<iframe", resource.html)

    def test_article_asset_paths_cannot_escape_article_folder(self):
        with self.assertRaises(ValueError):
            normalize_relative_asset("../secret.png")

        with self.assertRaises(ValueError):
            rewrite_html_asset_urls("demo", '<img src="../secret.png">')

    def test_sync_articles_imports_resource_metadata(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_resource(root, "resource-entry")

            with override_settings(ARTICLE_RESOURCE_ROOT=root):
                output = io.StringIO()
                call_command("sync_articles", stdout=output)

        article = Article.objects.get(slug="resource-entry")
        self.assertEqual(article.title, "测试文章")
        self.assertEqual(article.cover_url, "/resource/article/resource-entry/cover.png")
        self.assertIn("/resource/article/resource-entry/images/a.png", article.body_html)
        self.assertEqual(article.tags.count(), 2)
        self.assertTrue(ArticleViewCount.objects.filter(article=article).exists())

    def test_sync_articles_prunes_missing_resource_articles(self):
        article = Article.objects.create(
            slug="removed-entry",
            title="待移除文章",
            summary="这篇文章已经不在资源目录中。",
            pub_date=date(2026, 1, 1),
            draft=False,
            content_source=Article.SOURCE_RESOURCE,
        )

        with TemporaryDirectory() as tmp, override_settings(ARTICLE_RESOURCE_ROOT=Path(tmp)):
            call_command("sync_articles", "--prune", stdout=io.StringIO())

        article.refresh_from_db()
        self.assertTrue(article.draft)


class SitePageCommandTests(TestCase):
    def test_seed_pages_creates_home_page_from_json(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            pages_root = root / "src" / "content" / "pages"
            pages_root.mkdir(parents=True)
            (pages_root / "home.json").write_text(
                json.dumps(
                    {
                        "kind": "home",
                        "title": "测试首页",
                        "description": "来自种子文件。",
                        "profile": {"name": "Aura", "links": [], "tags": []},
                        "recentStatus": {},
                        "randomExplore": {"actionLabel": "开始"},
                        "intro": {"highlights": []},
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            with override_settings(REPO_ROOT=root):
                output = io.StringIO()
                call_command("seed_pages", "--key", "home", stdout=output)

        page = SitePage.objects.get(key=SitePage.HOME)
        self.assertEqual(page.title, "测试首页")
        self.assertEqual(page.content["description"], "来自种子文件。")
        self.assertTrue(page.is_published)


class ArticleApiTests(TestCase):
    def setUp(self):
        self.tag = Tag.objects.create(name="测试", slug="test")
        self.article = Article.objects.create(
            slug="published-entry",
            title="公开文章",
            summary="公开摘要",
            cover_url="/resource/default/default_image.png",
            body_html="<h2>正文</h2><p>公开内容。</p>",
            body_markdown="## 正文\n\n公开内容。",
            content_source=Article.SOURCE_MANUAL,
            pub_date=date(2026, 6, 6),
            category="随笔",
            draft=False,
        )
        self.article.tags.add(self.tag)
        ArticleViewCount.objects.create(article=self.article, views=3)
        self.draft = Article.objects.create(
            slug="draft-entry",
            title="草稿文章",
            summary="草稿摘要",
            content_source=Article.SOURCE_MANUAL,
            pub_date=date(2026, 6, 6),
            draft=True,
        )

    def test_article_api_lists_published_entries_with_filters(self):
        response = self.client.get("/api/articles/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["slug"] for item in response.json()["items"]], ["published-entry"])

        response = self.client.get("/api/articles/", {"tag": "测试"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["tags"], ["测试"])

        response = self.client.get("/api/articles/", {"tag": "missing"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"], [])

    def test_article_detail_and_view_counts(self):
        detail = self.client.get("/api/articles/published-entry/")
        self.assertEqual(detail.status_code, 200)
        self.assertIn("<h2>正文</h2>", detail.json()["html"])
        self.assertEqual(detail.json()["views"], 3)

        counts = self.client.get("/api/articles/views/", {"slugs": "published-entry,missing-entry"})
        self.assertEqual(counts.status_code, 200)
        self.assertEqual(counts.json()["views"], {"published-entry": 3, "missing-entry": 0})

    def test_article_view_event_counts_one_visit_per_day(self):
        first = self.client.post(
            "/api/articles/published-entry/view/",
            data="{}",
            content_type="application/json",
            HTTP_USER_AGENT="test-agent",
            REMOTE_ADDR="127.0.0.10",
        )
        second = self.client.post(
            "/api/articles/published-entry/view/",
            data="{}",
            content_type="application/json",
            HTTP_USER_AGENT="test-agent",
            REMOTE_ADDR="127.0.0.10",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(first.json()["counted"])
        self.assertFalse(second.json()["counted"])
        self.assertEqual(first.json()["views"], 4)
        self.assertEqual(second.json()["views"], 4)

    def test_article_view_event_ignores_spoofed_forwarded_for(self):
        first = self.client.post(
            "/api/articles/published-entry/view/",
            data="{}",
            content_type="application/json",
            HTTP_USER_AGENT="first-agent",
            HTTP_X_FORWARDED_FOR="203.0.113.10",
            REMOTE_ADDR="127.0.0.20",
        )
        second = self.client.post(
            "/api/articles/published-entry/view/",
            data="{}",
            content_type="application/json",
            HTTP_USER_AGENT="second-agent",
            HTTP_X_FORWARDED_FOR="203.0.113.11",
            REMOTE_ADDR="127.0.0.20",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(first.json()["counted"])
        self.assertFalse(second.json()["counted"])
        self.assertTrue(second.json()["throttled"])
        self.assertEqual(second.json()["views"], 4)

    @override_settings(ARTICLE_VIEW_LOOKUP_LIMIT=2)
    def test_article_view_lookup_limits_slug_count(self):
        counts = self.client.get("/api/articles/views/", {"slugs": "published-entry,missing-one,missing-two"})
        self.assertEqual(counts.status_code, 200)
        self.assertEqual(set(counts.json()["views"]), {"published-entry", "missing-one"})

    def test_draft_article_is_not_public(self):
        response = self.client.get("/api/articles/draft-entry/")
        self.assertEqual(response.status_code, 404)


class SitePageApiTests(TestCase):
    def test_site_page_api_exposes_published_pages_only(self):
        SitePage.objects.create(
            key=SitePage.HOME,
            title="首页",
            description="公开首页",
            content={"kind": "home", "title": "首页"},
            is_published=True,
            published_at=timezone.now(),
        )
        SitePage.objects.create(
            key=SitePage.ABOUT,
            title="关于",
            description="隐藏页面",
            content={"kind": "about", "title": "关于"},
            is_published=False,
        )

        detail = self.client.get("/api/pages/home/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"]["title"], "首页")

        list_response = self.client.get("/api/pages/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([item["key"] for item in list_response.json()["items"]], ["home"])

        hidden = self.client.get("/api/pages/about/")
        self.assertEqual(hidden.status_code, 404)
