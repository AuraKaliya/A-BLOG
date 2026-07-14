from django.db import migrations


SAMPLE_ARTICLE_SLUGS = ["notes-on-building", "starting-a-personal-site"]

HOME_CONTENT = {
    "kind": "home",
    "title": "Aura Kaliye 的个人空间",
    "description": "Aura Kaliye 的创作、写作与技术实践。",
    "profile": {
        "eyebrow": "个人简介",
        "name": "Aura Kaliye",
        "role": "笔名：Aura、银花海、花海",
        "status": "正在创作 Dreath",
        "location": "",
        "bio": "我使用 Aura Kaliye、Aura、银花海和花海作为署名。",
        "imageIndex": "default/default_image",
        "imageAlt": "Aura Kaliye 头像",
        "imagePosition": "50% 50%",
        "tags": [],
        "links": [],
    },
    "recentStatus": {
        "eyebrow": "近期状态",
        "title": "Dreath 近况",
        "description": "最近主要在推进 Dreath，当前工作集中在人物、地点和事件之间的关系。",
        "imageIndex": "default/default_image",
        "imageAlt": "近期状态展示图",
        "imagePosition": "42% 50%",
    },
    "randomExplore": {
        "eyebrow": "随机浏览",
        "title": "随意看看",
        "description": "从已经公开的文字、随记、收藏和其他内容中随机打开一页。",
        "actionLabel": "随机打开",
    },
    "intro": {
        "eyebrow": "关于这里",
        "title": "创作、写作与实践",
        "lead": "这个空间以 Dreath 为当前创作核心，也会收录其他已经完成或正在推进的内容。",
        "highlights": [
            {"keyword": "文字", "title": "写下来的内容", "description": "随笔、创作笔记与技术实践", "href": "/writings"},
            {"keyword": "作品", "title": "完成的创作", "description": "准备好公开的项目、工具与作品", "href": "/works"},
            {"keyword": "世界", "title": "Dreath", "description": "人物、地点、事件与规则构成的幻想世界", "href": "/world"},
        ],
    },
}

ABOUT_CONTENT = {
    "kind": "about",
    "title": "关于 Aura Kaliye",
    "description": "关于 Aura Kaliye 使用的署名、当前创作与这个个人空间。",
    "intro": {
        "title": "关于我的署名",
        "description": "我使用 Aura Kaliye、Aura、银花海和花海作为署名。Aura Kaliye 是这个个人空间的主要展示名称。",
    },
    "focusAreas": [],
    "stackCards": [
        {
            "label": "当前创作",
            "title": "Dreath",
            "description": "Dreath 是我目前投入最多精力的创作。当前工作集中在人物、地点、事件和规则之间的关系。",
            "featured": True,
        },
        {"title": "写作", "description": "文字部分会包含随笔、创作笔记，以及值得单独展开的思考。"},
        {"title": "技术实践", "description": "与工具、前端和交互有关的实践，会在形成可说明的结果后公开。"},
    ],
    "socialCards": [],
    "contact": {"ctaLabel": "发送邮件", "emailLabel": "邮箱", "githubLabel": "GitHub", "socialLabel": "社交主页"},
}

NOW_CONTENT = {
    "kind": "now",
    "title": "现在",
    "description": "Aura Kaliye 最近的创作重点。",
    "updatedDate": "2026-07-14",
    "intro": {
        "title": "最近在做什么",
        "description": "最近主要在推进 Dreath。当前工作集中在人物、地点和事件之间的关系，以及哪些设定适合首先公开。",
    },
    "focusAreas": [
        {"title": "世界结构", "description": "梳理人物、地点和事件之间的关系，让核心设定保持一致。"},
        {"title": "公开顺序", "description": "确认适合首先进入世界档案的基础设定。"},
    ],
    "tracks": [
        {
            "title": "Dreath 基础结构",
            "description": "当前先处理 Dreath 的基础结构和核心名词。",
            "items": ["人物关系", "地点脉络", "事件顺序"],
        }
    ],
}

LAB_CONTENT = {
    "kind": "lab",
    "title": "实验室",
    "description": "用于展示原型、工具与交互实验。",
    "intro": {"title": "实验内容", "description": "已经完成并能够独立说明的实验会出现在这里。"},
    "cards": [],
}

DEFAULT_CONTENT = {"home": HOME_CONTENT, "about": ABOUT_CONTENT, "now": NOW_CONTENT, "lab": LAB_CONTENT}
DEFAULT_MARKERS = {
    "home": {"在这里记录写作、创作、技术实践和仍在形成中的想法。", "欢迎来到Aura的个人空间！"},
    "about": {"写作、创作，以及仍在形成中的想法。", "先把自己放进一个清晰的结构里。"},
    "now": {"此刻正在发生的事", "当前关注方向"},
    "lab": {"保留探索，也尊重完成度", "实验不是作品的附属品"},
}


def marker_for(key, payload):
    if key == "home":
        return payload.get("profile", {}).get("bio")
    return payload.get("intro", {}).get("title")


def clean_public_defaults(apps, schema_editor):
    Article = apps.get_model("articles", "Article")
    SitePage = apps.get_model("articles", "SitePage")
    Tag = apps.get_model("articles", "Tag")

    Article.objects.filter(slug__in=SAMPLE_ARTICLE_SLUGS).delete()
    Tag.objects.filter(articles__isnull=True).delete()

    for page in SitePage.objects.filter(key__in=DEFAULT_CONTENT):
        changed = False
        for field_name in ("content", "draft_content"):
            payload = getattr(page, field_name)
            if not isinstance(payload, dict) or marker_for(page.key, payload) not in DEFAULT_MARKERS[page.key]:
                continue
            setattr(page, field_name, DEFAULT_CONTENT[page.key])
            changed = True
        if changed:
            page.title = DEFAULT_CONTENT[page.key]["title"]
            page.description = DEFAULT_CONTENT[page.key]["description"]
            page.save(update_fields=["title", "description", "content", "draft_content", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("articles", "0004_refresh_default_public_copy")]

    operations = [migrations.RunPython(clean_public_defaults, migrations.RunPython.noop)]
