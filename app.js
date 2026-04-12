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

// Create video card HTML
function createVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card';

  const cats = video.normalizedCategories;
  const primaryCat = cats[0]?.category || '';
  const subCat = cats[0]?.subCategory || '';
  const duration = formatDuration(video.duration);
  const buiParts = video.buiParts;
  const title = video.displayTitle || `${primaryCat}${subCat ? ' - ' + subCat : ''}`;

  card.innerHTML = `
    <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener">
      <div class="thumbnail-wrap">
        <img src="${getThumbnail(video.videoId)}" alt="${title}" loading="lazy" class="loading"
             onload="this.classList.remove('loading')"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22180%22%3E%3Crect fill=%22%23303030%22 width=%22320%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23888%22 font-size=%2214%22%3E動画%3C/text%3E%3C/svg%3E'">
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
            ${cats.map(c => `<span class="video-category">${c.category}</span>`).join('')}
          </div>
          ${buiParts.length > 0 ? `<div class="video-sub">部位: ${buiParts.join(' / ')}</div>` : ''}
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
      <div class="section-scroll"></div>
    `;

    const scroll = section.querySelector('.section-scroll');
    shuffled.forEach(v => scroll.appendChild(createVideoCard(v)));

    section.querySelector('.section-more').addEventListener('click', () => {
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

  // Hide home, show grid
  homeSections.style.display = 'none';
  hero.style.display = 'none';
  grid.style.display = '';
  grid.innerHTML = '';

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
      const searchable = (v.displayTitle + ' ' +
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
      // Build display title from categories
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

// Expose functions for inline onclick
window.filterCategory = filterCategory;
window.filterBui = filterBui;
window.filterPurpose = filterPurpose;
window.filterTime = filterTime;
window.resetFilters = resetFilters;
