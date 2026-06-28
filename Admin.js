/**
 * PORTFOLIO — admin.js
 * Handles:
 *  - Admin authentication (email/password + 2FA simulation)
 *  - Session management via sessionStorage
 *  - Full CRUD for all portfolio sections
 *  - Image upload via FileReader → base64
 *  - Theme toggle (syncs with main portfolio)
 */

/* ============================================================
   1. CONSTANTS & CONFIG
   ============================================================ */
const DATA_KEY       = 'portfolio_data';
const SESSION_KEY    = 'admin_session';
const THEME_KEY      = 'portfolio_theme';
const ATTEMPTS_KEY   = 'admin_attempts';
const MAX_ATTEMPTS   = 5;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Demo credentials — in production replace with server-side auth
const ADMIN_EMAIL = 'admin@portfolio.com';
const ADMIN_PASS  = 'Admin@123';
const DEMO_2FA    = '123456';

/* ============================================================
   2. STATE
   ============================================================ */
let portfolioData = null;
let pendingEmail  = '';     // Stored during 2FA step
let confirmCb     = null;   // Callback for confirm dialog

/* ============================================================
   3. BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyTheme(getSavedTheme());
  initThemeToggle();

  // Check existing session
  if (isSessionValid()) {
    showDashboard();
  } else {
    showAuthScreen();
  }

  hideLoarder();
});

/* ============================================================
   4. DATA HELPERS
   ============================================================ */
function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    portfolioData = raw ? JSON.parse(raw) : defaultData();
  } catch {
    portfolioData = defaultData();
  }
}

function saveData() {
  localStorage.setItem(DATA_KEY, JSON.stringify(portfolioData));
}

function defaultData() {
  return {
    profile: {
      name: '', title: '', bio: '',
      email: '', phone: '', location: '', avatar: '', resume: ''
    },
    social: { github:'', linkedin:'', twitter:'', instagram:'', website:'' },
    skills: [], projects: [], education: [], experience: [], certificates: []
  };
}

/* ============================================================
   5. SESSION MANAGEMENT
   ============================================================ */
function isSessionValid() {
  try {
    const sess = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!sess || !sess.expires) return false;
    if (Date.now() > sess.expires) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch { return false; }
}

function createSession(email) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    email,
    expires: Date.now() + SESSION_TTL_MS
  }));
}

function destroySession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function getSessionEmail() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.email || 'Admin';
  } catch { return 'Admin'; }
}

/* Login attempt throttle */
function getAttempts() {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0');
}
function incrementAttempts() {
  localStorage.setItem(ATTEMPTS_KEY, String(getAttempts() + 1));
}
function resetAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}

/* ============================================================
   6. AUTH FLOW
   ============================================================ */
function showAuthScreen() {
  q('#authScreen').style.display = '';
  q('#dashboard').style.display = 'none';
  initLoginForm();
  init2FAForm();
}

function showDashboard() {
  q('#authScreen').style.display = 'none';
  q('#dashboard').style.display = '';
  q('#topbarUser').textContent = getSessionEmail();
  initDashboard();
}

/* ---- Login form -------------------------------------------- */
function initLoginForm() {
  const form     = q('#loginForm');
  const emailIn  = q('#loginEmail');
  const pwdIn    = q('#loginPwd');
  const pwToggle = q('#pwToggle');

  // Password visibility toggle
  pwToggle.addEventListener('click', () => {
    const isText = pwdIn.type === 'text';
    pwdIn.type = isText ? 'password' : 'text';
    q('#eyeOpen').style.display  = isText ? '' : 'none';
    q('#eyeClosed').style.display = isText ? 'none' : '';
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    if (!isValidEmail(emailIn.value.trim())) {
      setErr(emailIn, 'loginEmailErr', 'Enter a valid email.');
      valid = false;
    } else clearErr(emailIn, 'loginEmailErr');

    if (pwdIn.value.length < 6) {
      setErr(pwdIn, 'loginPwdErr', 'Password must be at least 6 characters.');
      valid = false;
    } else clearErr(pwdIn, 'loginPwdErr');

    if (!valid) return;

    // Check attempt throttle
    if (getAttempts() >= MAX_ATTEMPTS) {
      setErr(emailIn, 'loginEmailErr', 'Too many failed attempts. Refresh and try again.');
      return;
    }

    // Validate credentials
    if (emailIn.value.trim() !== ADMIN_EMAIL || pwdIn.value !== ADMIN_PASS) {
      incrementAttempts();
      setErr(pwdIn, 'loginPwdErr', 'Invalid email or password.');
      return;
    }

    // Proceed to 2FA
    pendingEmail = emailIn.value.trim();
    q('#loginStep').style.display = 'none';
    q('#tfaStep').style.display   = '';
    q('#tfaCode').focus();
    showToast('Verification code sent! (Demo: 123456)', '');
  });
}

/* ---- 2FA form --------------------------------------------- */
function init2FAForm() {
  const form    = q('#tfaForm');
  const codeIn  = q('#tfaCode');

  q('#tfaBack').addEventListener('click', () => {
    q('#tfaStep').style.display   = 'none';
    q('#loginStep').style.display = '';
    codeIn.value = '';
    clearErr(codeIn, 'tfaCodeErr');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    const code = codeIn.value.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErr(codeIn, 'tfaCodeErr', 'Enter the 6-digit code.');
      return;
    }
    if (code !== DEMO_2FA) {
      setErr(codeIn, 'tfaCodeErr', 'Incorrect code. Try again.');
      return;
    }

    resetAttempts();
    createSession(pendingEmail);
    showDashboard();
    showToast('Logged in successfully!', 'success');
  });
}

/* ============================================================
   7. DASHBOARD INIT
   ============================================================ */
function initDashboard() {
  initSidebar();
  initLogout();
  initOverviewPanel();
  initProfilePanel();
  initSkillsPanel();
  initProjectsPanel();
  initEducationPanel();
  initExperiencePanel();
  initCertificatesPanel();
  initContactInfoPanel();
  initSocialPanel();
  initResumePanel();
}

/* ============================================================
   8. SIDEBAR & NAVIGATION
   ============================================================ */
function initSidebar() {
  const toggle = q('#sidebarToggle');
  const close  = q('#sidebarClose');
  const sidebar = q('#sidebar');

  toggle?.addEventListener('click', () => sidebar.classList.add('open'));
  close?.addEventListener('click', () => sidebar.classList.remove('open'));

  qAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', () => {
      const panelId = link.dataset.panel;
      if (!panelId) return;

      // Activate link
      qAll('.sidebar__link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Activate panel
      qAll('.admin-panel').forEach(p => p.classList.remove('active'));
      q('#' + panelId)?.classList.add('active');

      // Update top bar title
      q('#topbarTitle').textContent = link.textContent.trim();

      // Close mobile sidebar
      if (window.innerWidth < 769) sidebar.classList.remove('open');
    });
  });
}

function initLogout() {
  q('#logoutBtn').addEventListener('click', () => {
    showConfirm('Log out of the admin panel?', () => {
      destroySession();
      window.location.reload();
    });
  });
}

/* ============================================================
   9. OVERVIEW PANEL
   ============================================================ */
function initOverviewPanel() {
  const stats = [
    { label: 'Skills',       count: portfolioData.skills.length       },
    { label: 'Projects',     count: portfolioData.projects.length     },
    { label: 'Education',    count: portfolioData.education.length    },
    { label: 'Experience',   count: portfolioData.experience.length   },
    { label: 'Certificates', count: portfolioData.certificates.length }
  ];
  q('#statsGrid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-card__count">${s.count}</span>
      <span class="stat-card__label">${s.label}</span>
    </div>
  `).join('');
}

/* ============================================================
   10. PROFILE PANEL
   ============================================================ */
function initProfilePanel() {
  const p = portfolioData.profile;
  q('#pName').value     = p.name     || '';
  q('#pTitle').value    = p.title    || '';
  q('#pBio').value      = p.bio      || '';
  q('#pEmail').value    = p.email    || '';
  q('#pPhone').value    = p.phone    || '';
  q('#pLocation').value = p.location || '';

  if (p.avatar) q('#avatarPreview').src = p.avatar;

  // Avatar upload
  q('#avatarInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2 MB.', 'error'); return; }
    readFileAsBase64(file, b64 => {
      portfolioData.profile.avatar = b64;
      q('#avatarPreview').src = b64;
    });
  });

  q('#avatarRemove').addEventListener('click', () => {
    portfolioData.profile.avatar = '';
    q('#avatarPreview').src = 'assets/images/placeholder-avatar.svg';
    q('#avatarInput').value = '';
  });

  q('#profileForm').addEventListener('submit', e => {
    e.preventDefault();
    portfolioData.profile.name     = q('#pName').value.trim();
    portfolioData.profile.title    = q('#pTitle').value.trim();
    portfolioData.profile.bio      = q('#pBio').value.trim();
    portfolioData.profile.email    = q('#pEmail').value.trim();
    portfolioData.profile.phone    = q('#pPhone').value.trim();
    portfolioData.profile.location = q('#pLocation').value.trim();
    saveData();
    showToast('Profile saved!', 'success');
  });
}

/* ============================================================
   11. SKILLS PANEL
   ============================================================ */
function initSkillsPanel() {
  renderSkillsList();

  q('#addSkillCatBtn').addEventListener('click', () => {
    q('#skillModalTitle').textContent = 'Add Skill Category';
    q('#skCategory').value = '';
    q('#skItems').value    = '';
    q('#skEditIndex').value = '';
    q('#skillModal').style.display = '';
    q('#skCategory').focus();
  });

  q('#skillModalCancel').addEventListener('click', () => {
    q('#skillModal').style.display = 'none';
  });

  q('#skillForm').addEventListener('submit', e => {
    e.preventDefault();
    const cat   = q('#skCategory').value.trim();
    const items = q('#skItems').value.split(',').map(s => s.trim()).filter(Boolean);
    let valid = true;

    if (!cat)          { setErr(q('#skCategory'), 'skCategoryErr', 'Category name required.'); valid = false; }
    else               { clearErr(q('#skCategory'), 'skCategoryErr'); }
    if (!items.length) { setErr(q('#skItems'), 'skItemsErr', 'Add at least one skill.'); valid = false; }
    else               { clearErr(q('#skItems'), 'skItemsErr'); }

    if (!valid) return;

    const idx = q('#skEditIndex').value;
    if (idx !== '') {
      portfolioData.skills[parseInt(idx)] = { category: cat, items };
    } else {
      portfolioData.skills.push({ category: cat, items });
    }
    saveData();
    q('#skillModal').style.display = 'none';
    renderSkillsList();
    showToast('Skills saved!', 'success');
  });
}

function renderSkillsList() {
  const list = q('#skillsList');
  const skills = portfolioData.skills;
  if (!skills.length) { list.innerHTML = '<p class="empty-state">No skill categories yet.</p>'; return; }

  list.innerHTML = skills.map((s, i) => `
    <div class="admin-list-item">
      <div class="admin-list-item__body">
        <p class="admin-list-item__title">${escHtml(s.category)}</p>
        <p class="admin-list-item__sub">${escHtml(s.items.join(', '))}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost btn--sm" onclick="editSkill(${i})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteSkill(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editSkill = (i) => {
  const s = portfolioData.skills[i];
  q('#skillModalTitle').textContent = 'Edit Skill Category';
  q('#skCategory').value    = s.category;
  q('#skItems').value       = s.items.join(', ');
  q('#skEditIndex').value   = i;
  q('#skillModal').style.display = '';
  q('#skCategory').focus();
};

window.deleteSkill = (i) => {
  showConfirm('Delete this skill category?', () => {
    portfolioData.skills.splice(i, 1);
    saveData();
    renderSkillsList();
    showToast('Skill category deleted.', '');
  });
};

/* ============================================================
   12. PROJECTS PANEL
   ============================================================ */
let prjImageStore = []; // holds base64 strings for current project edit

function initProjectsPanel() {
  renderProjectsList();

  q('#addProjectBtn').addEventListener('click', () => {
    openProjectForm();
  });

  q('#projectModalCancel').addEventListener('click', () => {
    q('#projectModal2').style.display = 'none';
    prjImageStore = [];
  });

  // Image upload for projects
  q('#prjImages').addEventListener('change', e => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} exceeds 5 MB.`, 'error'); return; }
      readFileAsBase64(file, b64 => {
        prjImageStore.push(b64);
        renderPrjPreviews();
      });
    });
    e.target.value = ''; // reset so same file can be re-uploaded
  });

  q('#projectForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = q('#prjTitle').value.trim();
    if (!title) { setErr(q('#prjTitle'), 'prjTitleErr', 'Title is required.'); return; }
    clearErr(q('#prjTitle'), 'prjTitleErr');

    const project = {
      title,
      description:  q('#prjDesc').value.trim(),
      technologies: q('#prjTech').value.split(',').map(s => s.trim()).filter(Boolean),
      github:       q('#prjGithub').value.trim(),
      live:         q('#prjLive').value.trim(),
      images:       [...prjImageStore]
    };

    const idx = q('#prjEditIndex').value;
    if (idx !== '') {
      portfolioData.projects[parseInt(idx)] = project;
    } else {
      portfolioData.projects.push(project);
    }
    saveData();
    q('#projectModal2').style.display = 'none';
    prjImageStore = [];
    renderProjectsList();
    showToast('Project saved!', 'success');
  });
}

function openProjectForm(i) {
  prjImageStore = [];
  q('#prjImgPreviews').innerHTML = '';
  q('#prjTitle').value   = '';
  q('#prjDesc').value    = '';
  q('#prjTech').value    = '';
  q('#prjGithub').value  = '';
  q('#prjLive').value    = '';
  q('#prjEditIndex').value = '';
  q('#projectModalTitle').textContent = 'Add Project';

  if (i !== undefined) {
    const p = portfolioData.projects[i];
    q('#projectModalTitle').textContent = 'Edit Project';
    q('#prjTitle').value   = p.title || '';
    q('#prjDesc').value    = p.description || '';
    q('#prjTech').value    = (p.technologies || []).join(', ');
    q('#prjGithub').value  = p.github || '';
    q('#prjLive').value    = p.live   || '';
    q('#prjEditIndex').value = i;
    prjImageStore = [...(p.images || [])];
    renderPrjPreviews();
  }

  q('#projectModal2').style.display = '';
  q('#prjTitle').focus();
}

function renderPrjPreviews() {
  q('#prjImgPreviews').innerHTML = prjImageStore.map((b64, i) => `
    <div class="img-preview-item">
      <img src="${b64}" alt="Preview ${i+1}" />
      <button type="button" class="img-preview-item__rm" onclick="removePrjImg(${i})">✕</button>
    </div>
  `).join('');
}

window.removePrjImg = (i) => {
  prjImageStore.splice(i, 1);
  renderPrjPreviews();
};

function renderProjectsList() {
  const list = q('#projectsList');
  const projects = portfolioData.projects;
  if (!projects.length) { list.innerHTML = '<p class="empty-state">No projects yet.</p>'; return; }

  list.innerHTML = projects.map((p, i) => `
    <div class="admin-list-item">
      <div class="admin-list-item__body">
        <p class="admin-list-item__title">${escHtml(p.title)}</p>
        <p class="admin-list-item__sub">${escHtml((p.technologies || []).join(', ') || '—')}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost btn--sm" onclick="editProject(${i})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteProject(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editProject   = (i) => openProjectForm(i);
window.deleteProject = (i) => {
  showConfirm('Delete this project?', () => {
    portfolioData.projects.splice(i, 1);
    saveData();
    renderProjectsList();
    showToast('Project deleted.', '');
  });
};

/* ============================================================
   13. EDUCATION PANEL
   ============================================================ */
function initEducationPanel() {
  renderEducationList();

  q('#addEduBtn').addEventListener('click', () => openEduForm());
  q('#eduModalCancel').addEventListener('click', () => q('#eduModal').style.display = 'none');

  q('#eduForm').addEventListener('submit', e => {
    e.preventDefault();
    const degree = q('#eduDegree').value.trim();
    const inst   = q('#eduInst').value.trim();
    let valid = true;

    if (!degree) { setErr(q('#eduDegree'), 'eduDegreeErr', 'Degree is required.'); valid = false; }
    else clearErr(q('#eduDegree'), 'eduDegreeErr');
    if (!inst)   { setErr(q('#eduInst'), 'eduInstErr', 'Institution is required.'); valid = false; }
    else clearErr(q('#eduInst'), 'eduInstErr');
    if (!valid) return;

    const item = {
      degree,
      institution: inst,
      startYear:   q('#eduStart').value.trim(),
      endYear:     q('#eduEnd').value.trim(),
      description: q('#eduDesc').value.trim()
    };

    const idx = q('#eduEditIndex').value;
    if (idx !== '') portfolioData.education[parseInt(idx)] = item;
    else portfolioData.education.push(item);

    saveData();
    q('#eduModal').style.display = 'none';
    renderEducationList();
    showToast('Education saved!', 'success');
  });
}

function openEduForm(i) {
  q('#eduDegree').value    = '';
  q('#eduInst').value      = '';
  q('#eduStart').value     = '';
  q('#eduEnd').value       = '';
  q('#eduDesc').value      = '';
  q('#eduEditIndex').value = '';
  q('#eduModalTitle').textContent = 'Add Education';

  if (i !== undefined) {
    const ed = portfolioData.education[i];
    q('#eduModalTitle').textContent = 'Edit Education';
    q('#eduDegree').value    = ed.degree || '';
    q('#eduInst').value      = ed.institution || '';
    q('#eduStart').value     = ed.startYear || '';
    q('#eduEnd').value       = ed.endYear   || '';
    q('#eduDesc').value      = ed.description || '';
    q('#eduEditIndex').value = i;
  }
  q('#eduModal').style.display = '';
  q('#eduDegree').focus();
}

function renderEducationList() {
  const list = q('#educationList');
  const edu  = portfolioData.education;
  if (!edu.length) { list.innerHTML = '<p class="empty-state">No education records yet.</p>'; return; }

  list.innerHTML = edu.map((e, i) => `
    <div class="admin-list-item">
      <div class="admin-list-item__body">
        <p class="admin-list-item__title">${escHtml(e.degree)}</p>
        <p class="admin-list-item__sub">${escHtml(e.institution)} · ${escHtml(e.startYear)}–${escHtml(e.endYear)}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost btn--sm" onclick="editEdu(${i})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteEdu(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editEdu   = (i) => openEduForm(i);
window.deleteEdu = (i) => {
  showConfirm('Delete this education record?', () => {
    portfolioData.education.splice(i, 1);
    saveData();
    renderEducationList();
    showToast('Education record deleted.', '');
  });
};

/* ============================================================
   14. EXPERIENCE PANEL
   ============================================================ */
function initExperiencePanel() {
  renderExperienceList();

  q('#addExpBtn').addEventListener('click', () => openExpForm());
  q('#expModalCancel').addEventListener('click', () => q('#expModal').style.display = 'none');

  q('#expForm').addEventListener('submit', e => {
    e.preventDefault();
    const role    = q('#expRole').value.trim();
    const company = q('#expCompany').value.trim();
    let valid = true;

    if (!role)    { setErr(q('#expRole'), 'expRoleErr', 'Role is required.'); valid = false; }
    else clearErr(q('#expRole'), 'expRoleErr');
    if (!company) { setErr(q('#expCompany'), 'expCompanyErr', 'Company is required.'); valid = false; }
    else clearErr(q('#expCompany'), 'expCompanyErr');
    if (!valid) return;

    const item = {
      role, company,
      startDate:   q('#expStart').value.trim(),
      endDate:     q('#expEnd').value.trim(),
      description: q('#expDesc').value.trim()
    };

    const idx = q('#expEditIndex').value;
    if (idx !== '') portfolioData.experience[parseInt(idx)] = item;
    else portfolioData.experience.push(item);

    saveData();
    q('#expModal').style.display = 'none';
    renderExperienceList();
    showToast('Experience saved!', 'success');
  });
}

function openExpForm(i) {
  q('#expRole').value      = '';
  q('#expCompany').value   = '';
  q('#expStart').value     = '';
  q('#expEnd').value       = '';
  q('#expDesc').value      = '';
  q('#expEditIndex').value = '';
  q('#expModalTitle').textContent = 'Add Experience';

  if (i !== undefined) {
    const ex = portfolioData.experience[i];
    q('#expModalTitle').textContent = 'Edit Experience';
    q('#expRole').value      = ex.role        || '';
    q('#expCompany').value   = ex.company     || '';
    q('#expStart').value     = ex.startDate   || '';
    q('#expEnd').value       = ex.endDate     || '';
    q('#expDesc').value      = ex.description || '';
    q('#expEditIndex').value = i;
  }
  q('#expModal').style.display = '';
  q('#expRole').focus();
}

function renderExperienceList() {
  const list = q('#experienceList');
  const exp  = portfolioData.experience;
  if (!exp.length) { list.innerHTML = '<p class="empty-state">No experience records yet.</p>'; return; }

  list.innerHTML = exp.map((e, i) => `
    <div class="admin-list-item">
      <div class="admin-list-item__body">
        <p class="admin-list-item__title">${escHtml(e.role)}</p>
        <p class="admin-list-item__sub">${escHtml(e.company)} · ${escHtml(e.startDate)}–${escHtml(e.endDate)}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost btn--sm" onclick="editExp(${i})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteExp(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editExp   = (i) => openExpForm(i);
window.deleteExp = (i) => {
  showConfirm('Delete this experience record?', () => {
    portfolioData.experience.splice(i, 1);
    saveData();
    renderExperienceList();
    showToast('Experience record deleted.', '');
  });
};

/* ============================================================
   15. CERTIFICATES PANEL
   ============================================================ */
function initCertificatesPanel() {
  renderCertsList();

  q('#addCertBtn').addEventListener('click', () => openCertForm());
  q('#certModalCancel').addEventListener('click', () => q('#certModal').style.display = 'none');

  q('#certForm').addEventListener('submit', e => {
    e.preventDefault();
    const title  = q('#certTitle').value.trim();
    const issuer = q('#certIssuer').value.trim();
    let valid = true;

    if (!title)  { setErr(q('#certTitle'), 'certTitleErr', 'Title is required.'); valid = false; }
    else clearErr(q('#certTitle'), 'certTitleErr');
    if (!issuer) { setErr(q('#certIssuer'), 'certIssuerErr', 'Issuer is required.'); valid = false; }
    else clearErr(q('#certIssuer'), 'certIssuerErr');
    if (!valid) return;

    const item = {
      title, issuer,
      date: q('#certDate').value.trim(),
      link: q('#certLink').value.trim()
    };

    const idx = q('#certEditIndex').value;
    if (idx !== '') portfolioData.certificates[parseInt(idx)] = item;
    else portfolioData.certificates.push(item);

    saveData();
    q('#certModal').style.display = 'none';
    renderCertsList();
    showToast('Certificate saved!', 'success');
  });
}

function openCertForm(i) {
  q('#certTitle').value    = '';
  q('#certIssuer').value   = '';
  q('#certDate').value     = '';
  q('#certLink').value     = '';
  q('#certEditIndex').value = '';
  q('#certModalTitle').textContent = 'Add Certificate';

  if (i !== undefined) {
    const c = portfolioData.certificates[i];
    q('#certModalTitle').textContent = 'Edit Certificate';
    q('#certTitle').value    = c.title  || '';
    q('#certIssuer').value   = c.issuer || '';
    q('#certDate').value     = c.date   || '';
    q('#certLink').value     = c.link   || '';
    q('#certEditIndex').value = i;
  }
  q('#certModal').style.display = '';
  q('#certTitle').focus();
}

function renderCertsList() {
  const list  = q('#certsList');
  const certs = portfolioData.certificates;
  if (!certs.length) { list.innerHTML = '<p class="empty-state">No certificates yet.</p>'; return; }

  list.innerHTML = certs.map((c, i) => `
    <div class="admin-list-item">
      <div class="admin-list-item__body">
        <p class="admin-list-item__title">${escHtml(c.title)}</p>
        <p class="admin-list-item__sub">${escHtml(c.issuer)} · ${escHtml(c.date)}</p>
      </div>
      <div class="admin-list-item__actions">
        <button class="btn btn--ghost btn--sm" onclick="editCert(${i})">Edit</button>
        <button class="btn btn--danger btn--sm" onclick="deleteCert(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editCert   = (i) => openCertForm(i);
window.deleteCert = (i) => {
  showConfirm('Delete this certificate?', () => {
    portfolioData.certificates.splice(i, 1);
    saveData();
    renderCertsList();
    showToast('Certificate deleted.', '');
  });
};

/* ============================================================
   16. CONTACT INFO PANEL
   ============================================================ */
function initContactInfoPanel() {
  const p = portfolioData.profile;
  q('#ciEmail').value    = p.email    || '';
  q('#ciPhone').value    = p.phone    || '';
  q('#ciLocation').value = p.location || '';

  q('#contactInfoForm').addEventListener('submit', e => {
    e.preventDefault();
    portfolioData.profile.email    = q('#ciEmail').value.trim();
    portfolioData.profile.phone    = q('#ciPhone').value.trim();
    portfolioData.profile.location = q('#ciLocation').value.trim();
    saveData();
    showToast('Contact info saved!', 'success');
  });
}

/* ============================================================
   17. SOCIAL PANEL
   ============================================================ */
function initSocialPanel() {
  const s = portfolioData.social;
  q('#soGithub').value    = s.github    || '';
  q('#soLinkedin').value  = s.linkedin  || '';
  q('#soTwitter').value   = s.twitter   || '';
  q('#soInstagram').value = s.instagram || '';
  q('#soWebsite').value   = s.website   || '';

  q('#socialForm').addEventListener('submit', e => {
    e.preventDefault();
    portfolioData.social = {
      github:    q('#soGithub').value.trim(),
      linkedin:  q('#soLinkedin').value.trim(),
      twitter:   q('#soTwitter').value.trim(),
      instagram: q('#soInstagram').value.trim(),
      website:   q('#soWebsite').value.trim()
    };
    saveData();
    showToast('Social links saved!', 'success');
  });
}

/* ============================================================
   18. RESUME PANEL
   ============================================================ */
function initResumePanel() {
  q('#resumeUrl').value = portfolioData.profile.resume || '';

  q('#resumeForm').addEventListener('submit', e => {
    e.preventDefault();
    portfolioData.profile.resume = q('#resumeUrl').value.trim();
    saveData();
    showToast('Resume link saved!', 'success');
  });
}

/* ============================================================
   19. THEME TOGGLE
   ============================================================ */
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const moon = q('#adminMoon');
  const sun  = q('#adminSun');
  if (theme === 'dark') {
    if (moon) moon.style.display = '';
    if (sun)  sun.style.display  = 'none';
  } else {
    if (moon) moon.style.display = 'none';
    if (sun)  sun.style.display  = '';
  }
}
function initThemeToggle() {
  q('#themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

/* ============================================================
   20. CONFIRM DIALOG
   ============================================================ */
function showConfirm(msg, onYes) {
  confirmCb = onYes;
  q('#confirmMsg').textContent = msg;
  q('#confirmDialog').style.display = '';
}

q('#confirmYes')?.addEventListener('click', () => {
  if (typeof confirmCb === 'function') confirmCb();
  confirmCb = null;
  q('#confirmDialog').style.display = 'none';
});

q('#confirmNo')?.addEventListener('click', () => {
  confirmCb = null;
  q('#confirmDialog').style.display = 'none';
});

/* ============================================================
   21. TOAST
   ============================================================ */
function showToast(msg, type = '') {
  const toast = q('#toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ============================================================
   22. LOADER
   ============================================================ */
function hideLoarder() {
  setTimeout(() => {
    const loader = q('#loader');
    if (loader) loader.classList.add('hidden');
  }, 400);
}

/* ============================================================
   23. UTILITIES
   ============================================================ */
function q(sel)    { return document.querySelector(sel); }
function qAll(sel) { return document.querySelectorAll(sel); }

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function setErr(input, errId, msg) {
  input?.classList.add('error');
  const el = q('#' + errId);
  if (el) el.textContent = msg;
}
function clearErr(input, errId) {
  input?.classList.remove('error');
  const el = q('#' + errId);
  if (el) el.textContent = '';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Read a File object as a base64 data URL, then call callback(b64)
function readFileAsBase64(file, cb) {
  const reader = new FileReader();
  reader.onload = e => cb(e.target.result);
  reader.readAsDataURL(file);
}
