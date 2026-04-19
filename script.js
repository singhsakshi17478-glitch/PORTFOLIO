document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('header, section');

    // Function to switch sections
    function switchSection(targetId) {
        // Clean targetId (remove hash)
        const id = targetId.replace('#', '');
        
        // Hide all sections and remove active class from links
        sections.forEach(sec => {
            sec.classList.remove('active');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Show the targeted section
        const activeSection = document.getElementById(id);
        if (activeSection) {
            activeSection.classList.add('active');
            
            // Add active class to corresponding link
            const activeLink = document.querySelector(`.nav-links a[href="#${id}"]`);
            if (activeLink) activeLink.classList.add('active');

            // Scroll to top of the new view
            window.scrollTo(0, 0);
        }
    }

    // Handle initial state (Home)
    const initialHash = window.location.hash || '#home';
    switchSection(initialHash);

    // Navigation Link Click Handlers
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // Update URL hash without jumping (history push)
            history.pushState(null, null, targetId);
            
            // Switch view
            switchSection(targetId);
        });
    });

    // Sticky Navbar on Scroll (still useful for the active section being tall)
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    mobileMenuBtn.addEventListener('click', () => {
        const navLinksEl = document.querySelector('.nav-links');
        navLinksEl.classList.toggle('mobile-open');
    });

    // ── Certificate Lightbox ──────────────────────────────────────
    const certificates = [
        { title: 'Certificate 1', src: 'cert1.jpg.jpeg' },
        { title: 'Certificate 2', src: 'cert2.jpg.jpeg' },
        { title: 'Certificate 3', src: 'cert3.jpg.jpeg' },
        { title: 'Certificate 4', src: 'cert4.jpg.jpeg' },
        { title: 'Certificate 5', src: 'cert5.jpg.jpeg', rotate: -90 },
    ];

    let currentCertIndex = 0;

    const modal        = document.getElementById('cert-modal');
    const modalOverlay = document.getElementById('cert-modal-overlay');
    const modalImg     = document.getElementById('cert-modal-img');
    const placeholder  = document.getElementById('cert-modal-placeholder');
    const certClose    = document.getElementById('cert-close');
    const certPrev     = document.getElementById('cert-prev');
    const certNext     = document.getElementById('cert-next');
    const certCounter  = document.getElementById('cert-counter');

    function loadCert(index) {
        const cert = certificates[index];
        modalImg.classList.remove('loaded');
        placeholder.style.display = 'none';

        // Apply rotation if specified
        if (cert.rotate) {
            modalImg.style.transform = `rotate(${cert.rotate}deg)`;
        } else {
            modalImg.style.transform = '';
        }

        modalImg.onload = () => {
            modalImg.classList.add('loaded');
            placeholder.style.display = 'none';
        };
        modalImg.onerror = () => {
            modalImg.classList.remove('loaded');
            placeholder.style.display = 'block';
            placeholder.innerHTML = `📄 <strong>${cert.title}</strong><br><small>Image not found. Add <strong>${cert.src}</strong> to your portfolio folder.</small>`;
        };

        modalImg.src = cert.src;
        modalImg.alt = cert.title;
        certCounter.textContent = `${index + 1} / ${certificates.length}`;
        certPrev.disabled = index === 0;
        certNext.disabled = index === certificates.length - 1;
    }

    function openModal(index) {
        currentCertIndex = index;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        loadCert(currentCertIndex);
    }

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
        modalImg.src = '';
        modalImg.classList.remove('loaded');
    }

    // Open on card button click
    document.querySelectorAll('.btn-view-cert').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.closest('.cert-card').dataset.index);
            openModal(index);
        });
    });

    // Also open on card click
    document.querySelectorAll('.cert-card').forEach((card) => {
        card.addEventListener('click', () => {
            openModal(parseInt(card.dataset.index));
        });
    });

    // Close on X button or overlay click
    certClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Prev / Next
    certPrev.addEventListener('click', () => {
        if (currentCertIndex > 0) {
            currentCertIndex--;
            loadCert(currentCertIndex);
        }
    });

    certNext.addEventListener('click', () => {
        if (currentCertIndex < certificates.length - 1) {
            currentCertIndex++;
            loadCert(currentCertIndex);
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && currentCertIndex > 0) { currentCertIndex--; loadCert(currentCertIndex); }
        if (e.key === 'ArrowRight' && currentCertIndex < certificates.length - 1) { currentCertIndex++; loadCert(currentCertIndex); }
    });
});
