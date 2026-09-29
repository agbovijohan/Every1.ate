/* =========================================================
   EVERY1.ATE — SCRIPT
   Une seule logique par fonction :
   1. Horloge Paris
   2. Scroll : animation Hero mobile + indicateur de défilement
   3. Apparitions au scroll + surlignage
   4. Visages de la brigade (pupilles, clignements, bouche)
   5. Formulaire "Parlons projet" (+ validation instantanée)
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

  /* Indicateur de défilement (barre fine en haut) */
  var progress = document.querySelector(".scroll-progress");

  function renderProgress() {
    if (!progress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? clamp(window.scrollY / max) : 0;
    progress.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
  }

  /* Une seule boucle de scroll pour tout (1 calcul par image) */
  function frame() {
    ticking = false;
    render();
    renderProgress();
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(frame);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", renderProgress);
  renderProgress();

  if (hero) {
    measure();

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
     3. APPARITIONS AU SCROLL — une seule fois, 300 ms
     ======================================================= */

  var reveals = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window && !mqReduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Surlignage : déclenché quand le paragraphe arrive au milieu de l'écran */
  var marks = document.querySelectorAll("[data-mark]");

  if ("IntersectionObserver" in window && !mqReduce.matches) {
    var ioMark = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          ioMark.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -30% 0px" });

    marks.forEach(function (el) { ioMark.observe(el); });
  } else {
    marks.forEach(function (el) { el.classList.add("is-in"); });
  }


  /* =======================================================
     4. VISAGES DE LA BRIGADE
     -------------------------------------------------------
     Souris  : les pupilles suivent le curseur ; au survol, le
               visage cligne des yeux et "parle".
     Tactile : clignement + bouche à l'arrivée à l'écran,
               puis regards et clignements de temps en temps.
     Tout est coupé si "animations réduites" est activé.
     ======================================================= */

  var faces = Array.prototype.slice.call(document.querySelectorAll(".face"));
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function replay(face, cls, ms) {
    face.classList.remove(cls);
    void face.offsetWidth; // relance l'animation
    face.classList.add(cls);
    setTimeout(function () { face.classList.remove(cls); }, ms);
  }

  function blink(face) { replay(face, "is-blinking", 260); }
  function talk(face) { replay(face, "is-talking", 580); }

  function look(face, x, y) {
    face.querySelectorAll(".eye").forEach(function (eye) {
      eye.style.setProperty("--px", x.toFixed(2) + "px");
      eye.style.setProperty("--py", y.toFixed(2) + "px");
    });
  }

  if (faces.length && !mqReduce.matches) {

    var visible = new Set();

    if ("IntersectionObserver" in window) {
      var ioFace = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!visible.has(entry.target) && !canHover) {
              // tactile : petit "bonjour" à l'arrivée
              blink(entry.target);
              talk(entry.target);
            }
            visible.add(entry.target);
          } else {
            visible.delete(entry.target);
          }
        });
      }, { threshold: 0.5 });

      faces.forEach(function (face) { ioFace.observe(face); });
    } else {
      faces.forEach(function (face) { visible.add(face); });
    }

    // Clignements naturels, à intervalles irréguliers
    faces.forEach(function (face, i) {
      (function loop() {
        setTimeout(function () {
          if (visible.has(face) && !document.hidden) blink(face);
          loop();
        }, 2600 + Math.random() * 3400 + i * 400);
      })();
    });

    if (canHover) {
      // Survol : clignement + bouche
      faces.forEach(function (face) {
        face.parentNode.addEventListener("mouseenter", function () {
          blink(face);
          talk(face);
        });
      });

      // Pupilles qui suivent le curseur (1 calcul par image)
      var pointer = null;
      var lookTicking = false;

      var followPointer = function () {
        lookTicking = false;
        visible.forEach(function (face) {
          face.querySelectorAll(".eye").forEach(function (eye) {
            var r = eye.getBoundingClientRect();
            var max = r.width * 0.16;
            var x = 0, y = 0;
            if (pointer) {
              var dx = pointer.x - (r.left + r.width / 2);
              var dy = pointer.y - (r.top + r.height / 2);
              var dist = Math.sqrt(dx * dx + dy * dy) || 1;
              var k = Math.min(1, dist / 220);
              x = dx / dist * max * k;
              y = dy / dist * max * k * 0.6;
            }
            eye.style.setProperty("--px", x.toFixed(2) + "px");
            eye.style.setProperty("--py", y.toFixed(2) + "px");
          });
        });
      };

      var requestLook = function () {
        if (!lookTicking) {
          lookTicking = true;
          window.requestAnimationFrame(followPointer);
        }
      };

      document.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        pointer = { x: e.clientX, y: e.clientY };
        requestLook();
      }, { passive: true });

      document.documentElement.addEventListener("mouseleave", function () {
        pointer = null;
        requestLook();
      });
    } else {
      // Tactile : regards furtifs de temps en temps
      faces.forEach(function (face) {
        (function wander() {
          setTimeout(function () {
            if (visible.has(face)) {
              var w = face.querySelector(".eye").getBoundingClientRect().width * 0.16;
              look(face, (Math.random() * 2 - 1) * w, (Math.random() * 2 - 1) * w * 0.5);
              setTimeout(function () { look(face, 0, 0); }, 1100);
            }
            wander();
          }, 3500 + Math.random() * 4000);
        })();
      });
    }
  }


  /* =======================================================
     5. FORMULAIRE "PARLONS PROJET"
     ======================================================= */

  var overlay = document.getElementById("e1-project-overlay");
  var panel = document.getElementById("e1-project-panel");
  var form = document.getElementById("e1-project-form");
  var submit = document.getElementById("e1-submit");
  var servicesError = document.getElementById("e1-services-error");
  var formError = document.getElementById("e1-form-error");
  var submitLabel = submit && submit.querySelector(".e1-submit-label");
  var lastTrigger = null;

  if (!overlay || !form) return;

  function setSubmit(label, loading) {
    submit.classList.toggle("is-loading", !!loading);
    submit.disabled = !!loading;
    if (submitLabel) submitLabel.textContent = label;
  }

  /* --- Validation instantanée --- */
  form.noValidate = true; // on remplace les bulles natives par notre retour visuel

  var fields = form.querySelectorAll("[data-error]");

  fields.forEach(function (input) {
    var box = input.closest(".e1-field");
    var msg = document.createElement("span");
    msg.className = "e1-field-error";
    msg.setAttribute("aria-live", "polite");
    box.appendChild(msg);

    input.addEventListener("blur", function () {
      input.dataset.touched = "1";
      check(input);
    });
    input.addEventListener("input", function () { check(input); });
    input.addEventListener("change", function () {
      input.dataset.touched = "1";
      check(input);
    });
  });

  function check(input) {
    var box = input.closest(".e1-field");
    var ok = input.checkValidity();
    var touched = input.dataset.touched === "1";
    box.classList.toggle("is-valid", ok);
    box.classList.toggle("is-invalid", !ok && touched);
    box.querySelector(".e1-field-error").textContent = !ok && touched ? input.dataset.error : "";
    input.setAttribute("aria-invalid", !ok && touched ? "true" : "false");
    return ok;
  }

  function resetValidation() {
    fields.forEach(function (input) {
      delete input.dataset.touched;
      var box = input.closest(".e1-field");
      box.classList.remove("is-valid", "is-invalid");
      box.querySelector(".e1-field-error").textContent = "";
    });
  }

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
      resetValidation();
      setSubmit("Envoyer", false);
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

    var firstInvalid = null;
    fields.forEach(function (input) {
      input.dataset.touched = "1";
      if (!check(input) && !firstInvalid) firstInvalid = input;
    });

    var hasService = !!form.querySelector('input[name="services"]:checked');
    servicesError.classList.toggle("is-visible", !hasService);

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    if (!hasService) return;

    formError.classList.remove("is-visible");
    setSubmit("Envoi", true);

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Formspree error");
        setSubmit("Envoyé", true);
        submit.classList.remove("is-loading");
        setTimeout(function () {
          panel.classList.add("is-success");
        }, 180);
      })
      .catch(function () {
        setSubmit("Réessayer", false);
        formError.classList.add("is-visible");
      });
  });

})();
