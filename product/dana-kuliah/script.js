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
