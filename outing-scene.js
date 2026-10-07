/* Pixel walk: seasonal sprite artwork with articulated walking legs. */
(() => {
  'use strict';

  const WIDTH = 288;
  const HEIGHT = 160;
  const GROUND = 140;
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const PALETTES = {
    spring: { ground: '#dce4cb', grass: '#a8be8d', leaf: '#efc2ca', trunk: '#a48d72', trousers: '#736a64', sleeve: '#c6ae8e' },
    summer: { ground: '#dbe4c5', grass: '#92ad7b', leaf: '#b6ca96', trunk: '#a48d72', trousers: '#8a735f', sleeve: '#e2cfac' },
    autumn: { ground: '#e9ddc3', grass: '#c5a779', leaf: '#dba978', trunk: '#a48d72', trousers: '#766455', sleeve: '#bd8c62' },
    winter: { ground: '#e7e9e6', grass: '#c0cbc6', leaf: '#d8e1dc', trunk: '#a29382', trousers: '#637168', sleeve: '#8d9e8a' }
  };
  let active = null;

  function ageStage(months) {
    const value = Math.max(0, Number.isFinite(Number(months)) ? Math.floor(Number(months)) : 0);
    if (value >= 96) return { mode: 'mother', months: value, quarter: null, height: 0 };
    if (value <= 3) return { mode: 'bassinet', months: value, quarter: 0, height: 9 + value * 0.5 };
    if (value <= 15) {
      const quarter = Math.floor((value - 4) / 3);
      return { mode: 'stroller', months: value, quarter, height: 16 + quarter * 3 };
    }
    const quarter = Math.floor((value - 16) / 3);
    return { mode: 'walking', months: value, quarter, height: 37 + quarter };
  }

  function currentSeason() {
    const month = new Date().getMonth() + 1;
    return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
  }

  function precipitation(snapshot) {
    if (!snapshot || snapshot.choice !== 'allowed' || ['error', 'loading', 'idle', 'denied'].includes(snapshot.status)) return 'none';
    return snapshot.precipitation === 'rain' || snapshot.precipitation === 'snow' ? snapshot.precipitation : 'none';
  }

  function rectangle(ctx, color, x, y, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  }

  function segment(ctx, color, ax, ay, bx, by, thickness) {
    // Square pixels keep the procedural joints consistent with the sprite art.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
    for (let n = 0; n <= steps; n++) {
      const t = n / steps;
      rectangle(ctx, color, ax + (bx - ax) * t - thickness / 2, ay + (by - ay) * t, thickness, thickness);
    }
  }

  function cropAtlas(image) {
    const scratch = document.createElement('canvas');
    scratch.width = image.naturalWidth;
    scratch.height = image.naturalHeight;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const tiles = [];
    const tileWidth = Math.floor(scratch.width / 2);
    const tileHeight = Math.floor(scratch.height / 2);
    for (let index = 0; index < 4; index++) {
      const ox = (index % 2) * tileWidth;
      const oy = Math.floor(index / 2) * tileHeight;
      const pixels = ctx.getImageData(ox, oy, tileWidth, tileHeight).data;
      let left = tileWidth, top = tileHeight, right = -1, bottom = -1;
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          if (pixels[(y * tileWidth + x) * 4 + 3] < 100) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      if (right < left) throw new Error('Empty scene sprite');
      const w = right - left + 1;
      const h = bottom - top + 1;
      function dominant(start, end, saturated) {
        const bins = new Map();
        for (let y = Math.round(top + h * start); y < top + h * end; y++) {
          for (let x = Math.round(left + w * 0.17); x < left + w * 0.85; x++) {
            const at = (y * tileWidth + x) * 4;
            const rgb = [pixels[at], pixels[at + 1], pixels[at + 2]];
            if (pixels[at + 3] < 150 || Math.max(...rgb) < 75) continue;
            if (saturated && Math.max(...rgb) - Math.min(...rgb) < 36) continue;
            const key = rgb.map(v => Math.floor(v / 32)).join(',');
            const bin = bins.get(key) || { count: 0, rgb: [0, 0, 0] };
            bin.count++;
            rgb.forEach((value, i) => { bin.rgb[i] += value; });
            bins.set(key, bin);
          }
        }
        const bin = [...bins.values()].sort((a, b) => b.count - a.count)[0];
        return bin ? bin.rgb.map(v => Math.round(v / bin.count)) : [234, 220, 197];
      }
      const trousers = dominant(index === 0 ? 0.65 : 0.76, index === 0 ? 0.83 : 0.87, false);
      const sleeve = dominant(0.4, 0.52, true);
      tiles.push({ image, x: ox + left, y: oy + top, w, h, trousers, sleeve });
    }
    return tiles;
  }

  function sprite(ctx, tile, x, y, width, height, start = 0, end = 1) {
    ctx.drawImage(tile.image, tile.x, tile.y + tile.h * start, tile.w, tile.h * (end - start), Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  function tree(ctx, season, palette) {
    rectangle(ctx, palette.trunk, 31, 93, 4, 44);
    rectangle(ctx, palette.trunk, 25, 105, 7, 3);
    rectangle(ctx, palette.trunk, 34, 99, 9, 3);
    if (season === 'winter') {
      rectangle(ctx, '#eeefea', 23, 103, 9, 2);
      rectangle(ctx, '#eeefea', 34, 96, 11, 3);
      return;
    }
    rectangle(ctx, palette.leaf, 17, 77, 32, 25);
    rectangle(ctx, palette.leaf, 11, 84, 44, 13);
    rectangle(ctx, palette.leaf, 23, 72, 19, 35);
    rectangle(ctx, season === 'spring' ? '#f5d6d8' : season === 'summer' ? '#c2d4a4' : '#e5bf8f', 19, 77, 11, 12);
    rectangle(ctx, season === 'spring' ? '#f5d6d8' : season === 'summer' ? '#c2d4a4' : '#e5bf8f', 37, 84, 9, 9);
  }

  function scenery(ctx, season, seconds) {
    const p = PALETTES[season];
    rectangle(ctx, p.ground, 16, GROUND + 2, WIDTH - 32, 2);
    rectangle(ctx, p.ground, 28, GROUND + 4, WIDTH - 59, 1);
    tree(ctx, season, p);
    for (const [x, y] of [[48, 148], [214, 142], [247, 145]]) {
      if (season === 'spring') {
        rectangle(ctx, p.grass, x, y - 6, 1, 5);
        rectangle(ctx, '#d9a5b2', x - 2, y - 8, 5, 3);
        rectangle(ctx, '#ecd495', x, y - 8, 1, 1);
      } else if (season === 'summer') {
        rectangle(ctx, p.grass, x, y - 3, 2, 4);
        rectangle(ctx, p.grass, x - 3, y - 1, 7, 2);
      } else if (season === 'autumn') {
        rectangle(ctx, p.leaf, x, y, 4, 2);
        rectangle(ctx, p.grass, x + 5, y - 1, 2, 2);
      } else {
        rectangle(ctx, '#edf0ed', x - 4, y - 1, 13, 3);
      }
    }
    // A few petals/leaves belong to the season, while rain/snow require weather.
    if (season === 'spring' || season === 'autumn') {
      for (let n = 0; n < 3; n++) {
        const y = 91 + ((seconds * 6 + n * 17) % 47);
        rectangle(ctx, p.leaf, 41 + n * 6 + Math.sin(seconds + n) * 4, y, 2, 2);
      }
    }
  }

  function legs(ctx, x, ground, length, phase, stride, rgb, thickness) {
    const hipY = ground - length;
    for (const side of [-1, 1]) {
      const angle = phase + (side === -1 ? Math.PI : 0);
      const swing = Math.sin(angle);
      const lift = Math.max(0, Math.cos(angle)) * length * 0.22;
      const footX = x + side + swing * stride;
      const footY = ground - lift;
      const kneeX = x + swing * stride * 0.34 + (lift / length) * 8;
      const kneeY = hipY + length * 0.54 - lift * 0.35;
      const shade = `rgb(${rgb.map(v => Math.max(0, v - (side === -1 ? 18 : 0))).join(',')})`;
      segment(ctx, '#3e3b34', x + side * 3, hipY, kneeX, kneeY, thickness + 2);
      segment(ctx, '#3e3b34', kneeX, kneeY, footX, footY - 3, thickness + 2);
      segment(ctx, shade, x + side * 3, hipY, kneeX, kneeY, thickness);
      segment(ctx, shade, kneeX, kneeY, footX, footY - 4, thickness);
      rectangle(ctx, '#423d34', footX - thickness / 2 - 1, footY - 4, thickness + 6, 5);
      rectangle(ctx, side === -1 ? '#d6c9b3' : '#f1e5cd', footX - thickness / 2, footY - 4, thickness + 4, 3);
    }
  }

  function walker(ctx, tile, x, height, phase, season, isChild, growth) {
    const p = PALETTES[season];
    const bob = Math.cos(phase * 2) * 0.5;
    const legFraction = isChild ? 0.25 + growth * 0.065 : 0.445;
    const legLength = height * legFraction;
    const top = GROUND - height + bob;
    const bodyHeight = height - legLength + 1;
    const width = height * tile.w / tile.h;
    legs(ctx, x, GROUND, legLength, phase, isChild ? 5 + growth * 3 : 12, tile.trousers, isChild ? 4 : 7);
    if (isChild) {
      const headHeight = height * (0.38 - growth * 0.08);
      sprite(ctx, tile, x - width / 2, top, width, headHeight, 0, 0.34);
      sprite(ctx, tile, x - width / 2, top + headHeight, width, bodyHeight - headHeight, 0.34, 0.72);
    } else {
      sprite(ctx, tile, x - width / 2, top, width, bodyHeight, 0, 0.555);
    }
    return { x, top, height, width, sleeve: `rgb(${tile.sleeve.join(',')})`, shoulder: top + height * (isChild ? 0.43 : 0.34) };
  }

  function handhold(ctx, mother, child, season) {
    const elbowX = mother.x + 10;
    const elbowY = mother.shoulder + 15;
    const joinX = mother.x + 18;
    const joinY = child.shoulder - 1;
    segment(ctx, '#3e3b34', mother.x + 4, mother.shoulder, elbowX, elbowY, 6);
    segment(ctx, mother.sleeve, mother.x + 4, mother.shoulder, elbowX, elbowY, 4);
    segment(ctx, '#d3a27d', elbowX, elbowY, joinX, joinY, 3);
    segment(ctx, '#d3a27d', child.x - 3, child.shoulder, joinX, joinY, 3);
    rectangle(ctx, '#d3a27d', joinX - 1, joinY, 4, 3);
  }

  function swingingArm(ctx, mother, phase) {
    const elbowX = mother.x + 5 + Math.sin(phase + Math.PI) * 3;
    const elbowY = mother.shoulder + 11;
    const handX = mother.x + 5 + Math.sin(phase + Math.PI) * 8;
    const handY = mother.shoulder + 22 - Math.abs(Math.sin(phase)) * 2;
    segment(ctx, '#3e3b34', mother.x + 4, mother.shoulder, elbowX, elbowY, 6);
    segment(ctx, '#3e3b34', elbowX, elbowY, handX, handY, 5);
    segment(ctx, mother.sleeve, mother.x + 4, mother.shoulder, elbowX, elbowY, 4);
    segment(ctx, mother.sleeve, elbowX, elbowY, handX, handY - 3, 3);
    rectangle(ctx, '#d3a27d', handX - 1, handY - 2, 3, 4);
  }

  function stroller(ctx, tile, baby, mother, stage, phase, season) {
    const height = stage.mode === 'bassinet' ? 43 : 42;
    const width = height * tile.w / tile.h;
    const x = mother.x + 17;
    const top = GROUND - height;
    sprite(ctx, tile, x, top, width, height);
    const infantWidth = stage.mode === 'bassinet' ? 10 : 11 + stage.quarter * 1.1;
    const infantHeight = stage.height;
    const infantX = x + width * (stage.mode === 'bassinet' ? 0.58 : 0.57) - infantWidth / 2;
    const infantY = top + (stage.mode === 'bassinet' ? 13 : 9 - stage.quarter);
    sprite(ctx, baby, infantX, infantY, infantWidth, infantHeight, 0, stage.mode === 'bassinet' ? 0.44 : 0.57);
    // A front blanket/strap tucks the infant into the seat.
    rectangle(ctx, season === 'winter' ? '#bbc4b2' : '#d7c5a3', infantX - 1, infantY + infantHeight - 4, infantWidth + 2, 4);
    const handleX = x + width * 0.13;
    const handleY = top + 9;
    segment(ctx, '#3e3b34', mother.x + 4, mother.shoulder, mother.x + 12, mother.shoulder + 12, 6);
    segment(ctx, mother.sleeve, mother.x + 4, mother.shoulder, mother.x + 12, mother.shoulder + 12, 4);
    segment(ctx, '#d3a27d', mother.x + 12, mother.shoulder + 12, handleX, handleY, 3);
    // Rotating hubs make the stroller move with the walking parent.
    for (const wheelX of [x + width * 0.2, x + width * 0.8]) {
      const hubY = GROUND - 5;
      segment(ctx, '#c3bcb0', wheelX, hubY, wheelX + Math.cos(phase * 2) * 3, hubY + Math.sin(phase * 2) * 3, 1);
    }
  }

  function weather(ctx, kind, seconds) {
    if (kind === 'none') return;
    const count = kind === 'rain' ? 24 : 18;
    for (let n = 0; n < count; n++) {
      const speed = kind === 'rain' ? 70 : 16;
      const y = (n * 43 + seconds * speed) % (HEIGHT - 9);
      const x = 10 + ((n * 67 + (kind === 'rain' ? -seconds * 18 : Math.sin(seconds + n) * 6) + 10000) % (WIDTH - 20));
      if (kind === 'rain') segment(ctx, '#a9becb', x, y, x - 2, y + 5, 1);
      else {
        rectangle(ctx, '#f8fbfb', x, y, 2, 2);
        rectangle(ctx, '#ccd7d8', x + 1, y + 1, 1, 1);
      }
    }
  }

  function unmount() {
    if (active) active.destroy();
    active = null;
  }

  function mount(container, options = {}) {
    unmount();
    if (!container) return;
    const season = SEASONS.includes(options.season) ? options.season : currentSeason();
    const stage = ageStage(options.months);
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = 'display:block;width:min(100%,360px);height:auto;image-rendering:pixelated;';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.ageStage = stage.mode;
    canvas.dataset.ageQuarter = stage.quarter === null ? '' : String(stage.quarter);
    container.replaceChildren(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motionQuery.matches;
    let particles = precipitation(options.weather);
    let tiles = null;
    let raf = 0;
    let destroyed = false;
    let visible = true;
    let elapsed = 0;
    let lastTime = null;

    function draw() {
      if (!tiles) return;
      const seconds = reduced ? 0 : elapsed / 1000;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      scenery(ctx, season, seconds);
      const journey = (seconds % 24) / 12;
      const goingRight = journey < 1;
      const travel = goingRight ? journey : 2 - journey;
      const midpoint = 99 + travel * 83;
      const phase = reduced ? Math.PI / 2 : seconds * Math.PI * 2 / 0.82;
      ctx.save();
      ctx.translate(Math.round(midpoint), 0);
      if (!goingRight) ctx.scale(-1, 1);
      const mother = walker(ctx, tiles[0], stage.mode === 'mother' ? 0 : -20, 88, phase, season, false, 1);
      if (stage.mode === 'walking') {
        const child = walker(ctx, tiles[1], 10, stage.height, phase + 0.55, season, true, stage.quarter / 26);
        handhold(ctx, mother, child, season);
      } else if (stage.mode !== 'mother') {
        stroller(ctx, tiles[stage.mode === 'bassinet' ? 2 : 3], tiles[1], mother, stage, phase, season);
      } else {
        swingingArm(ctx, mother, phase);
      }
      ctx.restore();
      weather(ctx, particles, seconds);
    }

    function frame(now) {
      raf = 0;
      if (destroyed) return;
      if (!container.isConnected) { destroy(); return; }
      if (document.hidden || !visible || reduced) { lastTime = null; return; }
      if (lastTime !== null) elapsed += Math.min(80, now - lastTime);
      lastTime = now;
      draw();
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (!destroyed && tiles && !raf && !reduced && visible && !document.hidden) raf = window.requestAnimationFrame(frame);
    }

    function pause() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      lastTime = null;
    }

    function onVisibility() { if (document.hidden) pause(); else start(); }
    function onMotion(event) { reduced = event.matches; pause(); draw(); start(); }
    function onWeather(event) { particles = precipitation(event.detail); draw(); }

    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) start(); else pause();
    }) : null;
    observer?.observe(container);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('aigo:weather', onWeather);
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);
    else motionQuery.addListener(onMotion);

    function destroy() {
      destroyed = true;
      pause();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('aigo:weather', onWeather);
      if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotion);
      else motionQuery.removeListener(onMotion);
      atlas.onload = null;
      atlas.onerror = null;
    }

    function fallback() {
      if (destroyed || !container.isConnected) return;
      const image = document.createElement('img');
      image.src = `./images/walk-${season}.png`;
      image.alt = '';
      image.style.cssText = 'display:block;width:min(100%,300px);height:auto;image-rendering:pixelated';
      container.replaceChildren(image);
      destroy();
    }

    const atlas = new Image();
    atlas.onload = () => {
      if (destroyed || !container.isConnected) return;
      try { tiles = cropAtlas(atlas); } catch { fallback(); return; }
      draw();
      start();
    };
    atlas.onerror = fallback;
    active = { destroy };
    atlas.src = `./images/scene-${season}.png`;
    return { destroy, stage };
  }

  window.AigoScene = { mount, unmount, ageStage };
})();

