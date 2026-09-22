/* =========================================================
   EVERY1.ATE — SCRIPT
   Une seule logique par fonction :
   1. Horloge Paris
   2. Animation Hero mobile
   3. Formulaire "Parlons projet"
   ========================================================= */

(function () {
  "use strict";


  /* =======================================================
     1. HORLOGE PARIS — met à jour tous les [data-paris-clock]
     ======================================================= */

  var clocks = document.querySelectorAll("[data-paris-clock]");

  function updateClocks() {
    var time = new Date().toLocaleTimeString("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    for (var i = 0; i < clocks.length; i++) {
      clocks[i].textContent = "PARIS, FR  " + time;
    }
  }

  updateClocks();
  setInterval(updateClocks, 1000);


  /* =======================================================
     2. HERO MOBILE — animation liée au scroll
     -------------------------------------------------------
     La scène est en position: sticky (CSS). On lit simplement
     la progression du scroll dans le hero (0 → 1) et on
     applique des transformations. Rien n'est déplacé dans
     le DOM, rien ne bloque le scroll.

       0.00 → 0.35  barre noire descend, icône se réduit
                    et se place au centre de la barre,
                    logo typo disparaît
       0.30 → 0.60  statement apparaît
       0.40 → 0.70  CTA apparaît
       0.82 → 1.00  barre (et icône) remontent et disparaissent
     ======================================================= */

  var hero = document.getElementById("hero");
  var stage = hero && hero.querySelector(".hero-stage");
  var video = hero && hero.querySelector(".hero-video");
  var icon = hero && hero.querySelector(".m-icon");
  var typo = hero && hero.querySelector(".m-typo");
  var bar = hero && hero.querySelector(".m-bar");
  var topBar = hero && hero.querySelector(".hero-top");
  var statement = hero && hero.querySelector(".hero-statement");
  var cta = hero && hero.querySelector(".hero-cta");

  var mqMobile = window.matchMedia("(max-width: 480px)");
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  var ICON_IN_BAR = 30; // hauteur de l'icône dans la barre (px)
  var m = null;         // mesures
  var ticking = false;

  function clamp(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function range(p, start, end) {
    return clamp((p - start) / (end - start));
  }

  function ease(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function animationActive() {
    return hero && mqMobile.matches && !mqReduce.matches;
  }

  function clearInline() {
    [icon, typo, bar, topBar, statement, cta].forEach(function (el) {
      if (el) {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.pointerEvents = "";
      }
    });
  }

  function measure() {
    if (!animationActive()) {
      m = null;
      clearInline();
      return;
    }

    var stageH = stage.clientHeight;
    var iconH = icon.offsetHeight || 1;
    var barH = bar.offsetHeight;
    var scale = ICON_IN_BAR / iconH;

    m = {
      stageH: stageH,
      barH: barH,
      distance: hero.offsetHeight - stageH,
      startY: typo.offsetTop - iconH - 24,
      endY: (barH - ICON_IN_BAR) / 2,
      endScale: scale
    };

    render();
  }

  function render() {
    ticking = false;
    if (!m) return;

    var p = m.distance > 0 ? clamp(-hero.getBoundingClientRect().top / m.distance) : 0;

    var a = ease(range(p, 0, 0.35));     // barre + icône
    var b = ease(range(p, 0.30, 0.60));  // statement
    var c = ease(range(p, 0.40, 0.70));  // CTA
    var d = ease(range(p, 0.82, 1));     // sortie de la barre

    var barOffset = (a - 1 - d) * m.barH;

    bar.style.transform = "translateY(" + barOffset.toFixed(2) + "px)";

    icon.style.transform =
      "translate(-50%, " + (lerp(m.startY, m.endY, a) - d * m.barH).toFixed(2) + "px) " +
      "scale(" + lerp(1, m.endScale, a).toFixed(4) + ")";

    typo.style.opacity = (1 - clamp(a * 1.6)).toFixed(3);
    typo.style.transform = "translate(-50%, " + (-a * 20).toFixed(2) + "px)";

    topBar.style.opacity = (1 - clamp(a * 2)).toFixed(3);

    statement.style.opacity = b.toFixed(3);
    statement.style.transform = "translateY(" + ((1 - b) * 18).toFixed(2) + "px)";

    cta.style.opacity = c.toFixed(3);
    cta.style.transform = "translateY(" + ((1 - c) * 18).toFixed(2) + "px)";
    cta.style.pointerEvents = c > 0.5 ? "auto" : "none";
  }

  function onScroll() {
    if (m && !ticking) {
      ticking = true;
      window.requestAnimationFrame(render);
    }
  }

  if (hero) {
    measure();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);

    [mqMobile, mqReduce].forEach(function (mq) {
      if (mq.addEventListener) mq.addEventListener("change", measure);
      else if (mq.addListener) mq.addListener(measure);
    });

    if (icon && !icon.complete) icon.addEventListener("load", measure);
  }

  // Lecture auto de la vidéo (sécurité iOS / économie d'énergie)
  if (video) {
    video.muted = true;
    var play = video.play();
    if (play && typeof play.catch === "function") play.catch(function () {});
  }


  /* =======================================================
     3. FORMULAIRE "PARLONS PROJET"
     ======================================================= */

  var overlay = document.getElementById("e1-project-overlay");
  var panel = document.getElementById("e1-project-panel");
  var form = document.getElementById("e1-project-form");
  var submit = document.getElementById("e1-submit");
  var servicesError = document.getElementById("e1-services-error");
  var formError = document.getElementById("e1-form-error");
  var lastTrigger = null;

  if (!overlay || !form) return;

  function openForm(event) {
    if (event) event.preventDefault();
    lastTrigger = document.activeElement;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("e1-form-open");
    // Focus auto seulement sur desktop (sur mobile, il ouvrirait le clavier)
    if (!mqMobile.matches) {
      setTimeout(function () {
        var first = document.getElementById("e1-name");
        if (first) first.focus({ preventScroll: true });
      }, 450);
    }
  }

  function closeForm() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("e1-form-open");
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });

    setTimeout(function () {
      panel.classList.remove("is-success");
      form.reset();
      servicesError.classList.remove("is-visible");
      formError.classList.remove("is-visible");
      submit.disabled = false;
      submit.textContent = "ENVOYER ↗";
    }, 450);
  }

  document.querySelectorAll("[data-open-form]").forEach(function (el) {
    el.addEventListener("click", openForm);
  });

  ["e1-form-close", "e1-success-close"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", closeForm);
  });

  var backdrop = overlay.querySelector(".e1-project-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeForm);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeForm();
  });

  form.querySelectorAll('input[name="services"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (form.querySelector('input[name="services"]:checked')) {
        servicesError.classList.remove("is-visible");
      }
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!form.querySelector('input[name="services"]:checked')) {
      servicesError.classList.add("is-visible");
      return;
    }

    servicesError.classList.remove("is-visible");
    formError.classList.remove("is-visible");
    submit.disabled = true;
    submit.textContent = "ENVOI...";

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Formspree error");
        submit.textContent = "ENVOYÉ";
        setTimeout(function () {
          panel.classList.add("is-success");
        }, 180);
      })
      .catch(function () {
        submit.disabled = false;
        submit.textContent = "RÉESSAYER ↗";
        formError.classList.add("is-visible");
      });
  });

})();
