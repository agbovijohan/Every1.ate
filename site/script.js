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

    // Comme un restaurant : le bandeau suit l'heure de Paris
    var label = serviceLabel(parseInt(time.slice(0, 2), 10));
    document.querySelectorAll(".open-label").forEach(function (open) {
      if (open.hasAttribute("data-force")) return;
      if (open.textContent !== label) open.textContent = label;
    });
  }

  function serviceLabel(h) {
    if (h >= 23 || h < 6) return "Service de nuit.";
    if (h < 11) return "Mise en place.";
    if (h < 15) return "Service du midi.";
    if (h < 19) return "La cuisine est ouverte.";
    return "Service du soir.";
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
       (le CTA, lui, est visible dès l'arrivée)
       0.82 → 1.00  barre (et icône) remontent et disparaissent
     ======================================================= */

  var hero = document.getElementById("hero");
  var stage = hero && hero.querySelector(".hero-stage");
  var video = hero && hero.querySelector(".hero-video");
  var icon = hero && hero.querySelector(".m-icon");
  var typo = hero && hero.querySelector(".m-typo");
  var bar = hero && hero.querySelector(".m-bar");
  var topBar = hero && hero.querySelector(".hero-top");
  var statement = hero && hero.querySelector(".hero-say");
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

  // Lecture auto de la vidéo. Si le téléphone la bloque (mode économie
  // d'énergie), on la relance au premier toucher, sans afficher de bouton.
  if (video) {
    video.muted = true;
    var tryPlay = function () {
      var play = video.play();
      if (play && typeof play.catch === "function") play.catch(function () {});
    };
    tryPlay();
    ["touchstart", "pointerdown", "scroll"].forEach(function (evt) {
      window.addEventListener(evt, function once() {
        if (video.paused) tryPlay();
        window.removeEventListener(evt, once);
      }, { passive: true });
    });
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

  // action (optionnelle) : { label, onClick } → petit bouton dans la notification
  function toast(message, action) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.toggle("has-action", !!action);
    if (action) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toast-action";
      btn.textContent = action.label;
      btn.addEventListener("click", function () {
        toastEl.classList.remove("is-visible");
        action.onClick();
      });
      toastEl.appendChild(btn);
    }
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible", "has-action");
    }, action ? 5000 : 2400);
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
      "%cEVERY1.ATE%c\nLa cuisine est ouverte, même ici.\nUne idée ? hello@every1ate.com\n\nIndices : la carte secrète est dans le footer. Et tapez « chef », « service », « feu » ou un prénom de la brigade… ou ↑ ↑ ↓ ↓ (plusieurs fois).",
      "font:700 28px Arimo,Arial,sans-serif;color:#000;background:#eaff00;padding:4px 10px;",
      "font:14px 'Courier Prime',monospace;"
    );
  }

  // 2. Onglet quitté : le plat refroidit
  var baseTitle = document.title;
  document.addEventListener("visibilitychange", function () {
    document.title = document.hidden ? "Ça refroidit… — EVERY1.ATE" : baseTitle;
  });

  // 3. Les effets : un seul catalogue, déclenché au clavier,
  //    au clic sur les mots mis en avant, ou par le code ↑ ↑ ↓ ↓
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

  function openFormNow() {
    var trigger = document.querySelector(".hero-cta");
    if (trigger) trigger.click();
  }

  var track = document.querySelector(".e1-marquee-track");
  var busy = false;

  // Un seul effet "long" à la fois
  function exclusive(duration, fn) {
    if (busy) return;
    busy = true;
    fn();
    setTimeout(function () { busy = false; }, duration);
  }

  /* --- La salière : on assaisonne soi-même (clic / toucher) --- */
  var saltEl = document.querySelector(".salt");
  var shaker = saltEl && saltEl.querySelector(".salt-shaker");
  var saltPinches = 0;
  var saltIdle = null;

  function placeShaker(x, y) {
    shaker.style.transform = "translate(" + (x - 20) + "px," + (y - 60) + "px)";
    shaker.setAttribute("data-x", x);
    shaker.setAttribute("data-y", y);
  }

  function sprinkle(x, y) {
    shaker.classList.remove("is-shaking");
    void shaker.offsetWidth;
    shaker.classList.add("is-shaking");
    for (var i = 0; i < 9; i++) {
      var g = document.createElement("span");
      g.className = "salt-grain";
      g.style.left = (x - 2 + (Math.random() * 14 - 7)) + "px";
      g.style.top = (y - 6) + "px";
      saltEl.appendChild(g);
      var dx = Math.random() * 50 - 25;
      var dy = 60 + Math.random() * 90;
      var anim = g.animate([
        { transform: "translate(0,0)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px)", opacity: 0 }
      ], { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.3,0,.8,.6)", fill: "forwards" });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(g);
    }
    saltPinches += 1;
    if (saltPinches === 6) stopSalt(true);
    else armSaltIdle();
  }

  function armSaltIdle() {
    clearTimeout(saltIdle);
    saltIdle = setTimeout(function () { stopSalt(false); }, 6000);
  }

  function onSaltMove(event) { placeShaker(event.clientX, event.clientY); }
  function onSaltDown(event) {
    event.preventDefault();
    placeShaker(event.clientX, event.clientY);
    sprinkle(event.clientX, event.clientY);
  }
  function onSaltKey(event) { if (event.key === "Escape") stopSalt(false); }

  function startSalt() {
    if (!saltEl || saltEl.classList.contains("is-on")) return;
    saltPinches = 0;
    placeShaker(window.innerWidth / 2, window.innerHeight * 0.45);
    saltEl.classList.add("is-on");
    saltEl.addEventListener("pointermove", onSaltMove);
    saltEl.addEventListener("pointerdown", onSaltDown);
    document.addEventListener("keydown", onSaltKey);
    toast(canHover ? "À vous de doser : cliquez pour saler." : "À vous de doser : touchez l’écran pour saler.");
    armSaltIdle();
  }

  function stopSalt(done) {
    if (!saltEl) return;
    clearTimeout(saltIdle);
    saltEl.removeEventListener("pointermove", onSaltMove);
    saltEl.removeEventListener("pointerdown", onSaltDown);
    document.removeEventListener("keydown", onSaltKey);
    setTimeout(function () { saltEl.classList.remove("is-on"); }, done ? 700 : 0);
    if (done) toast("Chaque marque a son dosage. Le vôtre ?", { label: "Parlons projet", onClick: openFormNow });
  }

  /* --- La cloche du service : sonnez 3 fois, la commande part --- */
  var bellEl = document.querySelector(".bell");
  var bellRings = 0;
  var audioCtx = null;

  function ding() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      [1760, 2640].forEach(function (f, i) {
        var o = audioCtx.createOscillator();
        var v = audioCtx.createGain();
        o.frequency.value = f;
        v.gain.setValueAtTime(i ? 0.04 : 0.12, t);
        v.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(v).connect(audioCtx.destination);
        o.start(t);
        o.stop(t + 1.2);
      });
    } catch (e) {}
  }

  function setBell(open) {
    if (!bellEl) return;
    bellEl.classList.toggle("is-open", open);
    bellEl.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function startBell() {
    if (!bellEl) return;
    bellRings = 0;
    bellEl.querySelector(".bell-text").textContent = "Sonnez 3 fois";
    setBell(true);
    bellEl.querySelector(".bell-btn").focus({ preventScroll: true });
  }

  if (bellEl) {
    bellEl.querySelector(".bell-btn").addEventListener("click", function () {
      if (bellRings >= 3) return;
      var btn = this;
      btn.classList.remove("is-ringing");
      void btn.offsetWidth;
      btn.classList.add("is-ringing");
      ding();
      bellRings += 1;
      var text = bellEl.querySelector(".bell-text");
      if (bellRings < 3) {
        text.textContent = "Encore " + (3 - bellRings);
        return;
      }
      text.textContent = "Service !";
      wake(faces, 150);
      setTimeout(function () {
        setBell(false);
        toast("Commande envoyée en cuisine. La vôtre ?", { label: "Parlons projet", onClick: openFormNow });
      }, 900);
    });
    bellEl.querySelector(".bell-close").addEventListener("click", function () { setBell(false); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setBell(false);
    });
  }

  /* --- Pluie d'assiettes, version téléphone : on penche pour débarrasser --- */
  var tiltOn = false;

  function startTiltRain() {
    if (tiltOn) return;
    tiltOn = true;

    var layer = document.createElement("div");
    layer.className = "plate-rain is-tilt";
    var hint = document.createElement("p");
    hint.className = "tilt-hint";
    hint.innerHTML = "Penchez le téléphone vers la droite pour débarrasser la table" +
      '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
    layer.appendChild(hint);
    document.body.appendChild(layer);

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var plates = [];
    for (var i = 0; i < 18; i++) {
      var img = document.createElement("img");
      img.src = "assets/web/logo-icon-b.webp";
      img.alt = "";
      var size = 44 + Math.random() * 40;
      img.style.width = size + "px";
      layer.appendChild(img);
      plates.push({
        el: img, size: size,
        x: size / 2 + Math.random() * (vw - size),
        y: -size - Math.random() * vh * 0.8,
        vx: 0, vy: 0, r: Math.random() * 360,
        floor: vh - size - Math.random() * 46
      });
    }

    // Gyroscope : iOS demande l'autorisation (dans le geste de l'utilisateur)
    var gamma = 0;
    var gotTilt = false;
    function onTilt(event) {
      if (event.gamma === null) return;
      gotTilt = true;
      gamma = event.gamma;
    }
    var D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") {
      D.requestPermission().then(function (state) {
        if (state === "granted") window.addEventListener("deviceorientation", onTilt);
      }).catch(function () {});
    } else if (D) {
      window.addEventListener("deviceorientation", onTilt);
    }

    // Sans gyroscope : on glisse du doigt vers la droite
    var push = 0;
    var sx = null;
    setTimeout(function () {
      if (!gotTilt && tiltOn) hint.firstChild.textContent = "Glissez vers la droite pour débarrasser la table";
    }, 2500);
    layer.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    layer.addEventListener("touchmove", function (e) {
      if (sx === null) return;
      var dx = e.touches[0].clientX - sx;
      sx = e.touches[0].clientX;
      if (dx > 0) push = Math.min(2.4, push + dx * 0.05);
    }, { passive: true });
    layer.addEventListener("touchend", function () { sx = null; });

    var start = performance.now();
    function frame(now) {
      var auto = now - start > 25000 ? 1.2 : 0; // au bout de 25 s, la table se débarrasse seule
      var ax = gamma > 10 ? (gamma - 10) * 0.03 : gamma < -10 ? (gamma + 10) * 0.03 : 0;
      ax += push + auto;
      push *= 0.9;
      var left = 0;
      plates.forEach(function (p) {
        if (p.gone) return;
        p.vy += 0.7;
        p.y += p.vy;
        if (p.y >= p.floor) {
          p.y = p.floor;
          p.vy = Math.abs(p.vy) > 3 ? -p.vy * 0.35 : 0;
          p.vx = (p.vx + ax) * 0.93;
        } else {
          p.vx += ax * 0.4;
        }
        p.x += p.vx;
        if (p.x < p.size / 2) { p.x = p.size / 2; p.vx = -p.vx * 0.3; }
        p.r += p.vx * 1.6;
        if (p.x - p.size / 2 > vw) { p.gone = true; p.el.remove(); return; }
        left += 1;
        p.el.style.transform = "translate(" + (p.x - p.size / 2).toFixed(1) + "px," + p.y.toFixed(1) + "px) rotate(" + p.r.toFixed(1) + "deg)";
      });
      if (left) { requestAnimationFrame(frame); return; }
      window.removeEventListener("deviceorientation", onTilt);
      layer.remove();
      tiltOn = false;
      toast("Table débarrassée. Merci !");
    }
    requestAnimationFrame(frame);
  }

  var eggs = {

    /* 1. COUP DE FEU — toute la page s'emballe 5 s */
    rush: function () {
      exclusive(5200, function () {
        document.documentElement.classList.add("is-rush");
        replayMarks();
        if (track) track.style.animationDuration = "6s";
        var n = 0;
        var loop = setInterval(function () {
          faces.forEach(function (face, i) {
            setTimeout(function () { talk(face); if (Math.random() > .5) blink(face); }, i * 90);
          });
          if (++n >= 8) clearInterval(loop);
        }, 600);
        setTimeout(function () {
          document.documentElement.classList.remove("is-rush");
          if (track) track.style.animationDuration = "";
          toast("Service terminé. On vous écoute ?", { label: "Parlons projet", onClick: openFormNow });
        }, 5000);
      });
    },

    /* 2. PLAT DU JOUR — un ticket de cuisine qui mène au formulaire */
    plat: function () {
      var ticket = document.querySelector(".ticket");
      if (!ticket) return;
      ticket.querySelector(".ticket-no").textContent = "BON N° " + String(Math.floor(Math.random() * 900) + 100);
      ticket.classList.add("is-open");
      ticket.setAttribute("aria-hidden", "false");
      ticketY = window.scrollY;
    },

    /* 3. PLUIE D'ASSIETTES — l'icône tombe par dizaines et rebondit */
    pluie: function () {
      if (mqMobile.matches && !mqReduce.matches) { startTiltRain(); return; }
      exclusive(4000, function () {
        if (mqReduce.matches) { toast("Attention, ça glisse !"); return; }
        var rain = document.createElement("div");
        rain.className = "plate-rain";
        document.body.appendChild(rain);
        var vh = window.innerHeight;
        for (var i = 0; i < 30; i++) {
          var img = document.createElement("img");
          img.src = "assets/web/logo-icon-b.webp";
          img.alt = "";
          var size = 48 + Math.random() * 70;
          img.style.width = size + "px";
          img.style.left = (Math.random() * 100) + "%";
          rain.appendChild(img);
          var floor = vh - size;
          var spin = (Math.random() > .5 ? 1 : -1) * (180 + Math.random() * 360);
          img.animate([
            { transform: "translate(-50%, -120px) rotate(0deg)", opacity: 1 },
            { transform: "translate(-50%, " + floor + "px) rotate(" + spin * .7 + "deg)", opacity: 1, offset: .62 },
            { transform: "translate(-50%, " + (floor - 60 - Math.random() * 60) + "px) rotate(" + spin * .85 + "deg)", opacity: 1, offset: .78 },
            { transform: "translate(-50%, " + floor + "px) rotate(" + spin + "deg)", opacity: 0 }
          ], {
            duration: 2200 + Math.random() * 1000,
            delay: Math.random() * 700,
            easing: "cubic-bezier(.5, 0, .75, 1)",
            fill: "both"
          });
        }
        toast("Attention, ça glisse !");
        setTimeout(function () { rain.remove(); }, 4000);
      });
    },

    /* 4. LA SALIÈRE — on assaisonne la page soi-même */
    saliere: function () { startSalt(); },

    /* 5. LA CLOCHE DU SERVICE — sonnez 3 fois, la commande part */
    cloche: function () { startBell(); },

    /* Bonus — la brigade vous fait un clin d'œil */
    clin: function () {
      goToBrigade();
      faces.forEach(function (face, i) {
        var eye = face.querySelectorAll(".eye")[i % 2];
        setTimeout(function () {
          eye.classList.remove("is-winking");
          void eye.offsetWidth;
          eye.classList.add("is-winking");
          setTimeout(function () { eye.classList.remove("is-winking"); }, 460);
        }, 700 + i * 220);
      });
      toast("On s’attache vite, nous aussi.");
    },

    /* Bonus — "jusqu'au bout" : direction le contact */
    bout: function () {
      var target = document.getElementById("footer-cta");
      if (!target) return;
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: mqReduce.matches ? "auto" : "smooth"
      });
      toast("On vous accompagne jusqu’au bout.");
    },

    /* Bonus — l'horloge du hero : aperçu du service de nuit */
    nuit: function () {
      var open = document.getElementById("hero-open");
      if (!open) return;
      open.setAttribute("data-force", "1");
      open.textContent = "Service de nuit.";
      toast("De 23 h à 6 h, la cuisine tourne encore.");
      setTimeout(function () { open.removeAttribute("data-force"); }, 4000);
    },

    /* Mignardise — toute la brigade répond */
    chef: function () { wake(faces); toast("Oui chef !"); },

    /* Bonus — le copyright */
    legal: function () {
      toast("Recette déposée. Enfin… presque.");
    }
  };

  /* --- Suivi des effets "goûtés" (mémorisé sur cet appareil) --- */
  var MENU = ["rush", "clin", "plat", "saliere", "cloche", "pluie", "bout", "chef", "nuit"];
  var found = [];
  try { found = JSON.parse(localStorage.getItem("e1-eggs") || "[]"); } catch (e) { found = []; }

  function renderCarte() {
    var n = 0;
    document.querySelectorAll(".carte-item").forEach(function (item) {
      var ok = found.indexOf(item.getAttribute("data-run")) !== -1;
      item.classList.toggle("is-found", ok);
      if (ok) n += 1;
    });
    var f = document.querySelector(".carte-found");
    var t = document.querySelector(".carte-total");
    if (f) f.textContent = n;
    if (t) t.textContent = MENU.length;
  }

  function markFound(name) {
    if (MENU.indexOf(name) === -1 || found.indexOf(name) !== -1) return;
    found.push(name);
    try { localStorage.setItem("e1-eggs", JSON.stringify(found)); } catch (e) {}
    renderCarte();
    if (found.length === MENU.length) {
      setTimeout(function () {
        toast("Vous avez tout goûté. On se fait un café ?", { label: "Parlons projet", onClick: openFormNow });
      }, 2600);
    }
  }

  function run(name) {
    var fn = eggs[name];
    if (!fn) return;
    fn();
    markFound(name);
  }

  /* --- La carte secrète --- */
  var carte = document.querySelector(".carte");

  function setCarte(open) {
    if (!carte) return;
    carte.classList.toggle("is-open", open);
    carte.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) renderCarte();
  }

  document.querySelectorAll(".open-carte").forEach(function (btn) {
    btn.addEventListener("click", function () { setCarte(!carte.classList.contains("is-open")); });
  });

  var carteClose = document.querySelector(".carte-close");
  if (carteClose) carteClose.addEventListener("click", function () { setCarte(false); });

  document.querySelectorAll(".carte-item").forEach(function (item) {
    item.addEventListener("click", function () {
      var name = item.getAttribute("data-run");
      // on referme la carte pour laisser voir l'effet
      setCarte(false);
      run(name);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setCarte(false);
  });

  renderCarte();

  function goToBrigade() {
    var link = document.querySelector("[data-to-brigade]");
    if (link) link.click();
  }

  // Clic (ou Entrée) sur les éléments marqués data-egg
  document.querySelectorAll("[data-egg]").forEach(function (el) {
    var trigger = function (event) {
      if (event) event.preventDefault();
      run(el.getAttribute("data-egg"));
    };
    el.addEventListener("click", trigger);
    el.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") trigger(event);
    });
  });

  // Fermer le ticket : bouton ×, ou dès qu'on fait défiler la page
  var ticketEl = document.querySelector(".ticket");
  var ticketY = 0;

  function closeTicket() {
    if (!ticketEl || !ticketEl.classList.contains("is-open")) return;
    ticketEl.classList.remove("is-open");
    ticketEl.setAttribute("aria-hidden", "true");
  }

  var ticketClose = document.querySelector(".ticket-close");
  if (ticketClose) ticketClose.addEventListener("click", closeTicket);

  window.addEventListener("scroll", function () {
    if (ticketEl && ticketEl.classList.contains("is-open") && Math.abs(window.scrollY - ticketY) > 40) closeTicket();
  }, { passive: true });

  // Mots magiques au clavier
  var words = {
    chef:    function () { run("chef"); },
    johan:   function () { wake(faceOf("johan")); toast("Petit Bélier au rapport."); },
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
    sel:     function () { run("saliere"); },
    cloche:  function () { run("cloche"); },
    miam:    function () { wake(faces, 60); toast("Merci, on transmet en cuisine."); },
    hello:   function () { wake(faces, 90); toast("Hello ! On vous écoute."); },
    plat:    function () { run("plat"); },
    feu:     function () { run("rush"); }
  };

  // Code secret ↑ ↑ ↓ ↓ : les 5 effets, chacun son tour
  var konamiCycle = ["rush", "plat", "pluie", "saliere", "cloche"];
  var konamiIndex = 0;

  var typedWords = "";
  var arrows = "";

  document.addEventListener("keydown", function (event) {
    var t = event.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;

    if (event.key.indexOf("Arrow") === 0) {
      arrows = (arrows + event.key.charAt(5)).slice(-4); // U, D, L, R
      if (arrows === "UUDD") {
        arrows = "";
        run(konamiCycle[konamiIndex]);
        konamiIndex = (konamiIndex + 1) % konamiCycle.length;
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

  // 4. Au toucher : l'icône du hero fait un coup de poêle
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


  /* Marquee : pause au toucher (au survol, c'est le CSS) */
  var marqueeEl = document.querySelector(".e1-marquee");
  if (marqueeEl && !canHover) {
    marqueeEl.addEventListener("click", function () {
      marqueeEl.classList.toggle("is-paused");
    });
  }


  /* =======================================================
     BRIGADE — la fiche de chaque chef
     Panneau fixe (à droite sur desktop, en bas sur mobile) :
     seul le contenu change. AKA et @pseudo → Instagram.
     ======================================================= */

  var members = Array.prototype.slice.call(document.querySelectorAll(".member"));
  var chef = document.querySelector(".chef");
  var bubble = chef && chef.querySelector(".chef-bubble");
  var chefIndex = -1;

  function fillChef(i) {
    chefIndex = (i + members.length) % members.length;
    var mb = members[chefIndex];
    var insta = mb.querySelector(".member-insta");

    members.forEach(function (x, k) { x.classList.toggle("is-selected", k === chefIndex); });
    chef.querySelectorAll(".chef-tab").forEach(function (t, k) { t.classList.toggle("is-active", k === chefIndex); });
    chef.querySelector(".chef-index").textContent = (chefIndex + 1) + " / " + members.length;

    chef.querySelector(".chef-first").textContent = mb.querySelector(".member-name").textContent;
    var aka = chef.querySelector(".chef-aka");
    var handle = chef.querySelector(".chef-handle");
    aka.textContent = mb.querySelector(".member-aka").textContent;
    handle.textContent = insta.textContent;
    aka.href = handle.href = insta.href;
    chef.querySelector(".chef-role").innerHTML = mb.querySelector(".member-role").innerHTML;

    var dl = chef.querySelector(".chef-fiche");
    dl.innerHTML = "";
    mb.querySelectorAll(".fiche-inner dt").forEach(function (dt) {
      var group = document.createElement("div");
      group.appendChild(dt.cloneNode(true));
      group.appendChild(dt.nextElementSibling.cloneNode(true));
      dl.appendChild(group);
    });

    // Portrait en grand + badge façon carte FIFA
    var img = mb.querySelector(".face img");
    var portrait = chef.querySelector(".chef-portrait");
    portrait.src = img.getAttribute("src");
    portrait.alt = img.alt;
    chef.querySelector(".chef-pos").innerHTML = mb.getAttribute("data-pos") || "";
    chef.querySelectorAll(".chef-cycle li").forEach(function (li) {
      var k = li.getAttribute("data-k");
      li.classList.toggle("is-current", k === "all" || k.split(",").indexOf(String(chefIndex)) !== -1);
    });

    // Le corps en stickman animé, sous le portrait
    var crew = document.querySelectorAll(".crew-fig .crew-body")[chefIndex];
    var body = chef.querySelector(".chef-body");
    body.innerHTML = "";
    if (crew) body.appendChild(crew.cloneNode(true));

    // Ingrédients : le dosage de chacun, en %
    var stats = (mb.getAttribute("data-stats") || "").split("|").map(function (pair) {
      var p = pair.split(":");
      return { label: p[0], value: parseInt(p[1], 10) };
    });
    chef.querySelector(".chef-stat-list").innerHTML = stats.map(function (st) {
      return '<li><div class="stat-top"><span>' + st.label + "</span><b>" + st.value + ' %</b></div>' +
        '<span class="stat-bar"><span style="--v:' + st.value + '%"></span></span></li>';
    }).join("");

    bubble.scrollTop = 0;

    var face = mb.querySelector(".face");
    if (face) { blink(face); talk(face); }
  }

  function openChef(i) {
    if (!chef) return;
    fillChef(i);
    chef.classList.add("is-open");
    chef.setAttribute("aria-hidden", "false");
    if (!mqMobile.matches) document.body.classList.add("chef-open");
  }

  function closeChef() {
    if (!chef || !chef.classList.contains("is-open")) return;
    chef.classList.remove("is-open");
    chef.setAttribute("aria-hidden", "true");
    document.body.classList.remove("chef-open");
    members.forEach(function (x) { x.classList.remove("is-selected"); });
    chefIndex = -1;
  }

  members.forEach(function (mb, i) {
    mb.querySelector(".member-photo").addEventListener("click", function (event) {
      event.preventDefault();
      if (chefIndex === i) closeChef(); else openChef(i);
    });
    var more = mb.querySelector(".member-more");
    if (more) more.addEventListener("click", function () { openChef(i); });
  });

  if (chef) {
    chef.querySelector(".chef-close").addEventListener("click", closeChef);
    chef.querySelector(".chef-prev").addEventListener("click", function () { fillChef(chefIndex - 1); });
    chef.querySelector(".chef-next").addEventListener("click", function () { fillChef(chefIndex + 1); });
    chef.querySelectorAll(".chef-tab").forEach(function (t) {
      t.addEventListener("click", function () { fillChef(parseInt(t.getAttribute("data-i"), 10)); });
    });

    // clic en dehors du panneau (et hors d'un visage) → on ferme
    document.addEventListener("click", function (event) {
      if (!chef.classList.contains("is-open")) return;
      if (bubble.contains(event.target)) return;
      if (event.target.closest(".member-photo, .member-more")) return;
      closeChef();
    });

    document.addEventListener("keydown", function (event) {
      if (!chef.classList.contains("is-open")) return;
      if (event.key === "Escape") closeChef();
      if (event.key === "ArrowLeft") fillChef(chefIndex - 1);
      if (event.key === "ArrowRight") fillChef(chefIndex + 1);
    });

    // Mobile : glisser vers le bas ferme, glisser gauche/droite change de chef
    var sx = null, sy = null;
    bubble.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    bubble.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) fillChef(chefIndex + (dx < 0 ? 1 : -1));
      else if (dy > 80 && bubble.scrollTop <= 0) closeChef();
      sx = sy = null;
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

  // Lien direct vers le formulaire : …/#contact
  if (window.location.hash === "#contact") {
    setTimeout(function () { openForm(); }, 400);
  }

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
