// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentDesign = null;

// ==================== TEXTILE INSPIRATION DATA ====================
const inspirationDesigns = [
  {
    name: 'Paithani',
    prompt: 'Traditional Paithani saree with peacock motif, gold zari borders, burgundy silk background',
    region: 'Maharashtra',
    type: 'Traditional',
    image: '/designs/design_1778315319047.png'
  },
  {
    name: 'Bandhani',
    prompt: 'Vibrant Bandhani tie-dye pattern with intricate dots, yellow and blue colors',
    region: 'Gujarat',
    type: 'Traditional',
    image: '/designs/design_1778315325343.png'
  },
  {
    name: 'Ikat',
    prompt: 'Indigo Ikat pattern with geometric diamond motifs, white and blue contrast',
    region: 'Rajasthan',
    type: 'Geometric',
    image: '/designs/design_1778315457411.png'
  },
  {
    name: 'Floral Garden',
    prompt: 'Lush floral design with roses, jasmine, and marigold flowers on emerald silk',
    region: 'Maharashtra',
    type: 'Floral',
    image: '/designs/design_1778315459334.png'
  },
  {
    name: 'Desert Mirage',
    prompt: 'Abstract geometric pattern inspired by desert sand dunes and mirages in warm oranges and golds',
    region: 'Rajasthan',
    type: 'Abstract',
    image: '/designs/design_1778316505829.png'
  },
  {
    name: 'Lotus Dreams',
    prompt: 'Mystical lotus flowers with water ripples, shimmering silver and deep purple',
    region: 'Gujarat',
    type: 'Floral',
    image: '/designs/design_1778316686536.png'
  }
];

// ==================== PROMPT GENERATION ENGINE ====================
const promptTemplates = [
  'Traditional {style} pattern with {color} background and {element} embroidery',
  '{region} inspired textile design featuring {element} motifs in {color} silk',
  'Contemporary {style} pattern blending {region} heritage with {color} hues',
  'Luxurious {element} design with intricate details on {color} fabric',
  '{style} textile with geometric {element} and gold thread accents on {color}'
];

const styles = ['Paithani', 'Bandhani', 'Ikat', 'modern', 'fusion'];
const elements = ['peacock', 'floral', 'geometric', 'mandala', 'paisley', 'abstract', 'botanical'];
const colors = ['burgundy', 'emerald', 'sapphire', 'saffron', 'midnight', 'coral', 'gold'];
const regions = ['Maharashtra', 'Gujarat', 'Rajasthan'];

function generateRandomPrompt() {
  const template = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const element = elements[Math.floor(Math.random() * elements.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const region = regions[Math.floor(Math.random() * regions.length)];

  return template
    .replace('{style}', style)
    .replace('{element}', element)
    .replace('{color}', color)
    .replace('{region}', region)
    .replace('{region}', region);
}

// ==================== AUTHENTICATION ====================
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    updateAuthUI();
    showToast('Welcome back, ' + data.user.name + '!', 'success');
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

async function signup(name, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    updateAuthUI();
    showToast('Welcome to AI Textile Studio, ' + data.user.name + '!', 'success');
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateAuthUI();
  showToast('Logged out successfully', 'info');
}

function updateAuthUI() {
  const authNav = document.getElementById('authNav');
  const galleryNavItem = document.getElementById('galleryNavItem');

  if (currentUser) {
    authNav.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-gold dropdown-toggle" type="button" id="profileDropdown" data-bs-toggle="dropdown">
          <i class="fas fa-user"></i> ${currentUser.name}
        </button>
        <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="profileDropdown">
          <li><a class="dropdown-item" href="gallery.html"><i class="fas fa-images me-2"></i>My Gallery</a></li>
          <li><hr class="dropdown-divider" style="border-color: var(--color-border);"></li>
          <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
        </ul>
      </div>
    `;
    // Show My Gallery in nav when logged in
    if (galleryNavItem) galleryNavItem.style.display = 'block';
  } else {
    authNav.innerHTML = `
      <button class="btn btn-gold btn-sm" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
    `;
    // Hide My Gallery from nav when logged out
    if (galleryNavItem) galleryNavItem.style.display = 'none';
  }
}

function restoreSession() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    currentUser = JSON.parse(user);
    updateAuthUI();
  }
}

// ==================== DESIGN GENERATION ====================
async function generateDesign() {
  if (!currentUser) {
    showToast('Please login to generate designs', 'error');
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
    return;
  }

  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) {
    showToast('Please describe your textile design', 'error');
    return;
  }

  const region = document.getElementById('regionSelect').value;
  const patternType = document.getElementById('patternSelect').value;

  showSpinner();

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/generate-design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt, region, patternType })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    currentDesign = data.design;
    displayDesign(data.design);
    showToast('Design generated successfully!', 'success');
  } catch (error) {
    showToast('Error generating design: ' + error.message, 'error');
  } finally {
    hideSpinner();
  }
}

function displayDesign(design) {
  const container = document.getElementById('designContainer');
  const designInfo = document.getElementById('designInfo');
  const promptUsed = document.getElementById('promptUsed');

  container.innerHTML = `<img src="${design.imageUrl}" alt="Generated textile design" loading="lazy">`;
  promptUsed.textContent = design.prompt;
  designInfo.style.display = 'block';

  // Enable action buttons
  document.getElementById('downloadBtn').onclick = () => downloadImage(design);
  document.getElementById('shareBtn').onclick = () => shareDesign(design);
  document.getElementById('regenerateBtn').onclick = () => generateDesign();
}

function downloadImage(design) {
  const link = document.createElement('a');
  link.href = design.imageUrl;
  link.download = `textile-design-${design.id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Design downloaded!', 'success');
}

async function shareDesign(design) {
  const text = `Check out my AI-generated textile design: "${design.prompt}" 🎨✨`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'AI Textile Design',
        text: text,
        url: window.location.href
      });
      showToast('Design shared!', 'success');
    } catch (error) {
      if (error.name !== 'AbortError') {
        copyToClipboard(text);
      }
    }
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Design info copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy to clipboard', 'error');
  });
}

// ==================== SURPRISE ME & PROMPT GENERATION ====================
document.addEventListener('DOMContentLoaded', () => {
  const generatePromptBtn = document.getElementById('generatePromptBtn');
  if (generatePromptBtn) {
    generatePromptBtn.addEventListener('click', () => {
      const newPrompt = generateRandomPrompt();
      document.getElementById('promptInput').value = newPrompt;
      showToast('✨ Prompt generated!', 'info');
    });
  }

  const surpriseMeBtn = document.getElementById('surpriseMeBtn');
  if (surpriseMeBtn) {
    surpriseMeBtn.addEventListener('click', () => {
      const inspiration = inspirationDesigns[Math.floor(Math.random() * inspirationDesigns.length)];
      document.getElementById('promptInput').value = inspiration.prompt;
      document.getElementById('regionSelect').value = inspiration.region;
      document.getElementById('patternSelect').value = inspiration.type;
      showToast(`✨ Inspired by "${inspiration.name}"!`, 'info');
    });
  }

  const generateDesignBtn = document.getElementById('generateDesignBtn');
  if (generateDesignBtn) {
    generateDesignBtn.addEventListener('click', generateDesign);
  }
});

// ==================== INSPIRATIONS GRID ====================
function initializeInspirations() {
  const grid = document.getElementById('inspirationsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  inspirationDesigns.forEach(design => {
    const card = document.createElement('div');
    card.className = 'inspiration-card';
    card.innerHTML = `
      <img src="${design.image}" alt="${design.name}" class="inspiration-img">
      <div class="inspiration-overlay">
        <div class="overlay-text">Use this prompt</div>
      </div>
      <span class="inspiration-label">${design.name}</span>
    `;

    card.addEventListener('click', () => {
      document.getElementById('promptInput').value = design.prompt;
      document.getElementById('regionSelect').value = design.region;
      document.getElementById('patternSelect').value = design.type;
      showToast(`Loaded: ${design.name}`, 'success');
      scrollToSidebar();
    });

    grid.appendChild(card);
  });
}

function scrollToSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== SIDEBAR TOGGLE (Mobile) ====================
function initializeSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('show');
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('show')) {
      sidebar.classList.remove('show');
    }
  });

  // Close sidebar on smaller screens when item is clicked
  sidebar.querySelectorAll('.form-control, .btn').forEach(element => {
    element.addEventListener('click', () => {
      if (window.innerWidth < 1200) {
        sidebar.classList.remove('show');
      }
    });
  });
}

// ==================== AUTHENTICATION FORMS ====================
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const success = await login(email, password);
      if (success) {
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        loginForm.reset();
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const success = await signup(name, email, password);
      if (success) {
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        signupForm.reset();
      }
    });
  }
});

// ==================== UI UTILITIES ====================
function showSpinner() {
  document.getElementById('loadingSpinner').classList.add('show');
}

function hideSpinner() {
  document.getElementById('loadingSpinner').classList.remove('show');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;

  const icons = {
    success: '<i class="fas fa-check-circle toast-icon"></i>',
    error: '<i class="fas fa-exclamation-circle toast-icon"></i>',
    info: '<i class="fas fa-info-circle toast-icon"></i>'
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  initializeInspirations();
  initializeSidebarToggle();

  // Add smooth scroll behavior
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

// Handle window resize for responsive sidebar
window.addEventListener('resize', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth >= 1200) {
    sidebar.classList.remove('show');
  }
});

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to generate
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const promptInput = document.getElementById('promptInput');
    if (promptInput && document.activeElement === promptInput) {
      generateDesign();
    }
  }

  // Escape to close sidebar on mobile
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 1200) {
      sidebar.classList.remove('show');
    }
  }
});
