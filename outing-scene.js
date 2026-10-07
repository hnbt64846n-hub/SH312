/* Seasonal pixel scene. The approved GIF stays still in the scene; weather is an optional overlay. */
(() => {
  'use strict';

  const SIZE = 384;
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  let active = null;

  function ageStage(months) {
    const value = Math.max(0, Number.isFinite(Number(months)) ? Math.floor(Number(months)) : 0);
    if (value >= 96) return { mode: 'mother', months: value, quarter: null, height: 0 };
    if (value <= 3) return { mode: 'bassinet', months: value, quarter: 0, height: 9 + value * 0.5 };
    if (value <= 15) {
      return { mode: 'stroller', months: value, quarter: Math.floor((value - 4) / 3), height: 16 + Math.floor((value - 4) / 3) * 3 };
    }
    const quarter = Math.floor((value - 16) / 3);
    return { mode: 'walking', months: value, quarter, height: 37 + quarter };
  }

  function precipitation(snapshot) {
    if (!snapshot || snapshot.choice !== 'allowed' || snapshot.status !== 'ready') return 'none';
    return snapshot.precipitation === 'rain' || snapshot.precipitation === 'snow' ? snapshot.precipitation : 'none';
  }

  function drawWeather(ctx, kind, seconds) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (kind === 'none') return;
    const count = kind === 'rain' ? 26 : 22;
    for (let n = 0; n < count; n++) {
      const speed = kind === 'rain' ? 95 : 21;
      const y = (n * 67 + seconds * speed) % (SIZE + 16) - 8;
      const x = 10 + ((n * 83 + (kind === 'rain' ? -seconds * 23 : Math.sin(seconds + n) * 7) + 10000) % (SIZE - 20));
      if (kind === 'rain') {
        ctx.fillStyle = 'rgba(113, 157, 177, .72)';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 8);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, .92)';
        ctx.fillRect(Math.round(x), Math.round(y), 4, 4);
        ctx.fillStyle = 'rgba(194, 208, 211, .88)';
        ctx.fillRect(Math.round(x + 2), Math.round(y + 2), 2, 2);
      }
    }
  }

  function unmount() {
    if (active) active.destroy();
    active = null;
  }

  function mount(container, options = {}) {
    unmount();
    if (!container) return null;

    const season = SEASONS.includes(options.season) ? options.season : 'spring';
    const stage = ageStage(options.months);
    const frame = document.createElement('div');
    frame.className = 'scene-frame';
    frame.style.cssText = 'position:relative;display:block;width:clamp(180px,32svh,300px);max-width:100%;aspect-ratio:1/1;margin:0 auto;';

    const image = document.createElement('img');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    image.src = `./images/walk-${season}.${reducedMotion ? 'png' : 'gif'}`;
    image.alt = '';
    image.decoding = 'async';
    image.style.cssText = 'display:block;width:100%;height:100%;image-rendering:pixelated;object-fit:contain;';

    const weatherCanvas = document.createElement('canvas');
    weatherCanvas.className = 'scene-weather';
    weatherCanvas.width = SIZE;
    weatherCanvas.height = SIZE;
    weatherCanvas.setAttribute('aria-hidden', 'true');
    weatherCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;';

    frame.append(image, weatherCanvas);
    container.replaceChildren(frame);
    container.dataset.ageStage = stage.mode;
    container.dataset.ageQuarter = stage.quarter === null ? '' : String(stage.quarter);

    const ctx = weatherCanvas.getContext('2d');
    if (!ctx) return { destroy: () => {}, stage };
    let kind = precipitation(options.weather);
    let elapsed = 0;
    let last = null;
    let raf = 0;
    let destroyed = false;
    let visible = true;

    function draw(now = 0) {
      const seconds = now ? elapsed / 1000 : 0;
      drawWeather(ctx, kind, seconds);
    }

    function stop() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    }

    function frameTick(now) {
      raf = 0;
      if (destroyed || !visible || document.hidden) return;
      if (last !== null) elapsed += Math.min(80, now - last);
      last = now;
      draw(now);
      if (kind !== 'none') raf = window.requestAnimationFrame(frameTick);
    }

    function start() {
      if (!destroyed && visible && !document.hidden && kind !== 'none' && !raf) {
        raf = window.requestAnimationFrame(frameTick);
      }
    }

    function onWeather(event) {
      kind = precipitation(event.detail);
      if (kind === 'none') {
        stop();
        draw();
      } else {
        start();
      }
    }

    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    function destroy() {
      destroyed = true;
      stop();
      window.removeEventListener('aigo:weather', onWeather);
      document.removeEventListener('visibilitychange', onVisibility);
    }

    image.onerror = () => {
      image.onerror = null;
      image.src = `./images/walk-${season}.png`;
    };
    window.addEventListener('aigo:weather', onWeather);
    document.addEventListener('visibilitychange', onVisibility);
    draw();
    start();
    active = { destroy };
    return { destroy, stage };
  }

  window.AigoScene = { mount, unmount, ageStage };
})();

