(() => {
  const api = {
    async get(path) {
      const url = new URL(path, window.location.origin);
      url.searchParams.set("_live", String(Date.now()));
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`CMS API unavailable: ${path}`);
      return response.json();
    },
  };

  const text = (selector, value, root = document) => {
    const node = root.querySelector(selector);
    if (node && value !== undefined && value !== null) node.textContent = String(value);
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00+08:00`);
    if (Number.isNaN(date.valueOf())) return value;
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(date);
  };

  const formatWordCount = (value) => {
    const count = Number(value) || 0;
    if (count >= 10000) return `${(count / 10000).toFixed(1)} 万字`;
    return `${count.toLocaleString("zh-CN")} 字`;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const allowedArticleTags = new Set([
    "a",
    "abbr",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "figcaption",
    "figure",
    "h2",
    "h3",
    "h4",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "picture",
    "pre",
    "source",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ]);
  const unsafeArticleTags = new Set(["script", "style", "iframe", "object", "embed", "template", "form"]);
  const globalArticleAttrs = new Set(["class", "id"]);
  const articleAttrsByTag = {
    a: new Set(["href", "title", "target", "rel"]),
    img: new Set(["src", "alt", "title", "width", "height", "loading"]),
    source: new Set(["src", "srcset", "media", "type", "sizes"]),
    td: new Set(["colspan", "rowspan"]),
    th: new Set(["colspan", "rowspan", "scope"]),
  };
  const articleUrlAttrs = new Set(["href", "src", "poster"]);

  function hasUnsafeScheme(value) {
    const normalized = String(value ?? "")
      .trim()
      .replace(/[\u0000-\u001F\u007F\s]+/g, "")
      .toLowerCase();
    if (!normalized || normalized.startsWith("/") || normalized.startsWith("#")) return false;
    if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("mailto:") || normalized.startsWith("tel:")) return false;
    return /^[a-z][a-z0-9+.-]*:/i.test(normalized);
  }

  const safeHref = (value, fallback = "#") => {
    const href = String(value ?? "").trim();
    if (!href || hasUnsafeScheme(href)) return fallback;
    return href;
  };

  function isSafeSrcset(value) {
    return String(value ?? "")
      .split(",")
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .filter(Boolean)
      .every((url) => !hasUnsafeScheme(url));
  }

  function sanitizeArticleHtml(root) {
    [...root.querySelectorAll("*")].forEach((node) => {
      const tag = node.tagName.toLowerCase();
      if (!allowedArticleTags.has(tag)) {
        if (unsafeArticleTags.has(tag)) {
          node.remove();
        } else {
          node.replaceWith(...node.childNodes);
        }
        return;
      }
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const allowed = globalArticleAttrs.has(name) || articleAttrsByTag[tag]?.has(name);
        if (!allowed || name.startsWith("on")) {
          node.removeAttribute(attribute.name);
          return;
        }
        if (name === "srcset" && !isSafeSrcset(attribute.value)) {
          node.removeAttribute(attribute.name);
          return;
        }
        if (articleUrlAttrs.has(name) && hasUnsafeScheme(attribute.value)) {
          node.removeAttribute(attribute.name);
        }
      });
    });
  }

  const resourceImage = (index, fallback = "/resource/default/default_image.png") => {
    if (!index) return fallback;
    const raw = String(index).replace(/^\/?resource\//, "").replace(/^\/+/, "").replaceAll("\\", "/");
    if (/^https?:\/\//.test(raw)) return raw;
    if (/\.(png|jpe?g|webp|gif|avif)$/i.test(raw)) return `/resource/${raw}`;
    return `/resource/${raw}.png`;
  };

  const setImagePosition = (image, value) => {
    const position = String(value ?? "").trim();
    if (image && /^(?:\d{1,3}(?:\.\d+)?%|left|center|right)(?:\s+(?:\d{1,3}(?:\.\d+)?%|top|center|bottom))?$/.test(position)) {
      image.style.objectPosition = position;
    }
  };

  function setLinks(container, links = []) {
    if (!container) return;
    container.innerHTML = links
      .map((link) => `<a class="text-link" href="${escapeHtml(safeHref(link.href))}">${escapeHtml(link.label)}</a>`)
      .join("");
  }

  function setTags(container, tags = []) {
    if (!container) return;
    container.innerHTML = tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  }

  async function hydrateHome() {
    const root = document.querySelector("[data-cms-home]");
    if (!root) return;

    const payload = await api.get("/api/pages/home/");
    const home = payload.data;
    if (!home || home.kind !== "home") return;

    document.title = `${home.title || payload.title} | ${document.title.split("|").at(-1).trim()}`;
    const description = document.querySelector('meta[name="description"]');
    if (description && home.description) description.setAttribute("content", home.description);

    text("[data-home-profile-eyebrow]", home.profile?.eyebrow, root);
    text("[data-home-profile-name]", home.profile?.name, root);
    text("[data-home-profile-role]", home.profile?.role, root);
    text("[data-home-profile-status]", home.profile?.status, root);
    text("[data-home-profile-location]", home.profile?.location, root);
    const profileLocation = root.querySelector("[data-home-profile-location]");
    if (profileLocation) profileLocation.hidden = !String(home.profile?.location ?? "").trim();
    text("[data-home-profile-bio]", home.profile?.bio, root);
    setTags(root.querySelector("[data-home-profile-tags]"), home.profile?.tags);
    setLinks(root.querySelector("[data-home-profile-links]"), home.profile?.links);
    let profileImage = root.querySelector("[data-home-profile-image]");
    if (!profileImage && home.profile?.imageIndex) {
      const avatar = root.querySelector(".profile-avatar");
      profileImage = document.createElement("img");
      profileImage.loading = "eager";
      profileImage.dataset.homeProfileImage = "";
      avatar?.querySelector("[data-home-profile-fallback]")?.remove();
      avatar?.appendChild(profileImage);
      avatar?.classList.add("has-image");
    }
    if (profileImage && home.profile?.imageIndex) {
      profileImage.src = resourceImage(home.profile.imageIndex);
      profileImage.alt = home.profile.imageAlt || home.profile.name || "";
    }
    setImagePosition(profileImage, home.profile?.imagePosition);

    text("[data-home-recent-eyebrow]", home.recentStatus?.eyebrow, root);
    text("[data-home-recent-title]", home.recentStatus?.title, root);
    text("[data-home-recent-description]", home.recentStatus?.description, root);
    const recentImage = root.querySelector("[data-home-recent-image]");
    if (recentImage && home.recentStatus?.imageIndex) {
      recentImage.src = resourceImage(home.recentStatus.imageIndex);
      recentImage.alt = home.recentStatus.imageAlt || home.recentStatus.title || "";
    }
    setImagePosition(recentImage, home.recentStatus?.imagePosition);
    const recentLink = root.querySelector(".recent-status-copy a");
    if (recentLink && home.recentStatus?.href) recentLink.href = safeHref(home.recentStatus.href, recentLink.href);

    text("[data-home-random-eyebrow]", home.randomExplore?.eyebrow, root);
    text("[data-home-random-title]", home.randomExplore?.title, root);
    text("[data-home-random-description]", home.randomExplore?.description, root);
    text("[data-home-random-action]", home.randomExplore?.actionLabel, root);

    text("[data-home-intro-eyebrow]", home.intro?.eyebrow, root);
    const introTitle = root.querySelector("[data-home-intro-title]");
    if (introTitle && home.intro?.title) {
      introTitle.innerHTML = String(home.intro.title)
        .split("\n")
        .map((line) => `<span>${escapeHtml(line)}</span>`)
        .join("");
    }
    text("[data-home-intro-lead]", home.intro?.lead, root);
    const highlights = root.querySelector("[data-home-highlights]");
    if (highlights && Array.isArray(home.intro?.highlights)) {
      highlights.innerHTML = home.intro.highlights
        .map(
          (item, index) => `
            <a class="home-highlight-item" href="${escapeHtml(safeHref(item.href))}">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(item.keyword)}</strong>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </a>
          `,
        )
        .join("");
    }
  }

  function articleCard(article, index) {
    const tags = article.tags || [];
    return `
      <article class="resource-article-card" data-article-card data-article-side="${index % 2 === 0 ? "left" : "right"}" data-article-slug="${escapeHtml(article.slug)}" data-article-tags="${escapeHtml(tags.join(","))}">
        <a class="resource-article-cover" href="/writings/${encodeURIComponent(article.slug)}" aria-label="阅读 ${escapeHtml(article.title)}">
          <img src="${escapeHtml(article.cover || "/resource/default/default_image.png")}" alt="" loading="lazy" />
        </a>
        <div class="resource-article-body">
          <div class="resource-article-meta">
            <time datetime="${escapeHtml(article.pubDate)}">${escapeHtml(formatDate(article.pubDate))}</time>
            ${article.category ? `<span>${escapeHtml(article.category)}</span>` : ""}
            <span>${escapeHtml(formatWordCount(article.wordCount))}</span>
            <span><span data-article-view-count="${escapeHtml(article.slug)}">${Number(article.views) || 0}</span> 浏览</span>
          </div>
          <h2><a href="/writings/${encodeURIComponent(article.slug)}">${escapeHtml(article.title)}</a></h2>
          <p>${escapeHtml(article.summary)}</p>
          <div class="tag-row">
            ${tags.map((tag) => `<button type="button" data-article-tag-jump="${escapeHtml(tag)}" title="${escapeHtml(tag)}"><span>${escapeHtml(tag)}</span></button>`).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function applyArticleFilters(collection, controls) {
    if (!collection || !controls) return;
    const params = new URLSearchParams(window.location.search);
    let currentView = params.get("view") === "grid" ? "grid" : "timeline";
    let currentTag = params.get("tag") || "all";

    const applyState = () => {
      const cards = [...collection.querySelectorAll("[data-article-card]")];
      collection.classList.toggle("view-grid", currentView === "grid");
      collection.classList.toggle("view-timeline", currentView === "timeline");
      controls.querySelectorAll("[data-article-view]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.articleView === currentView ? "true" : "false");
      });
      controls.querySelectorAll("[data-article-tag]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.articleTag === currentTag ? "true" : "false");
      });
      cards.forEach((card) => {
        const tags = (card.dataset.articleTags || "").split(",").filter(Boolean);
        card.hidden = currentTag !== "all" && !tags.includes(currentTag);
      });
    };

    if (!controls.dataset.cmsLiveBound) {
      controls.dataset.cmsLiveBound = "true";
      controls.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        if (button.dataset.articleView) currentView = button.dataset.articleView;
        if (button.dataset.articleTag) currentTag = button.dataset.articleTag;
        applyState();
      });
      collection.addEventListener("click", (event) => {
        const target = event.target.closest("[data-article-tag-jump]");
        if (!target) return;
        currentTag = target.dataset.articleTagJump;
        applyState();
      });
    }
    applyState();
  }

  async function hydrateWritingsIndex() {
    const collection = document.querySelector("[data-article-collection]");
    const controls = document.querySelector("[data-article-controls]");
    const emptyState = document.querySelector("[data-article-empty]");
    if (!collection || !controls) return;

    const [articlePayload, tagPayload] = await Promise.all([api.get("/api/articles/"), api.get("/api/articles/tags/")]);
    const articles = articlePayload.items || [];
    const tags = tagPayload.items || [];
    collection.innerHTML = articles.map(articleCard).join("");
    controls.hidden = articles.length === 0;
    collection.hidden = articles.length === 0;
    if (emptyState) emptyState.hidden = articles.length > 0;

    const filter = controls.querySelector(".article-tag-filter");
    if (filter) {
      filter.innerHTML = `
        <button type="button" data-article-tag="all" aria-pressed="true"><span>全部档案</span><small>${articles.length}</small></button>
        ${tags.map((tag) => `<button type="button" data-article-tag="${escapeHtml(tag.name)}" aria-pressed="false" title="${escapeHtml(tag.name)}"><span>${escapeHtml(tag.name)}</span><small>${Number(tag.count) || 0}</small></button>`).join("")}
      `;
    }
    applyArticleFilters(collection, controls);
  }

  function slugFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== "writings") return "";
    if (parts[1] === "live") return new URLSearchParams(window.location.search).get("slug") || "";
    if (!parts[1]) return "";
    return decodeURIComponent(parts[1]);
  }

  function enhanceArticleHtml(rawHtml) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = rawHtml || "";
    sanitizeArticleHtml(wrapper);
    const used = new Set([...wrapper.querySelectorAll("[id]")].map((node) => node.id));
    const toc = [];
    wrapper.querySelectorAll("h2, h3").forEach((heading) => {
      const textValue = heading.textContent.trim();
      if (!textValue) return;
      if (!heading.id) {
        let base = textValue.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
        let id = base;
        let suffix = 2;
        while (used.has(id)) {
          id = `${base}-${suffix}`;
          suffix += 1;
        }
        heading.id = id;
        used.add(id);
      }
      toc.push({ id: heading.id, text: textValue, depth: heading.tagName === "H2" ? 2 : 3 });
    });
    return { html: wrapper.innerHTML, toc };
  }

  function updateArticleToc(shell, toc) {
    shell.classList.toggle("has-article-toc", toc.length > 0);
    let aside = shell.querySelector(".article-toc-panel");
    if (!toc.length) {
      aside?.remove();
      return;
    }
    if (!aside) {
      const layout = shell.querySelector(".article-detail-layout");
      aside = document.createElement("aside");
      aside.className = "article-toc-panel";
      aside.setAttribute("aria-label", "文章目录");
      layout?.appendChild(aside);
    }
    aside.innerHTML = `
      <div class="article-toc-card">
        <p class="article-toc-kicker">目录</p>
        <nav class="article-toc-list" aria-label="文章目录">
          ${toc.map((item) => `<a class="article-toc-link depth-${item.depth}" href="#${escapeHtml(item.id)}" data-article-toc-link="${escapeHtml(item.id)}"><span>${escapeHtml(item.text)}</span></a>`).join("")}
        </nav>
      </div>
    `;
  }

  async function hydrateArticleDetail() {
    const shell = document.querySelector("[data-article-detail]");
    if (!shell) return;
    const slug = shell.dataset.articleDetail || slugFromPath();
    if (!slug) return;

    let article;
    let listPayload;
    try {
      [article, listPayload] = await Promise.all([api.get(`/api/articles/${encodeURIComponent(slug)}/`), api.get("/api/articles/")]);
    } catch {
      if (window.location.pathname === "/writings/live") {
        text(".article-header h1", "文章预览不可用", shell);
        text(".article-header > p", "请返回内容管理后台，确认文章标识和发布状态。", shell);
        const meta = shell.querySelector(".meta-grid");
        if (meta) meta.innerHTML = "<span>读取失败</span>";
      }
      return;
    }
    const { html, toc } = enhanceArticleHtml(article.html);
    shell.dataset.articleDetail = article.slug;

    document.title = `${article.title} | ${document.title.split("|").at(-1).trim()}`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", article.summary || "");

    const breadcrumbs = shell.querySelector(".breadcrumbs, [aria-label='Breadcrumb']");
    text(".article-header h1", article.title, shell);
    text(".article-header > p", article.summary, shell);
    const meta = shell.querySelector(".meta-grid");
    if (meta) {
      meta.innerHTML = `
        <time datetime="${escapeHtml(article.pubDate)}">${escapeHtml(formatDate(article.pubDate))}</time>
        ${article.updatedDate ? `<span>更新于 ${escapeHtml(formatDate(article.updatedDate))}</span>` : ""}
        ${article.category ? `<span>${escapeHtml(article.category)}</span>` : ""}
        <span>${escapeHtml(formatWordCount(article.wordCount))}</span>
        <span><span data-article-detail-views>${Number(article.views) || 0}</span> 浏览</span>
      `;
    }
    const tagRow = shell.querySelector(".article-header .tag-row");
    if (tagRow) {
      tagRow.innerHTML = (article.tags || []).map((tag) => `<a href="/writings?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join("");
    }
    const cover = shell.querySelector(".article-cover-hero img");
    if (cover) cover.src = article.cover || "/resource/default/default_image.png";
    const body = shell.querySelector(".article-html");
    if (body) body.innerHTML = html;
    updateArticleToc(shell, toc);

    const articles = listPayload.items || [];
    const index = articles.findIndex((item) => item.slug === article.slug);
    const previous = index >= 0 ? articles[index + 1] : undefined;
    const next = index > 0 ? articles[index - 1] : undefined;
    const nav = shell.querySelector(".article-nav");
    if (nav) {
      nav.innerHTML = `
        ${previous ? `<a href="/writings/${encodeURIComponent(previous.slug)}"><span>上一篇</span><strong>${escapeHtml(previous.title)}</strong></a>` : "<span></span>"}
        ${next ? `<a href="/writings/${encodeURIComponent(next.slug)}"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>` : "<span></span>"}
      `;
    }
    if (breadcrumbs) {
      const last = breadcrumbs.querySelector("li:last-child, span:last-child");
      if (last) last.textContent = article.title;
    }

    fetch(`/api/articles/${encodeURIComponent(article.slug)}/view/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        const target = shell.querySelector("[data-article-detail-views]");
        if (target && payload?.views !== undefined) target.textContent = String(payload.views);
      })
      .catch(() => {});
  }

  async function run() {
    await Promise.allSettled([hydrateHome(), hydrateWritingsIndex(), hydrateArticleDetail()]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
