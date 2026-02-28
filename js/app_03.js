  // ============================================================
  // DASHBOARD MAP
  // ============================================================
  function renderDashboardMap(firms) {
    const container = document.getElementById('dashboard-map');
    if (!container) return;

    if (state.dashboardMap) { state.dashboardMap.remove(); state.dashboardMap = null; }

    const map = L.map('dashboard-map', { zoomControl: true, scrollWheelZoom: false }).setView(NJ_CENTER, NJ_ZOOM);
    state.dashboardMap = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 300);

    const cluster = L.markerClusterGroup({ chunkedLoading: true });
    state.dashboardMarkerCluster = cluster;

    firms.forEach(firm => {
      if (!firm.latitude || !firm.longitude) return;
      const cfg = getSectorConfig(firm.sector);
      const marker = L.circleMarker([firm.latitude, firm.longitude], {
        radius: 7, fillColor: cfg.color, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: 0.85
      });
      marker.bindPopup(createPopupHTML(firm), { maxWidth: 300 });
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
          ${firm.entity_wide_flag ? entityWideBadge() : ''}
        </div>
        <div class="map-popup-value">DOD Value (3yr): ${fmtMoney(firm.total_dod_contract_value_3yr)}${firm.entity_wide_flag ? ' <span style="color:#D97706;font-size:10px;">(entity-wide)</span>' : ''}</div>
        <div class="flex items-center gap-2 mt-1">
          ${readinessGradeBadge(firm.readiness_grade, 'sm')}
          ${trendBadgeHTML(firm.trend_direction || 'Unknown')}
        </div>
        <a href="#firm/${escapeHtml(slug)}" class="map-popup-link">View Details →</a>
      </div>
    `;
  }

  // ============================================================
  // FIRMS TABLE (enhanced with readiness + trend)
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
        (f.city || '').toLowerCase().includes(search) ||
        (f.subsector || '').toLowerCase().includes(search)
      );
    }

    const { col, dir } = state.tableSort;
    firms.sort((a, b) => {
      let va, vb;
      if (col === 'readiness_grade') {
        const order = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'F': 5, '—': 6 };
        va = order[a.readiness_grade] || 6;
        vb = order[b.readiness_grade] || 6;
      } else {
        va = a[col] || 0;
        vb = b[col] || 0;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    const countEl = document.getElementById('table-count');
    if (countEl) countEl.textContent = `${firms.length} firms`;

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
          <td>
            <a href="#firm/${escapeHtml(slug)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a>
            ${f.entity_wide_flag ? '<span class="text-amber-600 text-xs ml-1" title="Entity-wide values">⚠</span>' : ''}
          </td>
          <td>${escapeHtml(f.county) || '—'}</td>
          <td>${sectorBadgeHTML(f.sector)}</td>
          <td class="text-right font-mono text-sm">${fmtMoney(f.total_dod_contract_value_3yr)}</td>
          <td class="text-center">${readinessGradeBadge(f.readiness_grade, 'sm')}</td>
          <td>${trendBadgeHTML(f.trend_direction || 'Unknown')}</td>
        </tr>
      `;
    }).join('');
  }

  function filterTable() { renderFirmsTable(); }

  function sortTable(col) {
    if (state.tableSort.col === col) {
      state.tableSort.dir = state.tableSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      state.tableSort.col = col;
      state.tableSort.dir = col === 'total_dod_contract_value_3yr' || col === 'readiness_grade' ? 'desc' : 'asc';
    }
    renderFirmsTable();
  }

