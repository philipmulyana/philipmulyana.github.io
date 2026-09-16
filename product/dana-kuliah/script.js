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
  const landingParams = new URLSearchParams(window.location.search);
  const attributionParams = allowedAttributionParams
    .filter((name) => landingParams.has(name))
    .map((name) => [name, landingParams.get(name)]);

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

    link.addEventListener('click', () => {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Course Dana Kuliah',
          currency: 'IDR',
          value: 149000
        });
      }
    });
  });
})();
