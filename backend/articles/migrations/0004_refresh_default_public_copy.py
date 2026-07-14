from django.db import migrations


HOME_OLD_HIGHLIGHTS = [
    {
        "keyword": "文字",
        "title": "生活随笔、技术博客",
        "description": "梦和影子的留存之地",
        "href": "/archive",
    },
    {
        "keyword": "作品",
        "title": "项目、工具",
        "description": "一些想法和实践的产物归档之地",
        "href": "/works",
    },
    {
        "keyword": "世界",
        "title": "Dreath世界观",
        "description": "欢迎来到Aura的幻想世界",
        "href": "/world",
    },
]

HOME_NEW_HIGHLIGHTS = [
    {
        "keyword": "文字",
        "title": "随笔与技术记录",
        "description": "生活、学习与实践留下的文字",
        "href": "/writings",
    },
    {
        "keyword": "作品",
        "title": "项目与创作",
        "description": "已经形成明确成果的项目、工具和创作记录",
        "href": "/works",
    },
    {
        "keyword": "世界",
        "title": "Dreath 世界观",
        "description": "人物、地点、事件与规则构成的幻想世界",
        "href": "/world",
    },
]


def replace_value(container, key, old, new):
    if isinstance(container, dict) and container.get(key) == old:
        container[key] = new


def refresh_home(payload):
    replace_value(
        payload,
        "description",
        "一个保存文字、技术、作品、世界设定与未完成想法的个人内容站点入口。",
        "记录 Aura 的写作、创作、技术实践与 Dreath 世界观。",
    )
    profile = payload.get("profile", {})
    replace_value(profile, "status", "正在激情创作世界观中", "正在创作 Dreath 世界观")
    replace_value(
        profile,
        "bio",
        "欢迎来到Aura的个人空间！",
        "在这里记录写作、创作、技术实践和仍在形成中的想法。",
    )
    if profile.get("imageIndex") == "default/default_image" and "imagePosition" not in profile:
        profile["imagePosition"] = "50% 50%"

    recent = payload.get("recentStatus", {})
    replace_value(
        recent,
        "description",
        "正在激情创作世界观中，顺手把个人站整理成更适合长期维护的展示板。",
        "最近的主要精力放在 Dreath 世界观的整理与创作上，也会在这里留下阶段性的记录。",
    )
    if recent.get("imageIndex") == "default/default_image" and "imagePosition" not in recent:
        recent["imagePosition"] = "42% 50%"

    random_explore = payload.get("randomExplore", {})
    replace_value(
        random_explore,
        "description",
        "从文章、作品、世界档案、短动态和站外链接里随机打开一个入口。",
        "从文字、随记、收藏和已经公开的内容中随机打开一页。",
    )
    intro = payload.get("intro", {})
    replace_value(intro, "title", "来点正经介绍", "关于这个空间")
    replace_value(
        intro,
        "lead",
        "这里会留存有我的生活记录、创作作品以及各种想法和实验。",
        "这里收录生活与学习的记录、逐渐成形的作品，以及持续创作中的 Dreath 世界。",
    )
    replace_value(intro, "highlights", HOME_OLD_HIGHLIGHTS, HOME_NEW_HIGHLIGHTS)


def refresh_about(payload):
    replace_value(payload, "title", "关于", "关于 Aura")
    replace_value(
        payload,
        "description",
        "个人介绍、关注方向、技术栈和联系方式。",
        "关于 Aura 的创作、技术实践与长期关注方向。",
    )
    old_intro = {
        "title": "先把自己放进一个清晰的结构里。",
        "description": "个人网站最有用的地方，是让别人快速理解你长期关注什么、做过什么、正在构建什么，以及为什么这些内容放在一起。",
    }
    new_intro = {
        "title": "写作、创作，以及仍在形成中的想法。",
        "description": "这里是 Aura 整理创作、技术实践与长期想法的个人空间。目前主要在推进 Dreath 世界观，也会记录写作、工具、实验，以及尚未完成但值得保留的思考。",
    }
    replace_value(payload, "intro", old_intro, new_intro)
    replace_value(
        payload,
        "focusAreas",
        ["前端与展示系统", "AI 应用与自动化", "产品与内容结构", "长期写作与复盘"],
        ["Dreath 世界观创作", "写作与长期记录", "前端与交互实践", "AI 应用与自动化", "知识整理与复盘"],
    )
    old_cards = payload.get("stackCards")
    if isinstance(old_cards, list) and [card.get("title") for card in old_cards] == ["当前技术栈", "站点定位", "后续扩展"]:
        payload["stackCards"] = [
            {
                "label": "Create",
                "title": "创作与叙事",
                "description": "持续整理 Dreath 的人物、地点、事件与规则，让零散设定逐渐形成可以阅读和探索的世界。",
                "featured": True,
            },
            {
                "title": "技术实践",
                "description": "关注前端、交互、AI 应用与自动化，把方法、原型和解决问题的过程留下来。",
            },
            {
                "title": "长期记录",
                "description": "用随笔、笔记和阶段复盘保存变化，让曾经投入过的时间能够被重新找到。",
            },
        ]


def refresh_now(payload):
    replace_value(payload, "description", "当前关注方向、站点状态和下一步迭代计划。", "Aura 最近正在创作、记录和关注的事情。")
    payload.setdefault("updatedDate", "2026-07-14")
    old_intro = payload.get("intro", {})
    if old_intro.get("title") == "当前关注方向" and "内容关系" in old_intro.get("description", ""):
        payload["intro"] = {
            "title": "此刻正在发生的事",
            "description": "最近的主要精力放在 Dreath 世界观的整理与创作上，同时继续记录写作、技术实践和仍在形成中的想法。",
        }
    old_focus = payload.get("focusAreas", [])
    if [item.get("title") for item in old_focus if isinstance(item, dict)] == ["前端与展示系统", "AI 应用与自动化", "产品与内容结构", "长期写作与复盘"]:
        payload["focusAreas"] = [
            {"title": "Dreath 世界观", "description": "整理人物、地点、事件和规则之间的关系，逐步形成可以公开阅读的档案。"},
            {"title": "写作与记录", "description": "留下生活、学习和阶段性思考，不要求每个想法都立刻成为完整文章。"},
            {"title": "技术与实验", "description": "继续探索前端、交互、AI 应用与自动化，并记录真正形成结果的实践。"},
        ]
    old_tracks = payload.get("tracks", [])
    if [item.get("title") for item in old_tracks if isinstance(item, dict)] == ["正在搭建", "正在观察", "下一步"]:
        payload["tracks"] = [
            {"title": "正在创作", "description": "把 Dreath 从零散设想整理成更清晰的世界设定。", "items": ["世界设定整理", "人物与地点档案", "阶段性创作记录"]},
            {"title": "正在记录", "description": "把近期值得留下的经验和想法写下来。", "items": ["生活随笔", "技术笔记", "未完成的想法"]},
            {"title": "接下来", "description": "优先整理已经具有明确内容的部分，不用示例条目填满空白。", "items": ["逐步公开 Dreath 档案", "整理真实作品", "持续更新个人状态"]},
        ]


def refresh_lab(payload):
    replace_value(payload, "description", "AI 原型、交互 Demo、小工具和想法验证的归档入口。", "尚在验证中的原型、工具与交互实验。")
    old_intro = payload.get("intro", {})
    if old_intro.get("title") == "实验不是作品的附属品":
        payload["intro"] = {
            "title": "保留探索，也尊重完成度",
            "description": "这里收录已经具备明确问题、过程或结果的实验。尚未形成内容的想法不会被包装成公开条目。",
        }
    cards = payload.get("cards", [])
    if [card.get("title") for card in cards if isinstance(card, dict)] == ["AI 与自动化原型", "交互与可视化", "想法仓库"]:
        payload["cards"] = []


REFRESHERS = {
    "home": refresh_home,
    "about": refresh_about,
    "now": refresh_now,
    "lab": refresh_lab,
}


def refresh_default_copy(apps, schema_editor):
    SitePage = apps.get_model("articles", "SitePage")
    for page in SitePage.objects.filter(key__in=REFRESHERS):
        changed = False
        for field_name in ("content", "draft_content"):
            payload = getattr(page, field_name)
            if not isinstance(payload, dict):
                continue
            before = repr(payload)
            REFRESHERS[page.key](payload)
            if repr(payload) != before:
                setattr(page, field_name, payload)
                changed = True

        content = page.content if isinstance(page.content, dict) else {}
        if page.title in {"关于", "about"} and content.get("title") == "关于 Aura":
            page.title = "关于 Aura"
            changed = True
        old_descriptions = {
            "home": "一个保存文字、技术、作品、世界设定与未完成想法的个人内容站点入口。",
            "about": "个人介绍、关注方向、技术栈和联系方式。",
            "now": "当前关注方向、站点状态和下一步迭代计划。",
            "lab": "AI 原型、交互 Demo、小工具和想法验证的归档入口。",
        }
        if page.description == old_descriptions.get(page.key) and content.get("description"):
            page.description = content["description"]
            changed = True
        if changed:
            page.save(update_fields=["title", "description", "content", "draft_content", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("articles", "0003_article_body_html_article_body_markdown_and_more")]

    operations = [migrations.RunPython(refresh_default_copy, migrations.RunPython.noop)]
