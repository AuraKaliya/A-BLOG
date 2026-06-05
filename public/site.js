function initSiteInteractions() {
  const header = document.querySelector(".site-header");
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navGroup = document.querySelector(".nav-group");
  const menuRoots = [...document.querySelectorAll("[data-menu-root]")];
  const menuTriggers = [...document.querySelectorAll("[data-menu-trigger]")];
  const pillarList = document.querySelector("[data-portfolio-menu] .product-pillar-list");
  const portfolioPanels = [...document.querySelectorAll("[data-portfolio-panel]")];
  const randomEntryButtons = [...document.querySelectorAll("[data-random-entry]")];
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const worldFilterRoot = document.querySelector("[data-world-filter-root]");
  const noteFilterRoot = document.querySelector("[data-note-filter-root]");
  const linkFilterRoot = document.querySelector("[data-link-filter-root]");
  const archiveFilterRoot = document.querySelector("[data-archive-filter-root]");
  const contentMapRoot = document.querySelector("[data-content-map-root]");
  let exploreEntriesPromise;

  function closeAllMenus() {
    menuRoots.forEach((root) => {
      root.classList.remove("is-open");
      const trigger = root.querySelector(".nav-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });

    header?.classList.remove("menu-open");
  }

  function openMenu(targetName) {
    let didOpen = false;

    menuRoots.forEach((root) => {
      const trigger = root.querySelector(".nav-trigger");
      const shouldOpen = trigger?.dataset.menuTrigger === targetName;

      root.classList.toggle("is-open", Boolean(shouldOpen));
      if (trigger) trigger.setAttribute("aria-expanded", String(Boolean(shouldOpen)));
      if (shouldOpen) didOpen = true;
    });

    header?.classList.toggle("menu-open", didOpen);
  }

  function toggleMenu(targetName) {
    const targetTrigger = document.querySelector(`[data-menu-trigger="${targetName}"]`);
    const isOpen = targetTrigger?.getAttribute("aria-expanded") === "true";

    if (isOpen) closeAllMenus();
    else openMenu(targetName);
  }

  function showPortfolioPanel(activeId) {
    portfolioPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.hidden = panel.dataset.portfolioPanel !== activeId;
    });
  }

  function handleScrollState() {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  async function openRandomEntry(button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "正在寻找入口…";

    try {
      exploreEntriesPromise ??= fetch("/explore.json").then((response) => {
        if (!response.ok) throw new Error("Explore index unavailable");
        return response.json();
      });
      const entries = await exploreEntriesPromise;
      if (!Array.isArray(entries) || entries.length === 0) throw new Error("Explore index is empty");
      const entry = entries[Math.floor(Math.random() * entries.length)];
      window.location.assign(entry.href);
    } catch {
      button.disabled = false;
      button.textContent = "暂时找不到入口";
      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1800);
    }
  }

  function syncThemeToggle() {
    const isLight = document.documentElement.dataset.theme === "light";
    themeToggle?.setAttribute("aria-pressed", String(isLight));
    themeToggle?.setAttribute("aria-label", isLight ? "切换到暗色主题" : "切换到明亮主题");
  }

  function initWorldFilters() {
    if (!worldFilterRoot) return;

    const buttons = [...worldFilterRoot.querySelectorAll("[data-world-filter]")];
    const sections = [...worldFilterRoot.querySelectorAll("[data-world-kind-section]")];
    const summary = worldFilterRoot.querySelector("[data-world-filter-summary]");
    const totalCount = worldFilterRoot.querySelectorAll(".world-card").length;

    function applyWorldFilter(kind, syncUrl = true) {
      const activeKind = sections.some((section) => section.dataset.worldKindSection === kind) ? kind : "all";
      let visibleCount = 0;

      buttons.forEach((button) => {
        const isActive = button.dataset.worldFilter === activeKind;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      sections.forEach((section) => {
        const isVisible = activeKind === "all" || section.dataset.worldKindSection === activeKind;
        section.hidden = !isVisible;
        if (isVisible) visibleCount += section.querySelectorAll(".world-card").length;
      });

      if (summary) {
        summary.textContent = activeKind === "all"
          ? `正在显示全部 ${totalCount} 份档案`
          : `当前筛选显示 ${visibleCount} 份档案`;
      }

      if (syncUrl) {
        const url = new URL(window.location.href);
        if (activeKind === "all") url.searchParams.delete("kind");
        else url.searchParams.set("kind", activeKind);
        window.history.replaceState({}, "", url);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyWorldFilter(button.dataset.worldFilter ?? "all"));
    });

    applyWorldFilter(new URLSearchParams(window.location.search).get("kind") ?? "all", false);
  }

  function initNoteFilters() {
    if (!noteFilterRoot) return;

    const buttons = [...noteFilterRoot.querySelectorAll("[data-note-filter]")];
    const cards = [...noteFilterRoot.querySelectorAll("[data-note-kind]")];
    const summary = noteFilterRoot.querySelector("[data-note-filter-summary]");

    function applyNoteFilter(kind, syncUrl = true) {
      const activeKind = cards.some((card) => card.dataset.noteKind === kind) ? kind : "all";
      let visibleCount = 0;

      buttons.forEach((button) => {
        const isActive = button.dataset.noteFilter === activeKind;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      cards.forEach((card) => {
        const isVisible = activeKind === "all" || card.dataset.noteKind === activeKind;
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (summary) summary.textContent = activeKind === "all"
        ? `正在显示全部 ${cards.length} 条动态`
        : `当前筛选显示 ${visibleCount} 条动态`;

      if (syncUrl) {
        const url = new URL(window.location.href);
        if (activeKind === "all") url.searchParams.delete("kind");
        else url.searchParams.set("kind", activeKind);
        window.history.replaceState({}, "", url);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyNoteFilter(button.dataset.noteFilter ?? "all"));
    });

    applyNoteFilter(new URLSearchParams(window.location.search).get("kind") ?? "all", false);
  }

  function initArchiveFilters() {
    if (!archiveFilterRoot) return;

    const buttons = [...archiveFilterRoot.querySelectorAll("[data-archive-filter]")];
    const items = [...archiveFilterRoot.querySelectorAll("[data-archive-kind]")];
    const yearSections = [...archiveFilterRoot.querySelectorAll("[data-archive-year-section]")];
    const summary = archiveFilterRoot.querySelector("[data-archive-filter-summary]");

    function applyArchiveFilter(kind, syncUrl = true) {
      const activeKind = items.some((item) => item.dataset.archiveKind === kind) ? kind : "all";
      let visibleCount = 0;

      buttons.forEach((button) => {
        const isActive = button.dataset.archiveFilter === activeKind;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      items.forEach((item) => {
        const isVisible = activeKind === "all" || item.dataset.archiveKind === activeKind;
        item.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      yearSections.forEach((section) => {
        section.hidden = !section.querySelector("[data-archive-kind]:not([hidden])");
      });

      if (summary) summary.textContent = activeKind === "all"
        ? `正在显示全部 ${items.length} 条公开内容`
        : `当前筛选显示 ${visibleCount} 条公开内容`;

      if (syncUrl) {
        const url = new URL(window.location.href);
        if (activeKind === "all") url.searchParams.delete("type");
        else url.searchParams.set("type", activeKind);
        window.history.replaceState({}, "", url);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyArchiveFilter(button.dataset.archiveFilter ?? "all"));
    });

    applyArchiveFilter(new URLSearchParams(window.location.search).get("type") ?? "all", false);
  }

  function initLinkFilters() {
    if (!linkFilterRoot) return;

    const buttons = [...linkFilterRoot.querySelectorAll("[data-link-filter]")];
    const cards = [...linkFilterRoot.querySelectorAll("[data-link-kind]")];
    const summary = linkFilterRoot.querySelector("[data-link-filter-summary]");

    function applyLinkFilter(kind, syncUrl = true) {
      const activeKind = cards.some((card) => card.dataset.linkKind === kind) ? kind : "all";
      let visibleCount = 0;

      buttons.forEach((button) => {
        const isActive = button.dataset.linkFilter === activeKind;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      cards.forEach((card) => {
        const isVisible = activeKind === "all" || card.dataset.linkKind === activeKind;
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (summary) summary.textContent = activeKind === "all"
        ? `正在显示全部 ${cards.length} 个站外入口`
        : `当前筛选显示 ${visibleCount} 个站外入口`;

      if (syncUrl) {
        const url = new URL(window.location.href);
        if (activeKind === "all") url.searchParams.delete("kind");
        else url.searchParams.set("kind", activeKind);
        window.history.replaceState({}, "", url);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyLinkFilter(button.dataset.linkFilter ?? "all"));
    });

    applyLinkFilter(new URLSearchParams(window.location.search).get("kind") ?? "all", false);
  }

  function initContentMap() {
    if (!contentMapRoot) return;

    const buttons = [...contentMapRoot.querySelectorAll("[data-graph-filter]")];
    const nodes = [...contentMapRoot.querySelectorAll("[data-graph-node]")];
    const edges = [...contentMapRoot.querySelectorAll("[data-graph-edge]")];
    const summary = contentMapRoot.querySelector("[data-content-map-summary]");

    function clearGraphHighlight() {
      nodes.forEach((node) => node.classList.remove("is-related", "is-dimmed"));
      edges.forEach((edge) => edge.classList.remove("is-active", "is-dimmed"));
    }

    function highlightGraphNode(nodeId) {
      const relatedIds = new Set([nodeId]);
      edges.forEach((edge) => {
        const isConnected = edge.dataset.source === nodeId || edge.dataset.target === nodeId;
        edge.classList.toggle("is-active", isConnected);
        edge.classList.toggle("is-dimmed", !isConnected);
        if (isConnected) {
          relatedIds.add(edge.dataset.source);
          relatedIds.add(edge.dataset.target);
        }
      });
      nodes.forEach((node) => {
        const isRelated = relatedIds.has(node.dataset.graphNodeId);
        node.classList.toggle("is-related", isRelated);
        node.classList.toggle("is-dimmed", !isRelated);
      });
    }

    function applyGraphFilter(kind, syncUrl = true) {
      const activeKind = nodes.some((node) => node.dataset.graphNodeKind === kind) ? kind : "all";
      const visibleNodeIds = new Set();

      clearGraphHighlight();
      buttons.forEach((button) => {
        const isActive = button.dataset.graphFilter === activeKind;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      nodes.forEach((node) => {
        const nodeKind = node.dataset.graphNodeKind;
        const isVisible = activeKind === "all" || nodeKind === activeKind || (activeKind !== "topic" && nodeKind === "topic");
        node.toggleAttribute("hidden", !isVisible);
        if (isVisible) visibleNodeIds.add(node.dataset.graphNodeId);
      });

      let visibleEdges = 0;
      edges.forEach((edge) => {
        const isVisible = visibleNodeIds.has(edge.dataset.source) && visibleNodeIds.has(edge.dataset.target);
        edge.toggleAttribute("hidden", !isVisible);
        if (isVisible) visibleEdges += 1;
      });

      if (summary) summary.textContent = `当前显示 ${visibleNodeIds.size} 个节点 / ${visibleEdges} 条关系`;

      if (syncUrl) {
        const url = new URL(window.location.href);
        if (activeKind === "all") url.searchParams.delete("type");
        else url.searchParams.set("type", activeKind);
        window.history.replaceState({}, "", url);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyGraphFilter(button.dataset.graphFilter ?? "all"));
    });
    nodes.forEach((node) => {
      const nodeId = node.dataset.graphNodeId;
      node.addEventListener("mouseenter", () => highlightGraphNode(nodeId));
      node.addEventListener("mouseleave", clearGraphHighlight);
      node.addEventListener("focus", () => highlightGraphNode(nodeId));
      node.addEventListener("blur", clearGraphHighlight);
    });

    applyGraphFilter(new URLSearchParams(window.location.search).get("type") ?? "all", false);
  }

  menuTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const { menuTrigger } = trigger.dataset;
      if (!menuTrigger) return;
      if (window.innerWidth >= 1024 && trigger.getAttribute("aria-expanded") === "true") return;
      toggleMenu(menuTrigger);
    });

    trigger.addEventListener("mouseenter", () => {
      if (window.innerWidth < 1024) return;
      const { menuTrigger } = trigger.dataset;
      if (!menuTrigger) return;
      openMenu(menuTrigger);
    });
  });

  menuRoots.forEach((root) => {
    root.addEventListener("mouseenter", () => {
      if (window.innerWidth < 1024) return;
      const trigger = root.querySelector(".nav-trigger");
      const targetName = trigger?.dataset.menuTrigger;
      if (!targetName) return;
      openMenu(targetName);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (!target.closest("[data-menu-root]") && !target.closest(".nav-group")) {
      closeAllMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMenus();
      navGroup?.classList.remove("is-open");
      mobileToggle?.setAttribute("aria-expanded", "false");
    }
  });

  pillarList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest(".pillar-tab");
    if (!(button instanceof HTMLButtonElement)) return;

    const nextGroupId = button.dataset.groupId;
    if (!nextGroupId) return;

    pillarList.querySelectorAll(".pillar-tab").forEach((tab) => {
      const isActive = tab instanceof HTMLElement && tab.dataset.groupId === nextGroupId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    showPortfolioPanel(nextGroupId);
  });

  mobileToggle?.addEventListener("click", () => {
    const isOpen = mobileToggle.getAttribute("aria-expanded") === "true";
    mobileToggle.setAttribute("aria-expanded", String(!isOpen));
    navGroup?.classList.toggle("is-open", !isOpen);
    if (isOpen) closeAllMenus();
  });

  randomEntryButtons.forEach((button) => {
    button.addEventListener("click", () => openRandomEntry(button));
  });

  themeToggle?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem("a-blog-theme", nextTheme);
    } catch {}
    syncThemeToggle();
  });

  window.addEventListener("scroll", handleScrollState, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      navGroup?.classList.remove("is-open");
      mobileToggle?.setAttribute("aria-expanded", "false");
    }
  });

  handleScrollState();
  syncThemeToggle();
  initWorldFilters();
  initNoteFilters();
  initLinkFilters();
  initArchiveFilters();
  initContentMap();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteInteractions);
} else {
  initSiteInteractions();
}
