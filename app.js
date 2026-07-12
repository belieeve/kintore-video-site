let allVideos = [];
let currentCategory = 'all';
let currentBui = '';
let currentPurpose = '';
let currentTimeMin = null;
let currentTimeMax = null;
let searchQuery = '';

// Purpose mapping: which categories/subcategories belong to each purpose
const PURPOSE_MAP = {
  'ダイエット': {
    categories: ['有酸素', 'ボクササイズ'],
    subKeywords: ['hiit', '有酸素', 'ボクササイズ', 'マラソン']
  },
  '筋力アップ': {
    categories: ['筋トレ'],
    subKeywords: ['筋トレ', '腕立て', '全身', '上半身', '下半身', '胸', '背中', '腹筋', '足', '腕', 'お尻', 'お腹', '体幹']
  },
  '柔軟性': {
    categories: ['ストレッチ', 'ヨガ', 'ピラティス'],
    subKeywords: ['ストレッチ', 'ヨガ', 'ピラティス', '柔軟']
  },
  'リラックス': {
    categories: ['ストレッチ', 'ヨガ'],
    subKeywords: ['ストレッチ', 'ヨガ', 'リラクゼーション', 'リラックス']
  },
  '朝の運動': {
    categories: ['ラジオ体操'],
    subKeywords: ['ラジオ体操']
  },
  '夕方の運動': {
    categories: ['夕方メニュー'],
    subKeywords: ['夕方']
  }
};

// YouTube thumbnail URL
function getThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// Format duration (minutes -> "MM:SS")
function formatDuration(minutes) {
  if (!minutes || typeof minutes !== 'number') return '';
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Normalize sub-categories into proper categories
function normalizeCategories(video) {
  const cats = [];
  for (const c of video.categories) {
    let cat = c.category;
    let sub = c.subCategory || '';

    // Check sub-category for more specific categorization
    const subLower = sub.toLowerCase();
    if (subLower.includes('ボクササイズ')) {
      cats.push({ category: 'ボクササイズ', subCategory: sub });
    } else if (subLower.includes('ヨガ')) {
      cats.push({ category: 'ヨガ', subCategory: sub });
    } else if (subLower.includes('ピラティス')) {
      cats.push({ category: 'ピラティス', subCategory: sub });
    } else if (subLower.includes('hiit')) {
      cats.push({ category: '有酸素', subCategory: 'HIIT' });
    } else if (subLower.includes('有酸素')) {
      cats.push({ category: '有酸素', subCategory: sub });
    } else if (subLower.includes('ストレッチ') && cat === '筋トレ') {
      cats.push({ category: 'ストレッチ', subCategory: sub });
    } else {
      cats.push({ category: cat, subCategory: sub });
    }
  }
  return cats;
}

// Get body part (部位) from categories
function getBui(video) {
  const parts = new Set();
  const buiKeywords = ['足', '腹筋', '背中', '胸', '腕', 'お尻', 'お腹', '体幹', '上半身', '下半身', '全身'];
  for (const c of video.normalizedCategories) {
    const sub = c.subCategory || '';
    for (const kw of buiKeywords) {
      if (sub.includes(kw)) {
        parts.add(kw);
      }
    }
  }
  return [...parts];
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Create video card HTML
function createVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card';

  const cats = video.normalizedCategories;
  const primaryCat = cats[0]?.category || '';
  const subCat = cats[0]?.subCategory || '';
  const duration = formatDuration(video.duration);
  const buiParts = video.buiParts;
  const title = escapeHtml(video.displayTitle || `${primaryCat}${subCat ? ' - ' + subCat : ''}`);

  card.innerHTML = `
    <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener">
      <div class="thumbnail-wrap">
        <img src="${getThumbnail(video.videoId)}" alt="${title}" loading="lazy" class="loading"
             onload="this.classList.remove('loading')"
             onerror="this.closest('.video-card').style.display='none'">
        ${duration ? `<span class="duration-badge">${duration}分</span>` : ''}
        <div class="play-overlay">
          <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.6)"/><polygon points="18,14 36,24 18,34" fill="#fff"/></svg>
        </div>
      </div>
      <div class="video-info">
        <img src="assets/ロゴ.png" alt="" class="channel-icon">
        <div class="video-meta">
          <div class="video-title">${title}</div>
          <div>
            ${cats.map(c => `<span class="video-category">${escapeHtml(c.category)}</span>`).join('')}
          </div>
          ${buiParts.length > 0 ? `<div class="video-sub">部位: ${buiParts.map(b => escapeHtml(b)).join(' / ')}</div>` : ''}
        </div>
      </div>
    </a>
  `;

  return card;
}

// Check if we're on the home view (no filters active)
function isHomeView() {
  return currentCategory === 'all' && !currentBui && !currentPurpose
    && currentTimeMin === null && !searchQuery;
}

// Category sections config for home page
const HOME_SECTIONS = [
  { category: 'ラジオ体操', icon: '🏃', title: 'ラジオ体操' },
  { category: '筋トレ', icon: '💪', title: '筋トレ' },
  { category: '有酸素', icon: '🫀', title: '有酸素' },
  { category: 'ストレッチ', icon: '🧘', title: 'ストレッチ' },
  { category: 'ボクササイズ', icon: '🥊', title: 'ボクササイズ' },
  { category: 'ヨガ', icon: '🧘‍♀️', title: 'ヨガ' },
  { category: 'ピラティス', icon: '🤸', title: 'ピラティス' },
  { category: 'ダンス', icon: '💃', title: 'ダンス' },
  { category: 'HIIT', icon: '🔥', title: 'HIIT' },
];

// Render home page with category rows
function renderHome() {
  const homeSections = document.getElementById('homeSections');
  const grid = document.getElementById('videoGrid');
  const noResults = document.getElementById('noResults');
  const hero = document.getElementById('hero');
  const countEl = document.getElementById('videoCount');
  const heroCount = document.getElementById('heroCount');

  homeSections.innerHTML = '';
  homeSections.style.display = 'block';
  grid.style.display = 'none';
  noResults.style.display = 'none';
  hero.style.display = 'block';
  document.getElementById('backHomeBtn').style.display = 'none';
  document.getElementById('menuBot').style.display = 'block';
  document.getElementById('featuredVideo').style.display = 'block';
  document.getElementById('agkMvSection').style.display = 'block';

  countEl.textContent = `${allVideos.length} 本`;
  heroCount.textContent = `全 ${allVideos.length} 本の動画`;

  HOME_SECTIONS.forEach(sec => {
    const videos = allVideos.filter(v =>
      v.normalizedCategories.some(c => c.category === sec.category)
    );
    if (videos.length === 0) return;

    // Shuffle and pick up to 10
    const shuffled = [...videos].sort(() => Math.random() - 0.5).slice(0, 10);

    const section = document.createElement('div');
    section.className = 'section-row';
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">${sec.icon} ${sec.title}（${videos.length}本）</h2>
        <a class="section-more" data-category="${sec.category}">すべて見る →</a>
      </div>
      <div class="carousel-wrap">
        <button class="carousel-arrow carousel-arrow-left hidden" aria-label="左へ">
          <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <div class="section-scroll"></div>
        <button class="carousel-arrow carousel-arrow-right" aria-label="右へ">
          <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>
    `;

    const scroll = section.querySelector('.section-scroll');
    const btnLeft = section.querySelector('.carousel-arrow-left');
    const btnRight = section.querySelector('.carousel-arrow-right');
    const scrollAmount = 296 * 3;

    btnLeft.addEventListener('click', () => scroll.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
    btnRight.addEventListener('click', () => scroll.scrollBy({ left: scrollAmount, behavior: 'smooth' }));

    scroll.addEventListener('scroll', () => {
      btnLeft.classList.toggle('hidden', scroll.scrollLeft <= 10);
      btnRight.classList.toggle('hidden', scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - 10);
    });

    enableDragScroll(scroll);
    shuffled.forEach(v => scroll.appendChild(createVideoCard(v)));

    section.querySelector('.section-more').addEventListener('click', () => {
      const sidebarItem = document.querySelector(`.sidebar-item[data-category="${sec.category}"]`);
      filterCategory(sec.category, sidebarItem);
    });

    section.querySelector('.section-title').addEventListener('click', () => {
      const sidebarItem = document.querySelector(`.sidebar-item[data-category="${sec.category}"]`);
      filterCategory(sec.category, sidebarItem);
    });

    homeSections.appendChild(section);
  });
}

// Filter and render videos
function renderVideos() {
  const grid = document.getElementById('videoGrid');
  const noResults = document.getElementById('noResults');
  const countEl = document.getElementById('videoCount');
  const homeSections = document.getElementById('homeSections');
  const hero = document.getElementById('hero');

  // If home view, show sections instead of grid
  if (isHomeView()) {
    renderHome();
    return;
  }

  // Hide home, show grid and back button
  homeSections.style.display = 'none';
  hero.style.display = 'none';
  grid.style.display = '';
  grid.innerHTML = '';
  document.getElementById('backHomeBtn').style.display = 'flex';
  document.getElementById('menuBot').style.display = 'none';
  document.getElementById('featuredVideo').style.display = 'none';
  document.getElementById('agkMvSection').style.display = 'none';

  let filtered = allVideos.filter(v => {
    // Purpose filter
    if (currentPurpose) {
      const pm = PURPOSE_MAP[currentPurpose];
      if (pm) {
        const matchCat = v.normalizedCategories.some(c => pm.categories.includes(c.category));
        const matchSub = v.normalizedCategories.some(c => {
          const sub = (c.subCategory || '').toLowerCase();
          return pm.subKeywords.some(kw => sub.includes(kw.toLowerCase()));
        });
        if (!matchCat && !matchSub) return false;
      }
    }

    // Category filter
    if (currentCategory !== 'all' && !currentPurpose) {
      const hasCat = v.normalizedCategories.some(c => c.category === currentCategory);
      if (!hasCat) return false;
    }

    // Body part filter
    if (currentBui) {
      if (!v.buiParts.includes(currentBui)) return false;
    }

    // Time filter
    if (currentTimeMin !== null && currentTimeMax !== null) {
      const dur = v.duration;
      if (!dur || typeof dur !== 'number') return false;
      if (dur < currentTimeMin || dur > currentTimeMax) return false;
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = ((v.title || '') + ' ' + v.displayTitle + ' ' +
        v.normalizedCategories.map(c => c.category + ' ' + c.subCategory).join(' ') +
        ' ' + v.buiParts.join(' ')).toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });

  countEl.textContent = `${filtered.length} / ${allVideos.length} 本`;

  if (filtered.length === 0) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
    filtered.forEach(v => grid.appendChild(createVideoCard(v)));
  }
}

// Filter by time
function filterTime(min, max, el) {
  currentTimeMin = min;
  currentTimeMax = max;
  currentCategory = 'all';
  currentBui = '';
  currentPurpose = '';

  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.bui-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));

  renderVideos();
  closeMobileSidebar();
}

// Filter by purpose
function filterPurpose(purpose, el) {
  currentPurpose = purpose;
  currentCategory = 'all';
  currentBui = '';
  currentTimeMin = null;
  currentTimeMax = null;

  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.bui-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));

  renderVideos();
  closeMobileSidebar();
}

// Filter by category
function filterCategory(category, el) {
  currentCategory = category;
  currentBui = '';
  currentPurpose = '';
  currentTimeMin = null;
  currentTimeMax = null;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.bui-item').forEach(item => item.classList.remove('active'));
  if (el && el.classList.contains('sidebar-item')) {
    el.classList.add('active');
  } else {
    const sidebarItem = document.querySelector(`.sidebar-item[data-category="${category}"]`);
    if (sidebarItem) {
      sidebarItem.classList.add('active');
    }
  }

  // Update chips active state
  document.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });

  renderVideos();
  closeMobileSidebar();
}

// Filter by body part
function filterBui(bui, el) {
  currentCategory = '筋トレ';
  currentBui = bui;

  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.bui-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');

  // Update chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === '筋トレ');
  });

  renderVideos();
  closeMobileSidebar();
}

// Reset all filters
function resetFilters() {
  currentCategory = 'all';
  currentBui = '';
  currentPurpose = '';
  currentTimeMin = null;
  currentTimeMax = null;
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.bui-item').forEach(item => item.classList.remove('active'));
  document.querySelector('.sidebar-item[data-category="all"]').classList.add('active');
  document.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === 'all');
  });
  renderVideos();
  window.scrollTo(0, 0);
}

// Build body part list in sidebar
function buildBuiList() {
  const buiSet = new Set();
  allVideos.forEach(v => v.buiParts.forEach(b => buiSet.add(b)));
  const buiList = document.getElementById('buiList');
  const sorted = [...buiSet].sort();
  sorted.forEach(bui => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'bui-item';
    a.textContent = bui;
    a.onclick = (e) => { e.preventDefault(); filterBui(bui, a); };
    buiList.appendChild(a);
  });
}

// Mobile sidebar toggle
function closeMobileSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
  }
}

// Init
async function init() {
  try {
    const res = await fetch('assets/videos.json');
    allVideos = await res.json();

    // Normalize and enrich data
    allVideos.forEach(v => {
      v.normalizedCategories = normalizeCategories(v);
      v.buiParts = getBui(v);
      // Use YouTube title if available, otherwise build from categories
      if (v.title) {
        v.displayTitle = v.title;
      } else {
        const cats = v.normalizedCategories;
        const parts = [];
        cats.forEach(c => {
          let label = c.category;
          if (c.subCategory && c.subCategory !== c.category) {
            label += `（${c.subCategory}）`;
          }
          if (!parts.includes(label)) parts.push(label);
        });
        v.displayTitle = parts.join(' + ');
      }

      // Merge autoBui into buiParts
      if (v.autoBui) {
        v.autoBui.forEach(b => {
          if (!v.buiParts.includes(b)) v.buiParts.push(b);
        });
      }
    });

    // Shuffle for variety on load
    allVideos.sort(() => Math.random() - 0.5);

    buildBuiList();
    renderVideos();
  } catch (e) {
    console.error('Failed to load videos:', e);
    document.getElementById('noResults').style.display = 'block';
    document.getElementById('noResults').querySelector('p').textContent = 'データの読み込みに失敗しました';
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Search
  const searchInput = document.getElementById('searchInput');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderVideos();
    }, 300);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchQuery = searchInput.value.trim();
      renderVideos();
    }
  });

  document.getElementById('searchBtn').addEventListener('click', () => {
    searchQuery = searchInput.value.trim();
    renderVideos();
  });

  // Enable drag scroll on category chips
  enableDragScroll(document.getElementById('categoryChips'));

  // Sidebar toggle
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');

  // Create overlay for mobile
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  menuBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    } else {
      document.body.classList.toggle('sidebar-collapsed');
    }
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
});

// Enable mouse drag scrolling for horizontal scroll areas (PC only)
function enableDragScroll(el) {
  let isDown = false;
  let startX;
  let scrollLeft;

  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('a')) return;
    isDown = true;
    el.style.cursor = 'grabbing';
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    e.preventDefault();
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
    el.style.cursor = 'grab';
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
    el.style.cursor = 'grab';
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 2;
    el.scrollLeft = scrollLeft - walk;
  });

  // Mouse wheel horizontal scroll (PC only)
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Only show grab cursor on non-touch devices
  if (!('ontouchstart' in window)) {
    el.style.cursor = 'grab';
  }
}

// ==================== Menu Bot ====================

let botAnswers = {};

function toggleBot() {
  const body = document.getElementById('botBody');
  const toggle = document.getElementById('botToggle');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    toggle.classList.add('open');
  } else {
    body.style.display = 'none';
    toggle.classList.remove('open');
  }
}

function botAnswer(step, value) {
  botAnswers[step] = value;

  // Hide current step, show next
  const current = document.querySelector(`.bot-step[data-step="${step}"]`);
  current.classList.remove('active');

  if (step < 4) {
    const next = document.querySelector(`.bot-step[data-step="${step + 1}"]`);
    next.classList.add('active');
  } else {
    generateMenu();
  }
}

function botReset() {
  botAnswers = {};
  document.getElementById('botResult').style.display = 'none';
  document.getElementById('botSteps').style.display = 'block';
  document.querySelectorAll('.bot-step').forEach((s, i) => {
    s.classList.toggle('active', i === 0);
  });
}

function generateMenu() {
  const purpose = botAnswers[1];
  const time = botAnswers[2];
  const bui = botAnswers[3];
  const level = botAnswers[4];

  document.getElementById('botSteps').style.display = 'none';
  const result = document.getElementById('botResult');
  result.style.display = 'block';

  // Build menu structure based on time
  let menuStructure;
  if (time <= 15) {
    menuStructure = [
      { cat: 'ラジオ体操', label: 'ウォームアップ', maxDur: 4 },
      { cat: '筋トレ', label: 'メイン', maxDur: 7 },
      { cat: 'ストレッチ', label: 'クールダウン', maxDur: 5 },
    ];
  } else if (time <= 30) {
    menuStructure = [
      { cat: 'ラジオ体操', label: 'ウォームアップ', maxDur: 4 },
      { cat: '筋トレ', label: 'メイン①', maxDur: 10 },
      { cat: '有酸素', label: 'メイン②', maxDur: 8 },
      { cat: 'ストレッチ', label: 'クールダウン', maxDur: 8 },
    ];
  } else {
    menuStructure = [
      { cat: 'ラジオ体操', label: 'ウォームアップ', maxDur: 4 },
      { cat: '筋トレ', label: 'メイン①', maxDur: 12 },
      { cat: '有酸素', label: 'メイン②', maxDur: 10 },
      { cat: '筋トレ', label: 'メイン③', maxDur: 10 },
      { cat: 'ストレッチ', label: 'クールダウン', maxDur: 10 },
    ];
  }

  // Adjust based on purpose
  if (purpose === 'ダイエット') {
    menuStructure = menuStructure.map(m => {
      if (m.cat === '筋トレ' && m.label === 'メイン②') return { ...m, cat: '有酸素' };
      if (m.cat === '有酸素') return { ...m, cat: Math.random() > 0.5 ? 'ボクササイズ' : '有酸素' };
      return m;
    });
  } else if (purpose === 'リフレッシュ') {
    menuStructure = menuStructure.map(m => {
      if (m.cat === '筋トレ') return { ...m, cat: Math.random() > 0.5 ? 'ヨガ' : 'ストレッチ' };
      if (m.cat === '有酸素') return { ...m, cat: 'ヨガ', label: 'ヨガ' };
      return m;
    });
  }

  // Pick videos for each slot
  const menuList = document.getElementById('botMenuList');
  menuList.innerHTML = '';
  let totalTime = 0;

  menuStructure.forEach((slot, i) => {
    // Find matching videos
    let candidates = allVideos.filter(v =>
      v.normalizedCategories.some(c => c.category === slot.cat)
    );

    // Filter by body part if specified
    if (bui !== 'おまかせ' && slot.cat === '筋トレ') {
      const buiFiltered = candidates.filter(v => {
        const parts = v.buiParts.join(' ');
        if (bui === '全身') return parts.includes('全身') || v.buiParts.length === 0;
        if (bui === '上半身') return ['胸', '背中', '腕', '肩'].some(b => parts.includes(b));
        if (bui === '下半身') return ['足', 'お尻', '下半身'].some(b => parts.includes(b));
        if (bui === '体幹') return ['体幹', '腹筋', 'お腹'].some(b => parts.includes(b));
        return true;
      });
      if (buiFiltered.length > 0) candidates = buiFiltered;
    }

    // Filter by duration
    if (slot.maxDur) {
      const durFiltered = candidates.filter(v =>
        v.duration && v.duration <= slot.maxDur
      );
      if (durFiltered.length > 0) candidates = durFiltered;
    }

    // Filter by level (shorter for beginners)
    if (level === '初心者') {
      const easyFiltered = candidates.filter(v => !v.duration || v.duration <= 8);
      if (easyFiltered.length > 0) candidates = easyFiltered;
    } else if (level === '上級者') {
      const hardFiltered = candidates.filter(v => v.duration && v.duration >= 5);
      if (hardFiltered.length > 0) candidates = hardFiltered;
    }

    if (candidates.length === 0) return;

    // Random pick
    const video = candidates[Math.floor(Math.random() * candidates.length)];
    const dur = video.duration ? Math.round(video.duration) : '?';
    totalTime += video.duration || 0;
    const title = escapeHtml(video.displayTitle || '動画');

    const item = document.createElement('div');
    item.className = 'bot-menu-item';
    item.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener">
        <span class="bot-menu-step">${i + 1}</span>
        <img src="${getThumbnail(video.videoId)}" alt="" class="bot-menu-thumb"
             onerror="this.style.background='#303030'">
        <div class="bot-menu-info">
          <div class="bot-menu-cat">${slot.label}（${escapeHtml(slot.cat)}）</div>
          <div class="bot-menu-title">${title}</div>
          <div class="bot-menu-dur">${dur}分</div>
        </div>
      </a>
    `;
    menuList.appendChild(item);
  });

  // Title
  const titles = {
    'ダイエット': '🔥 脂肪燃焼メニュー',
    '筋力アップ': '💪 筋力アップメニュー',
    'リフレッシュ': '😌 リフレッシュメニュー',
    '体力づくり': '🏃 体力づくりメニュー',
  };
  document.getElementById('botResultTitle').textContent = titles[purpose] || '今日のメニュー';
  document.getElementById('botResultDesc').textContent =
    `${bui}・${level}向け・合計約${Math.round(totalTime)}分`;
}

// ===== アクセス解析（GA4）=====
// 動画クリック・記録表バナークリックをGoogleアナリティクスに送信する
document.addEventListener('click', (e) => {
  if (typeof gtag !== 'function') return;

  const videoLink = e.target.closest('a[href*="youtube.com/watch"]');
  if (videoLink) {
    const card = e.target.closest('.video-card');
    const botItem = e.target.closest('.bot-menu-item');
    const title =
      card?.querySelector('.video-title')?.textContent ||
      botItem?.querySelector('.bot-menu-title')?.textContent ||
      videoLink.href;
    const category =
      card?.querySelector('.video-category')?.textContent ||
      botItem?.querySelector('.bot-menu-cat')?.textContent || '';
    gtag('event', 'video_click', {
      video_title: title,
      video_category: category,
      click_source: botItem ? 'menu_bot' : 'video_card',
    });
    return;
  }

  if (e.target.closest('a.record-banner')) {
    gtag('event', 'record_banner_click');
  }
});

// Expose functions for inline onclick
window.filterCategory = filterCategory;
window.filterBui = filterBui;
window.filterPurpose = filterPurpose;
window.filterTime = filterTime;
window.resetFilters = resetFilters;
window.toggleBot = toggleBot;
window.botAnswer = botAnswer;
window.botReset = botReset;
