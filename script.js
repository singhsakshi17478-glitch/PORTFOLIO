document.addEventListener('DOMContentLoaded', () => {

    // ── Particle Background ───────────────────────────────────────
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 60;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 5 + 2,
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
            alpha: Math.random() * 0.4 + 0.4
        });
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connecting lines
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 33, 71, ${0.35 * (1 - dist / 130)})`;
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw dots
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 33, 71, ${p.alpha})`;
            ctx.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        });

        requestAnimationFrame(drawParticles);
    }

    drawParticles();
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

    // ── Video Modal ───────────────────────────────────────────────
    const learnMoreBtn = document.getElementById('learn-more-btn');
    const videoModal = document.getElementById('video-modal');
    const videoModalOverlay = document.getElementById('video-modal-overlay');
    const videoClose = document.getElementById('video-close');
    const introVideo = document.getElementById('intro-video');

    learnMoreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        videoModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        introVideo.play();
    });

    function closeVideoModal() {
        videoModal.classList.remove('open');
        document.body.style.overflow = '';
        introVideo.pause();
        introVideo.currentTime = 0;
    }

    videoClose.addEventListener('click', closeVideoModal);
    videoModalOverlay.addEventListener('click', closeVideoModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal.classList.contains('open')) {
            closeVideoModal();
        }
    });

    // ── Certificate Lightbox ──────────────────────────────────────
    const certificates = [
        { title: 'Python Certificate 1', src: 'cert1.jpg.jpeg' },
        { title: 'Python Certificate 2', src: 'cert2.jpg.jpeg' },
        { title: 'DSA Certificate', src: 'cert3.jpg.jpeg' },
        { title: 'Reverse Code Certificate', src: 'cert4.jpg.jpeg' },
        { title: 'Code Debugging', src: 'cert5.jpg.jpeg' },
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
