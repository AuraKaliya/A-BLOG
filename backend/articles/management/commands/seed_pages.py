from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from articles.models import SitePage


class Command(BaseCommand):
    help = "Seed editable site pages from src/content/pages JSON files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--key",
            choices=[choice[0] for choice in SitePage.PAGE_CHOICES],
            help="Seed one page only. Defaults to all known site pages.",
        )

    def handle(self, *args, **options):
        source_root = Path(settings.REPO_ROOT) / "src" / "content" / "pages"
        keys = [options["key"]] if options["key"] else [choice[0] for choice in SitePage.PAGE_CHOICES]
        seeded_count = 0

        for key in keys:
            source_path = source_root / f"{key}.json"
            if not source_path.is_file():
                self.stdout.write(self.style.WARNING(f"Skipped {key}: {source_path} does not exist."))
                continue

            try:
                payload = json.loads(source_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                raise CommandError(f"{source_path} is not valid JSON: {exc}") from exc

            if not isinstance(payload, dict):
                raise CommandError(f"{source_path} must contain a JSON object.")

            title = str(payload.get("title") or key).strip()
            description = str(payload.get("description") or "").strip()
            page, created = SitePage.objects.update_or_create(
                key=key,
                defaults={
                    "title": title,
                    "description": description,
                    "content": payload,
                    "is_published": True,
                    "published_at": timezone.now(),
                },
            )
            if created and not page.draft_content:
                page.draft_content = payload
                page.save(update_fields=["draft_content"])
            seeded_count += 1
            action = "Created" if created else "Updated"
            self.stdout.write(f"{action} page: {key}")

        self.stdout.write(self.style.SUCCESS(f"Seeded {seeded_count} page(s)."))
