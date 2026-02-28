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
      const res = await fetch('./firms_seed_data.json');
      const data = await res.json();
      state.firms = data;
      state.filteredFirms = [...data];
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

  function renderDashboard() {
    if (!state.firms.length) { setTimeout(renderDashboard, 100); return; }

    const firms = state.firms;

    // Stats
    const totalDOD = firms.reduce((s, f) => s + (f.total_dod_contract_value_3yr || 0), 0);

    // Sector counts + values
    const sectorStats = {};
    const clusterStats = { North: 0, Central: 0, South: 0 };
    const certStats = {};

    firms.forEach(f => {
      const cfg = getSectorConfig(f.sector);
      const key = f.sector;
      if (!sectorStats[key]) sectorStats[key] = { count: 0, value: 0, cfg };
      sectorStats[key].count++;
      sectorStats[key].value += f.total_dod_contract_value_3yr || 0;
      if (f.geographic_cluster) clusterStats[f.geographic_cluster] = (clusterStats[f.geographic_cluster] || 0) + 1;
      (f.certifications || []).forEach(c => { certStats[c] = (certStats[c] || 0) + 1; });
    });

    // Update label
    const lbl = document.getElementById('dash-firm-count-label');
    if (lbl) lbl.textContent = firms.length;

    // --- Stats Grid ---
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-value">${firms.length}</div>
          <div class="stat-card-label">Total Firms Mapped</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${fmtMoney(totalDOD)}</div>
          <div class="stat-card-label">Total DOD Contract Value (3yr)</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${Object.keys(sectorStats).length}</div>
          <div class="stat-card-label">Sectors Covered</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${Object.values(certStats).reduce((a,b)=>a+b,0)}</div>
          <div class="stat-card-label">Total Certifications</div>
        </div>
      `;
    }

    // --- Sector Cards ---
    const sectorCards = document.getElementById('sector-cards');
    if (sectorCards) {
      const maxCount = Math.max(...Object.values(sectorStats).map(s => s.count));
      sectorCards.innerHTML = Object.entries(sectorStats).map(([name, st]) => `
        <div class="sector-bar-card">
          <div class="sector-bar-card-icon" style="background:${st.cfg.color}"></div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-semibold text-gray-800">${st.cfg.short || name}</span>
              <span class="text-sm font-bold text-gray-900">${st.count}</span>
            </div>
            <div class="text-xs text-gray-500 mb-1.5">${fmtMoney(st.value)} DOD value</div>
            <div class="cluster-progress-bar">
              <div class="cluster-progress-fill" style="width:${(st.count/maxCount*100).toFixed(0)}%; background:${st.cfg.color}"></div>
            </div>
          </div>
          <a href="#sector/${st.cfg.slug}" class="text-xs text-blue-500 hover:text-blue-400 font-medium whitespace-nowrap">View →</a>
        </div>
      `).join('');
    }

    // --- Cluster Cards ---
    const clusterCards = document.getElementById('cluster-cards');
    if (clusterCards) {
      const total = firms.length;
      const colors = { North: '#166534', Central: '#854d0e', South: '#1e40af' };
      const fills = { North: '#4ade80', Central: '#fbbf24', South: '#60a5fa' };
      clusterCards.innerHTML = Object.entries(clusterStats).map(([name, count]) => `
        <div class="sector-bar-card">
          <div class="sector-bar-card-icon" style="background:${fills[name]}"></div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-semibold text-gray-800">${name} NJ</span>
              <span class="text-sm font-bold text-gray-900">${count}</span>
            </div>
            <div class="text-xs text-gray-500 mb-1.5">${(count/total*100).toFixed(0)}% of firms</div>
            <div class="cluster-progress-bar">
              <div class="cluster-progress-fill" style="width:${(count/total*100).toFixed(0)}%; background:${fills[name]}"></div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // --- Cert Grid ---
    const certGrid = document.getElementById('cert-grid');
    if (certGrid) {
      const topCerts = Object.entries(certStats).sort((a,b) => b[1]-a[1]).slice(0, 8);
      if (topCerts.length === 0) {
        certGrid.innerHTML = '<div class="col-span-2 text-xs text-gray-400">No certification data available</div>';
      } else {
        certGrid.innerHTML = topCerts.map(([cert, count]) => `
          <div class="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
            <span class="text-xs font-semibold text-gray-700">${cert}</span>
            <span class="text-sm font-bold text-navy">${count}</span>
          </div>
        `).join('');
      }
    }

    // --- Charts ---
    renderDashboardCharts(firms, sectorStats);

    // --- Dashboard Map ---
    if (!dashboardRendered) {
      setTimeout(() => {
        renderDashboardMap(firms);
        if (state.dashboardMap) {
          state.dashboardMap.invalidateSize();
        }
      }, 250);
      dashboardRendered = true;
    } else if (state.dashboardMap) {
      setTimeout(() => state.dashboardMap.invalidateSize(), 100);
    }

    // --- Table ---
    renderFirmsTable();
  }

  function renderDashboardCharts(firms, sectorStats) {
    // Top 10 firms bar chart
    const top10 = [...firms]
      .filter(f => f.total_dod_contract_value_3yr > 0)
      .sort((a,b) => b.total_dod_contract_value_3yr - a.total_dod_contract_value_3yr)
      .slice(0, 10);

    const barCtx = document.getElementById('top-firms-chart');
    if (barCtx) {
      if (state.topFirmsChart) { state.topFirmsChart.destroy(); }
      state.topFirmsChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: top10.map(f => f.firm_name.length > 28 ? f.firm_name.substring(0, 28) + '…' : f.firm_name),
          datasets: [{
            label: 'DOD Contract Value (3yr)',
            data: top10.map(f => f.total_dod_contract_value_3yr),
            backgroundColor: top10.map(f => getSectorConfig(f.sector).color + 'CC'),
            borderColor: top10.map(f => getSectorConfig(f.sector).color),
            borderWidth: 1,
            borderRadius: 3,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ' ' + fmtMoney(ctx.raw)
              }
            }
          },
          scales: {
            x: {
              ticks: {
                callback: (v) => fmtMoney(v),
                font: { size: 11 },
                color: '#64748b'
              },
              grid: { color: '#f1f5f9' }
            },
            y: {
              ticks: { font: { size: 11 }, color: '#374151' },
              grid: { display: false }
            }
          }
        }
      });
    }

    // Sector pie chart
    const pieCtx = document.getElementById('sector-pie-chart');
    if (pieCtx) {
      if (state.sectorPieChart) { state.sectorPieChart.destroy(); }
      const sEntries = Object.entries(sectorStats);
      state.sectorPieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: sEntries.map(([name, st]) => st.cfg.short || name),
          datasets: [{
            data: sEntries.map(([, st]) => st.count),
            backgroundColor: sEntries.map(([, st]) => st.cfg.color + 'CC'),
            borderColor: sEntries.map(([, st]) => st.cfg.color),
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 11 }, color: '#374151', padding: 12, boxWidth: 12 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} firms`
              }
            }
          },
          cutout: '55%'
        }
      });
    }
  }

  function renderDashboardMap(firms) {
    const container = document.getElementById('dashboard-map');
    if (!container) return;

    if (state.dashboardMap) {
      state.dashboardMap.remove();
      state.dashboardMap = null;
    }

    const map = L.map('dashboard-map', { zoomControl: true, scrollWheelZoom: false })
      .setView(NJ_CENTER, NJ_ZOOM);
    state.dashboardMap = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    // Force size recalculation
    setTimeout(() => map.invalidateSize(), 300);

    const cluster = L.markerClusterGroup({ chunkedLoading: true });
    state.dashboardMarkerCluster = cluster;

    firms.forEach(firm => {
      if (!firm.latitude || !firm.longitude) return;
      const cfg = getSectorConfig(firm.sector);
      const marker = L.circleMarker([firm.latitude, firm.longitude], {
        radius: 7,
        fillColor: cfg.color,
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      marker.bindPopup(createPopupHTML(firm), { maxWidth: 280 });
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
  }

  function createPopupHTML(firm) {
    const cfg = getSectorConfig(firm.sector);
    const slug = firmSlug(firm);
    return `
      <div class="map-popup">
        <div class="map-popup-firm">${escapeHtml(firm.firm_name)}</div>
        <div class="map-popup-meta">
          ${escapeHtml(firm.city)}, ${escapeHtml(firm.county)} County
          <br>${sectorBadgeHTML(firm.sector)}
        </div>
        <div class="map-popup-value">DOD Value (3yr): ${fmtMoney(firm.total_dod_contract_value_3yr)}</div>
        <a href="#firm/${escapeHtml(slug)}" class="map-popup-link">View Details →</a>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ============================================================
  // FIRMS TABLE
  // ============================================================
  function renderFirmsTable() {
    const search = (document.getElementById('table-search')?.value || '').toLowerCase();
    state.tableSearch = search;

    let firms = [...state.firms];

    if (search) {
      firms = firms.filter(f =>
        (f.firm_name || '').toLowerCase().includes(search) ||
        (f.county || '').toLowerCase().includes(search) ||
        (f.sector || '').toLowerCase().includes(search) ||
        (f.city || '').toLowerCase().includes(search)
      );
    }

    // Sort
    const { col, dir } = state.tableSort;
    firms.sort((a, b) => {
      let va = a[col] || 0;
      let vb = b[col] || 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    // Update count
    const countEl = document.getElementById('table-count');
    if (countEl) countEl.textContent = `${firms.length} firms`;

    // Update sort icons
    document.querySelectorAll('.sort-icon').forEach(el => {
      const col2 = el.dataset.col;
      el.className = 'sort-icon';
      if (col2 === col) el.classList.add(dir);
    });

    const tbody = document.getElementById('firms-table-body');
    if (!tbody) return;

    tbody.innerHTML = firms.map(f => {
      const slug = firmSlug(f);
      return `
        <tr>
          <td><a href="#firm/${escapeHtml(slug)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a></td>
          <td>${escapeHtml(f.county) || '—'}</td>
          <td>${sectorBadgeHTML(f.sector)}</td>
          <td class="text-right font-mono text-sm">${fmtMoney(f.total_dod_contract_value_3yr)}</td>
          <td>${certBadgesHTML(f.certifications)}</td>
        </tr>
      `;
    }).join('');
  }

  function filterTable() {
    renderFirmsTable();
  }

  function sortTable(col) {
    if (state.tableSort.col === col) {
      state.tableSort.dir = state.tableSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      state.tableSort.col = col;
      state.tableSort.dir = col === 'total_dod_contract_value_3yr' ? 'desc' : 'asc';
    }
    renderFirmsTable();
  }

  // ============================================================
  // MAP EXPLORER
  // ============================================================
  let explorerInitialized = false;

  function renderExplorer() {
    if (!state.firms.length) { setTimeout(renderExplorer, 100); return; }

    // Populate filter dropdowns (once)
    if (!explorerInitialized) {
      populateExplorerFilters();
      explorerInitialized = true;
    }

    // Init map
    if (!state.explorerMap) {
      setTimeout(() => {
        initExplorerMap();
        if (state.explorerMap) {
          state.explorerMap.invalidateSize();
        }
        applyFilters();
      }, 250);
    } else {
      applyFilters();
      setTimeout(() => {
        if (state.explorerMap) state.explorerMap.invalidateSize();
      }, 100);
    }
  }

  function populateExplorerFilters() {
    const firms = state.firms;

    // Sector checkboxes
    const sectorFiltersEl = document.getElementById('sector-filters');
    if (sectorFiltersEl) {
      sectorFiltersEl.innerHTML = Object.entries(SECTOR_CONFIG).map(([name, cfg]) => `
        <label class="filter-checkbox-label">
          <input type="checkbox" class="filter-checkbox sector-checkbox" value="${escapeHtml(name)}" onchange="window.njciiApp.applyFilters()" />
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cfg.color};flex-shrink:0;margin-right:2px;"></span>
          ${cfg.short}
        </label>
      `).join('');
    }

    // Cert checkboxes
    const certFiltersEl = document.getElementById('cert-filters');
    if (certFiltersEl) {
      certFiltersEl.innerHTML = CERTS_LIST.map(cert => `
        <label class="filter-checkbox-label">
          <input type="checkbox" class="filter-checkbox cert-checkbox" value="${escapeHtml(cert)}" onchange="window.njciiApp.applyFilters()" />
          ${cert}
        </label>
      `).join('');
    }

    // Counties
    const counties = [...new Set(firms.map(f => f.county).filter(Boolean))].sort();
    const countyEl = document.getElementById('county-filter');
    if (countyEl) {
      counties.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c + ' County';
        countyEl.appendChild(opt);
      });
    }

    // Congressional Districts
    const districts = [...new Set(firms.map(f => f.congressional_district).filter(Boolean))].sort();
    const distEl = document.getElementById('district-filter');
    if (distEl) {
      districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        distEl.appendChild(opt);
      });
    }

    // NAICS codes — top 20 by frequency
    const naicsCount = {};
    firms.forEach(f => {
      if (f.naics_primary) {
        const key = f.naics_primary + '|' + (f.naics_description || f.naics_primary);
        naicsCount[key] = (naicsCount[key] || 0) + 1;
      }
    });

    const topNaics = Object.entries(naicsCount).sort((a,b) => b[1]-a[1]).slice(0, 20);
    const naicsEl = document.getElementById('naics-filter');
    if (naicsEl) {
      topNaics.forEach(([key, count]) => {
        const [code, desc] = key.split('|');
        const opt = document.createElement('option');
        opt.value = code;
        const shortDesc = desc && desc.length > 40 ? desc.substring(0, 40) + '…' : (desc || code);
        opt.textContent = `${code} — ${shortDesc} (${count})`;
        naicsEl.appendChild(opt);
      });
    }

    // Explorer total
    const totalEl = document.getElementById('explorer-total');
    if (totalEl) totalEl.textContent = firms.length;
  }

  function initExplorerMap() {
    const container = document.getElementById('explorer-map');
    if (!container) return;

    const map = L.map('explorer-map', { zoomControl: true })
      .setView(NJ_CENTER, NJ_ZOOM);
    state.explorerMap = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    // Force size recalculation
    setTimeout(() => map.invalidateSize(), 300);

    state.explorerMarkerCluster = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 40 });
    map.addLayer(state.explorerMarkerCluster);
  }

  function applyFilters() {
    const firms = state.firms;

    // Collect current filter values
    const selectedSectors = [...document.querySelectorAll('.sector-checkbox:checked')].map(el => el.value);
    const selectedCluster = document.querySelector('input[name="cluster-filter"]:checked')?.value || '';
    const selectedCounty = document.getElementById('county-filter')?.value || '';
    const selectedDistrict = document.getElementById('district-filter')?.value || '';
    const selectedValue = parseFloat(document.querySelector('input[name="value-filter"]:checked')?.value || '0') || 0;
    const selectedCerts = [...document.querySelectorAll('.cert-checkbox:checked')].map(el => el.value);
    const selectedNaics = document.getElementById('naics-filter')?.value || '';

    // Filter
    let filtered = firms.filter(f => {
      if (selectedSectors.length > 0 && !selectedSectors.includes(f.sector)) return false;
      if (selectedCluster && f.geographic_cluster !== selectedCluster) return false;
      if (selectedCounty && f.county !== selectedCounty) return false;
      if (selectedDistrict && f.congressional_district !== selectedDistrict) return false;
      if (selectedValue > 0 && (f.total_dod_contract_value_3yr || 0) < selectedValue) return false;
      if (selectedCerts.length > 0) {
        const fCerts = f.certifications || [];
        if (!selectedCerts.every(c => fCerts.includes(c))) return false;
      }
      if (selectedNaics && f.naics_primary !== selectedNaics) return false;
      return true;
    });

    state.filteredFirms = filtered;

    // Update count display
    const countEl = document.getElementById('explorer-count');
    if (countEl) countEl.textContent = filtered.length;

    // Count active filters
    let filterCount = selectedSectors.length + (selectedCluster ? 1 : 0) + (selectedCounty ? 1 : 0) +
      (selectedDistrict ? 1 : 0) + (selectedValue > 0 ? 1 : 0) + selectedCerts.length + (selectedNaics ? 1 : 0);

    const badge = document.getElementById('filter-count-badge');
    const mobileBadge = document.getElementById('sidebar-filter-badge');
    if (badge) {
      badge.textContent = filterCount;
      filterCount > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
    }
    if (mobileBadge) {
      mobileBadge.textContent = filterCount;
      filterCount > 0 ? mobileBadge.classList.remove('hidden') : mobileBadge.classList.add('hidden');
    }

    // Update map
    if (state.explorerMarkerCluster) {
      state.explorerMarkerCluster.clearLayers();

      filtered.forEach(firm => {
        if (!firm.latitude || !firm.longitude) return;
        const cfg = getSectorConfig(firm.sector);
        const marker = L.circleMarker([firm.latitude, firm.longitude], {
          radius: 7,
          fillColor: cfg.color,
          color: '#fff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85
        });
        marker.bindPopup(createPopupHTML(firm), { maxWidth: 280 });
        state.explorerMarkerCluster.addLayer(marker);
      });
    }
  }

  function clearAllFilters() {
    // Uncheck all sector checkboxes
    document.querySelectorAll('.sector-checkbox').forEach(el => el.checked = false);
    // Reset cluster radio
    const clusterAll = document.querySelector('input[name="cluster-filter"][value=""]');
    if (clusterAll) clusterAll.checked = true;
    // Reset county
    const countyEl = document.getElementById('county-filter');
    if (countyEl) countyEl.value = '';
    // Reset district
    const distEl = document.getElementById('district-filter');
    if (distEl) distEl.value = '';
    // Reset value tier
    const valueAll = document.querySelector('input[name="value-filter"][value=""]');
    if (valueAll) valueAll.checked = true;
    // Uncheck certs
    document.querySelectorAll('.cert-checkbox').forEach(el => el.checked = false);
    // Reset NAICS
    const naicsEl = document.getElementById('naics-filter');
    if (naicsEl) naicsEl.value = '';

    applyFilters();
  }

  function exportCSV() {
    const firms = state.filteredFirms.length > 0 ? state.filteredFirms : state.firms;
    const headers = ['Firm Name', 'DBA Name', 'Address', 'City', 'County', 'ZIP', 'Sector', 'Subsector',
      'DOD Contract Value (3yr)', 'Federal Contract Value (3yr)', 'Geographic Cluster',
      'Congressional District', 'NAICS Code', 'NAICS Description', 'Certifications',
      'Employee Count', 'CAGE Code', 'UEI', 'Website', 'Confidence Score', 'Last Updated'];

    const csvRows = [headers.join(',')];

    firms.forEach(f => {
      const row = [
        csvQuote(f.firm_name),
        csvQuote(f.dba_name),
        csvQuote(f.address),
        csvQuote(f.city),
        csvQuote(f.county),
        csvQuote(f.zip),
        csvQuote(f.sector),
        csvQuote(f.subsector),
        f.total_dod_contract_value_3yr || 0,
        f.total_federal_contract_value_3yr || 0,
        csvQuote(f.geographic_cluster),
        csvQuote(f.congressional_district),
        csvQuote(f.naics_primary),
        csvQuote(f.naics_description),
        csvQuote((f.certifications || []).join('; ')),
        csvQuote(f.employee_count),
        csvQuote(f.cage_code),
        csvQuote(f.duns_uei),
        csvQuote(f.website),
        csvQuote(f.confidence_score),
        csvQuote(f.last_updated)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'njcii-industrial-base-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvQuote(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // Sidebar toggle (mobile)
  function toggleSidebar() {
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar) {
      state.sidebarOpen = !state.sidebarOpen;
      if (state.sidebarOpen) {
        sidebar.classList.add('open');
      } else {
        sidebar.classList.remove('open');
      }
    }
  }

  function closeSidebar() {
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar) {
      sidebar.classList.remove('open');
      state.sidebarOpen = false;
    }
  }

  // ============================================================
  // FIRM DETAIL
  // ============================================================
  function renderFirmDetail(slug) {
    const firm = getFirmBySlug(slug);
    if (!firm) {
      document.getElementById('firm-detail-content').innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <p class="text-lg">Firm not found.</p>
          <a href="#dashboard" class="text-blue-500 mt-2 inline-block">← Back to Dashboard</a>
        </div>
      `;
      return;
    }

    const cfg = getSectorConfig(firm.sector);

    const html = `
      <!-- Header -->
      <div class="firm-detail-header" style="border-left: 5px solid ${cfg.color}">
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white leading-tight">${escapeHtml(firm.firm_name)}</h1>
            ${firm.dba_name ? `<div class="text-gray-400 text-sm mt-1">DBA: ${escapeHtml(firm.dba_name)}</div>` : ''}
            <div class="flex items-center gap-2 mt-3 flex-wrap">
              ${sectorBadgeHTML(firm.sector)}
              ${clusterBadgeHTML(firm.geographic_cluster)}
              ${(firm.certifications || []).map(c => `<span class="cert-badge">${c}</span>`).join('')}
            </div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-white">${fmtMoney(firm.total_dod_contract_value_3yr)}</div>
            <div class="text-gray-400 text-xs mt-1 font-medium tracking-wider uppercase">DOD Contract Value (3yr)</div>
          </div>
        </div>
      </div>

      <!-- Grid layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left col: Location + Contract + Company -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Location -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Location</div>
            <div class="firm-detail-row"><span class="firm-detail-label">Address</span><span class="firm-detail-value">${escapeHtml(firm.address || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">City</span><span class="firm-detail-value">${escapeHtml(firm.city || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">County</span><span class="firm-detail-value">${escapeHtml(firm.county || '—')} County</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">ZIP Code</span><span class="firm-detail-value">${escapeHtml(firm.zip || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Congressional District</span><span class="firm-detail-value">${escapeHtml(firm.congressional_district || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Geographic Cluster</span><span class="firm-detail-value">${clusterBadgeHTML(firm.geographic_cluster)}</span></div>
          </div>

          <!-- Contract Data -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Contract Data</div>
            <div class="firm-detail-row"><span class="firm-detail-label">DOD Value (3yr)</span><span class="firm-detail-value font-mono font-semibold">${fmtMoneyFull(firm.total_dod_contract_value_3yr)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Federal Value (3yr)</span><span class="firm-detail-value font-mono">${fmtMoneyFull(firm.total_federal_contract_value_3yr)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Sector</span><span class="firm-detail-value">${sectorBadgeHTML(firm.sector)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Subsector</span><span class="firm-detail-value">${escapeHtml(firm.subsector || '—')}</span></div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Awarding Agencies</span>
              <span class="firm-detail-value">
                ${(firm.awarding_agencies || []).length > 0
                  ? (firm.awarding_agencies || []).map(a => `<span class="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1 mb-1">${escapeHtml(a)}</span>`).join('')
                  : '—'}
              </span>
            </div>
            ${(firm.contract_descriptions || []).length > 0 ? `
            <div class="firm-detail-row">
              <span class="firm-detail-label">Contract Descriptions</span>
              <span class="firm-detail-value">
                <ul class="list-disc pl-4 space-y-1">
                  ${(firm.contract_descriptions || []).map(d => `<li class="text-xs text-gray-600">${escapeHtml(d)}</li>`).join('')}
                </ul>
              </span>
            </div>` : ''}
          </div>

          <!-- Company Info -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Company Information</div>
            <div class="firm-detail-row"><span class="firm-detail-label">Employee Count</span><span class="firm-detail-value">${escapeHtml(firm.employee_count || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">CAGE Code</span><span class="firm-detail-value font-mono">${escapeHtml(firm.cage_code || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">UEI (SAM)</span><span class="firm-detail-value font-mono">${escapeHtml(firm.duns_uei || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">NAICS (Primary)</span><span class="firm-detail-value"><span class="font-mono mr-2">${escapeHtml(firm.naics_primary || '—')}</span><span class="text-gray-500 text-xs">${escapeHtml(firm.naics_description || '')}</span></span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Website</span><span class="firm-detail-value">${firm.website ? `<a href="${escapeHtml(firm.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 text-sm">${escapeHtml(firm.website)}</a>` : '—'}</span></div>
          </div>

          <!-- Certifications -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Certifications &amp; Set-Asides</div>
            <div class="p-4">
              ${(firm.certifications || []).length > 0
                ? (firm.certifications || []).map(c => `<span class="cert-badge mr-1 mb-1">${escapeHtml(c)}</span>`).join('')
                : '<span class="text-sm text-gray-400">No certifications on record</span>'}
            </div>
          </div>

          <!-- Data Quality -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Data Quality</div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Confidence Score</span>
              <span class="firm-detail-value ${firm.confidence_score === 'High' ? 'confidence-high' : firm.confidence_score === 'Medium' ? 'confidence-medium' : 'confidence-low'}">${escapeHtml(firm.confidence_score || '—')}</span>
            </div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Data Sources</span>
              <span class="firm-detail-value">${(firm.data_source || []).map(s => `<span class="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1">${escapeHtml(s)}</span>`).join('')}</span>
            </div>
            <div class="firm-detail-row"><span class="firm-detail-label">Last Updated</span><span class="firm-detail-value text-sm">${escapeHtml(firm.last_updated || '—')}</span></div>
          </div>
        </div>

        <!-- Right col: Map -->
        <div class="space-y-6">
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Location Map</div>
            <div id="firm-mini-map-${escapeHtml(slug)}" class="firm-mini-map" style="height:220px;"></div>
          </div>

          <!-- Quick stats -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Sector Overview</div>
            <div class="p-4">
              <a href="#sector/${escapeHtml(cfg.slug)}" class="flex items-center gap-3 p-3 rounded-lg border-2 hover:opacity-90 transition-opacity" style="border-color:${cfg.color}; background:${cfg.bg}">
                <div class="w-3 h-12 rounded flex-shrink-0" style="background:${cfg.color}"></div>
                <div>
                  <div class="font-semibold text-sm" style="color:${cfg.color}">${escapeHtml(cfg.label || firm.sector)}</div>
                  <div class="text-xs text-gray-500 mt-0.5">View all firms in this sector →</div>
                </div>
              </a>
            </div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('firm-detail-content').innerHTML = html;

    // Init mini map
    if (firm.latitude && firm.longitude) {
      setTimeout(() => {
        if (state.firmDetailMap) { state.firmDetailMap.remove(); state.firmDetailMap = null; }
        const mapId = `firm-mini-map-${slug}`;
        const miniMap = L.map(mapId, { zoomControl: false, scrollWheelZoom: false })
          .setView([firm.latitude, firm.longitude], 13);
        state.firmDetailMap = miniMap;

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
          maxZoom: 18
        }).addTo(miniMap);

        const cfgLocal = getSectorConfig(firm.sector);
        L.circleMarker([firm.latitude, firm.longitude], {
          radius: 9,
          fillColor: cfgLocal.color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9
        }).addTo(miniMap);
      }, 150);
    }
  }

  // ============================================================
  // SECTOR PAGES
  // ============================================================
  function renderSectorPage(slug) {
    if (!state.firms.length) { setTimeout(() => renderSectorPage(slug), 100); return; }

    const sectorName = SECTOR_SLUGS[slug];
    if (!sectorName) {
      document.getElementById('sector-detail-content').innerHTML =
        '<div class="p-8 text-center text-gray-500">Sector not found.</div>';
      return;
    }

    const cfg = getSectorConfig(sectorName);
    const firms = state.firms.filter(f => f.sector === sectorName);
    const totalValue = firms.reduce((s, f) => s + (f.total_dod_contract_value_3yr || 0), 0);

    // County breakdown
    const countyCount = {};
    const countyValue = {};
    firms.forEach(f => {
      if (f.county) {
        countyCount[f.county] = (countyCount[f.county] || 0) + 1;
        countyValue[f.county] = (countyValue[f.county] || 0) + (f.total_dod_contract_value_3yr || 0);
      }
    });

    const countySorted = Object.entries(countyCount).sort((a,b) => b[1]-a[1]);

    // NAICS breakdown
    const naicsCount = {};
    firms.forEach(f => {
      if (f.naics_primary) {
        const key = f.naics_primary + '|' + (f.naics_description || f.naics_primary);
        naicsCount[key] = (naicsCount[key] || 0) + 1;
      }
    });
    const naicsSorted = Object.entries(naicsCount).sort((a,b) => b[1]-a[1]).slice(0, 8);

    // Cluster distribution
    const clusterDist = {};
    firms.forEach(f => { if (f.geographic_cluster) clusterDist[f.geographic_cluster] = (clusterDist[f.geographic_cluster] || 0) + 1; });

    const html = `
      <!-- Hero -->
      <div class="sector-page-hero" style="background: linear-gradient(135deg, ${cfg.color}22 0%, ${cfg.color}08 100%); border-bottom: 3px solid ${cfg.color};">
        <div class="container mx-auto px-4 lg:px-6">
          <div class="flex items-center gap-3 mb-2">
            <a href="#dashboard" class="back-link text-xs">← Dashboard</a>
          </div>
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div class="inline-flex items-center gap-2 mb-3">
                <div class="w-1 h-8 rounded" style="background:${cfg.color}"></div>
                <span class="text-xs font-bold tracking-widest uppercase text-gray-500">Sector Overview</span>
              </div>
              <h1 class="text-3xl font-bold" style="color:${cfg.color}">${escapeHtml(sectorName)}</h1>
              <p class="text-gray-600 text-sm mt-3 max-w-2xl leading-relaxed">${SECTOR_DESCRIPTIONS[slug] || ''}</p>
            </div>
            <div class="flex gap-4 flex-wrap">
              <div class="stat-card text-center min-w-[100px]">
                <div class="stat-card-value" style="color:${cfg.color}">${firms.length}</div>
                <div class="stat-card-label">Firms</div>
              </div>
              <div class="stat-card text-center min-w-[120px]">
                <div class="stat-card-value" style="color:${cfg.color}">${fmtMoney(totalValue)}</div>
                <div class="stat-card-label">DOD Value (3yr)</div>
              </div>
              <div class="stat-card text-center min-w-[100px]">
                <div class="stat-card-value" style="color:${cfg.color}">${Object.keys(countyCount).length}</div>
                <div class="stat-card-label">Counties</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="container mx-auto px-4 lg:px-6 py-8 space-y-8">

        <!-- Charts row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="chart-card">
            <div class="chart-card-header"><h2 class="section-title">Top 10 Firms by DOD Contract Value</h2></div>
            <div class="chart-card-body"><canvas id="sector-top-chart-${slug}" height="260"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-header"><h2 class="section-title">Geographic Distribution</h2></div>
            <div class="chart-card-body">
              <div class="space-y-3">
                ${Object.entries(clusterDist).map(([name, count]) => {
                  const fills = { North: '#4ade80', Central: '#fbbf24', South: '#60a5fa' };
                  return `
                  <div>
                    <div class="flex items-center justify-between text-sm mb-1">
                      <span class="font-medium text-gray-700">${escapeHtml(name)} NJ</span>
                      <span class="font-bold text-gray-900">${count} firms</span>
                    </div>
                    <div class="cluster-progress-bar" style="height:8px;">
                      <div class="cluster-progress-fill" style="width:${(count/firms.length*100).toFixed(0)}%; background:${fills[name] || cfg.color}"></div>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- County + NAICS tables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div class="section-header"><h2 class="section-title">Firms by County</h2></div>
            <div class="data-table-card">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>County</th>
                    <th class="text-right">Firms</th>
                    <th class="text-right">DOD Value (3yr)</th>
                  </tr>
                </thead>
                <tbody>
                  ${countySorted.map(([county, count]) => `
                    <tr>
                      <td>${escapeHtml(county)}</td>
                      <td class="text-right font-semibold">${count}</td>
                      <td class="text-right font-mono text-sm">${fmtMoney(countyValue[county] || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div class="section-header"><h2 class="section-title">Top NAICS Codes</h2></div>
            <div class="data-table-card">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th class="text-right">Firms</th>
                  </tr>
                </thead>
                <tbody>
                  ${naicsSorted.map(([key, count]) => {
                    const [code, desc] = key.split('|');
                    const shortDesc = desc && desc.length > 30 ? desc.substring(0, 30) + '…' : (desc || code);
                    return `<tr>
                      <td class="font-mono text-xs">${escapeHtml(code)}</td>
                      <td class="text-xs text-gray-600">${escapeHtml(shortDesc)}</td>
                      <td class="text-right font-semibold">${count}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Firms list -->
        <div>
          <div class="section-header"><h2 class="section-title">All Firms — ${escapeHtml(sectorName)}</h2></div>
          <div class="data-table-card">
            <div class="overflow-x-auto">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Firm Name</th>
                    <th>County</th>
                    <th>Cluster</th>
                    <th class="text-right">DOD Value (3yr)</th>
                    <th>Certifications</th>
                  </tr>
                </thead>
                <tbody>
                  ${firms.sort((a,b) => (b.total_dod_contract_value_3yr||0) - (a.total_dod_contract_value_3yr||0)).map(f => {
                    const s = firmSlug(f);
                    return `<tr>
                      <td><a href="#firm/${escapeHtml(s)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a></td>
                      <td>${escapeHtml(f.county || '—')}</td>
                      <td>${clusterBadgeHTML(f.geographic_cluster)}</td>
                      <td class="text-right font-mono text-sm">${fmtMoney(f.total_dod_contract_value_3yr)}</td>
                      <td>${certBadgesHTML(f.certifications)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('sector-detail-content').innerHTML = html;

    // Render sector top chart
    setTimeout(() => {
      const top10 = [...firms]
        .filter(f => f.total_dod_contract_value_3yr > 0)
        .sort((a,b) => b.total_dod_contract_value_3yr - a.total_dod_contract_value_3yr)
        .slice(0, 10);

      const ctx = document.getElementById(`sector-top-chart-${slug}`);
      if (!ctx) return;

      if (state.sectorCharts[slug]) { state.sectorCharts[slug].destroy(); }
      state.sectorCharts[slug] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: top10.map(f => f.firm_name.length > 22 ? f.firm_name.substring(0, 22) + '…' : f.firm_name),
          datasets: [{
            label: 'DOD Value',
            data: top10.map(f => f.total_dod_contract_value_3yr),
            backgroundColor: cfg.color + 'BB',
            borderColor: cfg.color,
            borderWidth: 1,
            borderRadius: 3,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ' + fmtMoney(c.raw) } } },
          scales: {
            x: { ticks: { callback: (v) => fmtMoney(v), font: { size: 10 }, color: '#64748b' }, grid: { color: '#f1f5f9' } },
            y: { ticks: { font: { size: 10 }, color: '#374151' }, grid: { display: false } }
          }
        }
      });
    }, 100);
  }

  // ============================================================
  // MOBILE MENU
  // ============================================================
  function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
  }

  function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.add('hidden');
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.njciiApp = {
    handleAccessCode,
    filterTable,
    sortTable,
    applyFilters,
    clearAllFilters,
    exportCSV,
    toggleSidebar,
    closeSidebar,
    toggleMobileMenu,
    closeMobileMenu
  };

  // ============================================================
  // START
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
