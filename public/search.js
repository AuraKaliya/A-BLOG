function initSearch() {
  const root = document.querySelector("[data-search-root]");
  if (!root) return;

  const input = root.querySelector("[data-search-input]");
  const summary = root.querySelector("[data-search-summary]");
  const results = root.querySelector("[data-search-results]");
  const filterButtons = [...root.querySelectorAll("[data-search-filter]")];
  if (!(input instanceof HTMLInputElement) || !summary || !results) return;

  let entries = [];
  let activeKind = "all";

  function normalize(value) {
    return value.trim().toLowerCase();
  }

  function highlightText(text, tokens) {
    const fragment = document.createDocumentFragment();
    if (tokens.length === 0) {
      fragment.append(text);
      return fragment;
    }

    const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    text.split(pattern).filter(Boolean).forEach((part) => {
      if (tokens.some((token) => part.toLowerCase() === token)) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        fragment.appendChild(mark);
      } else {
        fragment.append(part);
      }
    });

    return fragment;
  }

  function syncUrl(query) {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");

    if (activeKind !== "all") url.searchParams.set("type", activeKind);
    else url.searchParams.delete("type");

    window.history.replaceState({}, "", url);
  }

  function scoreEntry(entry, tokens) {
    const title = normalize(entry.title);
    const description = normalize(entry.description);
    const tags = normalize((entry.tags ?? []).join(" "));
    const base = Number(entry.weight ?? 0);

    return tokens.reduce((score, token) => {
      if (title.includes(token)) score += 8;
      if (tags.includes(token)) score += 5;
      if (description.includes(token)) score += 3;
      if (entry.text.includes(token)) score += 1;
      return score;
    }, base);
  }

  function render(items, query) {
    const tokens = query.split(/\s+/).filter(Boolean);
    results.replaceChildren();

    if (!query) {
      summary.textContent = "输入关键词开始搜索。";
      return;
    }

    summary.textContent = items.length > 0 ? `找到 ${items.length} 条结果。` : "没有匹配结果。";

    items.slice(0, 12).forEach((item) => {
      const article = document.createElement("article");
      article.className = "archive-item search-result";

      const content = document.createElement("div");
      const meta = document.createElement("div");
      meta.className = "meta-grid";

      [item.type, item.category, ...(item.tags ?? []).slice(0, 2)].forEach((label) => {
        const span = document.createElement("span");
        span.appendChild(highlightText(label, tokens));
        meta.appendChild(span);
      });

      const title = document.createElement("h2");
      const link = document.createElement("a");
      link.href = item.href;
      link.appendChild(highlightText(item.title, tokens));
      title.appendChild(link);

      const description = document.createElement("p");
      description.appendChild(highlightText(item.description, tokens));

      content.append(meta, title, description);
      article.appendChild(content);
      results.appendChild(article);
    });
  }

  function runSearch() {
    const query = normalize(input.value);
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = tokens.length === 0
      ? []
      : entries
          .filter((entry) => activeKind === "all" || entry.kind === activeKind)
          .filter((entry) => tokens.every((token) => entry.text.includes(token)))
          .map((entry) => ({ ...entry, score: scoreEntry(entry, tokens) }))
          .sort((a, b) => b.score - a.score);

    syncUrl(query);
    render(matches, query);
  }

  fetch("/search.json")
    .then((response) => response.json())
    .then((data) => {
      entries = data;
      const params = new URLSearchParams(window.location.search);
      const query = params.get("q") ?? "";
      const type = params.get("type") ?? "all";

      input.value = query;
      if (["all", "blog", "work", "world", "note", "link", "changelog", "topic"].includes(type)) activeKind = type;

      filterButtons.forEach((button) => {
        const isActive = button.dataset.searchFilter === activeKind;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
          activeKind = button.dataset.searchFilter ?? "all";
          filterButtons.forEach((item) => {
            const isActive = item === button;
            item.classList.toggle("active", isActive);
            item.setAttribute("aria-pressed", String(isActive));
          });
          runSearch();
        });
      });

      input.addEventListener("input", runSearch);
      runSearch();
    })
    .catch(() => {
      summary.textContent = "搜索索引加载失败。";
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearch);
} else {
  initSearch();
}
