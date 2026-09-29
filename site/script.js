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

    // Easter egg : entre minuit et 6 h (heure de Paris), service de nuit
    var open = document.getElementById("hero-open");
    if (open) {
      var night = parseInt(time.slice(0, 2), 10) < 6;
      var label = night ? "Service de nuit." : "La cuisine est ouverte.";
      if (open.textContent !== label) open.textContent = label;
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
    typo.style.pointerEvents = a > 0.4 ? "none" : "";
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

  /* =======================================================
     CTA : fixe dans le hero, puis se détache et flotte
     -------------------------------------------------------
     Dès que la page recouvre le bouton du hero, une copie
     "flottante" part de sa position exacte et glisse vers le
     coin de l'écran (et fait le chemin inverse en remontant).
     Elle s'efface quand le footer arrive ou quand le
     formulaire est ouvert.
     ======================================================= */

  var floatCta = document.querySelector(".float-cta");
  var heroCta = hero && hero.querySelector(".hero-cta");
  var footerEl = document.getElementById("footer");
  var ctaState = "hero"; // "hero" | "float" | "hidden"

  function morph(fromRect, reverse, done) {
    var to = floatCta.getBoundingClientRect();
    var dx = fromRect.left - to.left;
    var dy = fromRect.top - to.top;
    var sc = fromRect.height / (to.height || 1);
    var away = "translate(" + dx + "px," + dy + "px) scale(" + sc + ")";
    var frames = reverse ? [{ transform: "none" }, { transform: away }] : [{ transform: away }, { transform: "none" }];
    if (!floatCta.animate || mqReduce.matches) { if (done) done(); return; }
    var anim = floatCta.animate(frames, { duration: reverse ? 260 : 340, easing: "cubic-bezier(.22,1,.36,1)" });
    if (done) anim.onfinish = done;
  }

  function setFloatVisible(on) {
    floatCta.classList.toggle("is-visible", on);
    floatCta.setAttribute("aria-hidden", on ? "false" : "true");
    floatCta.tabIndex = on ? 0 : -1;
  }

  function renderFloat() {
    if (!floatCta || !heroCta || !footerEl) return;
    var mainEl = document.getElementById("main");
    var ctaRect = heroCta.getBoundingClientRect();
    var covered = mainEl.getBoundingClientRect().top < ctaRect.bottom + 8;
    var hide = footerEl.getBoundingClientRect().top < window.innerHeight * 0.85 ||
               document.body.classList.contains("e1-form-open");
    var next = !covered ? "hero" : (hide ? "hidden" : "float");
    if (next === ctaState) return;

    var prev = ctaState;
    ctaState = next;

    if (next === "float") {
      heroCta.classList.add("is-detached");
      setFloatVisible(true);
      if (prev === "hero") morph(ctaRect, false);
    } else if (next === "hidden") {
      heroCta.classList.add("is-detached");
      setFloatVisible(false);
    } else { // retour dans le hero
      if (prev === "float") {
        morph(ctaRect, true, function () {
          if (ctaState !== "hero") return;
          setFloatVisible(false);
          heroCta.classList.remove("is-detached");
        });
      } else {
        setFloatVisible(false);
        heroCta.classList.remove("is-detached");
      }
    }
  }

  /* Une seule boucle de scroll pour tout (1 calcul par image) */
  function frame() {
    ticking = false;
    render();
    renderProgress();
    renderFloat();
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
      var hoveredFace = null;

      faces.forEach(function (face) {
        face.parentNode.addEventListener("mouseenter", function () {
          hoveredFace = face;
          blink(face);
          talk(face);
          // les deux autres tournent la tête… enfin, les yeux
          faces.forEach(function (other, i) {
            if (other !== face) setTimeout(function () { blink(other); }, 180 + i * 90);
          });
        });
        face.parentNode.addEventListener("mouseleave", function () {
          if (hoveredFace === face) hoveredFace = null;
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
            var target = pointer;
            // Si on survole un collègue, on le regarde lui
            if (hoveredFace && hoveredFace !== face) {
              var h = hoveredFace.getBoundingClientRect();
              target = { x: h.left + h.width / 2, y: h.top + h.height * 0.45 };
            }
            if (target) {
              var dx = target.x - (r.left + r.width / 2);
              var dy = target.y - (r.top + r.height / 2);
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
     EMPILEMENT — chaque carte colle quand son bas touche le
     bas de l'écran ; la suivante glisse par-dessus.
     ======================================================= */

  var cards = document.querySelectorAll(".stack-card");

  function setStick() {
    var vh = window.innerHeight;
    cards.forEach(function (card) {
      card.style.setProperty("--stick", Math.min(0, vh - card.offsetHeight) + "px");
    });
  }

  setStick();
  window.addEventListener("resize", setStick);
  window.addEventListener("load", setStick);
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(setStick);
    cards.forEach(function (card) { ro.observe(card); });
  }


  /* =======================================================
     LOGO → BRIGADE (clic sur les logos EVERY1.ATE)
     Position calculée "hors empilement" pour tomber juste.
     ======================================================= */

  var mainCard = document.getElementById("main");
  var brigade = document.getElementById("brigade-grid");

  function scrollToBrigade(event) {
    if (!brigade || !mainCard || !hero) return;
    event.preventDefault();
    var offset = brigade.getBoundingClientRect().top - mainCard.getBoundingClientRect().top;
    var target = hero.offsetHeight + offset - 24;
    // Sans dépasser le moment où le footer commence à recouvrir la page
    target = Math.min(target, hero.offsetHeight + mainCard.offsetHeight - window.innerHeight);
    window.scrollTo({ top: target, behavior: mqReduce.matches ? "auto" : "smooth" });
  }

  document.querySelectorAll("[data-to-brigade]").forEach(function (el) {
    el.addEventListener("click", scrollToBrigade);
  });


  /* =======================================================
     NOTIFICATION (toast)
     ======================================================= */

  var toastEl = document.querySelector(".toast");
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2400);
  }


  /* =======================================================
     COPIER L'EMAIL
     ======================================================= */

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copié";
        btn.classList.add("is-done");
        toast("Email copié. À très vite.");
        setTimeout(function () {
          btn.textContent = "Copier";
          btn.classList.remove("is-done");
        }, 1800);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, function () {
          window.location.href = "mailto:" + value;
        });
      } else {
        window.location.href = "mailto:" + value;
      }
    });
  });


  /* =======================================================
     EASTER EGGS
     ======================================================= */

  // 1. Pour les curieux qui ouvrent la console
  if (window.console && console.log) {
    console.log(
      "%cEVERY1.ATE%c\nLa cuisine est ouverte, même ici.\nUne idée ? hello@every1ate.com\n\nIndices : tapez « chef », « service » ou un prénom de la brigade… ou essayez ↑ ↑ ↓ ↓.",
      "font:700 28px Arimo,Arial,sans-serif;color:#000;background:#eaff00;padding:4px 10px;",
      "font:14px 'Courier Prime',monospace;"
    );
  }

  // 2. Onglet quitté : le plat refroidit
  var baseTitle = document.title;
  document.addEventListener("visibilitychange", function () {
    document.title = document.hidden ? "Ça refroidit… — EVERY1.ATE" : baseTitle;
  });

  // 3. Mots magiques : tapez-les n'importe où sur la page
  var faceOf = function (id) {
    var el = document.querySelector("#photo-" + id + " .face");
    return el ? [el] : [];
  };

  function wake(list, gap) {
    list.forEach(function (face, i) {
      setTimeout(function () { blink(face); talk(face); }, i * (gap || 120));
    });
  }

  function replayMarks() {
    document.querySelectorAll("[data-mark]").forEach(function (el, i) {
      el.classList.remove("is-in");
      void el.offsetWidth;
      setTimeout(function () { el.classList.add("is-in"); }, 60 + i * 120);
    });
  }

  var track = document.querySelector(".e1-marquee-track");

  var words = {
    chef:    function () { wake(faces); toast("Oui chef !"); },
    johan:   function () { wake(faceOf("johan")); toast("Jo’ au rapport."); },
    pierre:  function () { wake(faceOf("pierre")); toast("Boxito au rapport."); },
    charles: function () { wake(faceOf("charles")); toast("Charlito : moteur… action !"); },
    service: function () {
      wake(faces, 220);
      toast("Service ! Ça part en salle.");
      if (track) {
        track.style.animationDuration = "9s";
        setTimeout(function () { track.style.animationDuration = ""; }, 3000);
      }
    },
    sel:     function () { replayMarks(); toast("Une pincée de sel… et on relit."); },
    miam:    function () { wake(faces, 60); toast("Merci, on transmet en cuisine."); },
    hello:   function () { wake(faces, 90); toast("Hello ! On vous écoute."); }
  };

  var typedWords = "";
  var arrows = "";

  document.addEventListener("keydown", function (event) {
    var t = event.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;

    // Code secret simplifié : ↑ ↑ ↓ ↓ → mode négatif
    if (event.key.indexOf("Arrow") === 0) {
      arrows = (arrows + event.key.charAt(5)).slice(-4); // U, D, L, R
      if (arrows === "UUDD") {
        arrows = "";
        var on = document.documentElement.classList.toggle("is-negative");
        toast(on ? "Mode négatif. Comme nos portraits." : "Retour en cuisine.");
      }
      return;
    }

    if (event.key.length !== 1) return;
    typedWords = (typedWords + event.key.toLowerCase()).slice(-12);
    Object.keys(words).forEach(function (w) {
      if (typedWords.slice(-w.length) === w) {
        typedWords = "";
        words[w]();
      }
    });
  });

  // 4. Au toucher (mobile) : "les chefs !" fait parler la brigade,
  //    l'icône du hero fait un coup de poêle
  var chefsNote = document.querySelector(".note-inline");
  if (chefsNote) {
    chefsNote.style.cursor = "pointer";
    chefsNote.addEventListener("click", function () { words.chef(); });
  }

  var tosses = 0;
  if (icon) {
    icon.addEventListener("click", function () {
      icon.classList.remove("is-tossed");
      void icon.offsetWidth;
      icon.classList.add("is-tossed");
      tosses += 1;
      if (tosses % 3 === 0) toast("Joli coup de poêle.");
    });
  }


  /* =======================================================
     EXPERTISES — détail + exemple concret
     Desktop : s'ouvre au survol · Mobile : au toucher
     ======================================================= */

  var xps = Array.prototype.slice.call(document.querySelectorAll(".xp"));

  function setXp(item, open) {
    item.classList.toggle("is-open", open);
    item.querySelector(".xp-toggle").setAttribute("aria-expanded", open ? "true" : "false");
  }

  function openOnly(item) {
    xps.forEach(function (other) { setXp(other, other === item); });
  }

  xps.forEach(function (item) {
    var intent = null;

    item.querySelector(".xp-toggle").addEventListener("click", function () {
      if (canHover && item.classList.contains("is-open")) return; // déjà ouvert par le survol
      if (item.classList.contains("is-open")) setXp(item, false);
      else openOnly(item);
    });

    if (canHover) {
      // petite temporisation : on ne déplie pas en passant juste dessus
      item.addEventListener("mouseenter", function () {
        intent = setTimeout(function () { openOnly(item); }, 140);
      });
      item.addEventListener("mouseleave", function () {
        clearTimeout(intent);
        setXp(item, false);
      });
    }
  });


  /* =======================================================
     PARTAGE NATIF (mobile surtout)
     ======================================================= */

  var shareBtn = document.querySelector(".share-site");
  if (shareBtn && navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener("click", function () {
      navigator.share({
        title: "EVERY1.ATE — Creative & Strategic Kitchen",
        text: "Le studio qui cuisine des expériences pour que les marques vivent avec leur communauté.",
        url: window.location.href
      }).catch(function () {});
    });
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

    // Depuis une expertise : on pré-coche les services correspondants
    var from = event && event.currentTarget;
    var preset = from && from.getAttribute && from.getAttribute("data-services");
    if (preset) {
      preset.split("|").forEach(function (value) {
        form.querySelectorAll('input[name="services"]').forEach(function (input) {
          if (input.value === value) input.checked = true;
        });
      });
      servicesError.classList.remove("is-visible");
    }

    // Petit retour haptique (Android)
    if (navigator.vibrate) navigator.vibrate(10);

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
