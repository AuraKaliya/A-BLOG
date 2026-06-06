from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from articles.models import Article, ArticleViewCount, Tag
from articles.services import iter_article_resources, tag_slug


class Command(BaseCommand):
    help = "Scan resource/article and sync article metadata into the database."

    def add_arguments(self, parser):
        parser.add_argument("--prune", action="store_true", help="Mark database articles missing from resource/article as drafts.")

    @transaction.atomic
    def handle(self, *args, **options):
        resources = iter_article_resources()
        active_slugs = set()
        created_count = 0
        updated_count = 0

        for resource in resources:
            active_slugs.add(resource.slug)
            article, created = Article.objects.update_or_create(
                slug=resource.slug,
                defaults={
                    "title": resource.title,
                    "summary": resource.summary,
                    "cover_url": resource.cover_url,
                    "html_path": resource.html_path,
                    "pub_date": resource.pub_date,
                    "updated_date": resource.updated_date,
                    "category": resource.category,
                    "featured": resource.featured,
                    "draft": resource.draft,
                    "word_count": resource.word_count,
                    "source_hash": resource.source_hash,
                },
            )
            tag_models = []
            for tag_name in resource.tags:
                tag, _ = Tag.objects.get_or_create(name=tag_name, defaults={"slug": tag_slug(tag_name)})
                tag_models.append(tag)
            article.tags.set(tag_models)
            ArticleViewCount.objects.get_or_create(article=article)
            if created:
                created_count += 1
            else:
                updated_count += 1

        pruned_count = 0
        if options["prune"]:
            pruned_count = Article.objects.exclude(slug__in=active_slugs).update(draft=True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Synced {len(resources)} article(s): {created_count} created, {updated_count} updated, {pruned_count} pruned."
            )
        )
