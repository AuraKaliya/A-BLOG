function initSiteInteractions() {
  const header = document.querySelector(".site-header");
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navGroup = document.querySelector(".nav-group");
  const menuRoots = [...document.querySelectorAll("[data-menu-root]")];
  const menuTriggers = [...document.querySelectorAll("[data-menu-trigger]")];
  const pillarList = document.querySelector("[data-portfolio-menu] .product-pillar-list");
  const portfolioPanels = [...document.querySelectorAll("[data-portfolio-panel]")];

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

  window.addEventListener("scroll", handleScrollState, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      navGroup?.classList.remove("is-open");
      mobileToggle?.setAttribute("aria-expanded", "false");
    }
  });

  handleScrollState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteInteractions);
} else {
  initSiteInteractions();
}
