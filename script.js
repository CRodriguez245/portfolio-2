(function () {
  "use strict";

  var STROKE_MS = 450;
  var FOCUS_MS = 500;
  var BOUNCE_MS = 400;
  var GAP_MS = 80;
  var GAUSSIAN_START = 6;
  var OFFSCREEN_PAD = 80;

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById("menuToggle");
  var mobileMenu = document.getElementById("mobileMenu");

  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("hidden") === false;
      toggle.setAttribute("aria-expanded", String(open));
    });

    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Project filter tabs ---------- */
  var tabs = document.querySelectorAll(".filter-tab");
  var projectCards = document.querySelectorAll(".project-card[data-category]");
  var cardVideoObserver = null;

  function playCardVideo(video) {
    if (!video) return;
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function pauseCardVideo(video) {
    if (!video) return;
    video.pause();
  }

  function syncCardVideos() {
    document.querySelectorAll("video.project-card__video").forEach(function (video) {
      var card = video.closest(".project-card");
      if (card && card.hidden) {
        pauseCardVideo(video);
        return;
      }
      var rect = video.getBoundingClientRect();
      var inView =
        rect.bottom > 0 &&
        rect.top < (window.innerHeight || document.documentElement.clientHeight);
      if (inView) playCardVideo(video);
      else pauseCardVideo(video);
    });
  }

  function initCardVideoObserver() {
    var videos = document.querySelectorAll("video.project-card__video");
    if (!videos.length) return;

    videos.forEach(function (video) {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "none";
    });

    if (!("IntersectionObserver" in window)) {
      syncCardVideos();
      return;
    }

    cardVideoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          var card = video.closest(".project-card");
          if (card && card.hidden) {
            pauseCardVideo(video);
            return;
          }
          if (entry.isIntersecting) playCardVideo(video);
          else pauseCardVideo(video);
        });
      },
      { rootMargin: "80px 0px", threshold: 0.15 }
    );

    videos.forEach(function (video) {
      cardVideoObserver.observe(video);
    });
  }

  function applyProjectFilter(filter) {
    projectCards.forEach(function (card) {
      var categories = card.getAttribute("data-category").split(/\s+/);
      card.hidden = categories.indexOf(filter) === -1;
      /* Research: CSS order swaps GPLXC ↔ BlueDot; Selected uses DOM order. */
      if (filter === "research" && card.hasAttribute("data-research-order")) {
        card.style.order = card.getAttribute("data-research-order");
      } else {
        card.style.order = "";
      }

      if (card.hidden) {
        card.querySelectorAll("video.project-card__video").forEach(pauseCardVideo);
      }
    });

    window.requestAnimationFrame(syncCardVideos);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var filter = tab.getAttribute("data-filter");
      tabs.forEach(function (t) {
        t.setAttribute("aria-selected", "false");
      });
      tab.setAttribute("aria-selected", "true");
      applyProjectFilter(filter);
    });
  });

  applyProjectFilter("selected");
  initCardVideoObserver();

  /* ---------- Hero draw animation (SVG only) ---------- */
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function animateStroke(path, duration) {
    return new Promise(function (resolve) {
      var length = path.getTotalLength();
      path.style.strokeDasharray = length + " " + length;
      path.style.strokeDashoffset = String(length);

      var start = performance.now();

      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        path.style.strokeDashoffset = String(length * (1 - easeInOut(t)));

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          path.style.strokeDasharray = "none";
          path.style.strokeDashoffset = "0";
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function easeOutBounce(t) {
    var n1 = 7.5625;
    var d1 = 2.75;

    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }

  function getOffScreenFallDistance(group) {
    var svg = group.ownerSVGElement;
    var path = group.querySelector("path");
    if (!svg || !path) return 400;

    group.removeAttribute("transform");

    var bbox = path.getBBox();
    var pt = svg.createSVGPoint();
    pt.x = bbox.x + bbox.width / 2;
    pt.y = bbox.y + bbox.height / 2;
    var screen = pt.matrixTransform(path.getScreenCTM());

    var vb = svg.viewBox.baseVal;
    var rect = svg.getBoundingClientRect();
    var pxPerSvgUnit = rect.height / vb.height;
    var radiusPx = (bbox.height / 2) * pxPerSvgUnit;
    var fallPx = screen.y - radiusPx + OFFSCREEN_PAD;

    return fallPx / pxPerSvgUnit;
  }

  function pickCircleAnim() {
    return Math.random() < 0.5 ? "blur" : "bounce";
  }

  function animateFallBounce(group, duration, fallDistance) {
    return new Promise(function (resolve) {
      group.removeAttribute("filter");
      group.style.opacity = "1";
      group.setAttribute("transform", "translate(0 " + -fallDistance + ")");

      var start = performance.now();

      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        var y = -fallDistance * (1 - easeOutBounce(t));
        group.setAttribute("transform", "translate(0 " + y + ")");

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          group.removeAttribute("transform");
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function animateCircle(group, svg, animType, fallDistance) {
    if (animType === "bounce") {
      return animateFallBounce(group, BOUNCE_MS, fallDistance);
    }
    return animateGaussianBlur(group, svg, FOCUS_MS);
  }

  function getGaussianBlurNode(svg) {
    return svg.querySelector("#hero-gaussian feGaussianBlur");
  }

  function setGaussianBlur(svg, amount) {
    var node = getGaussianBlurNode(svg);
    if (node) {
      node.setAttribute("stdDeviation", String(amount));
    }
  }

  function hideCircle(group) {
    group.removeAttribute("transform");
    group.removeAttribute("filter");
    group.style.opacity = "0";
  }

  function showCircleBlurred(group, svg) {
    group.style.opacity = "0";
    group.setAttribute("filter", "url(#hero-gaussian)");
    setGaussianBlur(svg, GAUSSIAN_START);
  }

  function animateGaussianBlur(group, svg, duration) {
    return new Promise(function (resolve) {
      showCircleBlurred(group, svg);

      var start = performance.now();

      function frame(now) {
        var t = Math.min((now - start) / duration, 1);

        /* First 25%: fade in while fully blurred */
        if (t < 0.25) {
          group.style.opacity = String(easeInOut(t / 0.25));
          setGaussianBlur(svg, GAUSSIAN_START);
        } else {
          group.style.opacity = "1";
          var blurT = (t - 0.25) / 0.75;
          setGaussianBlur(svg, GAUSSIAN_START * (1 - easeInOut(blurT)));
        }

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          group.removeAttribute("filter");
          group.style.opacity = "1";
          setGaussianBlur(svg, 0);
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function initHeroDraw() {
    var svg = document.querySelector(".hero-viz");
    if (!svg) return;

    var circleAnim = pickCircleAnim();
    var fallDistance = 0;
    var circleGroup = svg.querySelector(".hero-draw-circle");

    if (circleGroup && circleAnim === "bounce") {
      fallDistance = getOffScreenFallDistance(circleGroup);
    }

    var shapes = Array.prototype.slice
      .call(svg.querySelectorAll("[data-order]"))
      .sort(function (a, b) {
        return (
          parseInt(a.getAttribute("data-order"), 10) -
          parseInt(b.getAttribute("data-order"), 10)
        );
      });

    shapes.forEach(function (shape) {
      if (shape.classList.contains("hero-draw-stroke")) {
        var length = shape.getTotalLength();
        shape.style.strokeDasharray = length + " " + length;
        shape.style.strokeDashoffset = String(length);
      } else if (shape.classList.contains("hero-draw-circle")) {
        hideCircle(shape);
      } else {
        shape.style.opacity = "0";
      }
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shapes.forEach(function (shape) {
        if (shape.classList.contains("hero-draw-stroke")) {
          shape.style.strokeDasharray = "none";
          shape.style.strokeDashoffset = "0";
        } else if (shape.classList.contains("hero-draw-circle")) {
          shape.removeAttribute("filter");
          setGaussianBlur(svg, 0);
          shape.style.opacity = "1";
        } else {
          shape.removeAttribute("transform");
          shape.style.opacity = "1";
        }
      });
      return;
    }

    (async function runSequence() {
      var byOrder = {};
      shapes.forEach(function (shape) {
        var order = parseInt(shape.getAttribute("data-order"), 10);
        byOrder[order] = shape;
      });

      /* 1 — black circle + green triangle together */
      await Promise.all([
        animateStroke(byOrder[1], STROKE_MS),
        animateStroke(byOrder[2], STROKE_MS),
      ]);
      await wait(GAP_MS);

      /* 2 — green circle: random blur or bounce */
      await animateCircle(byOrder[3], svg, circleAnim, fallDistance);
      await wait(GAP_MS);

      /* 3 — black triangle */
      await animateStroke(byOrder[4], STROKE_MS);
    })();
  }

  function animateShapeFill(shape, duration, options) {
    return new Promise(function (resolve) {
      var opts = options || {};
      var targetOpacity = parseFloat(shape.dataset.fillOpacity || "1");
      var useBlur =
        opts.forceBlur === true
          ? true
          : opts.forceBlur === false
            ? false
            : Math.random() < 0.5;
      var blurAmount =
        typeof opts.blurAmount === "number"
          ? opts.blurAmount
          : 3 + Math.random() * 5;
      // Bring opacity up early so blur is visible while the fill is already on-screen
      var opacityWindow =
        typeof opts.opacityWindow === "number" ? opts.opacityWindow : 1;
      var useSvgBlur = opts.useSvgBlur === true && opts.svgBlurNode;
      var svgFilterId = opts.svgFilterId;
      var start = performance.now();

      if (useBlur && useSvgBlur && svgFilterId) {
        shape.setAttribute("filter", "url(#" + svgFilterId + ")");
        opts.svgBlurNode.setAttribute("stdDeviation", String(blurAmount));
      }

      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        var opacityT = Math.min(t / opacityWindow, 1);
        shape.style.fillOpacity = String(targetOpacity * easeInOut(opacityT));
        if (useBlur) {
          var currentBlur = blurAmount * (1 - easeInOut(t));
          if (useSvgBlur) {
            opts.svgBlurNode.setAttribute(
              "stdDeviation",
              String(Math.max(0, currentBlur))
            );
          } else {
            shape.style.filter = "blur(" + currentBlur + "px)";
          }
        }

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          shape.style.fillOpacity = String(targetOpacity);
          if (useSvgBlur) {
            shape.removeAttribute("filter");
            opts.svgBlurNode.setAttribute("stdDeviation", "0");
          } else {
            shape.style.removeProperty("filter");
          }
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function isGreenFilledCircle(shape) {
    var fill = (shape.getAttribute("fill") || "").toLowerCase();
    var tagName = shape.tagName.toLowerCase();

    if (fill !== "#80c343") return false;
    if (tagName === "circle" || tagName === "ellipse") return true;
    if (tagName !== "path") return false;

    var pathData = shape.getAttribute("d") || "";
    return /c/i.test(pathData) && !/l/i.test(pathData);
  }

  function animateShapeBounce(shape, duration) {
    return new Promise(function (resolve) {
      var targetOpacity = parseFloat(shape.dataset.fillOpacity || "1");
      var bounds = shape.getBoundingClientRect();
      var fallDistance = bounds.top + bounds.height + 24;
      var start = performance.now();

      shape.style.transformBox = "fill-box";
      shape.style.transformOrigin = "center";

      function frame(now) {
        var t = Math.min((now - start) / duration, 1);
        var y = -fallDistance * (1 - easeOutBounce(t));
        shape.style.transform = "translateY(" + y + "px)";
        shape.style.fillOpacity = String(
          targetOpacity * Math.min(easeInOut(t * 2), 1)
        );

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          shape.style.removeProperty("transform");
          shape.style.removeProperty("transform-box");
          shape.style.removeProperty("transform-origin");
          shape.style.fillOpacity = String(targetOpacity);
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function prepareShapeGeometry(shape) {
    var stroke = shape.getAttribute("stroke");
    var fill = shape.getAttribute("fill");
    var hasStroke =
      stroke &&
      stroke !== "none" &&
      typeof shape.getTotalLength === "function";
    var hasFill = fill && fill !== "none";

    if (hasStroke) {
      var length = shape.getTotalLength();
      shape.style.strokeDasharray = length + " " + length;
      shape.style.strokeDashoffset = String(length);
    }

    if (hasFill) {
      shape.dataset.fillOpacity = shape.getAttribute("fill-opacity") || "1";
      shape.style.fillOpacity = "0";
    }

    return { hasStroke: hasStroke, hasFill: hasFill };
  }

  function animateShapeSvg(svg, delay) {
    var geometries = Array.prototype.slice.call(
      svg.querySelectorAll("path, circle, ellipse, rect, polygon, polyline, line")
    );
    var strokeDuration = 260 + Math.random() * 500;
    var fillDuration = 220 + Math.random() * 380;
    var bounceDuration = 480 + Math.random() * 360;
    var prepared = geometries.map(function (shape) {
      return { shape: shape, state: prepareShapeGeometry(shape) };
    });

    window.setTimeout(function () {
      prepared.forEach(function (item) {
        var animations = [];

        if (item.state.hasStroke) {
          animations.push(animateStroke(item.shape, strokeDuration));
        }
        if (item.state.hasFill) {
          if (isGreenFilledCircle(item.shape) && Math.random() < 0.5) {
            animations.push(animateShapeBounce(item.shape, bounceDuration));
          } else {
            animations.push(animateShapeFill(item.shape, fillDuration));
          }
        }

        Promise.all(animations).then(function () {
          item.shape.style.strokeDasharray = "none";
          item.shape.style.strokeDashoffset = "0";
        });
      });
    }, delay);
  }

  function shuffleShapes(shapes) {
    var shuffled = shapes.slice();

    for (var index = shuffled.length - 1; index > 0; index -= 1) {
      var randomIndex = Math.floor(Math.random() * (index + 1));
      var current = shuffled[index];
      shuffled[index] = shuffled[randomIndex];
      shuffled[randomIndex] = current;
    }

    return shuffled;
  }

  function positionAnnotatorTooltip(target, tooltip) {
    var targetBounds = target.getBoundingClientRect();
    var container = tooltip.offsetParent;
    if (!container) return;

    var containerBounds = container.getBoundingClientRect();
    var tooltipBounds = tooltip.getBoundingClientRect();
    var gutter = 8;
    var offset = 10;
    var left =
      targetBounds.left +
      targetBounds.width / 2 -
      tooltipBounds.width / 2 -
      containerBounds.left;
    var top = targetBounds.bottom - containerBounds.top + offset;

    left = Math.max(
      gutter,
      Math.min(left, containerBounds.width - tooltipBounds.width - gutter)
    );

    if (top + tooltipBounds.height > containerBounds.height - gutter) {
      top =
        targetBounds.top -
        containerBounds.top -
        tooltipBounds.height -
        offset;
    }

    top = Math.max(
      gutter,
      Math.min(top, containerBounds.height - tooltipBounds.height - gutter)
    );

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function positionAnnotatorTooltipAtPointer(event, tooltip) {
    var container = tooltip.offsetParent;
    if (!container) return;

    var containerBounds = container.getBoundingClientRect();
    var tooltipBounds = tooltip.getBoundingClientRect();
    var gutter = 8;
    var offset = 14;
    var pointerX = event.clientX - containerBounds.left;
    var pointerY = event.clientY - containerBounds.top;
    var left = pointerX + offset;
    var top = pointerY + offset;

    if (left + tooltipBounds.width > containerBounds.width - gutter) {
      left = pointerX - tooltipBounds.width - offset;
    }
    if (top + tooltipBounds.height > containerBounds.height - gutter) {
      top = pointerY - tooltipBounds.height - offset;
    }

    left = Math.max(
      gutter,
      Math.min(left, containerBounds.width - tooltipBounds.width - gutter)
    );
    top = Math.max(
      gutter,
      Math.min(top, containerBounds.height - tooltipBounds.height - gutter)
    );

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function initAnnotatorTooltips(grid, svgs, metadata) {
    var tooltip = document.getElementById("annotator-shape-tooltip");
    if (!tooltip) return;

    var name = tooltip.querySelector(".annotator-shape-tooltip__name");
    var theme = tooltip.querySelector(".annotator-shape-tooltip__theme");
    var quote = tooltip.querySelector(".annotator-shape-tooltip__quote");
    var activeShape = null;

    function showTooltip(shape, record, pointerEvent) {
      activeShape = shape;
      name.textContent = record.annotator;
      theme.textContent = record.theme;
      quote.textContent = "\u201c" + record.quote + "\u201d";
      tooltip.style.left = "0";
      tooltip.style.top = "0";
      if (pointerEvent) {
        positionAnnotatorTooltipAtPointer(pointerEvent, tooltip);
      } else {
        positionAnnotatorTooltip(shape, tooltip);
      }
      tooltip.classList.add("is-visible");
      tooltip.setAttribute("aria-hidden", "false");
    }

    function hideTooltip() {
      activeShape = null;
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
    }

    svgs.forEach(function (svg, index) {
      if (!svg) return;

      var row = Math.floor(index / 12) + 1;
      var column = (index % 12) + 1;
      var position = "R" + row + "C" + column;
      var record = metadata[position];
      if (!record) return;

      svg.dataset.position = position;
      svg.setAttribute("tabindex", "0");
      svg.setAttribute("role", "button");
      svg.setAttribute(
        "aria-label",
        record.annotator + ", " + record.theme + ". " + record.quote
      );
      svg.removeAttribute("aria-hidden");

      svg.addEventListener("mouseenter", function (event) {
        showTooltip(svg, record, event);
      });
      svg.addEventListener("mousemove", function (event) {
        if (activeShape === svg) {
          positionAnnotatorTooltipAtPointer(event, tooltip);
        }
      });
      svg.addEventListener("mouseleave", hideTooltip);
      svg.addEventListener("focus", function () {
        showTooltip(svg, record);
      });
      svg.addEventListener("blur", hideTooltip);
      svg.addEventListener("click", function () {
        showTooltip(svg, record);
      });
      svg.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          hideTooltip();
          svg.blur();
        }
      });
    });

    window.addEventListener("resize", function () {
      if (activeShape) positionAnnotatorTooltip(activeShape, tooltip);
    });
    window.addEventListener("scroll", hideTooltip, { passive: true });
  }

  function initAnnotatorShapeDraw() {
    var grid = document.querySelector(".project-hero__shape-grid");
    if (!grid) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    var images = Array.prototype.slice.call(grid.querySelectorAll("img"));
    var metadataUrl = grid.dataset.metadataUrl;
    // Keep the hero blank until shapes are prepared and ready to draw in
    grid.classList.add("is-loading");

    var shapePromise = Promise.all(
      images.map(function (image) {
        return fetch(image.src)
          .then(function (response) {
            if (!response.ok) throw new Error("Unable to load shape");
            return response.text();
          })
          .then(function (markup) {
            var documentNode = new DOMParser().parseFromString(
              markup,
              "image/svg+xml"
            );
            var svg = documentNode.documentElement;

            if (!svg || svg.nodeName.toLowerCase() !== "svg") return null;

            svg.classList.add("project-hero__shape");
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
            image.replaceWith(svg);

            // Prepare after insert so getTotalLength() is reliable, while still hidden
            if (!reduceMotion) {
              var geometries = svg.querySelectorAll(
                "path, circle, ellipse, rect, polygon, polyline, line"
              );
              Array.prototype.forEach.call(geometries, prepareShapeGeometry);
            }

            return svg;
          })
          .catch(function () {
            return null;
          });
      })
    );

    var metadataPromise = metadataUrl
      ? fetch(metadataUrl)
          .then(function (response) {
            if (!response.ok) throw new Error("Unable to load metadata");
            return response.json();
          })
          .catch(function () {
            return {};
          })
      : Promise.resolve({});

    Promise.all([shapePromise, metadataPromise]).then(function (results) {
      var svgs = results[0];
      var metadata = results[1];
      var loaded = svgs.filter(Boolean);
      var randomized = shuffleShapes(loaded);

      initAnnotatorTooltips(grid, svgs, metadata);

      if (reduceMotion) {
        grid.classList.remove("is-loading");
        return;
      }

      // Reveal blank prepared shapes, then draw them in
      grid.classList.remove("is-loading");
      requestAnimationFrame(function () {
        randomized.forEach(function (svg, index) {
          animateShapeSvg(svg, index * 24);
        });
      });
    });
  }

  function initHeroAnimations() {
    initHeroDraw();
    initAnnotatorShapeDraw();
    initHeroProjectTooltip();
  }

  function initHeroProjectTooltip() {
    var graphic = document.querySelector(".hero-graphic");
    var link = document.querySelector(".hero-graphic__link");
    var tooltip = document.querySelector(".hero-graphic__tooltip");
    if (!graphic || !link || !tooltip) return;

    function positionTooltip(event) {
      var containerBounds = graphic.getBoundingClientRect();
      var tooltipBounds = tooltip.getBoundingClientRect();
      var offset = 14;
      var pointerX =
        (event && typeof event.clientX === "number"
          ? event.clientX
          : containerBounds.left + containerBounds.width / 2) -
        containerBounds.left;
      var pointerY =
        (event && typeof event.clientY === "number"
          ? event.clientY
          : containerBounds.top + containerBounds.height / 2) -
        containerBounds.top;

      var left = pointerX + offset;
      var top = pointerY + offset;
      var width = tooltip.offsetWidth || tooltipBounds.width;
      var height = tooltip.offsetHeight || tooltipBounds.height;

      if (left + width > containerBounds.width + 120) {
        left = pointerX - width - offset;
      }
      if (top + height > containerBounds.height + 80) {
        top = pointerY - height - offset;
      }

      left = Math.max(-8, left);
      top = Math.max(-8, top);

      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }

    function showTooltip(event) {
      tooltip.classList.add("is-visible");
      tooltip.setAttribute("aria-hidden", "false");
      positionTooltip(event);
    }

    function hideTooltip() {
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
    }

    link.addEventListener("pointerenter", showTooltip);
    link.addEventListener("pointermove", positionTooltip);
    link.addEventListener("pointerleave", hideTooltip);
    link.addEventListener("focus", function () {
      showTooltip(null);
    });
    link.addEventListener("blur", hideTooltip);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroAnimations);
  } else {
    initHeroAnimations();
  }

  /* Reset scroll after bfcache restore when landing at home */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && (!location.hash || location.hash === "#top")) {
      window.scrollTo(0, 0);
    }
  });

  /* ---------- Venezuela choropleth reveal ---------- */
  function initVenezuelaChoropleth() {
    var host = document.querySelector("[data-choropleth-src]");
    if (!host) return;

    var src = host.getAttribute("data-choropleth-src");
    if (!src) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error("Choropleth SVG failed to load");
        return response.text();
      })
      .then(function (svgText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(svgText, "image/svg+xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Choropleth SVG parse error");
        }

        var svg = doc.documentElement;
        svg.setAttribute("role", "presentation");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        var circles = svg.querySelectorAll("circle");
        circles.forEach(function (circle) {
          var fill = (circle.getAttribute("fill") || "").toUpperCase();
          circle.classList.add("choropleth-dot");
          if (fill === "#130091") {
            circle.classList.add("choropleth-dot--strong");
          }
          circle.setAttribute("fill", "#80C343");
        });

        host.appendChild(document.importNode(svg, true));

        function revealMap() {
          var strongDots = host.querySelectorAll(".choropleth-dot--strong");
          strongDots.forEach(function (dot) {
            var delay = reduceMotion ? 0 : 0.15 + Math.random() * 0.9;
            dot.style.transitionDelay = delay.toFixed(3) + "s";
          });
          host.classList.add("is-revealed");
        }

        if (reduceMotion) {
          revealMap();
          return;
        }

        if (!("IntersectionObserver" in window)) {
          window.setTimeout(revealMap, 400);
          return;
        }

        var hasStarted = false;
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting || hasStarted) return;
              hasStarted = true;
              observer.unobserve(host);
              window.setTimeout(revealMap, 350);
            });
          },
          { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
        );
        observer.observe(host);
      })
      .catch(function () {
        var fallback = document.createElement("img");
        fallback.className = "project-annotators-viz__map-fallback";
        fallback.src = src;
        fallback.alt = host.getAttribute("aria-label") || "";
        host.appendChild(fallback);
      });
  }

  initVenezuelaChoropleth();

  /* ---------- Global systems map group pulse ---------- */
  function initGlobalSystemsMap() {
    var host = document.querySelector("[data-global-map-src]");
    if (!host) return;

    var src = host.getAttribute("data-global-map-src");
    if (!src) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idleFill = "#EDEDED";
    var activeFill = "#80C343";

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error("Global map SVG failed to load");
        return response.text();
      })
      .then(function (svgText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(svgText, "image/svg+xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Global map SVG parse error");
        }

        var svg = doc.documentElement;
        svg.setAttribute("role", "presentation");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        var groups = {};
        var groupKeys = [];
        var shapes = svg.querySelectorAll("path, circle");

        shapes.forEach(function (shape) {
          var fill = (shape.getAttribute("fill") || "").trim();
          if (!fill || fill.toLowerCase() === "none") return;

          var key = fill.toUpperCase();
          if (key === "WHITE" || key === "#FFF" || key === "#FFFFFF") {
            shape.classList.add("global-map-dot");
            shape.setAttribute("fill", idleFill);
            return;
          }

          if (key.charAt(0) !== "#") return;

          shape.classList.add("global-map-dot");
          shape.setAttribute("data-group", key);
          shape.setAttribute("fill", idleFill);

          if (!groups[key]) {
            groups[key] = [];
            groupKeys.push(key);
          }
          groups[key].push(shape);
        });

        host.appendChild(document.importNode(svg, true));

        // Re-query live nodes after import
        groupKeys.forEach(function (key) {
          groups[key] = Array.prototype.slice.call(
            host.querySelectorAll('.global-map-dot[data-group="' + key + '"]')
          );
        });

        if (reduceMotion || groupKeys.length === 0) {
          // Restore original regional colors for reduced motion
          groupKeys.forEach(function (key) {
            groups[key].forEach(function (dot) {
              dot.setAttribute("fill", key);
            });
          });
          return;
        }

        var lastIndex = -1;
        var cycleTimer = null;
        var isRunning = false;

        var STAGGER_MAX = 0.7;

        function setGroupActive(key, active) {
          groups[key].forEach(function (dot) {
            dot.style.transitionDelay = (Math.random() * STAGGER_MAX).toFixed(3) + "s";
            if (active) {
              dot.classList.add("is-active");
            } else {
              dot.classList.remove("is-active");
            }
          });
        }

        function pickNextIndex() {
          if (groupKeys.length === 1) return 0;
          var next = Math.floor(Math.random() * groupKeys.length);
          while (next === lastIndex) {
            next = Math.floor(Math.random() * groupKeys.length);
          }
          return next;
        }

        function runCycle() {
          if (!isRunning) return;

          var index = pickNextIndex();
          lastIndex = index;
          var key = groupKeys[index];

          setGroupActive(key, true);

          cycleTimer = window.setTimeout(function () {
            setGroupActive(key, false);
            cycleTimer = window.setTimeout(runCycle, 600);
          }, 2200);
        }

        function start() {
          if (isRunning) return;
          isRunning = true;
          runCycle();
        }

        function stop() {
          isRunning = false;
          if (cycleTimer) {
            window.clearTimeout(cycleTimer);
            cycleTimer = null;
          }
          groupKeys.forEach(function (key) {
            setGroupActive(key, false);
          });
        }

        if (!("IntersectionObserver" in window)) {
          start();
          return;
        }

        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                start();
              } else {
                stop();
              }
            });
          },
          { threshold: 0.25 }
        );
        observer.observe(host);
      })
      .catch(function () {
        var fallback = document.createElement("img");
        fallback.src = src;
        fallback.alt = host.getAttribute("aria-label") || "";
        fallback.className = "project-annotators-global__map";
        host.replaceWith(fallback);
      });
  }

  initGlobalSystemsMap();

  /* ---------- Choropleth maps with country tooltips ---------- */
  function countryNameFromCode(code) {
    if (!code) return "";
    try {
      if (typeof Intl !== "undefined" && Intl.DisplayNames) {
        var names = new Intl.DisplayNames(["en"], { type: "region" });
        var label = names.of(code.toUpperCase());
        if (label) return label;
      }
    } catch (error) {
      /* fall through */
    }
    return code.toUpperCase();
  }

  function positionReportingTooltip(event, tooltip, container) {
    var containerBounds = container.getBoundingClientRect();
    var tooltipBounds = tooltip.getBoundingClientRect();
    var gutter = 8;
    var offset = 14;
    var pointerX = event.clientX - containerBounds.left;
    var pointerY = event.clientY - containerBounds.top;
    var left = pointerX + offset;
    var top = pointerY + offset;

    if (left + tooltipBounds.width > containerBounds.width - gutter) {
      left = pointerX - tooltipBounds.width - offset;
    }
    if (top + tooltipBounds.height > containerBounds.height - gutter) {
      top = pointerY - tooltipBounds.height - offset;
    }

    left = Math.max(
      gutter,
      Math.min(left, containerBounds.width - tooltipBounds.width - gutter)
    );
    top = Math.max(
      gutter,
      Math.min(top, containerBounds.height - tooltipBounds.height - gutter)
    );

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function initChoroplethCountryMap(host) {
    var src = host.getAttribute("data-choropleth-map-src");
    var figure = host.closest(".project-annotators-choropleth__figure");
    var tooltip = figure && figure.querySelector(".reporting-country-tooltip");
    if (!src || !figure || !tooltip) return;

    var nameEl = tooltip.querySelector(".reporting-country-tooltip__name");
    var activeCountry = null;

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error("Choropleth map SVG failed to load");
        return response.text();
      })
      .then(function (svgText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(svgText, "image/svg+xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Choropleth map SVG parse error");
        }

        var svg = doc.documentElement;
        svg.setAttribute("role", "presentation");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        function markCountry(path, code) {
          path.classList.add("reporting-country");
          path.setAttribute("data-country", code.toUpperCase());
          path.setAttribute("tabindex", "0");
          path.setAttribute("role", "img");
          path.setAttribute("aria-label", countryNameFromCode(code));
        }

        svg.querySelectorAll("path[id]").forEach(function (path) {
          var code = path.getAttribute("id");
          if (!code || code.length !== 2) return;
          markCountry(path, code);
        });

        var indiaGroup = svg.querySelector('g[id="IN"]');
        if (indiaGroup) {
          indiaGroup.querySelectorAll("path").forEach(function (path) {
            markCountry(path, "IN");
          });
        }

        host.appendChild(document.importNode(svg, true));

        var liveNodes = host.querySelectorAll(".reporting-country");

        function showTooltip(code, event) {
          activeCountry = code;
          nameEl.textContent = countryNameFromCode(code);
          tooltip.style.left = "0";
          tooltip.style.top = "0";
          tooltip.classList.add("is-visible");
          tooltip.setAttribute("aria-hidden", "false");
          if (event) positionReportingTooltip(event, tooltip, figure);
        }

        function hideTooltip() {
          activeCountry = null;
          tooltip.classList.remove("is-visible");
          tooltip.setAttribute("aria-hidden", "true");
          liveNodes.forEach(function (node) {
            node.classList.remove("is-hovered");
          });
        }

        liveNodes.forEach(function (node) {
          var code = node.getAttribute("data-country");
          if (!code) return;

          node.addEventListener("mouseenter", function (event) {
            node.classList.add("is-hovered");
            showTooltip(code, event);
          });
          node.addEventListener("mousemove", function (event) {
            if (activeCountry === code) {
              positionReportingTooltip(event, tooltip, figure);
            }
          });
          node.addEventListener("mouseleave", hideTooltip);
          node.addEventListener("focus", function () {
            node.classList.add("is-hovered");
            showTooltip(code);
            var bounds = node.getBoundingClientRect();
            var figureBounds = figure.getBoundingClientRect();
            tooltip.style.left =
              Math.max(8, bounds.left - figureBounds.left) + "px";
            tooltip.style.top =
              Math.max(8, bounds.top - figureBounds.top - 36) + "px";
          });
          node.addEventListener("blur", hideTooltip);
        });

        window.addEventListener("scroll", hideTooltip, { passive: true });
      })
      .catch(function () {
        var fallback = document.createElement("img");
        fallback.className = host.className;
        fallback.src = src;
        fallback.alt = host.getAttribute("aria-label") || "";
        host.replaceWith(fallback);
      });
  }

  function initChoroplethCountryMaps() {
    document.querySelectorAll("[data-choropleth-map-src]").forEach(initChoroplethCountryMap);
  }

  initChoroplethCountryMaps();

  /* ---------- Reporting → readiness choropleth scroll morph ---------- */
  function initChoroplethStoryScroll() {
    var story = document.querySelector("[data-choropleth-story]");
    if (!story) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    var reportingPanel = story.querySelector('[data-choropleth-panel="reporting"]');
    var readinessPanel = story.querySelector('[data-choropleth-panel="readiness"]');
    var reportingMap = story.querySelector('[data-choropleth-map-panel="reporting"]');
    var readinessMap = story.querySelector('[data-choropleth-map-panel="readiness"]');
    var reportingCaption = story.querySelector('[data-choropleth-caption="reporting"]');
    var readinessCaption = story.querySelector('[data-choropleth-caption="readiness"]');
    var ticking = false;

    function applyFade(el, value, interactive) {
      if (!el) return;
      el.style.opacity = String(value);
      el.style.visibility = value <= 0.02 ? "hidden" : "visible";
      el.style.pointerEvents = interactive ? "auto" : "none";
      el.classList.toggle("is-active", interactive);
      el.setAttribute("aria-hidden", interactive ? "false" : "true");
    }

    function update() {
      ticking = false;
      var rect = story.getBoundingClientRect();
      var scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
      var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      var fade = Math.min(1, Math.max(0, (progress - 0.28) / 0.34));
      var showReadiness = fade >= 0.5;

      applyFade(reportingPanel, 1 - fade, !showReadiness);
      applyFade(readinessPanel, fade, showReadiness);
      applyFade(reportingMap, 1 - fade, !showReadiness);
      applyFade(readinessMap, fade, showReadiness);
      applyFade(reportingCaption, 1 - fade, !showReadiness);
      applyFade(readinessCaption, fade, showReadiness);

      if (fade > 0.02 && fade < 0.98) {
        story.querySelectorAll(".reporting-country-tooltip.is-visible").forEach(function (tip) {
          tip.classList.remove("is-visible");
          tip.setAttribute("aria-hidden", "true");
        });
      }
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
  }

  initChoroplethStoryScroll();

  /* ---------- Connectivity chart: hover + Venezuela zoom ---------- */
  function initConnectivityChart() {
    var host = document.querySelector("[data-connectivity-chart-src]");
    if (!host) return;

    var src = host.getAttribute("data-connectivity-chart-src");
    var story = document.querySelector("[data-connectivity-story]");
    var copy = document.querySelector("[data-connectivity-copy]");
    if (!src) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var START_VIEW = [0, 0, 628, 877];
    var END_VIEW = [448, 540, 178, 345];
    var BASE_RADIUS = 2.5;
    var SPHERE_RADIUS = 9;
    var SPHERE_STOPS = [
      ["0%", "#EAF7D4"],
      ["28%", "#B7E06A"],
      ["58%", "#8FCB4A"],
      ["82%", "#6AAD36"],
      ["100%", "#4F8528"],
    ];

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error("Connectivity chart SVG failed to load");
        return response.text();
      })
      .then(function (svgText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(svgText, "image/svg+xml");
        if (doc.querySelector("parsererror")) {
          throw new Error("Connectivity chart SVG parse error");
        }

        var svg = doc.documentElement;
        svg.setAttribute("role", "presentation");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("viewBox", START_VIEW.join(" "));

        var defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.insertBefore(defs, svg.firstChild);

        // The five Venezuela dots (Empty column, 2015–2020)
        var venezuelaCoords = [
          [547.5, 588.5],
          [538.5, 635.5],
          [530.5, 700.5],
          [537.5, 786.5],
          [538.5, 825.5],
        ];

        function isVenezuelaDot(cx, cy) {
          return venezuelaCoords.some(function (coord) {
            return Math.abs(coord[0] - cx) < 0.6 && Math.abs(coord[1] - cy) < 0.6;
          });
        }

        var venezuelaDots = [];
        svg.querySelectorAll("circle").forEach(function (dot) {
          var cx = Number(dot.getAttribute("cx"));
          var cy = Number(dot.getAttribute("cy"));
          dot.classList.add("connectivity-dot");
          if (isVenezuelaDot(cx, cy)) {
            dot.classList.add("connectivity-dot--venezuela");
            dot.setAttribute("fill", "#80C343");
            venezuelaDots.push(dot);
          }
        });

        venezuelaDots.forEach(function (dot) {
          svg.appendChild(dot);
        });

        host.appendChild(document.importNode(svg, true));

        var liveSvg = host.querySelector("svg");
        var liveDefs = liveSvg.querySelector("defs");
        var ns = "http://www.w3.org/2000/svg";
        var viewT = 0;
        var sphereT = 0;

        function lerp(a, b, t) {
          return a + (b - a) * t;
        }

        function easeInOut(t) {
          return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        function currentView() {
          return START_VIEW.map(function (start, index) {
            return lerp(start, END_VIEW[index], viewT);
          });
        }

        function lightPoint() {
          var view = currentView();
          return {
            x: view[0] + view[2] * 0.2,
            y: view[1] + view[3] * 0.14,
          };
        }

        function updateSphereLighting(sphere, cx, cy, radius, lit) {
          if (!lit || radius < 3.2) {
            sphere.element.setAttribute("fill", "#80C343");
            return;
          }

          var light = lightPoint();
          var lx = light.x - cx;
          var ly = light.y - cy;
          var len = Math.sqrt(lx * lx + ly * ly) || 1;
          lx /= len;
          ly /= len;

          var hx = cx + lx * radius * 0.32;
          var hy = cy + ly * radius * 0.32;
          var fx = cx + lx * radius * 0.42;
          var fy = cy + ly * radius * 0.42;

          sphere.gradient.setAttribute("cx", hx.toFixed(2));
          sphere.gradient.setAttribute("cy", hy.toFixed(2));
          sphere.gradient.setAttribute("fx", fx.toFixed(2));
          sphere.gradient.setAttribute("fy", fy.toFixed(2));
          sphere.gradient.setAttribute("r", (radius * 1.28).toFixed(2));
          sphere.element.setAttribute("fill", "url(#" + sphere.gradientId + ")");
        }

        var spheres = Array.prototype.map.call(
          liveSvg.querySelectorAll(".connectivity-dot--venezuela"),
          function (dot, index) {
            var baseX = Number(dot.getAttribute("cx"));
            var baseY = Number(dot.getAttribute("cy"));
            var gradientId = "connectivity-sphere-fill-" + index;

            var gradient = document.createElementNS(ns, "radialGradient");
            gradient.setAttribute("id", gradientId);
            gradient.setAttribute("gradientUnits", "userSpaceOnUse");
            SPHERE_STOPS.forEach(function (stopData) {
              var stop = document.createElementNS(ns, "stop");
              stop.setAttribute("offset", stopData[0]);
              stop.setAttribute("stop-color", stopData[1]);
              gradient.appendChild(stop);
            });
            liveDefs.appendChild(gradient);

            var group = document.createElementNS(ns, "g");
            group.classList.add("connectivity-sphere");

            var ball = document.createElementNS(ns, "circle");
            ball.classList.add("connectivity-dot", "connectivity-dot--venezuela");
            ball.setAttribute("cx", String(baseX));
            ball.setAttribute("cy", String(baseY));
            ball.setAttribute("r", String(BASE_RADIUS));
            ball.setAttribute("fill", "#80C343");

            group.appendChild(ball);
            dot.parentNode.replaceChild(group, dot);

            return {
              element: ball,
              gradient: gradient,
              gradientId: gradientId,
              baseX: baseX,
              baseY: baseY,
              ox: 0,
              oy: 0,
              targetOx: 0,
              targetOy: 0,
              vx: 0,
              vy: 0,
            };
          }
        );

        var dots = [];
        spheres.forEach(function (sphere) {
          dots.push({
            element: sphere.element,
            sphere: sphere,
            baseX: sphere.baseX,
            baseY: sphere.baseY,
            ox: 0,
            oy: 0,
            targetOx: 0,
            targetOy: 0,
            vx: 0,
            vy: 0,
            isSphere: true,
          });
        });

        function applyZoom(progress) {
          viewT = easeInOut(Math.min(1, Math.max(0, (progress - 0.08) / 0.62)));
          sphereT = easeInOut(Math.min(1, Math.max(0, (progress - 0.28) / 0.45)));

          liveSvg.setAttribute("viewBox", currentView().join(" "));

          var lit = sphereT > 0.08;
          spheres.forEach(function (sphere) {
            var radius = lerp(BASE_RADIUS, SPHERE_RADIUS, sphereT);
            var cx = sphere.baseX + sphere.ox;
            var cy = sphere.baseY + sphere.oy;
            sphere.element.setAttribute("r", radius.toFixed(2));
            sphere.element.setAttribute("cx", cx.toFixed(2));
            sphere.element.setAttribute("cy", cy.toFixed(2));
            updateSphereLighting(sphere, cx, cy, radius, lit);
          });

          if (copy) {
            var copyT = easeInOut(Math.min(1, Math.max(0, (progress - 0.35) / 0.35)));
            copy.style.opacity = String(copyT);
            copy.style.transform = "translateY(" + ((1 - copyT) * 0.75).toFixed(2) + "rem)";
            copy.classList.toggle("is-visible", copyT > 0.5);
            copy.setAttribute("aria-hidden", copyT > 0.5 ? "false" : "true");
          }
        }

        if (story && !reduceMotion) {
          var ticking = false;

          function updateStory() {
            ticking = false;
            var rect = story.getBoundingClientRect();
            var scrollable = Math.max(1, story.offsetHeight - window.innerHeight);
            var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
            applyZoom(progress);
          }

          function onScroll() {
            if (!ticking) {
              ticking = true;
              window.requestAnimationFrame(updateStory);
            }
          }

          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
          updateStory();
        } else if (reduceMotion) {
          applyZoom(1);
        }

        if (reduceMotion) return;

        var pointerLocal = null;
        var motionFrame = null;

        function setTargets() {
          var zoomBoost = sphereT;
          var influenceRadius = lerp(34, 30, zoomBoost);
          var maxShift = lerp(3.2, 5.5, zoomBoost);

          dots.forEach(function (dot) {
            if (!pointerLocal) {
              dot.targetOx = 0;
              dot.targetOy = 0;
              return;
            }

            var dx = dot.baseX - pointerLocal.x;
            var dy = dot.baseY - pointerLocal.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 0.001 || distance >= influenceRadius) {
              dot.targetOx = 0;
              dot.targetOy = 0;
              return;
            }

            var strength = Math.pow(1 - distance / influenceRadius, 1.45);
            var shift = maxShift * strength * (dot.isSphere ? 1.05 : 0.8);
            dot.targetOx = (dx / distance) * shift;
            dot.targetOy = (dy / distance) * shift;
          });
        }

        function renderMotion() {
          setTargets();
          var stillMoving = !!pointerLocal;
          var lit = sphereT > 0.08;
          var radius = lerp(BASE_RADIUS, SPHERE_RADIUS, sphereT);

          dots.forEach(function (dot) {
            var stiffness = dot.isSphere ? 0.14 : 0.18;
            var damping = dot.isSphere ? 0.78 : 0.72;
            var ax = (dot.targetOx - dot.ox) * stiffness;
            var ay = (dot.targetOy - dot.oy) * stiffness;
            dot.vx = (dot.vx + ax) * damping;
            dot.vy = (dot.vy + ay) * damping;
            dot.ox += dot.vx;
            dot.oy += dot.vy;

            if (
              Math.abs(dot.ox) > 0.015 ||
              Math.abs(dot.oy) > 0.015 ||
              Math.abs(dot.vx) > 0.01 ||
              Math.abs(dot.vy) > 0.01 ||
              Math.abs(dot.targetOx) > 0.01 ||
              Math.abs(dot.targetOy) > 0.01
            ) {
              stillMoving = true;
            }

            if (dot.isSphere) {
              var cx = dot.baseX + dot.ox;
              var cy = dot.baseY + dot.oy;
              dot.sphere.ox = dot.ox;
              dot.sphere.oy = dot.oy;
              dot.element.setAttribute("cx", cx.toFixed(2));
              dot.element.setAttribute("cy", cy.toFixed(2));
              updateSphereLighting(dot.sphere, cx, cy, radius, lit);
            } else {
              dot.element.setAttribute(
                "transform",
                "translate(" + dot.ox.toFixed(2) + " " + dot.oy.toFixed(2) + ")"
              );
            }
          });

          if (stillMoving) {
            motionFrame = window.requestAnimationFrame(renderMotion);
          } else {
            motionFrame = null;
          }
        }

        function ensureMotion() {
          if (!motionFrame) {
            motionFrame = window.requestAnimationFrame(renderMotion);
          }
        }

        host.addEventListener("pointermove", function (event) {
          var point = liveSvg.createSVGPoint();
          point.x = event.clientX;
          point.y = event.clientY;
          var matrix = liveSvg.getScreenCTM();
          if (!matrix) return;
          pointerLocal = point.matrixTransform(matrix.inverse());
          ensureMotion();
        });

        host.addEventListener("pointerleave", function () {
          pointerLocal = null;
          ensureMotion();
        });
      })
      .catch(function () {
        var fallback = document.createElement("img");
        fallback.className = "project-annotators-connectivity__chart";
        fallback.src = src;
        fallback.alt = host.getAttribute("aria-label") || "";
        host.replaceWith(fallback);
      });
  }

  initConnectivityChart();

  /* ---------- Venezuela / ven shape grids — continuous draw / redraw ---------- */
  function initVenShapeAnimations(root, shapeClassName) {
    if (!root) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    var images = Array.prototype.slice.call(root.querySelectorAll("img"));
    if (!images.length) return;

    Promise.all(
      images.map(function (image) {
        return fetch(image.src)
          .then(function (response) {
            if (!response.ok) throw new Error("Unable to load shape");
            return response.text();
          })
          .then(function (markup) {
            var documentNode = new DOMParser().parseFromString(
              markup,
              "image/svg+xml"
            );
            var svg = documentNode.documentElement;
            if (!svg || svg.nodeName.toLowerCase() !== "svg") return null;

            svg.classList.add(shapeClassName);
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
            svg.setAttribute("overflow", "visible");
            image.replaceWith(svg);
            return svg;
          })
          .catch(function () {
            return null;
          });
      })
    ).then(function (svgs) {
      var loaded = svgs.filter(Boolean);
      if (!loaded.length || reduceMotion) return;

      var inView = false;
      var visibilityWaiters = [];

      function whenVisible() {
        if (inView) return Promise.resolve();
        return new Promise(function (resolve) {
          visibilityWaiters.push(resolve);
        });
      }

      if ("IntersectionObserver" in window) {
        var visibilityObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              inView = entry.isIntersecting;
              if (inView) {
                visibilityWaiters.splice(0).forEach(function (resolve) {
                  resolve();
                });
              }
            });
          },
          { threshold: 0.15 }
        );
        visibilityObserver.observe(root);
      } else {
        inView = true;
      }

      function wait(ms) {
        return new Promise(function (resolve) {
          window.setTimeout(resolve, ms);
        });
      }

      function geometriesOf(svg) {
        return Array.prototype.slice.call(
          svg.querySelectorAll(
            "path, circle, ellipse, rect, polygon, polyline, line"
          )
        );
      }

      function eraseStroke(path, duration) {
        return new Promise(function (resolve) {
          var length = path.getTotalLength();
          path.style.strokeDasharray = length + " " + length;
          var start = performance.now();

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            path.style.strokeDashoffset = String(length * easeInOut(t));
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
          }

          requestAnimationFrame(frame);
        });
      }

      function eraseFill(shape, duration) {
        return new Promise(function (resolve) {
          var from = parseFloat(
            shape.style.fillOpacity || shape.dataset.fillOpacity || "1"
          );
          var start = performance.now();

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            shape.style.fillOpacity = String(from * (1 - easeInOut(t)));
            if (t < 1) requestAnimationFrame(frame);
            else {
              shape.style.fillOpacity = "0";
              resolve();
            }
          }

          requestAnimationFrame(frame);
        });
      }

      function ensureFillBlurFilter(svg) {
        var ns = "http://www.w3.org/2000/svg";
        var defs = svg.querySelector("defs");
        if (!defs) {
          defs = document.createElementNS(ns, "defs");
          svg.insertBefore(defs, svg.firstChild);
        }

        var filterId = svg.getAttribute("data-fill-blur-id");
        if (!filterId) {
          filterId =
            "ven-fill-blur-" + Math.random().toString(36).slice(2, 9);
          svg.setAttribute("data-fill-blur-id", filterId);
        }

        var filter = svg.querySelector("#" + filterId);
        if (!filter) {
          filter = document.createElementNS(ns, "filter");
          filter.setAttribute("id", filterId);
          /* Match hero filter padding so soft edges aren't clipped */
          filter.setAttribute("x", "-80%");
          filter.setAttribute("y", "-80%");
          filter.setAttribute("width", "260%");
          filter.setAttribute("height", "260%");
          filter.setAttribute("color-interpolation-filters", "sRGB");

          var blur = document.createElementNS(ns, "feGaussianBlur");
          blur.setAttribute("in", "SourceGraphic");
          blur.setAttribute("stdDeviation", "0");
          filter.appendChild(blur);
          defs.appendChild(filter);
        }

        return {
          id: filterId,
          blur: filter.querySelector("feGaussianBlur"),
        };
      }

      function drawIn(svg) {
        var strokeDuration = 700 + Math.random() * 900;
        var fillDuration = 800 + Math.random() * 900;
        /* Same SVG gaussian soft-focus as the banner / hero circle */
        var blurAmount = 3.5 + Math.random() * 2.5;
        var blurFilter = ensureFillBlurFilter(svg);
        var prepared = geometriesOf(svg).map(function (shape) {
          return { shape: shape, state: prepareShapeGeometry(shape) };
        });

        return Promise.all(
          prepared.map(function (item) {
            var animations = [];
            if (item.state.hasStroke) {
              animations.push(animateStroke(item.shape, strokeDuration));
            }
            if (item.state.hasFill) {
              animations.push(
                animateShapeFill(item.shape, fillDuration, {
                  forceBlur: true,
                  blurAmount: blurAmount,
                  opacityWindow: 0.35,
                  useSvgBlur: true,
                  svgBlurNode: blurFilter.blur,
                  svgFilterId: blurFilter.id,
                })
              );
            }
            return Promise.all(animations);
          })
        );
      }

      function drawOut(svg) {
        var strokeDuration = 650 + Math.random() * 800;
        var fillDuration = 550 + Math.random() * 700;

        return Promise.all(
          geometriesOf(svg).map(function (shape) {
            var animations = [];
            var stroke = shape.getAttribute("stroke");
            var fill = shape.getAttribute("fill");

            if (
              stroke &&
              stroke !== "none" &&
              typeof shape.getTotalLength === "function"
            ) {
              animations.push(eraseStroke(shape, strokeDuration));
            }
            if (fill && fill !== "none") {
              animations.push(eraseFill(shape, fillDuration));
            }
            return Promise.all(animations);
          })
        );
      }

      function loop(svg, initialDelay) {
        wait(initialDelay)
          .then(whenVisible)
          .then(function () {
            return drawIn(svg);
          })
          .then(function () {
            return wait(2800 + Math.random() * 4200);
          })
          .then(whenVisible)
          .then(function () {
            return drawOut(svg);
          })
          .then(function () {
            return wait(600 + Math.random() * 1400);
          })
          .then(function () {
            loop(svg, 0);
          });
      }

      loaded.forEach(function (svg) {
        geometriesOf(svg).forEach(prepareShapeGeometry);
      });

      shuffleShapes(loaded).forEach(function (svg, index) {
        loop(svg, index * 180 + Math.random() * 900);
      });
    });
  }

  function initVenezuelaBannerShapes() {
    var section = document.querySelector(".project-annotators-venezuela");
    if (section) {
      initVenShapeAnimations(section, "project-annotators-venezuela__shape");
    }

    Array.prototype.forEach.call(
      document.querySelectorAll("[data-ven-shapes]"),
      function (root) {
        initVenShapeAnimations(root, "project-card__ven-shape");
      }
    );
  }

  initVenezuelaBannerShapes();

  /* ---------- AI system card — draw aisystem1, transition to aisystem2 ---------- */
  function initAiSystemSequence() {
    var root = document.querySelector("[data-aisystem-sequence]");
    if (!root) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var layers = Array.prototype.slice.call(
      root.querySelectorAll(".project-card__aisystem-layer")
    );
    if (!layers.length) return;

    function geometriesOf(svg) {
      return Array.prototype.slice.call(
        svg.querySelectorAll(
          "path, circle, ellipse, rect, polygon, polyline, line"
        )
      );
    }

    function wait(ms) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
      });
    }

    function directChildPaths(svg) {
      return Array.prototype.filter.call(svg.children, function (node) {
        return node.tagName && node.tagName.toLowerCase() === "path";
      });
    }

    // The central "AI Systems" circle (largest radius) and its label stay static
    function staticAiSystem1Shapes(svg) {
      var circles = Array.prototype.slice.call(svg.querySelectorAll("circle"));
      if (!circles.length) return [];
      var hub = circles.reduce(function (largest, circle) {
        return parseFloat(circle.getAttribute("r") || "0") >
          parseFloat(largest.getAttribute("r") || "0")
          ? circle
          : largest;
      });
      var statics = [hub];
      var label = hub.nextElementSibling;
      if (label && label.tagName.toLowerCase() === "path") statics.push(label);
      return statics;
    }

    function blurFilterOf(group) {
      var filterAttr = group.getAttribute("filter") || "";
      var match = filterAttr.match(/url\(#([^)]+)\)/);
      if (!match) return null;
      var svg = group.ownerSVGElement;
      if (!svg || typeof svg.getElementById !== "function") return null;
      var filter = svg.getElementById(match[1]);
      if (!filter) return null;
      return filter.querySelector("feGaussianBlur");
    }

    function prepareDiagram(svg, index) {
      if (index === 0) {
        var statics = staticAiSystem1Shapes(svg);
        geometriesOf(svg).forEach(function (shape) {
          if (statics.indexOf(shape) === -1) prepareShapeGeometry(shape);
        });
        return;
      }

      Array.prototype.forEach.call(svg.querySelectorAll("g[filter]"), function (group) {
        group.style.opacity = "0";
        group.style.willChange = "opacity";
        var fe = blurFilterOf(group);
        if (fe) {
          if (!fe.dataset.targetBlur) {
            fe.dataset.targetBlur = fe.getAttribute("stdDeviation") || "100";
          }
          // Start softer than the final look, then settle into designed blur
          fe.setAttribute(
            "stdDeviation",
            String(parseFloat(fe.dataset.targetBlur) * 1.65)
          );
        }
      });
      directChildPaths(svg).forEach(function (path) {
        path.style.opacity = "0";
        path.style.willChange = "opacity";
      });
    }

    function drawAiSystem1(svg) {
      var strokeDuration = 1100;
      var fillDuration = 1000;
      var statics = staticAiSystem1Shapes(svg);
      var prepared = geometriesOf(svg)
        .filter(function (shape) {
          return statics.indexOf(shape) === -1;
        })
        .map(function (shape) {
          return { shape: shape, state: prepareShapeGeometry(shape) };
        });

      var lineAnims = [];
      var fillAnims = [];

      prepared.forEach(function (item) {
        if (item.state.hasStroke) {
          lineAnims.push(animateStroke(item.shape, strokeDuration));
        }
        if (item.state.hasFill) {
          fillAnims.push(
            animateShapeFill(item.shape, fillDuration, {
              forceBlur: false,
              opacityWindow: 0.85,
            })
          );
        }
      });

      return Promise.all(lineAnims).then(function () {
        return Promise.all(fillAnims);
      });
    }

    function fadeOpacity(el, toOpacity, duration, delay) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          var startOpacity = parseFloat(el.style.opacity || "0");
          var start = performance.now();

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = easeInOut(t);
            el.style.opacity = String(
              startOpacity + (toOpacity - startOpacity) * eased
            );
            if (t < 1) requestAnimationFrame(frame);
            else {
              el.style.opacity = String(toOpacity);
              el.style.willChange = "auto";
              resolve();
            }
          }

          requestAnimationFrame(frame);
        }, delay || 0);
      });
    }

    function revealBlurredOrb(group, duration, delay) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          var fe = blurFilterOf(group);
          var targetBlur = fe
            ? parseFloat(fe.dataset.targetBlur || fe.getAttribute("stdDeviation") || "100")
            : 100;
          var startBlur = targetBlur * 1.65;
          var startOpacity = parseFloat(group.style.opacity || "0");
          var start = performance.now();

          if (fe) fe.setAttribute("stdDeviation", String(startBlur));
          group.style.opacity = String(startOpacity);

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = easeInOut(t);
            // Opacity comes up slightly ahead so the soft blob is visible while settling
            var opacityT = Math.min(eased / 0.72, 1);
            group.style.opacity = String(
              startOpacity + (1 - startOpacity) * opacityT
            );
            if (fe) {
              fe.setAttribute(
                "stdDeviation",
                String(startBlur + (targetBlur - startBlur) * eased)
              );
            }
            if (t < 1) requestAnimationFrame(frame);
            else {
              group.style.opacity = "1";
              group.style.willChange = "auto";
              if (fe) fe.setAttribute("stdDeviation", String(targetBlur));
              resolve();
            }
          }

          requestAnimationFrame(frame);
        }, delay || 0);
      });
    }

    function drawAiSystem2(svg) {
      var groups = Array.prototype.slice.call(svg.querySelectorAll("g[filter]"));
      var labels = directChildPaths(svg);

      groups.forEach(function (group) {
        group.style.opacity = "0";
      });
      labels.forEach(function (path) {
        path.style.opacity = "0";
      });

      // Text and blur orbs reveal together
      var labelAnims = labels.map(function (path, i) {
        return fadeOpacity(path, 1, 900, Math.min(i * 24, 360));
      });
      var orbAnims = groups.map(function (group, i) {
        return revealBlurredOrb(group, 1700, i * 160);
      });

      return Promise.all(labelAnims.concat(orbAnims));
    }

    function drawStage(svg, index) {
      if (index === 0) return drawAiSystem1(svg);
      return drawAiSystem2(svg);
    }

    Promise.all(
      layers.map(function (layer) {
        var image = layer.querySelector("img");
        if (!image) return Promise.resolve(null);
        return fetch(image.src)
          .then(function (response) {
            if (!response.ok) throw new Error("Unable to load ai system svg");
            return response.text();
          })
          .then(function (markup) {
            var documentNode = new DOMParser().parseFromString(
              markup,
              "image/svg+xml"
            );
            var svg = documentNode.documentElement;
            if (!svg || svg.nodeName.toLowerCase() !== "svg") return null;
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
            svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            image.replaceWith(svg);
            return { layer: layer, svg: svg };
          })
          .catch(function () {
            return null;
          });
      })
    ).then(function (results) {
      var stages = results.filter(Boolean);
      if (stages.length < 2) return;

      if (reduceMotion) {
        stages[0].layer.classList.add("is-visible");
        return;
      }

      stages.forEach(function (stage, index) {
        prepareDiagram(stage.svg, index);
      });

      var inView = false;
      var visibilityWaiters = [];

      function whenVisible() {
        if (inView) return Promise.resolve();
        return new Promise(function (resolve) {
          visibilityWaiters.push(resolve);
        });
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              inView = entry.isIntersecting;
              if (inView) {
                visibilityWaiters.splice(0).forEach(function (resolve) {
                  resolve();
                });
              }
            });
          },
          { threshold: 0.2 }
        );
        observer.observe(root);
      } else {
        inView = true;
      }

      function runStage(index) {
        var stage = stages[index];
        var nextIndex = (index + 1) % stages.length;

        whenVisible()
          .then(function () {
            stages.forEach(function (other, i) {
              if (i !== index) other.layer.classList.remove("is-visible");
            });
            prepareDiagram(stage.svg, index);
            stage.layer.classList.add("is-visible");
            return drawStage(stage.svg, index);
          })
          .then(function () {
            return wait(2800);
          })
          .then(function () {
            runStage(nextIndex);
          });
      }

      runStage(0);
    });
  }

  initAiSystemSequence();

  /* ---------- BlueDot card — draw chart, then fade labels ---------- */
  function initBlueDotDraw() {
    var root = document.querySelector("[data-bluedot-draw]");
    if (!root) return;

    var image = root.querySelector("img");
    if (!image) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function wait(ms) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
      });
    }

    function fadeOpacity(el, toOpacity, duration, delay) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          var startOpacity = parseFloat(el.style.opacity || "0");
          var start = performance.now();

          function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = easeInOut(t);
            el.style.opacity = String(
              startOpacity + (toOpacity - startOpacity) * eased
            );
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

    fetch(image.src)
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load bluedot svg");
        return response.text();
      })
      .then(function (markup) {
        var documentNode = new DOMParser().parseFromString(
          markup,
          "image/svg+xml"
        );
        var svg = documentNode.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") return;

        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        image.replaceWith(svg);

        // Identify the updated artwork by geometry and color.
        var baseline = svg.querySelector("line");
        var allPaths = Array.prototype.slice.call(svg.querySelectorAll("path"));
        var chartParts = allPaths.filter(function (path) {
          var d = path.getAttribute("d") || "";
          return d.indexOf("M79") === 0 || d.indexOf("M704") === 0;
        });
        var panel = svg.querySelector("rect");
        var layerLabels = allPaths.find(function (path) {
          var fill = (path.getAttribute("fill") || "").toUpperCase();
          return fill === "#6B6B6B";
        });
        var unauditedLabel = allPaths.find(function (path) {
          return (path.getAttribute("fill") || "").toUpperCase() === "#A4A2FD";
        });
        var behavioralLabel = allPaths.find(function (path) {
          var fill = (path.getAttribute("fill") || "").toUpperCase();
          var d = path.getAttribute("d") || "";
          return fill === "#322EFF" && d.indexOf("M736") === 0;
        });
        var axisLabels = allPaths.filter(function (path) {
          return (path.getAttribute("fill") || "").toLowerCase() === "black";
        });
        var figLabel = axisLabels[0] || null;
        var miasLabel = axisLabels[1] || null;
        var yearLabel = axisLabels[2] || null;

        // Backward compatibility with the previous BlueDot SVG.
        if (!layerLabels) {
          layerLabels = allPaths.find(function (path) {
            return (path.getAttribute("fill") || "").toUpperCase() === "#9895F6";
          });
        }
        if (!unauditedLabel || !behavioralLabel) {
          var oldTitles = allPaths.filter(function (path) {
            var fill = (path.getAttribute("fill") || "").toUpperCase();
            return fill === "#322EFF" && chartParts.indexOf(path) === -1;
          });
          if (!unauditedLabel) unauditedLabel = oldTitles[0] || null;
          if (!behavioralLabel) behavioralLabel = oldTitles[1] || null;
        }

        var viewBox = (svg.getAttribute("viewBox") || "0 0 883 420").split(/\s+/);
        var vbX = parseFloat(viewBox[0]) || 0;
        var vbY = parseFloat(viewBox[1]) || 0;
        var vbW = parseFloat(viewBox[2]) || 883;
        var vbH = parseFloat(viewBox[3]) || 420;

        var clipId = "bluedot-chart-clip";
        var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        var clipPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "clipPath"
        );
        clipPath.setAttribute("id", clipId);
        var clipRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        clipRect.setAttribute("x", String(vbX));
        clipRect.setAttribute("y", String(vbY));
        clipRect.setAttribute("width", "0");
        clipRect.setAttribute("height", String(vbH));
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);
        svg.insertBefore(defs, svg.firstChild);

        chartParts.forEach(function (part) {
          part.setAttribute("clip-path", "url(#" + clipId + ")");
        });

        var textLabels = [
          figLabel,
          miasLabel,
          yearLabel,
          unauditedLabel,
          behavioralLabel,
          layerLabels,
        ];

        function prepare() {
          if (baseline && typeof baseline.getTotalLength === "function") {
            var length = baseline.getTotalLength();
            baseline.style.strokeDasharray = length + " " + length;
            baseline.style.strokeDashoffset = String(length);
          }
          if (clipRect) clipRect.setAttribute("width", "0");
          // Animate the panel via fill-opacity (it already uses fill-opacity="0.8")
          if (panel) {
            panel.style.opacity = "1";
            panel.setAttribute("fill-opacity", "0");
          }
          textLabels.forEach(function (el) {
            if (el) el.style.opacity = "0";
          });
        }

        function revealChart(duration) {
          return new Promise(function (resolve) {
            var start = performance.now();

            function frame(now) {
              var t = Math.min((now - start) / duration, 1);
              var eased = easeInOut(t);
              clipRect.setAttribute("width", String(vbW * eased));
              if (t < 1) requestAnimationFrame(frame);
              else {
                clipRect.setAttribute("width", String(vbW));
                resolve();
              }
            }

            requestAnimationFrame(frame);
          });
        }

        function fadePanel(duration) {
          return new Promise(function (resolve) {
            if (!panel) {
              resolve();
              return;
            }
            // Keep callout text hidden for the whole panel reveal
            if (unauditedLabel) unauditedLabel.style.opacity = "0";
            if (behavioralLabel) behavioralLabel.style.opacity = "0";
            panel.style.opacity = "1";
            panel.setAttribute("fill-opacity", "0");
            var target = 0.8;
            var start = performance.now();

            function frame(now) {
              var t = Math.min((now - start) / duration, 1);
              var eased = easeInOut(t);
              panel.setAttribute("fill-opacity", String(target * eased));
              if (t < 1) requestAnimationFrame(frame);
              else {
                panel.setAttribute("fill-opacity", String(target));
                resolve();
              }
            }

            requestAnimationFrame(frame);
          });
        }

        if (reduceMotion) {
          prepare();
          if (baseline) baseline.style.strokeDashoffset = "0";
          if (clipRect) clipRect.setAttribute("width", String(vbW));
          if (panel) panel.setAttribute("fill-opacity", "0.8");
          textLabels.forEach(function (el) {
            if (el) el.style.opacity = "1";
          });
          return;
        }

        var inView = false;
        var visibilityWaiters = [];

        function whenVisible() {
          if (inView) return Promise.resolve();
          return new Promise(function (resolve) {
            visibilityWaiters.push(resolve);
          });
        }

        if ("IntersectionObserver" in window) {
          var observer = new IntersectionObserver(
            function (entries) {
              entries.forEach(function (entry) {
                inView = entry.isIntersecting;
                if (inView) {
                  visibilityWaiters.splice(0).forEach(function (resolve) {
                    resolve();
                  });
                }
              });
            },
            { threshold: 0.25 }
          );
          observer.observe(root);
        } else {
          inView = true;
        }

        function runOnce() {
          whenVisible()
            .then(function () {
              prepare();
              return wait(80);
            })
            .then(function () {
              // 1 — baseline + Input / Layers 1–32 / Output (+ axis captions)
              var first = [];
              if (baseline) first.push(animateStroke(baseline, 700));
              if (layerLabels) first.push(fadeOpacity(layerLabels, 1, 550, 80));
              if (figLabel) first.push(fadeOpacity(figLabel, 1, 400, 120));
              if (miasLabel) first.push(fadeOpacity(miasLabel, 1, 400, 160));
              if (yearLabel) first.push(fadeOpacity(yearLabel, 1, 400, 200));
              return Promise.all(first);
            })
            .then(function () {
              // 2 — blue curves
              return revealChart(1100);
            })
            .then(function () {
              // 3a — white panel only
              return fadePanel(600);
            })
            .then(function () {
              // 3b — then Unaudited Demographic Encoding
              return wait(120).then(function () {
                return unauditedLabel
                  ? fadeOpacity(unauditedLabel, 1, 550, 0)
                  : Promise.resolve();
              });
            })
            .then(function () {
              // 4 — Behavioral Audit Capture last
              return behavioralLabel
                ? fadeOpacity(behavioralLabel, 1, 650, 80)
                : Promise.resolve();
            });
        }

        prepare();
        runOnce();
      })
      .catch(function () {
        /* keep static img fallback */
      });
  }

  initBlueDotDraw();

  /* ---------- Reporting decline chart — draw lines on enter ---------- */
  function initReportingDeclineChart() {
    var host = document.querySelector("[data-reporting-decline-src]");
    if (!host) return;

    var src = host.getAttribute("data-reporting-decline-src");
    if (!src) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    fetch(src)
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load chart");
        return response.text();
      })
      .then(function (markup) {
        var documentNode = new DOMParser().parseFromString(
          markup,
          "image/svg+xml"
        );
        var svg = documentNode.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") {
          throw new Error("Invalid chart SVG");
        }

        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        host.replaceChildren(svg);

        var seriesColors = ["#130091", "#82DA33", "#80C343"];
        var colorSet = {};
        seriesColors.forEach(function (color) {
          colorSet[color.toLowerCase()] = true;
        });

        var paths = Array.prototype.slice.call(svg.querySelectorAll("path"));
        var seriesByColor = {};

        paths.forEach(function (path) {
          var fill = (path.getAttribute("fill") || "").toLowerCase();
          if (!colorSet[fill]) return;

          var bbox = path.getBBox();
          var entry = { path: path, bbox: bbox, fill: fill };
          if (!seriesByColor[fill]) seriesByColor[fill] = { line: null, label: null };

          // Chart series span most of the plot width; labels are compact.
          if (bbox.width > 400) {
            seriesByColor[fill].line = entry;
          } else {
            seriesByColor[fill].label = entry;
            path.classList.add("reporting-decline-label");
          }
        });

        // Draw order matches the story: capacity first, then GDP, then inflation.
        var drawOrder = ["#130091", "#82DA33", "#80C343"];
        var series = drawOrder
          .map(function (color) {
            return seriesByColor[color.toLowerCase()];
          })
          .filter(Boolean);

        if (!series.length || reduceMotion) {
          series.forEach(function (item) {
            if (item.label) item.label.path.style.opacity = "1";
          });
          return;
        }

        var ns = "http://www.w3.org/2000/svg";
        var defs = svg.querySelector("defs");
        if (!defs) {
          defs = document.createElementNS(ns, "defs");
          svg.insertBefore(defs, svg.firstChild);
        }

        var prepared = series.map(function (item, index) {
          if (!item.line) return null;

          var bbox = item.line.bbox;
          var padY = 8;
          var clipId = "reporting-decline-clip-" + index;
          var clipPath = document.createElementNS(ns, "clipPath");
          clipPath.setAttribute("id", clipId);

          var rect = document.createElementNS(ns, "rect");
          rect.setAttribute("x", String(bbox.x));
          rect.setAttribute("y", String(bbox.y - padY));
          rect.setAttribute("width", "0");
          rect.setAttribute("height", String(bbox.height + padY * 2));
          clipPath.appendChild(rect);
          defs.appendChild(clipPath);

          item.line.path.setAttribute("clip-path", "url(#" + clipId + ")");
          if (item.label) item.label.path.style.opacity = "0";

          return {
            rect: rect,
            fullWidth: bbox.width + 2,
            label: item.label ? item.label.path : null,
            delay: index * 380,
            duration: 1600 + index * 120,
          };
        }).filter(Boolean);

        function animateSeries(item) {
          return new Promise(function (resolve) {
            window.setTimeout(function () {
              var start = performance.now();
              var labelShown = false;

              function frame(now) {
                var t = Math.min((now - start) / item.duration, 1);
                var eased = easeInOut(t);
                item.rect.setAttribute("width", String(item.fullWidth * eased));

                if (item.label && !labelShown && t >= 0.42) {
                  labelShown = true;
                  item.label.style.transition = "opacity 0.7s ease";
                  item.label.style.opacity = "1";
                }

                if (t < 1) {
                  requestAnimationFrame(frame);
                } else {
                  item.rect.setAttribute("width", String(item.fullWidth));
                  if (item.label) item.label.style.opacity = "1";
                  resolve();
                }
              }

              requestAnimationFrame(frame);
            }, item.delay);
          });
        }

        var hasAnimated = false;

        function play() {
          if (hasAnimated) return;
          hasAnimated = true;
          prepared.forEach(animateSeries);
        }

        if ("IntersectionObserver" in window) {
          var observer = new IntersectionObserver(
            function (entries, obs) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  play();
                  obs.disconnect();
                }
              });
            },
            { threshold: 0.35 }
          );
          observer.observe(host);
        } else {
          play();
        }
      })
      .catch(function () {
        var fallback = document.createElement("img");
        fallback.className = "project-annotators-reporting-decline__chart";
        fallback.src = src;
        fallback.alt = host.getAttribute("aria-label") || "";
        host.replaceWith(fallback);
      });
  }

  initReportingDeclineChart();

  /* ---------- Readiness profiles — draw on enter ---------- */
  function initReadinessProfiles() {
    var images = Array.prototype.slice.call(
      document.querySelectorAll(
        ".project-annotators-profile__diagram, .project-annotators-profiles__item"
      )
    );
    if (!images.length) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    var ns = "http://www.w3.org/2000/svg";

    function wait(ms) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
      });
    }

    function animateClipHeight(rect, fullHeight, duration) {
      return new Promise(function (resolve) {
        var start = performance.now();

        function frame(now) {
          var t = Math.min((now - start) / duration, 1);
          rect.setAttribute("height", String(fullHeight * easeInOut(t)));
          if (t < 1) requestAnimationFrame(frame);
          else {
            rect.setAttribute("height", String(fullHeight));
            resolve();
          }
        }

        requestAnimationFrame(frame);
      });
    }

    function fadeIn(el, duration) {
      return new Promise(function (resolve) {
        el.style.transition = "opacity " + duration + "ms ease";
        // Force style flush before transitioning.
        void el.getBoundingClientRect();
        el.style.opacity = "1";
        window.setTimeout(resolve, duration + 30);
      });
    }

    function prepareProfileSvg(svg, className) {
      svg.classList.add(className);
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.style.overflow = "visible";

      var elements = Array.prototype.slice.call(
        svg.querySelectorAll("path, circle")
      );
      var curves = [];
      var labels = [];
      var circle = null;

      elements.forEach(function (el) {
        var fill = (el.getAttribute("fill") || "").toLowerCase();
        var tag = el.tagName.toLowerCase();

        if (tag === "circle") {
          circle = el;
          return;
        }
        if (fill === "#4a4a4a") {
          curves.push(el);
          return;
        }
        if (fill === "#80c343" || fill === "#130091") {
          labels.push(el);
        }
      });

      curves.sort(function (a, b) {
        return a.getBBox().y - b.getBBox().y;
      });

      return { svg: svg, curves: curves, labels: labels, circle: circle };
    }

    function setupClips(profile) {
      var defs = profile.svg.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS(ns, "defs");
        profile.svg.insertBefore(defs, profile.svg.firstChild);
      }

      profile.labels.forEach(function (label) {
        label.style.opacity = "0";
      });

      if (profile.circle && typeof profile.circle.getTotalLength === "function") {
        var length = profile.circle.getTotalLength();
        profile.circle.style.strokeDasharray = length + " " + length;
        profile.circle.style.strokeDashoffset = String(length);
      }

      profile.curveClips = profile.curves.map(function (path, index) {
        var bbox = path.getBBox();
        var padX = 2;
        var clipId = "readiness-clip-" + Math.random().toString(36).slice(2, 9);
        var clipPath = document.createElementNS(ns, "clipPath");
        clipPath.setAttribute("id", clipId);

        var rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(bbox.x - padX));
        rect.setAttribute("y", String(bbox.y));
        rect.setAttribute("width", String(bbox.width + padX * 2));
        rect.setAttribute("height", "0");
        clipPath.appendChild(rect);
        defs.appendChild(clipPath);
        path.setAttribute("clip-path", "url(#" + clipId + ")");

        return {
          rect: rect,
          fullHeight: bbox.height + 1,
          delay: index * 55,
          duration: 720 + Math.min(index * 18, 280),
        };
      });
    }

    function animateProfile(profile) {
      var tasks = [];

      if (profile.circle) {
        tasks.push(animateStroke(profile.circle, 900));
      }

      profile.curveClips.forEach(function (clip) {
        tasks.push(
          wait(220 + clip.delay).then(function () {
            return animateClipHeight(clip.rect, clip.fullHeight, clip.duration);
          })
        );
      });

      profile.labels.forEach(function (label, index) {
        var fill = (label.getAttribute("fill") || "").toLowerCase();
        var delay = fill === "#130091" ? 120 : 520 + index * 140;
        tasks.push(
          wait(delay).then(function () {
            return fadeIn(label, 500);
          })
        );
      });

      return Promise.all(tasks);
    }

    function observeAndPlay(host, profile) {
      var hasPlayed = false;

      function play() {
        if (hasPlayed) return;
        hasPlayed = true;
        animateProfile(profile);
      }

      if (reduceMotion) {
        profile.labels.forEach(function (label) {
          label.style.opacity = "1";
        });
        if (profile.circle) {
          profile.circle.style.strokeDasharray = "none";
          profile.circle.style.strokeDashoffset = "0";
        }
        profile.curveClips.forEach(function (clip) {
          clip.rect.setAttribute("height", String(clip.fullHeight));
        });
        return;
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(
          function (entries, obs) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                play();
                obs.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.28, rootMargin: "0px 0px -8% 0px" }
        );
        observer.observe(host);
      } else {
        play();
      }
    }

    images.forEach(function (image) {
      var className = image.className;
      var alt = image.getAttribute("alt") || "";
      var width = image.getAttribute("width");
      var height = image.getAttribute("height");

      fetch(image.src)
        .then(function (response) {
          if (!response.ok) throw new Error("Unable to load profile");
          return response.text();
        })
        .then(function (markup) {
          var documentNode = new DOMParser().parseFromString(
            markup,
            "image/svg+xml"
          );
          var svg = documentNode.documentElement;
          if (!svg || svg.nodeName.toLowerCase() !== "svg") return;

          if (width) svg.setAttribute("width", width);
          if (height) svg.setAttribute("height", height);
          if (alt) svg.setAttribute("aria-label", alt);

          var profile = prepareProfileSvg(svg, className);
          image.replaceWith(svg);
          setupClips(profile);
          observeAndPlay(svg, profile);
        })
        .catch(function () {
          /* keep the original <img> */
        });
    });
  }

  initReadinessProfiles();

  /* ---------- Pen plotter grid — tooltips by R#C# id ---------- */
  function initPenPlotterGrid() {
    var figure = document.querySelector(".project-annotators-penplotter__figure");
    if (!figure) return;

    var host = figure.querySelector(".project-annotators-penplotter__chart");
    var tooltip = document.getElementById("penplotter-shape-tooltip");
    var src = figure.getAttribute("data-penplotter-src");
    var metadataUrl = figure.getAttribute("data-metadata-url");
    if (!host || !tooltip || !src || !metadataUrl) return;

    var name = tooltip.querySelector(".annotator-shape-tooltip__name");
    var theme = tooltip.querySelector(".annotator-shape-tooltip__theme");
    var quote = tooltip.querySelector(".annotator-shape-tooltip__quote");
    var activeGlyph = null;

    function showTooltip(glyph, record, pointerEvent) {
      activeGlyph = glyph;
      name.textContent = record.annotator;
      theme.textContent = record.theme;
      quote.textContent = "\u201c" + record.quote + "\u201d";
      tooltip.style.left = "0";
      tooltip.style.top = "0";
      if (pointerEvent) {
        positionAnnotatorTooltipAtPointer(pointerEvent, tooltip);
      } else {
        positionAnnotatorTooltip(glyph, tooltip);
      }
      tooltip.classList.add("is-visible");
      tooltip.setAttribute("aria-hidden", "false");
    }

    function hideTooltip() {
      activeGlyph = null;
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
    }

    Promise.all([
      fetch(src).then(function (response) {
        if (!response.ok) throw new Error("Unable to load pen plotter SVG");
        return response.text();
      }),
      fetch(metadataUrl).then(function (response) {
        if (!response.ok) throw new Error("Unable to load metadata");
        return response.json();
      }),
    ])
      .then(function (results) {
        var markup = results[0];
        var metadata = results[1];
        var documentNode = new DOMParser().parseFromString(
          markup,
          "image/svg+xml"
        );
        var svg = documentNode.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== "svg") {
          throw new Error("Invalid pen plotter SVG");
        }

        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        host.replaceChildren(svg);

        var ns = "http://www.w3.org/2000/svg";

        Object.keys(metadata).forEach(function (position) {
          var glyph = svg.getElementById(position);
          var record = metadata[position];
          if (!glyph || !record) return;

          glyph.classList.add("project-annotators-penplotter__glyph");
          glyph.dataset.position = position;
          glyph.setAttribute("tabindex", "0");
          glyph.setAttribute("role", "button");
          glyph.setAttribute(
            "aria-label",
            record.annotator + ", " + record.theme + ". " + record.quote
          );

          // Invisible hit target — glyph strokes are too thin to hover reliably.
          var bbox = glyph.getBBox();
          var pad = 6;
          var hit = document.createElementNS(ns, "rect");
          hit.setAttribute("class", "project-annotators-penplotter__hit");
          hit.setAttribute("x", String(bbox.x - pad));
          hit.setAttribute("y", String(bbox.y - pad));
          hit.setAttribute("width", String(Math.max(bbox.width + pad * 2, 18)));
          hit.setAttribute("height", String(Math.max(bbox.height + pad * 2, 18)));
          glyph.insertBefore(hit, glyph.firstChild);

          glyph.addEventListener("focus", function () {
            showTooltip(glyph, record);
          });
          glyph.addEventListener("blur", hideTooltip);
          glyph.addEventListener("keydown", function (event) {
            if (event.key === "Escape") hideTooltip();
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              showTooltip(glyph, record);
            }
          });
        });

        function glyphFromEvent(event) {
          var node = event.target;
          while (node && node !== svg) {
            if (
              node.dataset &&
              node.dataset.position &&
              metadata[node.dataset.position]
            ) {
              return node;
            }
            node = node.parentNode;
          }
          return null;
        }

        svg.addEventListener("pointerover", function (event) {
          var glyph = glyphFromEvent(event);
          if (!glyph) return;
          var record = metadata[glyph.dataset.position];
          if (!record) return;
          showTooltip(glyph, record, event);
        });

        svg.addEventListener("pointermove", function (event) {
          if (!activeGlyph) return;
          var glyph = glyphFromEvent(event);
          if (glyph === activeGlyph) {
            positionAnnotatorTooltipAtPointer(event, tooltip);
          }
        });

        svg.addEventListener("pointerout", function (event) {
          var glyph = glyphFromEvent(event);
          if (!glyph || glyph !== activeGlyph) return;
          var related = event.relatedTarget;
          while (related && related !== svg) {
            if (related === glyph) return;
            related = related.parentNode;
          }
          hideTooltip();
        });

        window.addEventListener("scroll", hideTooltip, { passive: true });
      })
      .catch(function () {
        var fallback = document.createElement("img");
        fallback.src = src;
        fallback.alt = host.getAttribute("aria-label") || "";
        fallback.width = 475;
        fallback.height = 679;
        host.replaceChildren(fallback);
      });
  }

  initPenPlotterGrid();

  /* ---------- Annotator quotes — typewriter on enter ---------- */
  function initAnnotatorQuotesTypewriter() {
    var section = document.querySelector(".project-annotators-quotes");
    if (!section) return;

    var items = Array.prototype.slice.call(
      section.querySelectorAll(".project-annotators-quotes__item")
    );
    if (!items.length) return;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var prepared = items.map(function (item) {
      var name = item.querySelector(".project-annotators-quotes__attribution");
      var quote = item.querySelector(".project-annotators-quotes__text");
      return {
        name: name,
        quote: quote,
        nameFull: name ? name.textContent : "",
        quoteFull: quote ? quote.textContent : "",
      };
    });

    if (reduceMotion) return;

    prepared.forEach(function (entry) {
      if (entry.name) entry.name.textContent = "";
      if (entry.quote) entry.quote.textContent = "";
    });

    function typeText(el, full, msPerChar) {
      return new Promise(function (resolve) {
        if (!el || !full) {
          resolve();
          return;
        }

        var index = 0;

        function tick() {
          index += 1;
          el.textContent = full.slice(0, index);
          if (index < full.length) {
            window.setTimeout(tick, msPerChar);
          } else {
            resolve();
          }
        }

        tick();
      });
    }

    var started = false;

    function play() {
      if (started) return;
      started = true;

      prepared.forEach(function (entry, index) {
        window.setTimeout(function () {
          typeText(entry.name, entry.nameFull, 14).then(function () {
            return typeText(entry.quote, entry.quoteFull, 9);
          });
        }, index * 48);
      });
    }

    var target =
      section.querySelector(".project-annotators-quotes__stage") || section;

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              play();
              obs.disconnect();
            }
          });
        },
        { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
      );
      observer.observe(target);
    } else {
      play();
    }
  }

  initAnnotatorQuotesTypewriter();

  /* ---------- Live heatmap card (Mechanistic Interpretability) ---------- */
  (function initHeatmapLive() {
    var root = document.querySelector("[data-heatmap-live]");
    if (!root) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var rects = [];
    var rafId = 0;
    var lastTick = 0;
    var running = false;
    var card = root.closest(".project-card");

    /* Approximate viridis stops for live cell updates */
    var VIRIDIS = [
      [68, 1, 84],
      [72, 36, 117],
      [64, 67, 135],
      [52, 94, 141],
      [41, 120, 142],
      [32, 144, 140],
      [34, 167, 132],
      [68, 190, 112],
      [121, 209, 81],
      [189, 222, 38],
      [253, 231, 37],
    ];

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function viridis(t) {
      t = Math.max(0, Math.min(1, t));
      var scaled = t * (VIRIDIS.length - 1);
      var i = Math.floor(scaled);
      var f = scaled - i;
      var c0 = VIRIDIS[i];
      var c1 = VIRIDIS[Math.min(i + 1, VIRIDIS.length - 1)];
      var r = Math.round(lerp(c0[0], c1[0], f));
      var g = Math.round(lerp(c0[1], c1[1], f));
      var b = Math.round(lerp(c0[2], c1[2], f));
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    function randomValue() {
      /* Bias toward mid-high greens like the source, with rare extremes */
      var u = Math.random();
      if (u < 0.04) return Math.random() * 0.15;
      if (u > 0.94) return 0.85 + Math.random() * 0.15;
      return 0.35 + Math.random() * 0.45;
    }

    function tick(now) {
      if (!running) return;
      rafId = window.requestAnimationFrame(tick);
      if (now - lastTick < 90) return;
      lastTick = now;

      var n = rects.length;
      if (!n) return;

      /* Burst of cell updates each frame — feels like streaming compute */
      var updates = 8 + Math.floor(Math.random() * 10);
      var i;
      for (i = 0; i < updates; i++) {
        var idx = Math.floor(Math.random() * n);
        rects[idx].setAttribute("fill", viridis(randomValue()));
      }

      /* Occasional horizontal scanline sweep */
      if (Math.random() < 0.12) {
        var row = Math.floor(Math.random() * 32);
        var base = row * 32;
        for (i = 0; i < 32; i++) {
          if (base + i < n) {
            rects[base + i].setAttribute(
              "fill",
              viridis(0.4 + Math.random() * 0.45)
            );
          }
        }
      }
    }

    function start() {
      if (running || reduceMotion || !rects.length) return;
      if (card && card.hidden) return;
      running = true;
      lastTick = 0;
      rafId = window.requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function syncVisibility() {
      if (card && card.hidden) {
        stop();
        return;
      }
      start();
    }

    fetch("./assets/media/bbb-heatmap.svg")
      .then(function (res) {
        return res.text();
      })
      .then(function (markup) {
        var overlay = root.querySelector(".project-card__heatmap-overlay");
        root.innerHTML = markup;
        if (overlay) root.appendChild(overlay);
        rects = Array.prototype.slice.call(root.querySelectorAll("rect"));
        if (reduceMotion) return;

        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(
            function (entries) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) start();
                else stop();
              });
            },
            { threshold: 0.2 }
          );
          io.observe(root);
        } else {
          start();
        }

        /* Restart when Research filter reveals the card */
        document.querySelectorAll(".filter-tab").forEach(function (tab) {
          tab.addEventListener("click", function () {
            window.setTimeout(syncVisibility, 0);
          });
        });
      })
      .catch(function () {});
  })();

  /* ---------- Scroll reveal (excludes hero text) ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();
