document.addEventListener('DOMContentLoaded', () => {
    // Load shared partials
    const navPlaceholder = document.getElementById('navbar-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) {
        fetch('partials/navbar.html')
            .then(r => r.text())
            .then(html => {
                navPlaceholder.innerHTML = html;
                highlightActiveLink();
                initMobileMenu();
            });
    }

    if (footerPlaceholder) {
        fetch('partials/footer.html')
            .then(r => r.text())
            .then(html => {
                footerPlaceholder.innerHTML = html;
            });
    }

    // Smooth scroll for anchor links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    // Scroll-triggered fade-in animations
    initScrollAnimations();
});

function highlightActiveLink() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const navMap = {
        'index.html': 'home',
        'consultation.html': 'services',
        'tools.html': 'tools',
        'tool-calculator.html': 'tools',
        'tool-quiz.html': 'tools',
        'tool-retirement.html': 'tools',
        'tool-assessment.html': 'tools',
        'blog.html': 'blog',
        'about.html': 'about',
        'contact.html': 'contact'
    };
    let activeNav = navMap[page];
    if (!activeNav) {
        if (page.startsWith('post-')) activeNav = 'blog';
        else if (page.startsWith('tool-')) activeNav = 'tools';
    }
    if (activeNav) {
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.nav === activeNav) {
                link.classList.remove('text-gray-500');
                link.classList.add('text-black');
                // Skip the contact button styling
                if (activeNav !== 'contact') {
                    link.classList.add('font-medium');
                }
            }
        });
    }
}

function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('menu-icon');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => {
        const isOpen = !menu.classList.contains('hidden');
        menu.classList.toggle('hidden');
        // Swap hamburger <-> X icon
        icon.setAttribute('d', isOpen
            ? 'M4 6h16M4 12h16M4 18h16'
            : 'M6 18L18 6M6 6l12 12'
        );
    });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}
