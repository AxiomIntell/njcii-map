/**
 * NJ-CII Industrial Base Map — Application JS
 * Single-page app with hash-based routing, in-memory state only
 */

(function () {
  'use strict';

  // ==========================================
  // STATE
  // ==========================================
  const state = {
    firms: [],
    filteredFirms: [],
    activeFilters: {
      sector: '',
      county: '',
      cluster: '',
      search: ''
    },
    selectedFirm: null,
    mapInstance: null,
    markers: [],
    markerLayer: null,
    accessGranted: false
  };

  // ==========================================
  // CONSTANTS
  // ==========================================
  const ACCESS_CODE = 'NJCII2026';

  const SECTOR_COLORS = {
    'Defense & Aerospace': '#1a3a5c',
    'Life Sciences': '#2e7d6b',
    'Energy & Critical Infrastructure': '#7b4f00',
    'Advanced Manufacturing & Logistics': '#4a1a6b'
  };

  const SECTOR_ICONS = {
    'Defense & Aerospace': '✈',
    'Life Sciences': '⚕',
    'Energy & Critical Infrastructure': '⚡',
    'Advanced Manufacturing & Logistics': '⚙'
  };

  // ==========================================
  // UTILITY
  // ==========================================
  function fmt(val, isCurrency = false) {
    if (val === null || val === undefined || val === '') return 'N/A';
    if (isCurrency) {
      if (typeof val === 'number') {
        if (val >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
        if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
        if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
        return '$' + val.toFixed(0);
      }
      return val;
    }
    return val;
  }

  function sanitize(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // INIT
  // ==========================================
  async function init() {
    // Check if access already granted (session)
    if (sessionStorage.getItem('njcii_access') === 'granted') {
      state.accessGranted = true;
    }

    // Bind access code button
    const btn = document.getElementById('access-btn');
    if (btn) {
      btn.addEventListener('click', handleAccessCode);
    }
    const input = document.getElementById('access-code-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAccessCode();
      });
    }

    // Hash change routing
    window.addEventListener('hashchange', () => route());

    // Load data (split across 5 parts)
    try {
      const parts = await Promise.all([
        fetch('./firms_seed_data_part1.json').then(r => r.json()),
        fetch('./firms_seed_data_part2.json').then(r => r.json()),
        fetch('./firms_seed_data_part3.json').then(r => r.json()),
        fetch('./firms_seed_data_part4.json').then(r => r.json()),
        fetch('./firms_seed_data_part5.json').then(r => r.json())
      ]);
      const data = [].concat(...parts);
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

    if (!input || !btn) return;

    if (code === ACCESS_CODE) {
      state.accessGranted = true;
      sessionStorage.setItem('njcii_access', 'granted');
      route();
    } else {
      if (errorEl) {
        errorEl.textContent = 'Invalid access code. Please try again.';
        errorEl.style.display = 'block';
      }
      input.value = '';
      input.focus();
    }
  }

  // ============================================================
  // ROUTER
  // ============================================================
  function route() {
    if (!state.accessGranted) {
      showView('access-view');
      return;
    }

    const hash = window.location.hash || '#map';

    if (hash === '#map' || hash === '') {
      showView('map-view');
      renderMap();
    } else if (hash === '#list') {
      showView('list-view');
      renderList();
    } else if (hash.startsWith('#firm/')) {
      const slug = hash.replace('#firm/', '');
      showView('detail-view');
      renderDetail(slug);
    } else {
      showView('map-view');
      renderMap();
    }
  }

  function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (
        (viewId === 'map-view' && link.getAttribute('href') === '#map') ||
        (viewId === 'list-view' && link.getAttribute('href') === '#list')
      ) {
        link.classList.add('active');
      }
    });
  }

  // ============================================================
  // FILTERS
  // ============================================================
  function applyFilters() {
    const { sector, county, cluster, search } = state.activeFilters;
    state.filteredFirms = state.firms.filter(f => {
      if (sector && f.sector !== sector) return false;
      if (county && f.county !== county) return false;
      if (cluster && f.geographic_cluster !== cluster) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          f.firm_name, f.city, f.county, f.sector,
          f.subsector, f.naics_description, f.duns_uei
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function bindFilters(container) {
    const sectorSel = container.querySelector('#filter-sector');
    const countySel = container.querySelector('#filter-county');
    const clusterSel = container.querySelector('#filter-cluster');
    const searchInput = container.querySelector('#filter-search');
    const clearBtn = container.querySelector('#filter-clear');

    if (sectorSel) {
      sectorSel.value = state.activeFilters.sector;
      sectorSel.addEventListener('change', () => {
        state.activeFilters.sector = sectorSel.value;
        applyFilters();
        renderActiveView();
      });
    }
    if (countySel) {
      countySel.value = state.activeFilters.county;
      countySel.addEventListener('change', () => {
        state.activeFilters.county = countySel.value;
        applyFilters();
        renderActiveView();
      });
    }
    if (clusterSel) {
      clusterSel.value = state.activeFilters.cluster;
      clusterSel.addEventListener('change', () => {
        state.activeFilters.cluster = clusterSel.value;
        applyFilters();
        renderActiveView();
      });
    }
    if (searchInput) {
      searchInput.value = state.activeFilters.search;
      searchInput.addEventListener('input', () => {
        state.activeFilters.search = searchInput.value;
        applyFilters();
        renderActiveView();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.activeFilters = { sector: '', county: '', cluster: '', search: '' };
        applyFilters();
        // Reset UI
        if (sectorSel) sectorSel.value = '';
        if (countySel) countySel.value = '';
        if (clusterSel) clusterSel.value = '';
        if (searchInput) searchInput.value = '';
        renderActiveView();
      });
    }
  }

  function renderActiveView() {
    const hash = window.location.hash || '#map';
    if (hash === '#map' || hash === '') {
      renderMap();
    } else if (hash === '#list') {
      renderList();
    }
  }

  // ============================================================
  // MAP VIEW
  // ============================================================
  function renderMap() {
    const container = document.getElementById('map-view');
    if (!container) return;

    // Build HTML structure if not already built
    if (!container.querySelector('.map-layout')) {
      container.innerHTML = buildMapHTML();
      bindFilters(container);

      // Init Leaflet map
      const mapEl = document.getElementById('leaflet-map');
      if (mapEl && !state.mapInstance) {
        state.mapInstance = L.map('leaflet-map').setView([40.1, -74.5], 9);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18
        }).addTo(state.mapInstance);
        state.markerLayer = L.layerGroup().addTo(state.mapInstance);
      }
    }

    updateMapMarkers();
    updateMapSummary();
  }

  function buildMapHTML() {
    const sectors = [...new Set(state.firms.map(f => f.sector))].sort();
    const counties = [...new Set(state.firms.map(f => f.county))].sort();
    const clusters = [...new Set(state.firms.map(f => f.geographic_cluster))].sort();

    return `
      <div class="map-layout">
        <div class="sidebar">
          <div class="sidebar-header">
            <h2>NJ Defense & Industrial Base</h2>
            <p class="subtitle">${state.firms.length} firms across New Jersey</p>
          </div>
          <div class="filter-panel">
            <h3>Filters</h3>
            <div class="filter-group">
              <label for="filter-sector">Sector</label>
              <select id="filter-sector">
                <option value="">All Sectors</option>
                ${sectors.map(s => `<option value="${sanitize(s)}">${sanitize(s)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label for="filter-county">County</label>
              <select id="filter-county">
                <option value="">All Counties</option>
                ${counties.map(c => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label for="filter-cluster">Geographic Cluster</label>
              <select id="filter-cluster">
                <option value="">All Clusters</option>
                ${clusters.map(c => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label for="filter-search">Search</label>
              <input type="text" id="filter-search" placeholder="Search firms..." />
            </div>
            <button id="filter-clear" class="btn-secondary">Clear Filters</button>
          </div>
          <div class="map-summary" id="map-summary"></div>
        </div>
        <div class="map-container">
          <div id="leaflet-map"></div>
        </div>
      </div>
    `;
  }

  function updateMapMarkers() {
    if (!state.markerLayer) return;
    state.markerLayer.clearLayers();
    state.markers = [];

    state.filteredFirms.forEach(firm => {
      if (!firm.latitude || !firm.longitude) return;

      const color = SECTOR_COLORS[firm.sector] || '#555';
      const icon = SECTOR_ICONS[firm.sector] || '●';

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-dot" style="background:${color}" title="${sanitize(firm.firm_name)}">${icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([firm.latitude, firm.longitude], { icon: markerIcon });
      marker.bindPopup(buildPopup(firm));
      marker.on('click', () => {
        state.selectedFirm = firm;
      });
      state.markerLayer.addLayer(marker);
      state.markers.push(marker);
    });

    // Fit bounds if markers exist
    if (state.markers.length > 0) {
      try {
        const group = L.featureGroup(state.markers);
        state.mapInstance.fitBounds(group.getBounds().pad(0.1));
      } catch (e) {
        // ignore
      }
    }
  }

  function buildPopup(firm) {
    const dodVal = fmt(firm.total_dod_contract_value_3yr, true);
    const sector = sanitize(firm.sector || '');
    const color = SECTOR_COLORS[firm.sector] || '#555';
    return `
      <div class="popup-content">
        <div class="popup-sector" style="background:${color}">${sector}</div>
        <h4>${sanitize(firm.firm_name)}</h4>
        <p>${sanitize(firm.city)}, ${sanitize(firm.county)} County</p>
        <p><strong>DoD Contracts (3yr):</strong> ${dodVal}</p>
        <p><strong>Employees:</strong> ${fmt(firm.employee_count)}</p>
        <a href="#firm/${sanitize(firm.slug)}" class="popup-link">View Details →</a>
      </div>
    `;
  }

  function updateMapSummary() {
    const el = document.getElementById('map-summary');
    if (!el) return;

    const total = state.filteredFirms.length;
    const bySector = {};
    state.filteredFirms.forEach(f => {
      bySector[f.sector] = (bySector[f.sector] || 0) + 1;
    });

    const totalDoD = state.filteredFirms.reduce((sum, f) => {
      const v = parseFloat(f.total_dod_contract_value_3yr) || 0;
      return sum + v;
    }, 0);

    el.innerHTML = `
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-num">${total}</span>
          <span class="stat-label">Firms Shown</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">${fmt(totalDoD, true)}</span>
          <span class="stat-label">Total DoD (3yr)</span>
        </div>
      </div>
      <div class="sector-breakdown">
        ${Object.entries(bySector).map(([s, n]) => `
          <div class="sector-bar-item">
            <span class="sector-dot" style="background:${SECTOR_COLORS[s] || '#555'}"></span>
            <span class="sector-name">${sanitize(s)}</span>
            <span class="sector-count">${n}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ============================================================
  // LIST VIEW
  // ============================================================
  function renderList() {
    const container = document.getElementById('list-view');
    if (!container) return;

    if (!container.querySelector('.list-layout')) {
      container.innerHTML = buildListHTML();
      bindFilters(container);
    } else {
      // Just re-bind search if filters already present
    }

    updateListTable();
  }

  function buildListHTML() {
    const sectors = [...new Set(state.firms.map(f => f.sector))].sort();
    const counties = [...new Set(state.firms.map(f => f.county))].sort();
    const clusters = [...new Set(state.firms.map(f => f.geographic_cluster))].sort();

    return `
      <div class="list-layout">
        <div class="list-header">
          <h2>Firm Directory</h2>
          <div class="filter-panel horizontal">
            <div class="filter-group">
              <label for="filter-sector">Sector</label>
              <select id="filter-sector">
                <option value="">All Sectors</option>
                ${sectors.map(s => `<option value="${sanitize(s)}">${sanitize(s)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label for="filter-county">County</label>
              <select id="filter-county">
                <option value="">All Counties</option>
                ${counties.map(c => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label for="filter-cluster">Cluster</label>
              <select id="filter-cluster">
                <option value="">All Clusters</option>
                ${clusters.map(c => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label for="filter-search">Search</label>
              <input type="text" id="filter-search" placeholder="Search firms..." />
            </div>
            <button id="filter-clear" class="btn-secondary">Clear</button>
          </div>
        </div>
        <div class="list-container">
          <table class="firms-table" id="firms-table">
            <thead>
              <tr>
                <th>Firm Name</th>
                <th>City</th>
                <th>County</th>
                <th>Sector</th>
                <th>DoD Contracts (3yr)</th>
                <th>Employees</th>
                <th>Cluster</th>
              </tr>
            </thead>
            <tbody id="firms-tbody"></tbody>
          </table>
        </div>
      </div>
    `;
  }

  function updateListTable() {
    const tbody = document.getElementById('firms-tbody');
    if (!tbody) return;

    if (state.filteredFirms.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">No firms match the current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = state.filteredFirms.map(firm => {
      const color = SECTOR_COLORS[firm.sector] || '#555';
      return `
        <tr class="firm-row" onclick="location.hash='#firm/${sanitize(firm.slug)}'" style="cursor:pointer">
          <td><strong>${sanitize(firm.firm_name)}</strong>${firm.dba_name ? '<br><small>dba ' + sanitize(firm.dba_name) + '</small>' : ''}</td>
          <td>${sanitize(firm.city)}</td>
          <td>${sanitize(firm.county)}</td>
          <td><span class="sector-badge" style="background:${color}">${sanitize(firm.sector)}</span></td>
          <td>${fmt(firm.total_dod_contract_value_3yr, true)}</td>
          <td>${fmt(firm.employee_count)}</td>
          <td>${sanitize(firm.geographic_cluster)}</td>
        </tr>
      `;
    }).join('');
  }

  // ============================================================
  // DETAIL VIEW
  // ============================================================
  function renderDetail(slug) {
    const container = document.getElementById('detail-view');
    if (!container) return;

    const firm = state.firms.find(f => f.slug === slug);
    if (!firm) {
      container.innerHTML = '<div class="detail-layout"><p>Firm not found. <a href="#list">Back to list</a></p></div>';
      return;
    }

    const color = SECTOR_COLORS[firm.sector] || '#555';
    const icon = SECTOR_ICONS[firm.sector] || '●';

    container.innerHTML = `
      <div class="detail-layout">
        <div class="detail-header" style="border-left: 5px solid ${color}">
          <div class="detail-back">
            <a href="#list" class="back-link">← Back to Directory</a>
          </div>
          <div class="detail-title">
            <span class="detail-sector-icon">${icon}</span>
            <div>
              <h1>${sanitize(firm.firm_name)}</h1>
              ${firm.dba_name ? `<p class="dba">dba ${sanitize(firm.dba_name)}</p>` : ''}
              <span class="sector-badge" style="background:${color}">${sanitize(firm.sector)}</span>
            </div>
          </div>
        </div>

        <div class="detail-body">
          <div class="detail-grid">

            <div class="detail-card">
              <h3>Location</h3>
              <dl>
                <dt>Address</dt><dd>${sanitize(firm.address)}</dd>
                <dt>City</dt><dd>${sanitize(firm.city)}</dd>
                <dt>County</dt><dd>${sanitize(firm.county)} County</dd>
                <dt>ZIP</dt><dd>${sanitize(firm.zip)}</dd>
                <dt>Congressional District</dt><dd>${sanitize(firm.congressional_district)}</dd>
                <dt>Geographic Cluster</dt><dd>${sanitize(firm.geographic_cluster)}</dd>
              </dl>
            </div>

            <div class="detail-card">
              <h3>Contract Activity (3yr)</h3>
              <dl>
                <dt>DoD Contracts</dt><dd class="highlight">${fmt(firm.total_dod_contract_value_3yr, true)}</dd>
                <dt>Total Federal</dt><dd>${fmt(firm.total_federal_contract_value_3yr, true)}</dd>
                <dt>Awarding Agencies</dt><dd>${sanitize((firm.awarding_agencies || []).join(', '))}</dd>
              </dl>
            </div>

            <div class="detail-card">
              <h3>Firm Profile</h3>
              <dl>
                <dt>NAICS Code</dt><dd>${sanitize(firm.naics_primary)}</dd>
                <dt>NAICS Description</dt><dd>${sanitize(firm.naics_description)}</dd>
                <dt>Subsector</dt><dd>${sanitize(firm.subsector)}</dd>
                <dt>Employees</dt><dd>${fmt(firm.employee_count)}</dd>
                <dt>CAGE Code</dt><dd>${sanitize(firm.cage_code)}</dd>
                <dt>UEI/DUNS</dt><dd>${sanitize(firm.duns_uei)}</dd>
                ${firm.website ? `<dt>Website</dt><dd><a href="${sanitize(firm.website)}" target="_blank" rel="noopener">${sanitize(firm.website)}</a></dd>` : ''}
              </dl>
            </div>

            <div class="detail-card">
              <h3>Certifications</h3>
              ${firm.certifications && firm.certifications.length > 0
                ? `<ul class="cert-list">${firm.certifications.map(c => `<li>${sanitize(c)}</li>`).join('')}</ul>`
                : '<p>No certifications on file.</p>'
              }
            </div>

          </div>

          ${firm.contract_descriptions && firm.contract_descriptions.length > 0 ? `
            <div class="detail-card contract-card">
              <h3>Recent Contract Descriptions</h3>
              <ul class="contract-list">
                ${firm.contract_descriptions.map(d => `<li>${sanitize(d)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    // Mini map for firm location
    if (firm.latitude && firm.longitude) {
      setTimeout(() => {
        const mapEl = document.createElement('div');
        mapEl.id = 'detail-mini-map';
        mapEl.style.cssText = 'height:220px;width:100%;border-radius:8px;overflow:hidden;margin-top:1rem;';
        const locationCard = container.querySelector('.detail-card');
        if (locationCard) locationCard.appendChild(mapEl);

        const miniMap = L.map('detail-mini-map').setView([firm.latitude, firm.longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18
        }).addTo(miniMap);

        const color = SECTOR_COLORS[firm.sector] || '#555';
        const icon = SECTOR_ICONS[firm.sector] || '●';
        const markerIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-dot" style="background:${color}">${icon}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        L.marker([firm.latitude, firm.longitude], { icon: markerIcon })
          .bindPopup(sanitize(firm.firm_name))
          .addTo(miniMap)
          .openPopup();
      }, 100);
    }
  }

  // ============================================================
  // BOOTSTRAP
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);

}());
