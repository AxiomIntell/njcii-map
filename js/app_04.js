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
        const shortDesc = desc && desc.length > 40 ? desc.substring(0, 40) + '\u2026' : (desc || code);
        opt.textContent = `${code} \u2014 ${shortDesc} (${count})`;
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
      attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
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
