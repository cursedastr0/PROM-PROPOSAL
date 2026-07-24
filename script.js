(() => {
  let noEscapes = 0;
  let btnPos = { x: 0, y: 0 };
  let lastFlee = 0;
  let fleeFrame = null;
  let responseSent = false;

  const screens = {
    question: document.getElementById("screen-question"),
    sunday: document.getElementById("screen-sunday"),
    altDates: document.getElementById("screen-alt-dates"),
    confirm: document.getElementById("screen-confirm"),
    letter: document.getElementById("screen-letter"),
    thanks: document.getElementById("screen-thanks"),
  };

  const btnYes = document.getElementById("btn-yes");
  const btnNo = document.getElementById("btn-no");
  const btnZone = document.getElementById("btn-zone");
  const noHint = document.getElementById("no-hint");

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function submitResponse(chosenDate) {
  if (responseSent) return;
  responseSent = true;
  if (!CONFIG.formspreeEndpoint) return;

  fetch(CONFIG.formspreeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      answer: "yes",
      chosenDate: chosenDate,
      timestamp: new Date().toLocaleString(),
      noButtonEscapes: noEscapes,
    }),
  }).catch(() => {});
}

  /* ── Smooth runaway "No" button ── */
  function setNoPosition(x, y) {
    const zoneW = btnZone.clientWidth;
    const zoneH = btnZone.clientHeight;
    const btnW = btnNo.offsetWidth;
    const btnH = btnNo.offsetHeight;
    const maxX = Math.max(0, zoneW - btnW);
    const maxY = Math.max(0, zoneH - btnH);

    btnPos.x = Math.max(0, Math.min(maxX, x));
    btnPos.y = Math.max(0, Math.min(maxY, y));
    btnNo.style.transform = `translate(${btnPos.x}px, ${btnPos.y}px)`;
  }

  function fleeNoButton(clientX, clientY) {
    if (fleeFrame) return;

    fleeFrame = requestAnimationFrame(() => {
      fleeFrame = null;

      const now = performance.now();
      if (now - lastFlee < 120) return;
      lastFlee = now;

      const zone = btnZone.getBoundingClientRect();
      const btnW = btnNo.offsetWidth;
      const btnH = btnNo.offsetHeight;
      const maxX = Math.max(0, zone.width - btnW);
      const maxY = Math.max(0, zone.height - btnH);

      let newX;
      let newY;

      if (clientX != null && clientY != null) {
        const btnCenterX = zone.left + btnPos.x + btnW / 2;
        const btnCenterY = zone.top + btnPos.y + btnH / 2;
        let dx = btnCenterX - clientX;
        let dy = btnCenterY - clientY;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        const push = 90 + Math.random() * 40;
        newX = btnPos.x + dx * push + (Math.random() - 0.5) * 30;
        newY = btnPos.y + dy * push + (Math.random() - 0.5) * 30;
      } else {
        newX = Math.random() * maxX;
        newY = Math.random() * maxY;
      }

      setNoPosition(newX, newY);
      btnNo.classList.add("fleeing");
      clearTimeout(btnNo._fleeTimer);
      btnNo._fleeTimer = setTimeout(() => btnNo.classList.remove("fleeing"), 500);

      noEscapes++;
      if (noEscapes >= 3 && noHint.hidden) {
        noHint.hidden = false;
      }
    });
  }

  function initNoButton() {
    const zoneW = btnZone.clientWidth;
    const zoneH = btnZone.clientHeight;
    setNoPosition(zoneW * 0.55, zoneH * 0.35);

    btnNo.addEventListener("mouseenter", (e) => fleeNoButton(e.clientX, e.clientY));
    btnNo.addEventListener("click", (e) => {
      e.preventDefault();
      fleeNoButton(e.clientX, e.clientY);
    });
    btnNo.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      fleeNoButton(touch.clientX, touch.clientY);
    }, { passive: false });

    btnZone.addEventListener("mousemove", (e) => {
      const rect = btnNo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 100) fleeNoButton(e.clientX, e.clientY);
    });
  }

  function setChosenDate(label) {
    document.getElementById("summary-day").textContent = label;
  }

  function goToConfirm(label) {
    setChosenDate(label);
    showScreen("confirm");
    submitResponse(label);
  }

  btnYes.addEventListener("click", () => {
    initSundayScreen();
    showScreen("sunday");
  });

  function initSundayScreen() {
    document.getElementById("sunday-date").textContent =
      `I'm thinking of ${CONFIG.dates.preferred}`;
    setChosenDate(CONFIG.dates.preferred);
  }

  function initAltDates() {
    const container = document.getElementById("alt-date-choices");
    container.innerHTML = "";

    CONFIG.dates.alternatives.forEach((date) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.innerHTML = `<span class="emoji">${date.emoji}</span><span>${date.label}</span>`;
      btn.addEventListener("click", () => goToConfirm(date.label));
      container.appendChild(btn);
    });
  }

  document.querySelectorAll("#sunday-choices .choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.available === "yes") {
        goToConfirm(CONFIG.dates.preferred);
      } else {
        initAltDates();
        showScreen("altDates");
      }
    });
  });

  function renderLetter() {
    document.getElementById("paper-title").textContent = CONFIG.lyricsTitle;
    document.getElementById("paper-date").textContent = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const body = document.getElementById("paper-body");
    body.innerHTML = CONFIG.lyrics
      .map((line, i) =>
        line.trim() === ""
          ? "<br>"
          : `<p style="animation-delay:${i * 0.04}s">${line}</p>`
      )
      .join("");

    document.getElementById("thanks-photo-1").src = CONFIG.thanksPhoto1;
    document.getElementById("thanks-photo-2").src = CONFIG.thanksPhoto2;
  }

  document.getElementById("btn-letter").addEventListener("click", () => {
    renderLetter();
    showScreen("letter");
  });

  document.getElementById("btn-click-here").addEventListener("click", () => {
    showScreen("thanks");
  });

  initNoButton();
})();
