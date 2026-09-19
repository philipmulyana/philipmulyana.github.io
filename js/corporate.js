(() => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (reducedMotion?.matches) return;

  const prepareCarousel = async (carousel) => {
    if (carousel.dataset.logoMarqueeReady === 'true') return;
    carousel.dataset.logoMarqueeReady = 'true';

    const track = carousel.querySelector('.corporate-partner-track');
    const group = track?.querySelector('.corporate-partner-grid');
    if (!track || !group) return;

    const images = [...group.querySelectorAll('img')];
    images.forEach((image) => {
      image.loading = 'eager';
    });
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));

    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.removeAttribute('aria-label');
    duplicate.querySelectorAll('[data-brand]').forEach((item) => {
      item.removeAttribute('data-brand');
    });
    duplicate.querySelectorAll('img').forEach((image) => {
      image.alt = '';
    });

    track.append(duplicate);
    window.requestAnimationFrame(() => track.classList.add('is-ready'));
  };

  document.querySelectorAll('[data-logo-marquee]').forEach((carousel) => {
    if (typeof window.IntersectionObserver !== 'function') {
      prepareCarousel(carousel);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      prepareCarousel(carousel);
    }, { rootMargin: '500px 0px' });
    observer.observe(carousel);
  });
})();
