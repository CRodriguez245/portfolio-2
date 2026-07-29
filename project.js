(function () {
  "use strict";

  var TRIGGER_FADE_MS = 600;

  function prepareHeroVideo(video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    if (!video.hasAttribute("loop")) video.loop = true;
  }

  function playHeroVideo(video) {
    if (!video) return;
    prepareHeroVideo(video);
    var tryPlay = function () {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {});
      }
    };
    if (video.readyState >= 2) {
      tryPlay();
      return;
    }
    var onReady = function () {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      tryPlay();
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    tryPlay();
  }

  var heroVideos = document.querySelectorAll(".project-hero__video");
  heroVideos.forEach(function (video) {
    prepareHeroVideo(video);
    playHeroVideo(video);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    heroVideos.forEach(playHeroVideo);
  });

  var unlockHeroVideosOnce = function () {
    heroVideos.forEach(playHeroVideo);
    document.removeEventListener("touchstart", unlockHeroVideosOnce, true);
    document.removeEventListener("click", unlockHeroVideosOnce, true);
  };
  document.addEventListener("touchstart", unlockHeroVideosOnce, true);
  document.addEventListener("click", unlockHeroVideosOnce, true);

  var header = document.getElementById("siteHeader");
  var heroMedia = document.querySelector(".project-hero__media");
  var aboutHero = document.querySelector(".about-hero");
  var transferSection = document.querySelector(".project-transfer");
  var venezuelaSection = document.querySelector(".project-annotators-venezuela");
  var instrumentSection = document.querySelector(".project-bluedot-instrument");

  if (header && (heroMedia || aboutHero || transferSection || venezuelaSection || instrumentSection)) {
    function updateHeader() {
      var headerHeight = header.offsetHeight;
      var transparent = false;

      if (heroMedia) {
        var mediaBottom = heroMedia.getBoundingClientRect().bottom;
        if (mediaBottom > headerHeight) transparent = true;
      }

      if (aboutHero) {
        var aboutRect = aboutHero.getBoundingClientRect();
        if (aboutRect.top < headerHeight && aboutRect.bottom > headerHeight) {
          transparent = true;
        }
      }

      if (transferSection) {
        var transferRect = transferSection.getBoundingClientRect();
        if (transferRect.top < headerHeight && transferRect.bottom > 0) {
          transparent = true;
        }
      }

      if (venezuelaSection) {
        var venezuelaRect = venezuelaSection.getBoundingClientRect();
        if (venezuelaRect.top < headerHeight && venezuelaRect.bottom > 0) {
          transparent = true;
        }
      }

      if (instrumentSection) {
        var instrumentRect = instrumentSection.getBoundingClientRect();
        if (instrumentRect.top < headerHeight && instrumentRect.bottom > headerHeight) {
          transparent = true;
        }
      }

      header.classList.toggle("site-header--solid", !transparent);
      header.classList.toggle("site-header--transparent", transparent);
    }

    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    updateHeader();
  }

  var triggerRoot = document.querySelector("[data-triggers]");
  if (triggerRoot) {
    var buttons = triggerRoot.querySelectorAll("[data-trigger-button]");
    var panels = triggerRoot.querySelectorAll("[data-trigger-panel]");
    var activePanel = triggerRoot.querySelector(".project-triggers__panel.is-active");

    function setActiveTrigger(id) {
      var nextPanel = null;

      buttons.forEach(function (button) {
        var active = button.dataset.triggerButton === id;

        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });

      panels.forEach(function (panel) {
        if (panel.dataset.triggerPanel === id) {
          nextPanel = panel;
        }
      });

      if (!nextPanel || nextPanel === activePanel) return;

      panels.forEach(function (panel) {
        var isNext = panel === nextPanel;
        var wasActive = panel === activePanel;

        panel.classList.toggle("is-active", isNext);
        panel.classList.toggle("is-leaving", wasActive && !isNext);
        panel.setAttribute("aria-hidden", isNext ? "false" : "true");

        var video = panel.querySelector("video");
        if (!video) return;

        if (isNext) {
          video.currentTime = 0;
          video.play().catch(function () {});
          return;
        }

        if (!wasActive) {
          video.pause();
        }
      });

      if (activePanel) {
        var outgoing = activePanel;
        var outgoingVideo = outgoing.querySelector("video");

        window.setTimeout(function () {
          outgoing.classList.remove("is-leaving");
          if (!outgoing.classList.contains("is-active") && outgoingVideo) {
            outgoingVideo.pause();
          }
        }, TRIGGER_FADE_MS);
      }

      activePanel = nextPanel;
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.classList.contains("is-active")) return;
        setActiveTrigger(button.dataset.triggerButton);
      });
    });
  }

  var TAKEAWAY_ANIM_MS = 450;
  var takeawayItems = document.querySelectorAll(".project-takeaways__item");

  takeawayItems.forEach(function (details) {
    var summary = details.querySelector(".project-takeaways__trigger");

    summary.addEventListener("click", function (event) {
      event.preventDefault();

      if (details.classList.contains("is-closing")) return;

      if (details.open) {
        details.classList.add("is-closing");
        window.setTimeout(function () {
          details.open = false;
          details.classList.remove("is-closing");
        }, TAKEAWAY_ANIM_MS);
        return;
      }

      details.open = true;
    });
  });

  var soundToggles = document.querySelectorAll("[data-sound-toggle]");
  var audioCtx = null;
  var activeSound = null;
  var waveRaf = 0;
  var IDLE_HEIGHTS = [
    28, 46, 62, 38, 72, 54, 80, 44, 66, 36,
    58, 74, 42, 68, 50, 78, 34, 60, 46, 70,
    52, 64, 38, 56, 72, 44, 60, 48, 66, 34,
    58, 42, 70, 50, 36, 62, 46, 54, 40, 48
  ];

  function ensureAudioContext() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setSoundPressed(button, pressed) {
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    var label = button.getAttribute("aria-label") || "";
    button.setAttribute(
      "aria-label",
      pressed ? label.replace(/^Play /, "Pause ") : label.replace(/^Pause /, "Play ")
    );
  }

  function getWaveBars(button) {
    var player = button.closest(".project-sound__player");
    if (!player) return [];
    return Array.prototype.slice.call(player.querySelectorAll(".project-sound__wave span"));
  }

  function paintIdleWave(bars) {
    bars.forEach(function (bar, index) {
      bar.style.height = (IDLE_HEIGHTS[index % IDLE_HEIGHTS.length] || 40) + "%";
      bar.style.background = "#d9d9d9";
    });
  }

  function stopWaveLoop() {
    if (waveRaf) {
      window.cancelAnimationFrame(waveRaf);
      waveRaf = 0;
    }
  }

  function updateWaveframe(entry) {
    var bars = entry.bars;
    var count = bars.length;
    if (!count) return;

    var data = entry.data;
    entry.analyser.getByteFrequencyData(data);

    var progress = entry.audio.duration
      ? entry.audio.currentTime / entry.audio.duration
      : 0;
    var playedThrough = progress * count;
    var fadeWidth = 5;

    for (var i = 0; i < count; i++) {
      var bin = Math.floor((i / count) * data.length * 0.7);
      var level = data[bin] / 255;
      var idle = (IDLE_HEIGHTS[i % IDLE_HEIGHTS.length] || 40) / 100;
      var height = Math.max(0.18, idle * 0.35 + level * 0.85);
      bars[i].style.height = height * 100 + "%";

      if (i < playedThrough) {
        bars[i].style.background = "#6b19b5";
      } else if (i < playedThrough + fadeWidth) {
        var t = (i - playedThrough) / fadeWidth;
        bars[i].style.background = t < 0.5 ? "#9b5fd0" : "#c9b0dd";
      } else {
        bars[i].style.background = "#d9d9d9";
      }
    }
  }

  function startWaveLoop(entry) {
    stopWaveLoop();

    function tick() {
      if (!activeSound || activeSound !== entry || entry.audio.paused) {
        waveRaf = 0;
        return;
      }
      updateWaveframe(entry);
      waveRaf = window.requestAnimationFrame(tick);
    }

    waveRaf = window.requestAnimationFrame(tick);
  }

  function stopActiveSound(reset) {
    if (!activeSound) return;
    activeSound.audio.pause();
    if (reset !== false) {
      activeSound.audio.currentTime = 0;
      paintIdleWave(activeSound.bars);
    }
    setSoundPressed(activeSound.button, false);
    stopWaveLoop();
    activeSound = null;
  }

  soundToggles.forEach(function (button) {
    var src = button.getAttribute("data-sound-src");
    if (!src) return;

    var audio = new Audio(src);
    audio.preload = "metadata";
    var bars = getWaveBars(button);
    paintIdleWave(bars);

    var analyser = null;
    var source = null;
    var data = null;

    function connectGraph() {
      if (analyser) return;
      var ctx = ensureAudioContext();
      source = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
    }

    function getEntry() {
      connectGraph();
      return {
        button: button,
        audio: audio,
        bars: bars,
        analyser: analyser,
        data: data
      };
    }

    audio.addEventListener("ended", function () {
      if (activeSound && activeSound.button === button) {
        setSoundPressed(button, false);
        paintIdleWave(bars);
        stopWaveLoop();
        activeSound = null;
      }
    });

    button.addEventListener("click", function () {
      var isActive = activeSound && activeSound.button === button;

      if (isActive) {
        if (audio.paused) {
          ensureAudioContext();
          audio.play().then(function () {
            setSoundPressed(button, true);
            startWaveLoop(activeSound);
          }).catch(function () {});
        } else {
          audio.pause();
          setSoundPressed(button, false);
          stopWaveLoop();
        }
        return;
      }

      stopActiveSound(true);
      var entry = getEntry();
      activeSound = entry;
      setSoundPressed(button, true);
      ensureAudioContext();
      audio.play().then(function () {
        startWaveLoop(entry);
      }).catch(function () {
        setSoundPressed(button, false);
        paintIdleWave(bars);
        activeSound = null;
      });
    });
  });

  var phaseVideos = document.querySelectorAll("[data-phase-video]");
  if (phaseVideos.length && "IntersectionObserver" in window) {
    var phaseObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(function () {});
          } else {
            video.pause();
          }
        });
      },
      { rootMargin: "10% 0px", threshold: 0.25 }
    );

    phaseVideos.forEach(function (video) {
      phaseObserver.observe(video);
    });
  }

  var phasesTimeline = document.querySelector("[data-phases-timeline]");
  if (phasesTimeline) {
    var phasesFill = phasesTimeline.querySelector("[data-phases-fill]");
    var phasesRail = phasesTimeline.querySelector(".project-phases__rail");
    var phaseItems = phasesTimeline.querySelectorAll(".project-phases__phase");

    function updatePhasesProgress() {
      if (!phasesFill || !phasesRail || !phaseItems.length) return;

      var railRect = phasesRail.getBoundingClientRect();
      var railTop = railRect.top + window.scrollY;
      var railHeight = phasesRail.offsetHeight;
      if (railHeight <= 0) return;

      var anchor = window.scrollY + window.innerHeight * 0.42;
      var progressPx = Math.min(Math.max(anchor - railTop, 0), railHeight);
      phasesFill.style.height = progressPx + "px";

      phaseItems.forEach(function (phase) {
        var dot = phase.querySelector(".project-phases__dot");
        if (!dot) return;
        var dotRect = dot.getBoundingClientRect();
        var dotCenter = dotRect.top + window.scrollY + dotRect.height / 2;
        var reached = progressPx >= dotCenter - railTop - 1;
        phase.classList.toggle("is-active", reached);
      });
    }

    window.addEventListener("scroll", updatePhasesProgress, { passive: true });
    window.addEventListener("resize", updatePhasesProgress);
    updatePhasesProgress();
  }

  /* ---------- BlueDot brief ↔ problem crossfade + staged diagram ---------- */
  (function initBlueDotArgumentScroll() {
    var story = document.querySelector("[data-bluedot-argument]");
    if (!story) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var briefPanel = story.querySelector('[data-bluedot-panel="brief"]');
    var problemPanel = story.querySelector('[data-bluedot-panel="problem"]');
    var figure = story.querySelector("[data-bluedot-argument-draw]");
    var image = figure && figure.querySelector("img");
    var ticking = false;

    var diagram = {
      ready: false,
      lightChart: null,
      darkParts: [],
      unauditedLabel: null,
      behavioralLabel: null,
      lightClipRect: null,
      lightVbW: 0,
      lightDrawn: false,
    };

    function applyFade(el, value, interactive) {
      if (!el) return;
      el.style.opacity = String(value);
      el.style.visibility = value <= 0.02 ? "hidden" : "visible";
      el.style.pointerEvents = interactive ? "auto" : "none";
      el.classList.toggle("is-active", interactive);
      el.setAttribute("aria-hidden", interactive ? "false" : "true");
    }

    function setOpacity(el, value) {
      if (!el) return;
      el.style.opacity = String(value);
    }

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function fadeOpacity(el, toOpacity, duration, delay) {
      return new Promise(function (resolve) {
        if (!el) {
          resolve();
          return;
        }
        window.setTimeout(function () {
          var startOpacity = parseFloat(el.style.opacity || "0");
          var start = performance.now();

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = easeInOut(t);
            el.style.opacity = String(startOpacity + (toOpacity - startOpacity) * eased);
            if (t < 1) requestAnimationFrame(frame);
            else {
              el.style.opacity = String(toOpacity);
              resolve();
            }
          }

          requestAnimationFrame(frame);
        }, delay || 0);
      });
    }

    function revealLightChart() {
      if (!diagram.ready || diagram.lightDrawn) return;
      diagram.lightDrawn = true;

      if (reduceMotion) {
        if (diagram.lightClipRect) {
          diagram.lightClipRect.setAttribute("width", String(diagram.lightVbW));
        }
        setOpacity(diagram.lightChart, 1);
        setOpacity(diagram.unauditedLabel, 1);
        return;
      }

      var clipRect = diagram.lightClipRect;
      var fullW = diagram.lightVbW;
      if (!clipRect) {
        setOpacity(diagram.lightChart, 1);
        fadeOpacity(diagram.unauditedLabel, 1, 550, 80);
        return;
      }

      var start = performance.now();
      var duration = 1100;

      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = easeInOut(t);
        clipRect.setAttribute("width", String(fullW * eased));
        if (t < 1) requestAnimationFrame(frame);
        else {
          clipRect.setAttribute("width", String(fullW));
          fadeOpacity(diagram.unauditedLabel, 1, 550, 40);
        }
      }

      requestAnimationFrame(frame);
    }

    function syncDiagram(fade) {
      if (!diagram.ready) return;

      // Dark blue (Behavioral Audit Capture) only appears with Problem.
      diagram.darkParts.forEach(function (part) {
        setOpacity(part, fade);
      });
      setOpacity(diagram.behavioralLabel, fade);
    }

    function update() {
      ticking = false;
      var rect = story.getBoundingClientRect();
      var scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
      var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      var fade = Math.min(1, Math.max(0, (progress - 0.22) / 0.36));
      var showProblem = fade >= 0.5;

      applyFade(briefPanel, 1 - fade, !showProblem);
      applyFade(problemPanel, fade, showProblem);

      // Draw light-blue unaudited encoding while Project Brief is in view.
      if (progress > 0.02 || rect.top < window.innerHeight * 0.75) {
        revealLightChart();
      }

      syncDiagram(fade);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    function prepareDiagram(svg) {
      var baseline = svg.querySelector("line");
      var allPaths = Array.prototype.slice.call(svg.querySelectorAll("path"));

      var lightChart = allPaths.find(function (path) {
        return (path.getAttribute("fill") || "").toUpperCase() === "#D2D1FF";
      });
      var darkParts = allPaths.filter(function (path) {
        var fill = (path.getAttribute("fill") || "").toUpperCase();
        var d = path.getAttribute("d") || "";
        return fill === "#322EFF" && (d.indexOf("M79") === 0 || d.indexOf("M704") === 0);
      });
      var unauditedLabel = allPaths.find(function (path) {
        return (path.getAttribute("fill") || "").toUpperCase() === "#A4A2FD";
      });
      var behavioralLabel = allPaths.find(function (path) {
        var fill = (path.getAttribute("fill") || "").toUpperCase();
        var d = path.getAttribute("d") || "";
        return fill === "#322EFF" && d.indexOf("M736") === 0;
      });
      var layerLabels = allPaths.find(function (path) {
        return (path.getAttribute("fill") || "").toUpperCase() === "#6B6B6B";
      });
      var axisLabels = allPaths.filter(function (path) {
        return (path.getAttribute("fill") || "").toLowerCase() === "black";
      });

      var viewBox = (svg.getAttribute("viewBox") || "0 0 885 396").split(/\s+/);
      var vbX = parseFloat(viewBox[0]) || 0;
      var vbY = parseFloat(viewBox[1]) || 0;
      var vbW = parseFloat(viewBox[2]) || 885;
      var vbH = parseFloat(viewBox[3]) || 396;

      var clipId = "bluedot-argument-light-clip";
      var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      var clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clipPath.setAttribute("id", clipId);
      var clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      clipRect.setAttribute("x", String(vbX));
      clipRect.setAttribute("y", String(vbY));
      clipRect.setAttribute("width", reduceMotion ? String(vbW) : "0");
      clipRect.setAttribute("height", String(vbH));
      clipPath.appendChild(clipRect);
      defs.appendChild(clipPath);
      svg.insertBefore(defs, svg.firstChild);

      if (lightChart) {
        lightChart.setAttribute("clip-path", "url(#" + clipId + ")");
        lightChart.style.opacity = "1";
      }

      darkParts.forEach(function (part) {
        part.style.opacity = "0";
      });
      if (unauditedLabel) unauditedLabel.style.opacity = "0";
      if (behavioralLabel) behavioralLabel.style.opacity = "0";

      // Axis / layer labels stay available for both panels.
      if (baseline) baseline.style.opacity = "1";
      if (layerLabels) layerLabels.style.opacity = "1";
      axisLabels.forEach(function (el) {
        el.style.opacity = "1";
      });

      diagram.ready = true;
      diagram.lightChart = lightChart;
      diagram.darkParts = darkParts;
      diagram.unauditedLabel = unauditedLabel;
      diagram.behavioralLabel = behavioralLabel;
      diagram.lightClipRect = clipRect;
      diagram.lightVbW = vbW;

      if (reduceMotion) {
        diagram.lightDrawn = true;
        if (clipRect) clipRect.setAttribute("width", String(vbW));
        if (lightChart) lightChart.style.opacity = "1";
        if (unauditedLabel) unauditedLabel.style.opacity = "1";
        darkParts.forEach(function (part) {
          part.style.opacity = "1";
        });
        if (behavioralLabel) behavioralLabel.style.opacity = "1";
      }
    }

    if (image) {
      fetch(image.src)
        .then(function (response) {
          if (!response.ok) throw new Error("Unable to load bluedot argument svg");
          return response.text();
        })
        .then(function (markup) {
          var documentNode = new DOMParser().parseFromString(markup, "image/svg+xml");
          var svg = documentNode.documentElement;
          if (!svg || svg.nodeName.toLowerCase() !== "svg") return;

          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("focusable", "false");
          svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
          image.replaceWith(svg);
          prepareDiagram(svg);
          update();
        })
        .catch(function () {
          /* keep static image fallback */
        });
    }

    if (reduceMotion) {
      applyFade(briefPanel, 1, true);
      applyFade(problemPanel, 0, false);
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

  (function initBlueDotLifecycleScroll() {
    var story = document.querySelector("[data-bluedot-lifecycle]");
    if (!story) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    var equityCaption = story.querySelector('[data-bluedot-lifecycle-caption="equity"]');
    var safetyCaption = story.querySelector('[data-bluedot-lifecycle-caption="safety"]');
    var gapCaption = story.querySelector('[data-bluedot-lifecycle-caption="gap"]');
    var equityHighlight = story.querySelector('[data-bluedot-lifecycle-highlight="equity"]');
    var safetyHighlight = story.querySelector('[data-bluedot-lifecycle-highlight="safety"]');
    var gapHighlight = story.querySelector('[data-bluedot-lifecycle-highlight="gap"]');
    var ticking = false;

    function applyFade(el, value) {
      if (!el) return;
      el.style.opacity = String(value);
      el.style.visibility = value <= 0.02 ? "hidden" : "visible";
      if (el.hasAttribute("data-bluedot-lifecycle-caption")) {
        el.setAttribute("aria-hidden", value >= 0.5 ? "false" : "true");
      }
    }

    function update() {
      ticking = false;
      var rect = story.getBoundingClientRect();
      var scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
      var progress = Math.min(1, Math.max(0, -rect.top / scrollable));

      // Frame 1: equity. Frame 2: safety. Frame 3: the gap. Prior frames stay.
      var equityIn = Math.min(1, Math.max(0, (progress - 0.16) / 0.16));
      var safetyIn = Math.min(1, Math.max(0, (progress - 0.4) / 0.16));
      var gapIn = Math.min(1, Math.max(0, (progress - 0.66) / 0.16));

      applyFade(equityCaption, equityIn);
      applyFade(equityHighlight, equityIn);
      applyFade(safetyCaption, safetyIn);
      applyFade(safetyHighlight, safetyIn);
      applyFade(gapCaption, gapIn);
      applyFade(gapHighlight, gapIn);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

  (function initBlueDotInterventionScroll() {
    var story = document.querySelector("[data-bluedot-intervention]");
    if (!story) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    var baseLayer = story.querySelector('[data-bluedot-intervention-layer="base"]');
    var missingLayer = story.querySelector('[data-bluedot-intervention-layer="missing"]');
    var baseCopy = story.querySelector('[data-bluedot-intervention-copy="base"]');
    var missingCopy = story.querySelector('[data-bluedot-intervention-copy="missing"]');
    var ticking = false;

    function applyFade(el, value, interactive) {
      if (!el) return;
      el.style.opacity = String(value);
      el.style.visibility = value <= 0.02 ? "hidden" : "visible";
      if (el.hasAttribute("data-bluedot-intervention-copy")) {
        el.style.pointerEvents = interactive ? "auto" : "none";
        el.classList.toggle("is-active", interactive);
        el.setAttribute("aria-hidden", interactive ? "false" : "true");
      }
    }

    function update() {
      ticking = false;
      var rect = story.getBoundingClientRect();
      var scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
      var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      // Crossfade so semi-transparent pink never composites over the base SVG.
      var fade = Math.min(1, Math.max(0, (progress - 0.28) / 0.32));
      var showMissing = fade >= 0.5;

      applyFade(baseLayer, 1 - fade, false);
      applyFade(missingLayer, fade, false);
      applyFade(baseCopy, 1 - fade, !showMissing);
      applyFade(missingCopy, fade, showMissing);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

  (function initBlueDotInstrumentDraw() {
    var root = document.querySelector("[data-bluedot-instrument-draw]");
    if (!root) return;

    var image = root.querySelector("img");
    if (!image) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var played = false;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function getCircleGroups(svg) {
      return Array.prototype.slice.call(svg.children).filter(function (node) {
        return node.tagName && node.tagName.toLowerCase() === "g" && node.querySelector("circle");
      });
    }

    function animateOpacity(el, toOpacity, duration, delay) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          var startOpacity = parseFloat(el.style.opacity || "0");
          var start = performance.now();

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = easeOutCubic(t);
            el.style.opacity = String(startOpacity + (toOpacity - startOpacity) * eased);
            if (t < 1) requestAnimationFrame(frame);
            else {
              el.style.opacity = String(toOpacity);
              resolve();
            }
          }

          requestAnimationFrame(frame);
        }, delay || 0);
      });
    }

    // Soft expand in place via opacity + slight scale. Keep SVG feGaussianBlur
    // (Figma blur 200) on the groups — CSS filter on <g> is unreliable and was
    // leaving hard-edged circles.
    function animateCircle(group, duration, delay) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          var circle = group.querySelector("circle");
          if (!circle) {
            resolve();
            return;
          }

          var cx = parseFloat(circle.getAttribute("cx") || "0");
          var cy = parseFloat(circle.getAttribute("cy") || "0");
          var fromScale = 0.82;
          group.style.opacity = "0";
          group.setAttribute(
            "transform",
            "translate(" + cx + " " + cy + ") scale(" + fromScale + ") translate(" + -cx + " " + -cy + ")"
          );

          var start = performance.now();
          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = easeOutCubic(t);
            var scale = fromScale + (1 - fromScale) * eased;
            group.style.opacity = String(Math.min(1, eased * 1.2));
            group.setAttribute(
              "transform",
              "translate(" + cx + " " + cy + ") scale(" + scale + ") translate(" + -cx + " " + -cy + ")"
            );
            if (t < 1) requestAnimationFrame(frame);
            else {
              group.style.opacity = "1";
              group.removeAttribute("transform");
              resolve();
            }
          }

          requestAnimationFrame(frame);
        }, delay || 0);
      });
    }

    function play(svg) {
      if (played) return;
      played = true;

      var groups = getCircleGroups(svg);
      var paths = Array.prototype.slice.call(svg.children).filter(function (node) {
        return node.tagName && node.tagName.toLowerCase() === "path";
      });
      var titlePath = paths.find(function (path) {
        return (path.getAttribute("fill") || "").toLowerCase() === "black";
      });
      var domainLabels = paths.filter(function (path) {
        var fill = (path.getAttribute("fill") || "").toUpperCase();
        return ["#125A66", "#6C1257", "#22005C", "#6D5100"].indexOf(fill) !== -1;
      });
      var detailLabels = paths.filter(function (path) {
        return (path.getAttribute("fill") || "").toUpperCase() === "#626262";
      });

      groups.forEach(function (group) {
        group.classList.add("instrument-circle");
        group.style.opacity = "0";
      });
      paths.forEach(function (path) {
        path.classList.add("instrument-label");
        path.style.opacity = "0";
      });

      if (reduceMotion) {
        groups.concat(paths).forEach(function (el) {
          el.style.opacity = "1";
          el.removeAttribute("transform");
        });
        return;
      }

      var circleAnims = groups.map(function (group, index) {
        return animateCircle(group, 700, index * 160);
      });

      Promise.all(circleAnims).then(function () {
        var labelAnims = [];
        if (titlePath) labelAnims.push(animateOpacity(titlePath, 1, 450, 0));
        domainLabels.forEach(function (path, index) {
          labelAnims.push(animateOpacity(path, 1, 400, 80 + index * 70));
        });
        detailLabels.forEach(function (path, index) {
          labelAnims.push(animateOpacity(path, 1, 350, 220 + index * 35));
        });
        return Promise.all(labelAnims);
      });
    }

    fetch(image.src)
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load instrument design svg");
        return response.text();
      })
      .then(function (markup) {
        var documentNode = new DOMParser().parseFromString(markup, "image/svg+xml");
        var svg = documentNode.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") return;

        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        image.replaceWith(svg);

        getCircleGroups(svg).forEach(function (group) {
          group.classList.add("instrument-circle");
          group.style.opacity = "0";
        });
        Array.prototype.forEach.call(svg.children, function (node) {
          if (node.tagName && node.tagName.toLowerCase() === "path") {
            node.classList.add("instrument-label");
            node.style.opacity = "0";
          }
        });

        if (reduceMotion) {
          play(svg);
          return;
        }

        if (!("IntersectionObserver" in window)) {
          play(svg);
          return;
        }

        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                play(svg);
                observer.disconnect();
              }
            });
          },
          { threshold: 0.35 }
        );
        observer.observe(root);
      })
      .catch(function () {
        /* keep static image fallback */
      });
  })();

  /* ---------- About: stamp shapes on white hover (hero + copy) ---------- */
  (function () {
    var hero = document.querySelector(".about-hero");
    var image = document.querySelector(".about-hero__image");
    var heroLayer = document.querySelector(".about-hero__shapes");
    var copy = document.querySelector(".about-copy");
    var copyLayer = document.querySelector(".about-copy__shapes");
    if (!hero || !image || !heroLayer) return;

    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches) return;

    var SHAPE_BASE = "./assets/media/shapes/";
    var shapes = [];
    var r;
    var c;
    for (r = 1; r <= 5; r += 1) {
      for (c = 1; c <= 12; c += 1) {
        shapes.push(SHAPE_BASE + "row" + r + "xcol" + c + ".svg");
      }
    }

    var sampleCanvas = document.createElement("canvas");
    var sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    var sampleReady = false;
    var lastSpawn = 0;
    var lastX = -9999;
    var lastY = -9999;
    var SPAWN_GAP_MS = 110;
    var MIN_MOVE_PX = 40;
    var WHITE_MIN = 242;
    var MAX_STAMPS = 24;
    var DRAW_IN_MS = reduceMotion.matches ? 200 : 520;
    var DRAW_OUT_MS = reduceMotion.matches ? 180 : 480;
    var HOLD_MS = reduceMotion.matches ? 400 : 900;
    var svgCache = {};

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function prepareSample() {
      if (!image.naturalWidth || !sampleCtx) return;
      var maxW = 640;
      var scale = Math.min(1, maxW / image.naturalWidth);
      sampleCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      sampleCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      sampleCtx.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
      sampleCtx.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);
      sampleReady = true;
    }

    if (image.complete) {
      prepareSample();
    } else {
      image.addEventListener("load", prepareSample);
    }

    function isHeroWhiteAt(clientX, clientY) {
      var heroRect = hero.getBoundingClientRect();
      if (
        clientX < heroRect.left ||
        clientX > heroRect.right ||
        clientY < heroRect.top ||
        clientY > heroRect.bottom
      ) {
        return false;
      }

      var rect = image.getBoundingClientRect();
      var overImage =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      if (!overImage) return true;
      if (!sampleReady || !sampleCtx) return true;

      var nx = (clientX - rect.left) / rect.width;
      var ny = (clientY - rect.top) / rect.height;
      var px = Math.min(
        sampleCanvas.width - 1,
        Math.max(0, Math.floor(nx * sampleCanvas.width))
      );
      var py = Math.min(
        sampleCanvas.height - 1,
        Math.max(0, Math.floor(ny * sampleCanvas.height))
      );
      var data = sampleCtx.getImageData(px, py, 1, 1).data;
      return data[0] >= WHITE_MIN && data[1] >= WHITE_MIN && data[2] >= WHITE_MIN;
    }

    function randomShape() {
      return shapes[Math.floor(Math.random() * shapes.length)];
    }

    function loadSvg(url) {
      if (svgCache[url]) return Promise.resolve(svgCache[url]);
      return fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error("shape fetch failed");
          return res.text();
        })
        .then(function (text) {
          svgCache[url] = text;
          return text;
        });
    }

    function drawableNodes(svg) {
      return Array.prototype.slice.call(
        svg.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect")
      );
    }

    function setupDraw(nodes) {
      nodes.forEach(function (el) {
        var fill = el.getAttribute("fill");
        var stroke = el.getAttribute("stroke");
        var hasFill = fill && fill !== "none";
        var hasStroke = stroke && stroke !== "none";
        var targetFill = 1;
        if (el.hasAttribute("fill-opacity")) {
          var parsed = parseFloat(el.getAttribute("fill-opacity"));
          if (!isNaN(parsed)) targetFill = parsed;
        }

        el.__hasFill = hasFill;
        el.__targetFill = targetFill;
        el.__len = 0;

        if (hasFill) {
          el.style.fillOpacity = "0";
        }

        if (hasFill && !hasStroke) {
          el.setAttribute("stroke", fill);
          el.setAttribute("stroke-width", el.getAttribute("stroke-width") || "1.25");
          hasStroke = true;
        }

        if (hasStroke && typeof el.getTotalLength === "function") {
          try {
            var len = el.getTotalLength();
            if (len > 0) {
              el.__len = len + 1;
              el.style.strokeDasharray = el.__len + " " + el.__len;
              el.style.strokeDashoffset = String(el.__len);
            }
          } catch (err) {
            /* skip non-drawable */
          }
        }
      });
    }

    function finalizeDrawIn(nodes) {
      nodes.forEach(function (el) {
        if (el.__len) {
          el.style.strokeDasharray = "none";
          el.style.strokeDashoffset = "0";
        }
        if (el.__hasFill) {
          el.style.fillOpacity = String(el.__targetFill);
        }
      });
    }

    function prepareDrawOut(nodes) {
      nodes.forEach(function (el) {
        if (!el.__len) return;
        el.style.strokeDasharray = el.__len + " " + el.__len;
        el.style.strokeDashoffset = "0";
      });
    }

    function animateDraw(nodes, drawIn, duration) {
      return new Promise(function (resolve) {
        if (!nodes.length) {
          resolve();
          return;
        }

        var start = performance.now();

        function frame(now) {
          var t = Math.min((now - start) / duration, 1);
          var e = easeInOut(t);
          var strokeP = drawIn ? e : 1 - e;
          var fillP = drawIn
            ? Math.max(0, (e - 0.2) / 0.8)
            : Math.max(0, 1 - e / 0.35);

          nodes.forEach(function (el) {
            if (el.__len) {
              el.style.strokeDashoffset = String(el.__len * (1 - strokeP));
            }
            if (el.__hasFill) {
              el.style.fillOpacity = String(el.__targetFill * fillP);
            }
          });

          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            if (drawIn) finalizeDrawIn(nodes);
            resolve();
          }
        }

        requestAnimationFrame(frame);
      });
    }

    function spawnStamp(root, layer, clientX, clientY, soft) {
      var rect = root.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      var size = 52 + Math.random() * 44;
      var rot = (Math.random() * 50 - 25).toFixed(1) + "deg";
      var url = randomShape();

      var stamp = document.createElement("div");
      stamp.className =
        "about-hero__stamp" + (soft ? " about-hero__stamp--soft" : "");
      stamp.style.left = x + "px";
      stamp.style.top = y + "px";
      stamp.style.setProperty("--stamp-size", size.toFixed(0) + "px");
      stamp.style.setProperty("--stamp-rot", rot);

      layer.appendChild(stamp);
      while (layer.children.length > MAX_STAMPS) {
        layer.removeChild(layer.firstChild);
      }

      loadSvg(url)
        .then(function (markup) {
          if (!stamp.parentNode) return;
          stamp.innerHTML = markup;
          var svg = stamp.querySelector("svg");
          if (!svg) {
            stamp.parentNode.removeChild(stamp);
            return;
          }
          svg.setAttribute("aria-hidden", "true");
          var nodes = drawableNodes(svg);
          setupDraw(nodes);

          return animateDraw(nodes, true, DRAW_IN_MS)
            .then(function () {
              return new Promise(function (resolve) {
                window.setTimeout(resolve, HOLD_MS);
              });
            })
            .then(function () {
              if (!stamp.parentNode) return;
              prepareDrawOut(nodes);
              return animateDraw(nodes, false, DRAW_OUT_MS);
            })
            .then(function () {
              if (stamp.parentNode) stamp.parentNode.removeChild(stamp);
            });
        })
        .catch(function () {
          if (stamp.parentNode) stamp.parentNode.removeChild(stamp);
        });
    }

    function onPointerMove(event, root, layer, soft, canSpawn) {
      if (event.pointerType && event.pointerType !== "mouse") return;
      if (!canSpawn(event.clientX, event.clientY)) return;

      var now = performance.now();
      var dx = event.clientX - lastX;
      var dy = event.clientY - lastY;
      if (now - lastSpawn < SPAWN_GAP_MS) return;
      if (dx * dx + dy * dy < MIN_MOVE_PX * MIN_MOVE_PX && lastSpawn !== 0) return;

      lastSpawn = now;
      lastX = event.clientX;
      lastY = event.clientY;
      spawnStamp(root, layer, event.clientX, event.clientY, soft);
    }

    hero.addEventListener(
      "pointermove",
      function (event) {
        onPointerMove(event, hero, heroLayer, false, isHeroWhiteAt);
      },
      { passive: true }
    );

    if (copy && copyLayer) {
      copy.addEventListener(
        "pointermove",
        function (event) {
          onPointerMove(event, copy, copyLayer, true, function () {
            return true;
          });
        },
        { passive: true }
      );
    }

  })();

  (function initResearchLifecycleDraw() {
    var root = document.querySelector("[data-rb-lifecycle]");
    var host = document.querySelector("[data-rb-lifecycle-host]");
    if (!root || !host) return;

    var reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var svgUrl = new URL("../assets/media/researchlifecycle.svg", window.location.href).href;

    fetch(svgUrl)
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to load research lifecycle SVG");
        return response.text();
      })
      .then(function (markup) {
        host.innerHTML = markup;
        var progress = host.querySelector(".rb-lifecycle__progress");
        var nodes = Array.prototype.slice.call(host.querySelectorAll(".rb-lifecycle__node"));

        if (!progress) return;

        // Node centers along the horizontal line (viewBox x)
        var nodeXs = nodes.map(function (node) {
          return parseFloat(node.getAttribute("cx")) || 0;
        });
        var lineStart = 48;
        var lineEnd = 833;
        var lineSpan = lineEnd - lineStart;

        function setProgress(t) {
          var value = Math.max(0, Math.min(1, t));
          progress.style.strokeDashoffset = String(1 - value);

          var reachedX = lineStart + lineSpan * value;
          nodes.forEach(function (node, index) {
            node.classList.toggle("is-active", nodeXs[index] <= reachedX + 0.5);
          });
        }

        if (reduceMotion) {
          setProgress(1);
          return;
        }

        setProgress(0);

        function update() {
          var rect = root.getBoundingClientRect();
          var viewport = window.innerHeight || 1;
          var scrollable = Math.max(root.offsetHeight - viewport, 1);
          // Progress 0→1 while the sticky diagram is pinned
          var t = (-rect.top) / scrollable;
          setProgress(t);
        }

        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        update();
      })
      .catch(function () {
        // Fallback: show static image if fetch fails
        host.innerHTML =
          '<img src="../assets/media/researchlifecycle.svg" alt="Research lifecycle" width="899" height="106" />';
      });
  })();

  (function initCoverflow() {
    var root = document.querySelector("[data-coverflow]");
    if (!root) return;

    var items = Array.prototype.slice.call(root.querySelectorAll(".project-coverflow__item"));
    if (!items.length) return;

    var index = Math.floor(items.length / 2);
    var dragStartX = 0;
    var dragStartIndex = 0;
    var dragging = false;
    var activePointer = null;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function cardWidth() {
      var sample = items[0];
      return (sample && sample.offsetWidth) || 220;
    }

    function render() {
      /* Show ~25–30% of each side card — heavy fan overlap like the reference */
      var gap = cardWidth() * 0.26;

      items.forEach(function (item, i) {
        var offset = i - index;
        var abs = Math.abs(offset);
        var x = offset * gap;
        var scale = abs < 0.5 ? 1.38 : 1 - Math.min(abs * 0.055, 0.32);
        /* Gentle convex arc: side cards sit slightly higher */
        var y = -Math.min(abs * abs * 3.5, 28);
        var z = Math.round(100 - abs * 4);

        item.style.transform =
          "translate(-50%, -50%) translateX(" +
          x +
          "px) translateY(" +
          y +
          "px) scale(" +
          scale +
          ")";
        item.style.zIndex = String(z);
        item.classList.toggle("is-active", abs < 0.5);
        item.setAttribute("aria-hidden", abs < 1.1 ? "false" : "true");
      });
    }

    function setIndex(next) {
      index = clamp(next, 0, items.length - 1);
      render();
    }

    function onPointerDown(event) {
      if (event.button != null && event.button !== 0) return;
      dragging = true;
      activePointer = event.pointerId;
      dragStartX = event.clientX;
      dragStartIndex = index;
      root.classList.add("is-dragging");
      if (root.setPointerCapture) root.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function onPointerMove(event) {
      if (!dragging || (activePointer != null && event.pointerId !== activePointer)) return;
      var delta = event.clientX - dragStartX;
      var step = Math.max(cardWidth() * 0.42, 70);
      setIndex(dragStartIndex - delta / step);
    }

    function onPointerUp(event) {
      if (!dragging || (activePointer != null && event.pointerId !== activePointer)) return;
      dragging = false;
      activePointer = null;
      root.classList.remove("is-dragging");
      setIndex(Math.round(index));
    }

    var wheelAccum = 0;
    var wheelSettleTimer = null;

    function onWheel(event) {
      /* Only when the cursor is over a photo card */
      if (!event.target.closest || !event.target.closest(".project-coverflow__item")) return;

      /* Horizontal trackpad/wheel only — leave vertical page scroll alone */
      var dx = event.deltaX;
      if (Math.abs(dx) < 0.5) return;

      event.preventDefault();
      wheelAccum += dx;

      var step = Math.max(cardWidth() * 0.55, 90);
      if (Math.abs(wheelAccum) < step) {
        if (wheelSettleTimer) window.clearTimeout(wheelSettleTimer);
        wheelSettleTimer = window.setTimeout(function () {
          wheelAccum = 0;
          setIndex(Math.round(index));
        }, 140);
        return;
      }

      var steps = Math.trunc(wheelAccum / step);
      wheelAccum -= steps * step;
      setIndex(Math.round(index + steps));

      if (wheelSettleTimer) window.clearTimeout(wheelSettleTimer);
      wheelSettleTimer = window.setTimeout(function () {
        wheelAccum = 0;
        setIndex(Math.round(index));
      }, 140);
    }

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("lostpointercapture", onPointerUp);
    root.addEventListener("wheel", onWheel, { passive: false });

    window.addEventListener("resize", function () {
      render();
    });

    setIndex(index);
  })();

  (function initNmFindingsPan() {
    var root = document.querySelector("[data-nm-findings-pan]");
    if (!root) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      root.classList.add("is-duo");
      return;
    }

    var played = false;
    var timer = null;

    function clearTimer() {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function playOnce() {
      if (played) return;
      played = true;
      clearTimer();
      timer = window.setTimeout(function () {
        root.classList.add("is-duo");
      }, 2400);
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playOnce();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.25 }
      );
      observer.observe(root);
    } else {
      playOnce();
    }
  })();
})();
