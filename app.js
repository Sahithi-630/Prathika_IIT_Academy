/**
 * PRATHIKA IIT ACADEMY - INTERACTIVE CORE JAVASCRIPT
 * Features: Sticky Navigation, Mobile Menu, Course Tabs, Testimonial Slider, Scroll Reveals, Admissions Form
 */

document.addEventListener('DOMContentLoaded', () => {

    // Override fetch to automatically redirect relative API calls to localhost:3000 if running on a dev server or file scheme
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        if (typeof input === 'string' && input.startsWith('/api/')) {
            if (window.location.protocol === 'file:' || !window.location.port || window.location.port !== '3000') {
                input = `http://localhost:3000${input}`;
            }
        }
        return originalFetch(input, init);
    };

    /* ==========================================================================================================
       1. STICKY HEADER TRANSITION ON SCROLL
       ========================================================================== */
    const header = document.querySelector('.main-header');
    
    const checkScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', checkScroll);
    checkScroll(); // Run once on load in case page is refreshed halfway down


    /* ==========================================================================
       2. RESPONSIVE MOBILE NAVIGATION DRAWER
       ========================================================================== */
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const toggleMenu = () => {
        mobileToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
        document.body.classList.toggle('no-scroll');
    };
    
    mobileToggle.addEventListener('click', toggleMenu);
    
    // Close mobile menu when clicking any nav link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('open')) {
                toggleMenu();
            }
        });
    });


    /* ==========================================================================
       3. INTERACTIVE COURSE TABS SWITCHER
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            
            // Deactivate active states
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none'; // Ensure display none to let layout calculate correctly
            });
            
            // Activate target state
            btn.classList.add('active');
            const activePanel = document.getElementById(targetId);
            activePanel.style.display = 'block';
            
            // Small timeout to allow browser layout recalculation before introducing CSS transitions
            setTimeout(() => {
                activePanel.classList.add('active');
            }, 50);
        });
    });


    /* ==========================================================================
       4. PREMIUM TESTIMONIALS SLIDER
       ========================================================================== */
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    
    if (slides.length > 0 && prevBtn && nextBtn) {
        let currentSlide = 0;
        let autoSlideInterval;
        
        const showSlide = (index) => {
            // Handle boundary conditions
            if (index >= slides.length) currentSlide = 0;
            else if (index < 0) currentSlide = slides.length - 1;
            else currentSlide = index;
            
            // Remove active class from all slides and dots
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            // Activate target slide and dot
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        };
        
        const startAutoSlide = () => {
            stopAutoSlide(); // clear existing if any
            autoSlideInterval = setInterval(() => {
                showSlide(currentSlide + 1);
            }, 6000); // 6 seconds per slide
        };
        
        const stopAutoSlide = () => {
            if (autoSlideInterval) {
                clearInterval(autoSlideInterval);
            }
        };
        
        // Slide Navigation click events
        nextBtn.addEventListener('click', () => {
            showSlide(currentSlide + 1);
            startAutoSlide(); // Reset timer on manual click
        });
        
        prevBtn.addEventListener('click', () => {
            showSlide(currentSlide - 1);
            startAutoSlide(); // Reset timer on manual click
        });
        
        // Dot click events
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const slideIndex = parseInt(dot.getAttribute('data-slide'));
                showSlide(slideIndex);
                startAutoSlide(); // Reset timer on manual click
            });
        });
        
        // Pause auto-sliding on hovering over slider to improve UX
        const sliderContainer = document.querySelector('.testimonials-container');
        if (sliderContainer) {
            sliderContainer.addEventListener('mouseenter', stopAutoSlide);
            sliderContainer.addEventListener('mouseleave', startAutoSlide);
        }
        
        // Initialise slider timer
        startAutoSlide();
    }


    /* ==========================================================================
       5. SCROLL-TRIGGERED FADE-IN REVEAL ANIMATIONS
       ========================================================================== */
    const revealElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');
    
    const revealOnScroll = () => {
        const triggerBottom = window.innerHeight * 0.85; // animate when 85% of viewport is scrolled
        
        revealElements.forEach(el => {
            const elTop = el.getBoundingClientRect().top;
            
            if (elTop < triggerBottom) {
                el.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Run once on load to reveal elements already in view


    /* ==========================================================================
       6. INTERACTIVE LEAD ADMISSION INQUIRY FORM
       ========================================================================== */
    const inquiryForm = document.getElementById('inquiryForm');
    const formSuccessState = document.getElementById('formSuccessState');
    const resetFormBtn = document.getElementById('resetFormBtn');
    
    if (inquiryForm && formSuccessState && resetFormBtn) {
        inquiryForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent standard page reload
            
            // Retrieve inputs (useful for validation or eventual API integration)
            const studentName = document.getElementById('studentName').value;
            const parentName = document.getElementById('parentName').value;
            const studentClass = document.getElementById('studentClass').value;
            const targetExam = document.getElementById('targetExam').value;
            const phoneNumber = document.getElementById('phoneNumber').value;
            const message = document.getElementById('message').value;
            
            // POST to backend API
            fetch('/api/inquiries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentName,
                    parentName,
                    studentClass,
                    targetExam,
                    phoneNumber,
                    message
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Inquiry Captured in database:', data);
            })
            .catch(err => {
                console.error('Error saving inquiry:', err);
            });
            
            // Elegant animation transitions to success state
            inquiryForm.style.opacity = '0';
            
            setTimeout(() => {
                inquiryForm.style.display = 'none';
                formSuccessState.style.display = 'flex';
                
                // Smooth scroll up to contact card header if needed
                const contactColumn = document.querySelector('.contact-form-column');
                if (contactColumn) {
                    contactColumn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 300);
        });
        
        // Reset Form button action
        resetFormBtn.addEventListener('click', () => {
            inquiryForm.reset();
            
            formSuccessState.style.display = 'none';
            inquiryForm.style.display = 'flex';
            
            setTimeout(() => {
                inquiryForm.style.opacity = '1';
            }, 50);
        });
    }


    /* ==========================================================================
       7. ACTIVE NAVIGATION LINK SWITCHER BASED ON SCROLL POSITION
       ========================================================================== */
    // const sections = document.querySelectorAll('section');
    
    // const activeNavLinkOnScroll = () => {
    //     let currentSectionId = '';
        
    //     sections.forEach(section => {
    //         const sectionTop = section.offsetTop - 120; // accounting for sticky header gap
    //         const sectionHeight = section.clientHeight;
            
    //         if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
    //             currentSectionId = section.getAttribute('id');
    //         }
    //     });
        
    //     navLinks.forEach(link => {
    //         link.classList.remove('active');
    //         if (link.getAttribute('href') === `#${currentSectionId}`) {
    //             link.classList.add('active');
    //         }
    //     });
    // };
    
    // window.addEventListener('scroll', activeNavLinkOnScroll);
    // activeNavLinkOnScroll();
});
