/**
 * NJ-CII Industrial Base Map — Application JS
 * Single-page app with hash-based routing, in-memory state only
 */

(function () {
  'use strict';

  // ============================================================
  // GLOBAL STATE — in-memory only
  // ============================================================
  window.__njciiAuth = false;

  const state = {
    isAuthenticated: false,
    firms: [],
    filteredFirms: [],
    currentRoute: '',
    tableSort: { col: 'total_dod_contract_value_3yr', dir: 'desc' },
    tableSearch: '',
    explorerFilters: {
      sectors: [],
      cluster: '',
      county: '',
      district: '',
      valueMin: 0,
      certs: [],
      naics: ''
    },
    // Map instances
    dashboardMap: null,
    dashboardMarkerCluster: null,
    explorerMap: null,
    explorerMarkerCluster: null,
    firmDetailMap: null,
    // Chart instances
    topFirmsChart: null,
    sectorPieChart: null,
    sectorCharts: {},
    // Sidebar state
    sidebarOpen: false
  };

  // ============================================================
  // CONSTANTS
  // ============================================================
  const SECTOR_CONFIG = {
    'Defense & Aerospace': { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', cls: 'sector-badge-defense', slug: 'defense-aerospace', short: 'Defense', label: 'Defense & Aerospace' },
    'Life Sciences & Pharmaceutical Manufacturing': { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', cls: 'sector-badge-lifesci', slug: 'life-sciences', short: 'Life Sciences', label: 'Life Sciences' },
    'Energy & Critical Infrastructure': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', cls: 'sector-badge-energy', slug: 'energy-infrastructure', short: 'Energy', label: 'Energy & Infrastructure' },
    'Advanced Manufacturing & Logistics': { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', cls: 'sector-badge-mfg', slug: 'advanced-manufacturing', short: 'Adv. Mfg.', label: 'Advanced Manufacturing' }
  };

  const SECTOR_SLUGS = {
    'defense-aerospace': 'Defense & Aerospace',
    'life-sciences': 'Life Sciences & Pharmaceutical Manufacturing',
    'energy-infrastructure': 'Energy & Critical Infrastructure',
    'advanced-manufacturing': 'Advanced Manufacturing & Logistics'
  };

  const SECTOR_DESCRIPTIONS = {
    'defense-aerospace': 'New Jersey is home to a premier defense and aerospace industrial base, anchored by major prime contractors and a deep network of specialized suppliers. The sector spans radar and sensor systems, electronic warfare, naval combat systems, and advanced R&D.',
    'life-sciences': 'New Jersey\'s life sciences sector represents one of the densest pharmaceutical and biotech clusters in the world, with significant federal contract exposure through DoD medical procurement, BARDA, and NIH programs.',
    'energy-infrastructure': 'The energy and critical infrastructure sector includes utilities, grid technology, renewable energy developers, and critical infrastructure protection firms — all with growing federal contract and homeland security exposure.',
    'advanced-manufacturing': 'Advanced manufacturing and logistics firms form the backbone of New Jersey\'s supply chain, providing precision components, specialty chemicals, industrial services, and logistics capabilities to defense and civilian prime contractors.'
  };

  const CERTS_LIST = ['SDVOSB', 'WOSB', 'HUBZone', '8(a)', 'SDB', 'DVOB', 'SBE', 'Small Business'];

  const NJ_CENTER = [40.0583, -74.4057];
  const NJ_ZOOM = 8;

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    // Enter key on access code input
    const input = document.getElementById('access-code-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAccessCode();
      });
    }

    // Hash change routing
    window.addEventListener('hashchange', () => route());

    // Load data
    try {
      const data = window.__NJCII_FIRMS_DATA || await fetch('./firms_seed_data.json').then(r => r.json());
      state.firms = Array.isArray(data) ? data : (data.firms || []);
      state.filteredFirms = [...state.firms];
    } catch (e) {
      console.error('Failed to load firms data:', e);
    }

    // Initial route
    route();
  }

  // ============================================================
  // ACCESS CODE
  // ============================================================
  function handleAccessCode() {
    const input = document.getElementById('access-code-input');
    const errorEl = document.getElementById('access-error');
    const btn = document.getElementById('access-btn');
    const code = (input.value || '').trim().toUpperCase();

    if (code === 'NJCII2026') {
      window.__njciiAuth = true;
      state.isAuthenticated = true;
      btn.innerHTML = '<span class="loading-spinner"></span>';
      btn.disabled = true;
      setTimeout(() => {
        showApp();
        window.location.hash = '#dashboard';
      }, 400);
    } else {
      errorEl.classList.remove('hidden');
      input.classList.add('border-red-500');
      input.value = '';
      input.focus();
      setTimeout(() => {
        errorEl.classList.add('hidden');
        input.classList.remove('border-red-500');
      }, 3000);
    }
  }

  function showApp() {
    document.getElementById('page-landing').style.display = 'none';
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('app-shell').style.display = 'flex';
    document.getElementById('app-shell').style.flexDirection = 'column';
  }

  function hidePage(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.style.display = 'none'; }
  }

  function showPage(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    if (id === 'page-explorer') {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
    } else {
      el.style.display = 'block';
    }
  }

  // ============================================================
  // ROUTER
  // ============================================================
  function route() {
    const hash = window.location.hash || '#landing';

    // If not authenticated, force landing
    if (!window.__njciiAuth && hash !== '#landing' && hash !== '') {
      window.location.hash = '#landing';
      return;
    }

    // Hide all pages
    ['page-dashboard', 'page-explorer', 'page-firm', 'page-sector', 'page-about'].forEach(hidePage);

    // Update active nav
    document.querySelectorAll('.nav-link[data-route]').forEach(el => el.classList.remove('active'));

    state.currentRoute = hash;

    if (hash === '' || hash === '#landing' || hash === '#') {
      if (window.__njciiAuth) {
        window.location.hash = '#dashboard';
      }
      return;
    }

    if (hash === '#dashboard') {
      setActiveNav('dashboard');
      showPage('page-dashboard');
      renderDashboard();
    } else if (hash === '#explorer') {
      setActiveNav('explorer');
      showPage('page-explorer');
      renderExplorer();
    } else if (hash.startsWith('#firm/')) {
      const slug = hash.replace('#firm/', '');
      showPage('page-firm');
      renderFirmDetail(slug);
    } else if (hash.startsWith('#sector/')) {
      const slug = hash.replace('#sector/', '');
      showPage('page-sector');
      renderSectorPage(slug);
    } else if (hash === '#about') {
      setActiveNav('about');
      showPage('page-about');
    } else {
      window.location.hash = '#dashboard';
    }
  }

  function setActiveNav(route) {
    const el = document.querySelector(`.nav-link[data-route="${route}"]`);
    if (el) el.classList.add('active');
  }

  // ============================================================
  // FORMATTERS
  // ============================================================
  function fmtMoney(val) {
    if (!val || val === 0) return '$0';
    const abs = Math.abs(val);
    if (abs >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
    return '$' + val.toFixed(0);
  }

  function fmtMoneyFull(val) {
    if (!val || val === 0) return '$0';
    return '$' + Math.round(val).toLocaleString('en-US');
  }

  function getSectorConfig(sectorName) {
    // Exact match first
    if (SECTOR_CONFIG[sectorName]) return SECTOR_CONFIG[sectorName];
    // Partial match
    for (const [key, cfg] of Object.entries(SECTOR_CONFIG)) {
      if (sectorName && (sectorName.includes('Defense') || sectorName.includes('Aerospace')) && key.includes('Defense')) return cfg;
      if (sectorName && (sectorName.includes('Life') || sectorName.includes('Pharma')) && key.includes('Life')) return cfg;
      if (sectorName && (sectorName.includes('Energy') || sectorName.includes('Infrastructure')) && key.includes('Energy')) return cfg;
      if (sectorName && (sectorName.includes('Manufacturing') || sectorName.includes('Logistics')) && key.includes('Manufacturing')) return cfg;
    }
    return { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', cls: 'sector-badge-mfg', slug: 'advanced-manufacturing', short: sectorName, label: sectorName };
  }

  function sectorBadgeHTML(sector) {
    const cfg = getSectorConfig(sector);
    return `<span class="sector-badge ${cfg.cls}">${cfg.short || sector}</span>`;
  }

  function clusterBadgeHTML(cluster) {
    const map = {
      'North': 'cluster-badge-north',
      'Central': 'cluster-badge-central',
      'South': 'cluster-badge-south'
    };
    return `<span class="cluster-badge ${map[cluster] || ''}">${cluster}</span>`;
  }

  function certBadgesHTML(certs) {
    if (!certs || certs.length === 0) return '<span class="text-gray-400 text-xs">—</span>';
    return certs.map(c => `<span class="cert-badge">${c}</span>`).join(' ');
  }

  function firmSlug(firm) {
    return firm.slug || firm.firm_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function getFirmBySlug(slug) {
    return state.firms.find(f => firmSlug(f) === slug);
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  let dashboardRendered = false;

