(() => {
  const allowedAttributionParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'placement',
    'fbclid'
  ];
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
  const landingParams = new URLSearchParams(window.location.search);
  const attributionParams = allowedAttributionParams
    .filter((name) => landingParams.has(name))
    .map((name) => [name, normalizeAttributionValue(name, landingParams.get(name))])
    .filter(([, value]) => value !== null);

  document.querySelectorAll('.purchase-cta').forEach((link) => {
    if (attributionParams.length > 0) {
      const checkoutUrl = new URL(link.href);
      if (
        checkoutUrl.hostname === 'philip-mulyana-84218.myr.id'
        && checkoutUrl.pathname === '/pl/dana-kuliah'
      ) {
        attributionParams.forEach(([name, value]) => {
          checkoutUrl.searchParams.append(name, value);
        });
        link.href = checkoutUrl.toString();
      }
    }

  });
})();

(() => {
  const statsEndpoint = 'https://acahbbudqbqinsamyhsc.supabase.co/functions/v1/purchase-stats';
  const countCard = document.querySelector('#verified-purchase-count');
  const countValue = document.querySelector('#verified-purchase-count-value');
  const notice = document.querySelector('#purchase-notification');
  const liveRegion = document.querySelector('#purchase-notification-live');
  const closeButton = notice?.querySelector('.purchase-notification-close');
  if (!countCard || !countValue || !notice || !liveRegion || !closeButton) return;

  const shownKey = 'dana-kuliah-purchase-notification-shown';
  let shownInMemory = false;
  let verifiedLatestPurchase = null;
  let readyToShow = false;
  let hideTimer = null;
  let pointerInsideNotice = false;

  const wasShown = () => {
    try {
      return sessionStorage.getItem(shownKey) === '1';
    } catch {
      return shownInMemory;
    }
  };

  const rememberShown = () => {
    shownInMemory = true;
    try {
      sessionStorage.setItem(shownKey, '1');
    } catch {
      // The in-memory guard still prevents repeats when storage is unavailable.
    }
  };

  const clearHideTimer = () => {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = null;
  };

  const hideNotice = () => {
    clearHideTimer();
    notice.hidden = true;
    notice.setAttribute('aria-hidden', 'true');
  };

  const notificationIsInline = () => window.matchMedia(
    '(max-width: 600px), (max-width: 900px) and (max-height: 600px)'
  ).matches;

  const notificationOverlapsPurchaseAction = () => {
    if (notice.hidden || notificationIsInline()) return false;
    const noticeBounds = notice.getBoundingClientRect();
    return Array.from(document.querySelectorAll('.purchase-cta')).some((cta) => {
      const actionBounds = cta.getBoundingClientRect();
      return noticeBounds.left < actionBounds.right &&
        noticeBounds.right > actionBounds.left &&
        noticeBounds.top < actionBounds.bottom &&
        noticeBounds.bottom > actionBounds.top;
    });
  };


  const startDismissTimer = () => {
    clearHideTimer();
    if (notice.hidden || pointerInsideNotice || notice.contains(document.activeElement)) return;
    hideTimer = window.setTimeout(() => {
      if (pointerInsideNotice || notice.contains(document.activeElement)) return;
      hideNotice();
    }, 4000);
  };

  const tryToShow = () => {
    if (!readyToShow || !verifiedLatestPurchase || wasShown() || document.hidden) return;
    notice.style.visibility = 'hidden';
    notice.hidden = false;
    if (notificationOverlapsPurchaseAction()) {
      notice.hidden = true;
      notice.style.removeProperty('visibility');
      return;
    }
    notice.style.removeProperty('visibility');
    notice.setAttribute('aria-hidden', 'false');
    rememberShown();
    window.requestAnimationFrame(() => {
      liveRegion.textContent = 'Seseorang baru saja membeli Online Course Dana Kuliah';
    });
    startDismissTimer();
  };

  const markReady = () => {
    if (readyToShow) return;
    readyToShow = true;
    tryToShow();
  };

  closeButton.addEventListener('click', () => {
    rememberShown();
    hideNotice();
  });
  notice.addEventListener('pointerenter', () => {
    pointerInsideNotice = true;
    clearHideTimer();
  });
  notice.addEventListener('pointerleave', () => {
    pointerInsideNotice = false;
    startDismissTimer();
  });
  notice.addEventListener('focusin', clearHideTimer);
  notice.addEventListener('focusout', () => window.setTimeout(startDismissTimer, 0));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !notice.hidden) hideNotice();
  });

  const handleLayoutChange = () => {
    if (!notice.hidden && notificationOverlapsPurchaseAction()) hideNotice();
    if (notice.hidden) tryToShow();
  };
  window.addEventListener('resize', handleLayoutChange, { passive: true });
  window.addEventListener('orientationchange', handleLayoutChange, { passive: true });

  window.addEventListener('scroll', () => {
    const root = document.documentElement;
    const scrollable = Math.max(1, root.scrollHeight - window.innerHeight);
    if (window.scrollY / scrollable >= 0.25) markReady();
    handleLayoutChange();
  }, { passive: true });

  window.setTimeout(markReady, 8000);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  fetch(statsEndpoint, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: controller.signal,
    credentials: 'omit'
  })
    .then((response) => {
      if (!response.ok) throw new Error('stats unavailable');
      return response.json();
    })
    .then((stats) => {
      const paidCount = Number(stats.paid_count_7d);
      if (Number.isSafeInteger(paidCount) && paidCount > 0) {
        countValue.textContent = new Intl.NumberFormat('id-ID').format(paidCount);
        countCard.hidden = false;
      }

      if (typeof stats.latest_purchase_at !== 'string') return;
      const latest = new Date(stats.latest_purchase_at);
      const age = Date.now() - latest.getTime();
      if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) return;
      verifiedLatestPurchase = latest;
      tryToShow();
    })
    .catch(() => {
      countCard.hidden = true;
      liveRegion.textContent = '';
      hideNotice();
    })
    .finally(() => window.clearTimeout(timeout));
})();
