// Facebook Pixel - Philip Mulyana Website
// Pixel ID: 1408957391027533
// Include this script in every page: <script src="js/pixel.js"></script>

!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

// Page-scoped opt-out of Meta's server-configured Automatic Events, set by
// /cek-awal/index.html only. Must precede 'init' — autoConfig applies to how
// the pixel configures itself for this init call. No other page sets this
// flag, so autoConfig stays on (default) everywhere else.
if (window.__CEK_AWAL_PIXEL_NO_AUTOCONFIG__) {
    fbq('set', 'autoConfig', false, '1408957391027533');
}
fbq('init', '1408957391027533');
fbq('track', 'PageView');

// Exactly one PageView per page load. The previous unconditional image
// beacon fired a second, duplicate PageView from JavaScript. No noscript
// image fallback is added here: a <noscript> beacon builds its own URL
// outside the page's scrub step and could carry an unscrubbed address.
