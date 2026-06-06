from __future__ import annotations

from django.db import models


class ArticleQuerySet(models.QuerySet):
    def published(self):
        return self.filter(draft=False)


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
    slug = models.SlugField("Slug", max_length=160, unique=True)
    title = models.CharField("标题", max_length=240)
    summary = models.TextField("摘要")
    cover_url = models.CharField("封面 URL", max_length=500, blank=True)
    html_path = models.CharField("HTML 相对路径", max_length=500)
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
