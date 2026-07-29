(function () {
  "use strict";

  var CONTACT_EMAIL = "c.a.rodriguez1999@gmail.com";
  var fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      /* ignore */
    }
    document.body.removeChild(ta);
  }

  function copyEmail(email, triggerEl) {
    var value = email || CONTACT_EMAIL;
    var statusEl = triggerEl && triggerEl.querySelector
      ? triggerEl.querySelector(".nav-contact__status")
      : null;
    var labelEl = null;
    var originalLabel = "";

    if (!statusEl && triggerEl) {
      labelEl = triggerEl;
      originalLabel = triggerEl.textContent.trim() || "Email";
    }

    function done() {
      if (statusEl) {
        statusEl.textContent = "Copied";
        if (statusEl.parentElement) statusEl.parentElement.classList.add("is-copied");
        window.setTimeout(function () {
          statusEl.textContent = "Copy";
          if (statusEl.parentElement) {
            statusEl.parentElement.classList.remove("is-copied");
          }
        }, 1600);
        return;
      }

      if (labelEl) {
        labelEl.textContent = "Copied";
        labelEl.classList.add("is-copied");
        window.setTimeout(function () {
          labelEl.textContent = originalLabel;
          labelEl.classList.remove("is-copied");
        }, 1600);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(function () {
        fallbackCopy(value);
        done();
      });
    } else {
      fallbackCopy(value);
      done();
    }
  }

  function positionMenu(root, menu) {
    /* Fixed positioning avoids project-hero stacking/clipping on case-study pages */
    if (menu.closest("#mobileMenu")) {
      menu.classList.remove("is-fixed");
      menu.style.top = "";
      menu.style.right = "";
      return;
    }

    var rect = root.getBoundingClientRect();
    menu.classList.add("is-fixed");
    menu.style.top = Math.round(rect.bottom + 6) + "px";
    menu.style.right = Math.round(window.innerWidth - rect.right) + "px";
    menu.style.left = "auto";
  }

  function clearMenuPosition(menu) {
    menu.classList.remove("is-fixed");
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  }

  function closeAllContactMenus(except) {
    document.querySelectorAll(".nav-contact.is-open").forEach(function (el) {
      if (except && el === except) return;
      el.classList.remove("is-open");
      var btn = el.querySelector(".nav-contact__toggle");
      var menu = el.querySelector(".nav-contact__menu");
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (menu) {
        menu.setAttribute("aria-hidden", "true");
        clearMenuPosition(menu);
      }
    });
  }

  function init() {
    document.querySelectorAll(".nav-contact").forEach(function (root) {
      var btn = root.querySelector(".nav-contact__toggle");
      var menu = root.querySelector(".nav-contact__menu");
      if (!btn || !menu) return;

      menu.hidden = false;
      menu.setAttribute("aria-hidden", "true");

      function setOpen(open) {
        root.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-hidden", String(!open));
        if (open) {
          positionMenu(root, menu);
        } else {
          clearMenuPosition(menu);
        }
      }

      root.addEventListener("mouseenter", function () {
        if (!fineHover.matches) return;
        setOpen(true);
      });

      root.addEventListener("mouseleave", function () {
        if (!fineHover.matches) return;
        setOpen(false);
      });

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (fineHover.matches) {
          /* Hover already opens; keep click as a no-op toggle for keyboard users */
          setOpen(!root.classList.contains("is-open"));
          return;
        }
        var willOpen = !root.classList.contains("is-open");
        closeAllContactMenus(willOpen ? root : null);
        setOpen(willOpen);
      });

      menu.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    });

    document.querySelectorAll("[data-email]").forEach(function (el) {
      if (el.getAttribute("data-contact-bound") === "1") return;
      el.setAttribute("data-contact-bound", "1");
      el.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        copyEmail(el.getAttribute("data-email"), el);
      });
    });

    document.addEventListener("click", function () {
      closeAllContactMenus();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAllContactMenus();
    });

    window.addEventListener(
      "resize",
      function () {
        document.querySelectorAll(".nav-contact.is-open").forEach(function (root) {
          var menu = root.querySelector(".nav-contact__menu");
          if (menu) positionMenu(root, menu);
        });
      },
      { passive: true }
    );

    window.addEventListener(
      "scroll",
      function () {
        document.querySelectorAll(".nav-contact.is-open").forEach(function (root) {
          var menu = root.querySelector(".nav-contact__menu");
          if (menu) positionMenu(root, menu);
        });
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
