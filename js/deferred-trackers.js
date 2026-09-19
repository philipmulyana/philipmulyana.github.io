(() => {
  let started = false;

  const startTrackers = () => {
    if (started) return;
    started = true;

    const pixel = document.createElement('script');
    pixel.src = '/js/pixel.js';
    pixel.async = true;
    document.head.append(pixel);

    window.clarity = window.clarity || function clarity() {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    const clarity = document.createElement('script');
    clarity.src = 'https://www.clarity.ms/tag/wjulbbpfmx';
    clarity.async = true;
    document.head.append(clarity);
  };

  const scheduleTrackers = () => window.setTimeout(startTrackers, 3500);

  window.addEventListener('pointerdown', startTrackers, { once: true, passive: true });
  window.addEventListener('keydown', startTrackers, { once: true });
  if (document.readyState === 'complete') scheduleTrackers();
  else window.addEventListener('load', scheduleTrackers, { once: true });
})();
