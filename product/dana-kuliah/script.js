(() => {
  document.querySelectorAll('.purchase-cta').forEach((link) => {
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
