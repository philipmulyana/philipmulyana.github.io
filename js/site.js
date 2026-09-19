(() => {
  const currentYear = new Date().getFullYear();

  document.querySelectorAll('[data-years-since]').forEach((element) => {
    const startYear = Number(element.dataset.yearsSince);
    if (Number.isFinite(startYear)) {
      element.textContent = Math.max(0, currentYear - startYear).toString();
    }
  });

  const allowedAttributionFields = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'placement',
    'fbclid',
  ];
  const incomingParams = new URLSearchParams(window.location.search);
  const attributionParams = new URLSearchParams();

  allowedAttributionFields.forEach((field) => {
    if (incomingParams.has(field)) {
      attributionParams.set(field, incomingParams.get(field));
    }
  });

  if (attributionParams.size === 0) return;

  document.querySelectorAll('[data-forward-attribution]').forEach((link) => {
    const destination = new URL(link.href, window.location.href);
    attributionParams.forEach((value, field) => {
      destination.searchParams.set(field, value);
    });
    link.href = destination.toString();
  });
})();

(() => {
  function initCarousels() {
    if (typeof window.matchMedia !== 'function') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    document.querySelectorAll('[data-carousel]').forEach((carousel) => {
      const section = carousel.closest('section');
      const track = carousel.querySelector('.partner-track');
      const toggle = section?.querySelector('[data-carousel-action="toggle"]');
      const previous = section?.querySelector('[data-carousel-action="previous"]');
      const next = section?.querySelector('[data-carousel-action="next"]');
      const status = section?.querySelector('[data-carousel-status]');
      if (!track || !toggle || !previous || !next) return;

      let paused = false;
      const motion = () => track.getAnimations?.()[0];
      const announce = (message) => {
        if (status) status.textContent = message;
      };
      const setPaused = (value, message) => {
        paused = value;
        track.style.animationPlayState = paused ? 'paused' : 'running';
        const animation = motion();
        if (animation) {
          if (paused) animation.pause();
          else animation.play();
        }
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Putar' : 'Jeda';
        announce(message || (paused ? 'Carousel dijeda.' : 'Carousel berjalan.'));
      };
      const move = (direction) => {
        setPaused(true);
        const animation = motion();
        if (animation) {
          const current = Number(animation.currentTime) || 0;
          animation.currentTime = Math.max(0, current + (direction * 4000));
        }
        announce(direction < 0 ? 'Menampilkan brand sebelumnya.' : 'Menampilkan brand berikutnya.');
      };

      toggle.addEventListener('click', () => setPaused(!paused));
      previous.addEventListener('click', () => move(-1));
      next.addEventListener('click', () => move(1));
    });
  }

  if (typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', initCarousels, { once: true });
  }
})();
