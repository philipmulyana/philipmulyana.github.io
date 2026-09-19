(() => {
  function prepareCorporateCarousel() {
    const carousel = document.querySelector('.corporate-partner-carousel');
    const track = carousel?.querySelector('.corporate-partner-track');
    const group = track?.querySelector('.corporate-partner-group');
    if (!carousel || !track || !group) return;

    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || track.querySelector('[aria-hidden="true"]')) return;

    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.removeAttribute('aria-label');
    duplicate.querySelectorAll('[data-brand]').forEach((item) => {
      item.removeAttribute('data-brand');
    });
    track.append(duplicate);
  }

  document.addEventListener('DOMContentLoaded', prepareCorporateCarousel, { once: true });
})();
