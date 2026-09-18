(() => {
  const allowedAttributionFields = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'placement',
    'fbclid',
  ];
  const currentUrl = new URL(window.location.href);
  const safeParams = new URLSearchParams();
  const allowedAnchors = new Set([
    'main-content',
    'credentials',
    'artikel-terbaru',
    'course',
    'first-call',
    'policy-review',
    'tentang',
  ]);

  allowedAttributionFields.forEach((field) => {
    if (currentUrl.searchParams.has(field)) {
      safeParams.set(field, currentUrl.searchParams.get(field));
    }
  });

  const safeQuery = safeParams.toString();
  const currentAnchor = currentUrl.hash.slice(1);
  const safeHash = allowedAnchors.has(currentAnchor) ? currentUrl.hash : '';
  const safeAddress = `${currentUrl.pathname}${safeQuery ? `?${safeQuery}` : ''}${safeHash}`;
  const currentAddress = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

  if (safeAddress !== currentAddress) {
    window.history.replaceState(window.history.state, '', safeAddress);
  }
})();
