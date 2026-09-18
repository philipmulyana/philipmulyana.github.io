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
