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
                    const shortDesc = desc && desc.length > 30 ? desc.substring(0, 30) + '\u2026' : (desc || code);
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
          <div class="section-header"><h2 class="section-title">All Firms \u2014 ${escapeHtml(sectorName)}</h2></div>
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
                      <td>${escapeHtml(f.county || '\u2014')}</td>
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
          labels: top10.map(f => f.firm_name.length > 22 ? f.firm_name.substring(0, 22) + '\u2026' : f.firm_name),
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
