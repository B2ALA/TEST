/**
 * PORTFOLIO — script.js
 * Handles: data loading, rendering all sections, dark/light mode,
 * search, contact form, project modal slideshow, scroll animations.
 * All content comes from localStorage (seeded from data.json on first load).
 */

/* ============================================================
   1. CONSTANTS & STATE
   ============================================================ */
const DATA_KEY   = 'portfolio_data';
const THEME_KEY  = 'portfolio_theme';
const FALLBACK_AVATAR = 'assets/images/placeholder-avatar.svg';

let portfolioData = null;  // Holds the parsed portfolio data
let currentSlide  = 0;     // Active slide index in the project modal
let slidesCount   = 0;     // Total slides in the current modal

/* ============================================================
   2. BOOT — runs once DOM is ready
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  applyTheme(getSavedTheme());
  renderAll();
  initNav();
  initThemeToggle();
  initScrollReveal();
  initProjectSearch();
  initCertSearch();
  initContactForm();
  initModal();
  hideLoarder();
  setFooterYear();
});

/* ============================================================
   3. DATA LOADING
   Tries localStorage first; falls back to data.json on first visit.
   ============================================================ */
async function loadData() {
  const stored = localStorage.getItem(DATA_KEY);
  if (stored) {
    try {
      portfolioData = JSON.parse(stored);
      return;
    } catch (e) {
      console.warn('Corrupt localStorage data, reloading from JSON.', e);
    }
  }
  // First visit — fetch seed data
  try {
    const res  = await fetch('data.json');
    portfolioData = await res.json();
    localStorage.setItem(DATA_KEY, JSON.stringify(portfolioData));
  } catch (e) {
    console.error('Could not load data.json', e);
    portfolioData = defaultData();
  }
}

function defaultData() {
  return {
    profile: {
      name: 'Add your name', title: 'Add your title',
      bio: 'Add your bio here.', email: 'your@email.com',
      phone: '+1 234 567 8900', location: 'Your City, Country',
      avatar: '', resume: ''
    },
    social: { github:'', linkedin:'', twitter:'', instagram:'', website:'' },
    skills: [], projects: [], education: [], experience: [], certificates: []
  };
}

/* ============================================================
   4. RENDER ALL SECTIONS
   ============================================================ */
function renderAll() {
  renderHome();
  renderAbout();
  renderSkills();
  renderProjects(portfolioData.projects);
  renderEducation();
  renderExperience();
  renderCertificates(portfolioData.certificates);
  renderContact();
  renderFooter();
  // Re-init Lucide icons after dynamic content
  if (window.lucide) lucide.createIcons();
}

/* -- HOME ---------------------------------------------------- */
function renderHome() {
  const p = portfolioData.profile;
  const s = portfolioData.social;

  q('#homeName').textContent   = p.name  || 'Add your name';
  q('#homeTitle').textContent  = p.title || 'Add your title';
  q('#homeBio').textContent    = p.bio   || 'Add your bio here.';
  q('#navLogo').textContent    = p.name  || 'Portfolio';

  const avatar = p.avatar || FALLBACK_AVATAR;
  q('#homeAvatar').src  = avatar;
  q('#aboutAvatar').src = avatar;

  // Resume button
  const homeResBtn = q('#homeResume');
  if (p.resume) {
    homeResBtn.href = p.resume;
  } else {
    homeResBtn.style.display = 'none';
  }

  // Social icons in hero
  q('#homeSocial').innerHTML = buildSocialHTML(s);
}

/* -- ABOUT --------------------------------------------------- */
function renderAbout() {
  const p = portfolioData.profile;
  q('#aboutBio').textContent      = p.bio      || '—';
  q('#aboutName').textContent     = p.name     || '—';
  q('#aboutEmail').textContent    = p.email    || '—';
  q('#aboutPhone').textContent    = p.phone    || '—';
  q('#aboutLocation').textContent = p.location || '—';

  const aboutResBtn = q('#aboutResume');
  if (p.resume) {
    aboutResBtn.href = p.resume;
  } else {
    aboutResBtn.style.display = 'none';
  }
}

/* -- SKILLS -------------------------------------------------- */
function renderSkills() {
  const grid = q('#skillsGrid');
  const skills = portfolioData.skills;

  if (!skills || skills.length === 0) {
    grid.innerHTML = '<p class="empty-state">Add your skills</p>';
    return;
  }

  /* skills = [{ category: "Frontend", items: ["HTML","CSS"] }, ...] */
  grid.innerHTML = skills.map(s => `
    <div class="skill-category reveal">
      <p class="skill-category__name">${escHtml(s.category)}</p>
      <div class="skill-tags">
        ${s.items.map(it => `<span class="skill-tag">${escHtml(it)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

/* -- PROJECTS ----------------------------------------------- */
function renderProjects(list) {
  const grid = q('#projectsGrid');

  if (!list || list.length === 0) {
    grid.innerHTML = '<p class="empty-state">Add your projects</p>';
    return;
  }

  grid.innerHTML = list.map((proj, i) => {
    const thumb = (proj.images && proj.images[0]) ? proj.images[0] : null;
    const imgHtml = thumb
      ? `<img class="project-card__img" src="${escAttr(thumb)}" alt="${escAttr(proj.title)}" loading="lazy" />`
      : `<div class="project-card__img-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>`;

    const tags = (proj.technologies || [])
      .slice(0, 4)
      .map(t => `<span class="project-card__tag">${escHtml(t)}</span>`).join('');

    return `
      <article class="project-card reveal" data-index="${i}" tabindex="0" role="button" aria-label="View ${escAttr(proj.title)} details">
        ${imgHtml}
        <div class="project-card__body">
          <h3 class="project-card__title">${escHtml(proj.title)}</h3>
          <p class="project-card__desc">${escHtml(proj.description || '')}</p>
          <div class="project-card__tags">${tags}</div>
        </div>
      </article>`;
  }).join('');

  // Click/keyboard open modal
  qAll('.project-card').forEach(card => {
    card.addEventListener('click', () => openProjectModal(parseInt(card.dataset.index)));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openProjectModal(parseInt(card.dataset.index));
    });
  });
}

/* -- EDUCATION ---------------------------------------------- */
function renderEducation() {
  const tl = q('#educationTimeline');
  const edu = portfolioData.education;

  if (!edu || edu.length === 0) {
    tl.innerHTML = '<p class="empty-state">Add your education</p>';
    return;
  }

  tl.innerHTML = edu.map(e => `
    <div class="timeline-item reveal">
      <h3 class="timeline-item__title">${escHtml(e.degree)}</h3>
      <p class="timeline-item__sub">${escHtml(e.institution)}</p>
      <p class="timeline-item__date">${escHtml(e.startYear)} – ${escHtml(e.endYear)}</p>
      <p class="timeline-item__desc">${escHtml(e.description || '')}</p>
    </div>
  `).join('');
}

/* -- EXPERIENCE --------------------------------------------- */
function renderExperience() {
  const tl = q('#experienceTimeline');
  const exp = portfolioData.experience;

  if (!exp || exp.length === 0) {
    tl.innerHTML = '<p class="empty-state">Add your experience</p>';
    return;
  }

  tl.innerHTML = exp.map(e => `
    <div class="timeline-item reveal">
      <h3 class="timeline-item__title">${escHtml(e.role)}</h3>
      <p class="timeline-item__sub">${escHtml(e.company)}</p>
      <p class="timeline-item__date">${escHtml(e.startDate)} – ${escHtml(e.endDate)}</p>
      <p class="timeline-item__desc">${escHtml(e.description || '')}</p>
    </div>
  `).join('');
}

/* -- CERTIFICATES ------------------------------------------- */
function renderCertificates(list) {
  const grid = q('#certsGrid');

  if (!list || list.length === 0) {
    grid.innerHTML = '<p class="empty-state">Add your certificates</p>';
    return;
  }

  grid.innerHTML = list.map(c => `
    <div class="cert-card reveal">
      <div class="cert-card__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <h3 class="cert-card__title">${escHtml(c.title)}</h3>
      <p class="cert-card__issuer">${escHtml(c.issuer)}</p>
      <p class="cert-card__date">${escHtml(c.date)}</p>
      ${c.link ? `<a href="${escAttr(c.link)}" class="cert-card__link" target="_blank" rel="noopener">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        View Certificate
      </a>` : ''}
    </div>
  `).join('');
}

/* -- CONTACT ------------------------------------------------- */
function renderContact() {
  const p = portfolioData.profile;
  const s = portfolioData.social;

  q('#contactEmail').textContent    = p.email    || '—';
  q('#contactPhone').textContent    = p.phone    || '—';
  q('#contactLocation').textContent = p.location || '—';
  q('#contactSocial').innerHTML     = buildSocialHTML(s);
}

/* -- FOOTER -------------------------------------------------- */
function renderFooter() {
  q('#footerName').textContent = portfolioData.profile.name || 'Portfolio';
  q('#footerSocial').innerHTML = buildSocialHTML(portfolioData.social);
  q('#footerYear').textContent = new Date().getFullYear();
}

/* ============================================================
   5. SOCIAL ICON HTML BUILDER
   ============================================================ */
function buildSocialHTML(s) {
  if (!s) return '';
  const icons = {
    github:   `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>`,
    linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    twitter:  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    instagram:`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    website:  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>`
  };

  return Object.entries(icons)
    .filter(([key]) => s[key])
    .map(([key]) =>
      `<a href="${escAttr(s[key])}" target="_blank" rel="noopener" aria-label="${key}" title="${key}">${icons[key]}</a>`
    ).join('');
}

/* ============================================================
   6. PROJECT MODAL
   ============================================================ */
function openProjectModal(index) {
  const proj = portfolioData.projects[index];
  if (!proj) return;

  const modal   = q('#projectModal');
  const slides  = q('#modalSlides');
  const dots    = q('#modalDots');
  const images  = (proj.images && proj.images.length) ? proj.images : [];

  // Reset slide index
  currentSlide = 0;
  slidesCount  = images.length;

  // Build slides
  if (images.length > 0) {
    slides.innerHTML = images
      .map(src => `<img src="${escAttr(src)}" alt="${escAttr(proj.title)}" loading="lazy" />`)
      .join('');
    dots.innerHTML = images.map((_, i) =>
      `<button class="modal__dot ${i===0?'active':''}" aria-label="Go to image ${i+1}" data-i="${i}"></button>`
    ).join('');
    q('#modalSlideshow').style.display = '';
  } else {
    q('#modalSlideshow').style.display = 'none';
  }

  // Content
  q('#modalTitle').textContent = proj.title || '';
  q('#modalDesc').textContent  = proj.description || '';
  q('#modalTags').innerHTML = (proj.technologies || [])
    .map(t => `<span class="project-card__tag">${escHtml(t)}</span>`).join('');

  // Links
  const githubBtn = q('#modalGithub');
  const liveBtn   = q('#modalLive');
  if (proj.github) {
    githubBtn.href = proj.github;
    githubBtn.style.display = '';
  } else {
    githubBtn.style.display = 'none';
  }
  if (proj.live) {
    liveBtn.href = proj.live;
    liveBtn.style.display = '';
  } else {
    liveBtn.style.display = 'none';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Dot click
  qAll('.modal__dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.i)));
  });

  // Refresh icons
  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  q('#projectModal').classList.remove('open');
  document.body.style.overflow = '';
}

function goToSlide(n) {
  if (slidesCount === 0) return;
  currentSlide = (n + slidesCount) % slidesCount;
  q('#modalSlides').style.transform = `translateX(-${currentSlide * 100}%)`;
  qAll('.modal__dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}

function initModal() {
  q('#modalClose').addEventListener('click', closeModal);
  q('#modalBackdrop').addEventListener('click', closeModal);
  q('#slidePrev').addEventListener('click', () => goToSlide(currentSlide - 1));
  q('#slideNext').addEventListener('click', () => goToSlide(currentSlide + 1));
  document.addEventListener('keydown', e => {
    if (!q('#projectModal').classList.contains('open')) return;
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowLeft')  goToSlide(currentSlide - 1);
    if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);
  });
}

/* ============================================================
   7. SEARCH
   ============================================================ */
function initProjectSearch() {
  q('#projectSearch').addEventListener('input', e => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = portfolioData.projects.filter(p =>
      p.title.toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.technologies || []).some(t => t.toLowerCase().includes(term))
    );
    renderProjects(filtered);
    if (window.lucide) lucide.createIcons();
    initScrollReveal(); // Re-observe new elements
  });
}

function initCertSearch() {
  q('#certSearch').addEventListener('input', e => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = portfolioData.certificates.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.issuer.toLowerCase().includes(term)
    );
    renderCertificates(filtered);
    if (window.lucide) lucide.createIcons();
    initScrollReveal();
  });
}

/* ============================================================
   8. CONTACT FORM VALIDATION
   ============================================================ */
function initContactForm() {
  const form    = q('#contactForm');
  const nameIn  = q('#cfName');
  const emailIn = q('#cfEmail');
  const msgIn   = q('#cfMsg');
  const success = q('#cfSuccess');

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    // Name
    if (!nameIn.value.trim()) {
      setErr(nameIn, 'cfNameErr', 'Name is required.');
      valid = false;
    } else {
      clearErr(nameIn, 'cfNameErr');
    }

    // Email
    if (!isValidEmail(emailIn.value.trim())) {
      setErr(emailIn, 'cfEmailErr', 'Enter a valid email address.');
      valid = false;
    } else {
      clearErr(emailIn, 'cfEmailErr');
    }

    // Message
    if (msgIn.value.trim().length < 10) {
      setErr(msgIn, 'cfMsgErr', 'Message must be at least 10 characters.');
      valid = false;
    } else {
      clearErr(msgIn, 'cfMsgErr');
    }

    if (!valid) return;

    // Simulate send (no backend)
    success.textContent = '✓ Message sent! I\'ll get back to you soon.';
    form.reset();
    setTimeout(() => { success.textContent = ''; }, 5000);
    showToast('Message sent!', 'success');
  });
}

function setErr(input, errId, msg) {
  input.classList.add('error');
  q('#' + errId).textContent = msg;
}
function clearErr(input, errId) {
  input.classList.remove('error');
  q('#' + errId).textContent = '';
}
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* ============================================================
   9. NAVIGATION — scroll spy + sticky
   ============================================================ */
function initNav() {
  const nav = q('#nav');

  // Sticky class on scroll
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
    updateActiveLink();
  }, { passive: true });

  // Mobile drawer
  q('#navBurger').addEventListener('click', openDrawer);
  q('#navDrawerClose').addEventListener('click', closeDrawer);
  q('#navOverlay').addEventListener('click', closeDrawer);

  qAll('.nav__drawer-link').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Smooth scroll on nav links
  qAll('.nav__link, .nav__drawer-link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

function openDrawer() {
  q('#navDrawer').classList.add('open');
  q('#navOverlay').classList.add('visible');
  q('#navDrawer').setAttribute('aria-hidden', 'false');
  q('#navBurger').setAttribute('aria-expanded', 'true');
}
function closeDrawer() {
  q('#navDrawer').classList.remove('open');
  q('#navOverlay').classList.remove('visible');
  q('#navDrawer').setAttribute('aria-hidden', 'true');
  q('#navBurger').setAttribute('aria-expanded', 'false');
}

function updateActiveLink() {
  const sections = qAll('main section[id]');
  let current = '';
  sections.forEach(sec => {
    const top = sec.getBoundingClientRect().top;
    if (top <= 80) current = sec.id;
  });
  qAll('.nav__link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
}

/* ============================================================
   10. DARK / LIGHT MODE
   ============================================================ */
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  const moonIcon = q('.icon--moon');
  const sunIcon  = q('.icon--sun');
  if (theme === 'dark') {
    if (moonIcon) moonIcon.style.display = '';
    if (sunIcon)  sunIcon.style.display  = 'none';
  } else {
    if (moonIcon) moonIcon.style.display = 'none';
    if (sunIcon)  sunIcon.style.display  = '';
  }
}

function initThemeToggle() {
  q('#themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

/* ============================================================
   11. SCROLL REVEAL ANIMATION
   ============================================================ */
function initScrollReveal() {
  const reveals = qAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
}

/* ============================================================
   12. LOADER
   ============================================================ */
function hideLoarder() {
  setTimeout(() => {
    const loader = q('#loader');
    if (loader) loader.classList.add('hidden');
  }, 600);
}

/* ============================================================
   13. FOOTER
   ============================================================ */
function setFooterYear() {
  const el = q('#footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ============================================================
   14. TOAST NOTIFICATION
   ============================================================ */
function showToast(msg, type = '') {
  const toast = q('#toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ============================================================
   15. UTILITY HELPERS
   ============================================================ */
function q(sel)    { return document.querySelector(sel); }
function qAll(sel) { return document.querySelectorAll(sel); }

// Escape HTML to prevent XSS
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escape attribute values
function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}
