/* ============================================================
   ToolAdvisor — PREMIUM LAYER (effects engine)
   Loaded on every page. Pairs with premium.css.

   Adds, with no required markup changes:
     · animated gradient-mesh background
     · scroll-reveal (IntersectionObserver + fail-safe)
     · cursor spotlight on .ta-hero
     · 3D tilt + glare on .ta-tilt cards
     · count-up on [data-countup]
     · magnetic pull on .ta-magnetic
     · lazy Three.js 3D insert on [data-ta-3d]

   Everything degrades gracefully and respects reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var docEl = document.documentElement;
  // Flag the page synchronously so CSS hidden-states apply before paint.
  docEl.classList.add("ta-premium");

  var REDUCED = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  /* -------------------------------------------------- mesh bg */
  function injectMesh() {
    if (document.querySelector(".ta-mesh")) return;
    var mesh = document.createElement("div");
    mesh.className = "ta-mesh";
    mesh.setAttribute("aria-hidden", "true");
    document.body.appendChild(mesh);
  }

  /* ----------------------------------------------- reveal */
  function setupReveal() {
    // Auto-tag top-level sections on pages that didn't hand-tag anything.
    var hasManual = document.querySelector("[data-ta-reveal]");
    if (!hasManual) {
      var autoTargets = document.querySelectorAll(
        "main > section, main > article"
      );
      autoTargets.forEach(function (el) {
        el.classList.add("ta-reveal");
      });
    }

    var items = [].slice.call(
      document.querySelectorAll("[data-ta-reveal], .ta-reveal")
    );
    if (!items.length) return;

    function showAll() {
      items.forEach(function (el) { el.classList.add("ta-in"); });
    }

    if (REDUCED || !("IntersectionObserver" in window)) {
      showAll();
      return;
    }

    // Stagger siblings that share a parent for a polished cascade.
    var seen = new Map();
    items.forEach(function (el) {
      var p = el.parentElement;
      var i = seen.get(p) || 0;
      seen.set(p, i + 1);
      if (!el.style.getPropertyValue("--ta-d")) {
        el.style.setProperty("--ta-d", Math.min(i * 70, 350) + "ms");
      }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("ta-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) { io.observe(el); });

    // Fail-safe: nothing may ever stay hidden.
    setTimeout(showAll, 2200);
    window.addEventListener("load", function () {
      setTimeout(showAll, 600);
    });
  }

  /* --------------------------------------------- spotlight */
  function setupSpotlight() {
    var heroes = document.querySelectorAll(".ta-hero");
    heroes.forEach(function (hero) {
      if (!hero.querySelector(".ta-spot")) {
        var spot = document.createElement("div");
        spot.className = "ta-spot";
        spot.setAttribute("aria-hidden", "true");
        hero.insertBefore(spot, hero.firstChild);
      }
      if (REDUCED) return;
      hero.addEventListener("mousemove", function (ev) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--sx", ((ev.clientX - r.left) / r.width) * 100 + "%");
        hero.style.setProperty("--sy", ((ev.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  /* ------------------------------------------------- tilt */
  function setupTilt() {
    if (REDUCED) return;
    var cards = document.querySelectorAll(".ta-tilt");
    cards.forEach(function (card) {
      var max = parseFloat(card.getAttribute("data-tilt")) || 7;
      var raf = null, tx = 0, ty = 0;

      function onMove(ev) {
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width;
        var py = (ev.clientY - r.top) / r.height;
        ty = (px - 0.5) * 2 * max;        // rotateY
        tx = -(py - 0.5) * 2 * max;       // rotateX
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        if (!raf) raf = requestAnimationFrame(apply);
      }
      function apply() {
        raf = null;
        card.style.setProperty("--ry", ty.toFixed(2) + "deg");
        card.style.setProperty("--rx", tx.toFixed(2) + "deg");
      }
      card.addEventListener("mouseenter", function () {
        card.classList.add("ta-tilt-active");
      });
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", function () {
        card.classList.remove("ta-tilt-active");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* ---------------------------------------------- magnetic */
  function setupMagnetic() {
    if (REDUCED) return;
    document.querySelectorAll(".ta-magnetic").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-magnetic")) || 0.3;
      el.style.transition = "transform .25s cubic-bezier(.16,1,.3,1)";
      el.addEventListener("mousemove", function (ev) {
        var r = el.getBoundingClientRect();
        var x = ev.clientX - r.left - r.width / 2;
        var y = ev.clientY - r.top - r.height / 2;
        el.style.transform =
          "translate(" + x * strength + "px," + y * strength + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "translate(0,0)";
      });
    });
  }

  /* ---------------------------------------------- count-up */
  function setupCountUp() {
    var nums = document.querySelectorAll("[data-countup]");
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-countup"));
      if (isNaN(target)) {
        target = parseFloat((el.textContent || "").replace(/[^0-9.]/g, ""));
      }
      if (isNaN(target)) return;
      var suffix = el.getAttribute("data-countup-suffix");
      if (suffix === null) {
        var m = (el.textContent || "").match(/[^\d.\s].*$/);
        suffix = m ? m[0] : "";
      }
      var decimals = (String(target).split(".")[1] || "").length;
      if (REDUCED) { el.textContent = target + suffix; return; }
      var dur = 1100, start = null;
      function step(t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals) + suffix;
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------- Three.js 3D insert */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function build3DInsert(mount) {
    var THREE = window.THREE;
    var stage = mount.closest(".ta-3d-stage") || mount;

    var canvasWrap = document.createElement("div");
    canvasWrap.className = "ta-3d-canvas";
    mount.appendChild(canvasWrap);

    var w = mount.clientWidth || 520;
    var h = mount.clientHeight || (w * 0.86);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0.4, 7.2);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    if (THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    }
    canvasWrap.appendChild(renderer.domElement);

    /* ---- build an 80° rhombic turning insert (CNMG-style) ---- */
    var group = new THREE.Group();
    scene.add(group);

    // rhombus half-diagonals: tan(40°) ≈ 0.839 → 80° acute corners
    var Hh = 1.55;            // long half-diagonal (acute corners top/bottom)
    var Wh = Hh * 0.8391;     // short half-diagonal
    var shape = new THREE.Shape();
    shape.moveTo(0, Hh);
    shape.lineTo(Wh, 0);
    shape.lineTo(0, -Hh);
    shape.lineTo(-Wh, 0);
    shape.closePath();

    // center mounting hole
    var hole = new THREE.Path();
    hole.absarc(0, 0, 0.42, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    var extrude = new THREE.ExtrudeGeometry(shape, {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 4,
      curveSegments: 48
    });
    extrude.center();
    extrude.computeVertexNormals();

    // carbide body — metallic, slightly warm steel
    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4b2,
      metalness: 0.92,
      roughness: 0.34
    });
    var insert = new THREE.Mesh(extrude, bodyMat);
    // lay it flat-ish, acute corner pointing toward viewer
    insert.rotation.x = -Math.PI / 2 * 0.86;
    group.add(insert);

    // PVD-style top coating tint (a thin floating rhombus skin)
    var topShape = new THREE.Shape();
    var k = 0.9;
    topShape.moveTo(0, Hh * k);
    topShape.lineTo(Wh * k, 0);
    topShape.lineTo(0, -Hh * k);
    topShape.lineTo(-Wh * k, 0);
    topShape.closePath();
    var topHole = new THREE.Path();
    topHole.absarc(0, 0, 0.5, 0, Math.PI * 2, true);
    topShape.holes.push(topHole);
    var topGeo = new THREE.ShapeGeometry(topShape);
    var topMat = new THREE.MeshStandardMaterial({
      color: 0x123356,
      metalness: 0.6,
      roughness: 0.5,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    var topSkin = new THREE.Mesh(topGeo, topMat);
    topSkin.rotation.x = -Math.PI / 2 * 0.86;
    topSkin.position.y = 0.33 * Math.sin(Math.PI / 2 * 0.86) + 0.01;
    topSkin.position.z = 0.33 * Math.cos(Math.PI / 2 * 0.86);
    // simpler: parent the skin to the insert so it always tracks the top face
    insert.add(topSkin);
    topSkin.rotation.set(0, 0, 0);
    topSkin.position.set(0, 0, 0.32);

    // amber edge ring around the mounting hole (the "highlight")
    var ringGeo = new THREE.TorusGeometry(0.5, 0.045, 16, 48);
    var ringMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B, metalness: 0.4, roughness: 0.4,
      emissive: 0xF59E0B, emissiveIntensity: 0.35
    });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = 0.33;
    insert.add(ring);

    /* ---- lighting: cool key + amber rim + soft fill ---- */
    scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x20283a, 0.55));

    var key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-4, 6, 5);
    scene.add(key);

    var rim = new THREE.PointLight(0xF59E0B, 1.4, 30);
    rim.position.set(5, 1.5, 2);
    scene.add(rim);

    var fill = new THREE.PointLight(0x3B82F6, 0.9, 30);
    fill.position.set(-3, -2, 4);
    scene.add(fill);

    /* ---- interaction: auto-spin + mouse parallax + drag ---- */
    var targetY = -0.5, targetX = 0.1;
    var curY = targetY, curX = targetX;
    var dragging = false, lastX = 0, lastY = 0, spin = true;

    function pointerFromEvent(e) {
      return e.touches ? e.touches[0] : e;
    }
    stage.addEventListener("mousemove", function (e) {
      if (dragging) return;
      var r = stage.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      targetY = -0.5 + nx * 0.9;
      targetX = 0.1 + ny * 0.5;
    });
    renderer.domElement.addEventListener("pointerdown", function (e) {
      dragging = true; spin = false; lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
    });
    window.addEventListener("pointerup", function () {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      targetY += (e.clientX - lastX) * 0.01;
      targetX += (e.clientY - lastY) * 0.01;
      targetX = Math.max(-0.9, Math.min(0.9, targetX));
      lastX = e.clientX; lastY = e.clientY;
    });

    function onResize() {
      var nw = mount.clientWidth, nh = mount.clientHeight || nw * 0.86;
      if (!nw) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(onResize).observe(mount);
    } else {
      window.addEventListener("resize", onResize);
    }

    var running = true;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) loop();
    });

    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      if (spin && !dragging) targetY += 0.0026;
      curY += (targetY - curY) * 0.06;
      curX += (targetX - curX) * 0.06;
      group.rotation.y = curY;
      group.rotation.x = curX;
      group.position.y = Math.sin(Date.now() * 0.0011) * 0.06; // gentle float
      renderer.render(scene, camera);
    }

    onResize();
    loop();
    stage.classList.add("ta-3d-ready");
  }

  function setup3D() {
    var mount = document.querySelector("[data-ta-3d]");
    if (!mount) return;
    if (REDUCED || !webglOK() || window.innerWidth < 1024) return;

    var started = false;
    function go() {
      if (started) return;
      started = true;
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js")
        .then(function () { build3DInsert(mount); })
        .catch(function () { /* keep SVG fallback */ });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { go(); io.disconnect(); }
        });
      }, { rootMargin: "200px" });
      io.observe(mount);
    } else {
      go();
    }
  }

  /* --------------------------------------------------- boot */
  ready(function () {
    try { injectMesh(); } catch (e) {}
    try { setupReveal(); } catch (e) {}
    try { setupSpotlight(); } catch (e) {}
    try { setupTilt(); } catch (e) {}
    try { setupMagnetic(); } catch (e) {}
    try { setupCountUp(); } catch (e) {}
    try { setup3D(); } catch (e) {}
  });
})();
