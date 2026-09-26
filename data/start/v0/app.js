(() => {
  "use strict";

  const BRAND_MODE = "wordmark"; // 改为 "image" 即可使用 assets/guild-mark-candidate.png
  const leaders = [
    { name: "awdc", role: "President", contribution: "拥有 2 个 Super。" },
    { name: "flowerwsr", role: "Vice President", contribution: "精通计算机，参与 Florr Wiki 维护及公会成员表等资料的编写与维护。" },
    { name: "CNFlyDream", role: "Vice President", contribution: "拥有 3 个 S。" },
    { name: "sschara", role: "Management", contribution: "为公会贡献 3 次 Blood Sacrifice。" }
  ];
  const members = ["Llhleo","Hugo12168","ZHZ114514","zhy10","xtxsh","imstarry_01","Taurus","X-zero","Hhh123456","LCY2024oO","jisizhe","fly-cy","MeteorFall","91love78","Fawudazheng","ILXN","citizens","dianlao","HaiFei_114514","grassland","bookshelf"];

  const root = document.documentElement;
  const shell = document.querySelector(".story-shell");
  const viewport = document.querySelector(".story-viewport");
  const track = document.querySelector(".story-track");
  const progress = document.querySelector(".progress i");
  const counter = document.querySelector(".chapter-count b");
  const panels = [...document.querySelectorAll(".panel")];
  const leaderList = document.querySelector("#leader-list");
  const memberCloud = document.querySelector("#member-cloud");
  const mobileQuery = matchMedia("(max-width: 760px)");
  let maxTravel = 0;
  let raf = 0;
  let unlocked = false;
  let started = false;

  root.dataset.brand = BRAND_MODE;
  leaderList.innerHTML = leaders.map((leader, index) => `
    <article class="leader-card">
      <span class="number">${String(index + 1).padStart(2, "0")}</span>
      <div><span class="role">${leader.role}</span><h3>${leader.name}</h3><p>${leader.contribution}</p></div>
    </article>`).join("");
  memberCloud.innerHTML = members.map(name => `<span>${name}</span>`).join("");

  const prevent = event => {
    if (!unlocked) event.preventDefault();
  };
  const preventKey = event => {
    if (!unlocked && ["ArrowDown","ArrowUp","PageDown","PageUp"," ","Home","End"].includes(event.key)) event.preventDefault();
  };
  addEventListener("wheel", prevent, { passive: false });
  addEventListener("touchmove", prevent, { passive: false });
  addEventListener("keydown", preventKey, { passive: false });

  function unlockIntro() {
    if (unlocked) return;
    unlocked = true;
    root.classList.remove("is-intro-locked");
    updateGeometry();
  }

  function startIntro() {
    if (started) return;
    started = true;
    root.classList.add("intro-ready");
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 2500;
    setTimeout(unlockIntro, delay);
  }

  function updateGeometry() {
    if (mobileQuery.matches) {
      shell.style.height = "auto";
      maxTravel = 0;
      return;
    }
    maxTravel = Math.max(0, track.scrollWidth - viewport.clientWidth);
    shell.style.height = `${maxTravel + innerHeight}px`;
    update();
  }

  function update() {
    raf = 0;
    if (mobileQuery.matches) {
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progress.style.transform = `scaleX(${scrollY / scrollMax})`;
      return;
    }
    const y = Math.min(maxTravel, Math.max(0, scrollY));
    track.style.transform = `translate3d(${-y}px,0,0)`;
    progress.style.transform = `scaleX(${maxTravel ? y / maxTravel : 0})`;
    const center = y + innerWidth * .5;
    let activeIndex = 0;
    let cursor = 0;
    panels.forEach((panel, index) => {
      if (center >= cursor) activeIndex = index;
      cursor += panel.getBoundingClientRect().width;
    });
    counter.textContent = String(Math.min(activeIndex + 1, 10)).padStart(2, "0");
  }

  function requestUpdate() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  function goToElement(element) {
    if (!element) return;
    if (mobileQuery.matches) {
      element.scrollIntoView({ behavior: "smooth" });
      return;
    }
    let x = 0;
    for (const child of track.children) {
      if (child === element) break;
      x += child.getBoundingClientRect().width;
    }
    scrollTo({ top: Math.min(x, maxTravel), behavior: "smooth" });
  }

  document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => goToElement(document.getElementById(button.dataset.section)));
  });
  document.querySelectorAll("[data-go='0']").forEach(button => {
    button.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  });

  addEventListener("scroll", requestUpdate, { passive: true });
  addEventListener("resize", updateGeometry, { passive: true });
  mobileQuery.addEventListener?.("change", updateGeometry);
  addEventListener("load", startIntro, { once: true });
  setTimeout(startIntro, 350);
  setTimeout(unlockIntro, 4200); // 资源异常时的保险解锁
  updateGeometry();
})();
