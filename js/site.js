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
  const attributionTaxonomy = {
    utm_source: new Set(['meta', 'facebook', 'instagram', 'google', 'youtube', 'tiktok', 'linkedin', 'newsletter', 'email', 'organic', 'direct', 'website', 'whatsapp']),
    utm_medium: new Set(['cpc', 'ppc', 'paid_social', 'social', 'organic_social', 'email', 'newsletter', 'referral', 'display', 'video']),
    placement: new Set(['feed', 'story', 'stories', 'reels', 'search', 'display', 'video', 'mobile', 'desktop', 'audience_network']),
  };
  const opaqueAttributionPatterns = {
    utm_campaign: /^cmp_(?=[a-f0-9]{16,64}$)(?=[a-f0-9]*[a-f])(?=[a-f0-9]*\d)[a-f0-9]+$/i,
    utm_content: /^ad_(?=[a-f0-9]{16,64}$)(?=[a-f0-9]*[a-f])(?=[a-f0-9]*\d)[a-f0-9]+$/i,
    utm_term: /^kw_(?=[a-f0-9]{16,64}$)(?=[a-f0-9]*[a-f])(?=[a-f0-9]*\d)[a-f0-9]+$/i,
    fbclid: /^IwAR(?=[a-z0-9_-]{16,124}$)(?=[a-z0-9_-]*\d)[a-z0-9_-]+$/i,
  };
  const normalizeAttributionValue = (field, rawValue) => {
    let value = String(rawValue || '').trim();
    if (!value || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) return null;
    for (let attempt = 0; attempt < 8 && /%[0-9a-f]{2}/i.test(value); attempt += 1) {
      try {
        const decoded = decodeURIComponent(value);
        if (decoded === value) break;
        value = decoded;
      } catch {
        return null;
      }
    }
    if (/%[0-9a-f]{2}/i.test(value)) return null;
    if (!/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value)) return null;
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/i.test(value)) return null;
    if (/(?:^|[^\d])(?:\+?62|0)8(?:[\s().-]*\d){7,12}(?:$|[^\d])/.test(value)) return null;
    if (/(?:mailto|tel):|(?:name|full_?name|first_?name|last_?name|email|e-mail|phone|telephone|whatsapp|wa|coupon|promo)=/i.test(value)) return null;
    if (attributionTaxonomy[field]) return attributionTaxonomy[field].has(value.toLowerCase()) ? value : null;
    return opaqueAttributionPatterns[field]?.test(value) ? value : null;
  };

  allowedAttributionFields.forEach((field) => {
    if (incomingParams.has(field)) {
      const value = incomingParams.get(field);
      const normalizedValue = normalizeAttributionValue(field, value);
      if (normalizedValue !== null) attributionParams.set(field, normalizedValue);
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
          const duration = Number(animation.effect?.getTiming?.().duration) || 0;
          const destination = current + (direction * 4000);
          animation.currentTime = duration > 0
            ? ((destination % duration) + duration) % duration
            : Math.max(0, destination);
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
