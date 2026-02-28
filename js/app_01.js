/**
 * NJ-CII Industrial Base Map — Application JS (Tier 2)
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
      naics: '',
      subsector: '',
      trend: '',
      readinessGrades: [],
      verification: ''
    },
    dashboardMap: null,
    dashboardMarkerCluster: null,
    explorerMap: null,
    explorerMarkerCluster: null,
    firmDetailMap: null,
    topFirmsChart: null,
    sectorPieChart: null,
    sectorCharts: {},
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
  const READINESS_GRADES = ['A', 'B', 'C', 'D', 'F'];

  const GRADE_COLORS = {
    'A': { bg: '#059669', text: '#ffffff', label: 'Excellent' },
    'B': { bg: '#2563EB', text: '#ffffff', label: 'Good' },
    'C': { bg: '#D97706', text: '#ffffff', label: 'Moderate' },
    'D': { bg: '#DC2626', text: '#ffffff', label: 'Below Average' },
    'F': { bg: '#7f1d1d', text: '#ffffff', label: 'Needs Improvement' }
  };

  const TREND_CONFIG = {
    'Growing': { icon: '↑', color: '#059669', bg: '#ECFDF5' },
    'Active': { icon: '●', color: '#2563EB', bg: '#EFF6FF' },
    'Stable': { icon: '→', color: '#6B7280', bg: '#F9FAFB' },
    'New Entry': { icon: '★', color: '#7C3AED', bg: '#F5F3FF' },
    'Historical': { icon: '◷', color: '#D97706', bg: '#FFFBEB' },
    'Declining': { icon: '↓', color: '#DC2626', bg: '#FEF2F2' },
    'Inactive': { icon: '○', color: '#9CA3AF', bg: '#F9FAFB' },
    'Unknown': { icon: '?', color: '#9CA3AF', bg: '#F9FAFB' }
  };

  const NJ_CENTER = [40.0583, -74.4057];
  const NJ_ZOOM = 8;

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    const input = document.getElementById('access-code-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAccessCode();
      });
    }

    window.addEventListener('hashchange', () => route());

    try {
      const data = window.__NJCII_FIRMS_DATA || await fetch('./firms_seed_data.json').then(r => r.json());
      state.firms = Array.isArray(data) ? data : (data.firms || []);
      // Normalize readiness data
      state.firms.forEach(f => {
        if (f.readiness_score && typeof f.readiness_score === 'object') {
          f.readiness_grade = f.readiness_score.grade || '—';
          f.readiness_total = f.readiness_score.total || 0;
          f.readiness_components = f.readiness_score.components || {};
        } else {
          f.readiness_grade = '—';
          f.readiness_total = 0;
          f.readiness_components = {};
        }
      });
      state.filteredFirms = [...state.firms];
    } catch (e) {
      console.error('Failed to load firms data:', e);
    }

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

    if (!window.__njciiAuth && hash !== '#landing' && hash !== '') {
      window.location.hash = '#landing';
      return;
    }

    ['page-dashboard', 'page-explorer', 'page-firm', 'page-sector', 'page-about', 'page-cross-agency', 'page-gap-analysis'].forEach(hidePage);
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
    } else if (hash === '#cross-agency') {
      setActiveNav('cross-agency');
      showPage('page-cross-agency');
      renderCrossAgency();
    } else if (hash === '#gap-analysis') {
      setActiveNav('gap-analysis');
      showPage('page-gap-analysis');
      renderGapAnalysis();
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
    if (SECTOR_CONFIG[sectorName]) return SECTOR_CONFIG[sectorName];
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
    const map = { 'North': 'cluster-badge-north', 'Central': 'cluster-badge-central', 'South': 'cluster-badge-south' };
    return `<span class="cluster-badge ${map[cluster] || ''}">${cluster || '—'}</span>`;
  }

  function certBadgesHTML(certs) {
    if (!certs || certs.length === 0) return '<span class="text-gray-400 text-xs">—</span>';
    return certs.map(c => `<span class="cert-badge">${c}</span>`).join(' ');
  }

  function readinessGradeBadge(grade, size) {
    const cfg = GRADE_COLORS[grade] || { bg: '#6B7280', text: '#fff', label: 'Unknown' };
    const sz = size === 'lg' ? 'w-10 h-10 text-lg' : size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
    return `<span class="inline-flex items-center justify-center rounded-md font-bold ${sz}" style="background:${cfg.bg};color:${cfg.text}">${grade}</span>`;
  }

  function trendBadgeHTML(trend) {
    const cfg = TREND_CONFIG[trend] || TREND_CONFIG['Unknown'];
    return `<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style="background:${cfg.bg};color:${cfg.color}">${cfg.icon} ${trend}</span>`;
  }

  function entityWideBadge() {
    return `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300" title="Contract values reflect entity-wide (nationwide) totals, not NJ-specific">⚠ Entity-Wide</span>`;
  }

  function verificationBadge(status) {
    const map = {
      'Verified': { bg: '#ECFDF5', color: '#059669', icon: '✓' },
      'Partially Verified': { bg: '#FFFBEB', color: '#D97706', icon: '◐' },
      'Unverified': { bg: '#FEF2F2', color: '#DC2626', icon: '○' }
    };
    const cfg = map[status] || map['Unverified'];
    return `<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style="background:${cfg.bg};color:${cfg.color}">${cfg.icon} ${status}</span>`;
  }

  function firmSlug(firm) {
    return firm.slug || firm.firm_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function getFirmBySlug(slug) {
    return state.firms.find(f => firmSlug(f) === slug);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Exclude entity-wide firms from NJ aggregates
  function njSpecificFirms() {
    return state.firms.filter(f => !f.entity_wide_flag);
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  let dashboardRendered = false;

