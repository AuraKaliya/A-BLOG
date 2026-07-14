from django.db import migrations


HOME_CONTENT = {
    "kind": "home",
    "title": "Aura Kaliye 的个人空间",
    "description": "Aura Kaliye 的创作记录与个人空间。",
    "profile": {
        "eyebrow": "关于我",
        "name": "Aura Kaliye",
        "role": "独立创作者",
        "status": "正在构建幻想世界 Dreath",
        "location": "",
        "bio": "我以 Aura Kaliye 作为本站署名，记录世界观创作、写作片段与相关实践。",
        "imageAlt": "Aura Kaliye",
        "imagePosition": "50% 50%",
        "tags": [],
        "links": [],
    },
    "recentStatus": {
        "eyebrow": "当前创作",
        "title": "Dreath",
        "description": "Dreath 是一个正在创作中的幻想世界项目，围绕人物、地点、事件与规则展开。",
        "imageIndex": "default/default_image",
        "imageAlt": "Dreath 创作近况插图",
        "imagePosition": "42% 50%",
        "href": "/now",
    },
    "randomExplore": {
        "eyebrow": "随机浏览",
        "title": "随机阅读",
        "description": "从两篇以上已经公开的内容中随机打开一页。",
        "actionLabel": "随机打开",
    },
    "intro": {
        "eyebrow": "关于这里",
        "title": "从已经公开的内容开始",
        "lead": "这里从 Dreath 的创作过程开始，记录已经公开的近况与思考。",
        "highlights": [
            {"keyword": "随记", "title": "创作近况与阶段想法", "description": "已经公开的短记录", "href": "/notes"},
            {"keyword": "现在", "title": "当前正在处理的内容", "description": "Dreath 的整理范围与本阶段重点", "href": "/now"},
            {"keyword": "关于", "title": "关于 Aura Kaliye", "description": "主要署名、创作方向与这个个人空间", "href": "/about"},
        ],
    },
}

ABOUT_CONTENT = {
    "kind": "about",
    "title": "关于 Aura Kaliye",
    "description": "Aura Kaliye 的创作方向、署名与这个个人空间。",
    "intro": {
        "title": "关于我",
        "description": "我是 Aura Kaliye，目前主要投入幻想世界项目 Dreath 的创作。这里整理已经公开的创作近况与思考。",
    },
    "focusAreas": [],
    "stackCards": [
        {
            "label": "当前创作",
            "title": "Dreath",
            "description": "Dreath 是一个正在创作中的幻想世界项目，围绕人物、地点、事件与规则展开。",
            "featured": True,
        },
        {"title": "记录方式", "description": "我先整理内容之间的关系，再公开能够独立阅读的近况、片段与思考。"},
        {"title": "关于署名", "description": "本站统一使用 Aura Kaliye；Aura、银花海和花海也是我使用的署名。"},
    ],
    "socialCards": [],
    "contact": {"ctaLabel": "发送邮件", "emailLabel": "邮箱", "githubLabel": "GitHub", "socialLabel": "社交主页"},
}

NOW_CONTENT = {
    "kind": "now",
    "title": "现在",
    "description": "Dreath 当前的整理范围与创作重点。",
    "updatedDate": "2026-07-14",
    "intro": {
        "title": "最近在做什么",
        "description": "这一阶段先整理 Dreath 的基础结构，当前范围包括人物关系、地点脉络与事件顺序。",
    },
    "focusAreas": [
        {"title": "人物关系", "description": "整理主要人物之间已经确定的直接关系。"},
        {"title": "地点脉络", "description": "区分地点层级，并核对地点与人物、事件的联系。"},
        {"title": "事件顺序", "description": "整理事件的先后关系，检查现有设定是否一致。"},
    ],
    "tracks": [
        {
            "title": "基础结构整理",
            "description": "本阶段集中处理支撑当前创作的基础信息。",
            "items": ["人物之间的直接关系", "地点与事件的对应", "核心名词的统一写法"],
        }
    ],
}

LAB_CONTENT = {
    "kind": "lab",
    "title": "实验室",
    "description": "原型、工具与交互实验的公开记录。",
    "intro": {"title": "实验内容", "description": "这里集中整理能够独立说明的实验记录。"},
    "cards": [],
}

NEW_CONTENT = {"home": HOME_CONTENT, "about": ABOUT_CONTENT, "now": NOW_CONTENT, "lab": LAB_CONTENT}


def uses_old_default(key, payload):
    if not isinstance(payload, dict):
        return False
    if key == "home":
        profile = payload.get("profile", {})
        return profile.get("role") == "笔名：Aura、银花海、花海" and profile.get("bio") == "我使用 Aura Kaliye、Aura、银花海和花海作为署名。"
    if key == "about":
        return payload.get("intro", {}).get("description") == "我使用 Aura Kaliye、Aura、银花海和花海作为署名。Aura Kaliye 是这个个人空间的主要展示名称。"
    if key == "now":
        return payload.get("intro", {}).get("description") == "最近主要在推进 Dreath。当前工作集中在人物、地点和事件之间的关系，以及哪些设定适合首先公开。"
    if key == "lab":
        return payload.get("intro", {}).get("description") == "已经完成并能够独立说明的实验会出现在这里。"
    return False


def refresh_personal_space_content(apps, schema_editor):
    SitePage = apps.get_model("articles", "SitePage")

    for page in SitePage.objects.filter(key__in=NEW_CONTENT):
        changed_fields = []
        public_content_changed = False
        for field_name in ("content", "draft_content"):
            if not uses_old_default(page.key, getattr(page, field_name)):
                continue
            setattr(page, field_name, NEW_CONTENT[page.key])
            changed_fields.append(field_name)
            public_content_changed = public_content_changed or field_name == "content"

        if not changed_fields:
            continue
        if public_content_changed:
            page.title = NEW_CONTENT[page.key]["title"]
            page.description = NEW_CONTENT[page.key]["description"]
            changed_fields.extend(["title", "description"])
        page.save(update_fields=[*changed_fields, "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("articles", "0005_clean_public_defaults")]

    operations = [migrations.RunPython(refresh_personal_space_content, migrations.RunPython.noop)]
