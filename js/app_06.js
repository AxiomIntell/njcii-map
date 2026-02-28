  // ============================================================
  // CROSS-AGENCY INTELLIGENCE PAGE
  // ============================================================
  function renderCrossAgency() {
    if (!state.firms.length) { setTimeout(renderCrossAgency, 100); return; }
    const firms = state.firms;

    // Agency counts
    const agencyCounts = {};
    const agencyValue = {};
    firms.forEach(f => {
      if (f.total_federal_value_by_agency) {
        Object.entries(f.total_federal_value_by_agency).forEach(([agency, val]) => {
          agencyCounts[agency] = (agencyCounts[agency] || 0) + 1;
          agencyValue[agency] = (agencyValue[agency] || 0) + val;
        });
      }
    });
    const agencySorted = Object.entries(agencyCounts).sort((a,b) => b[1] - a[1]);

    // Multi-agency firms
    const multiAgencyFirms = firms.filter(f => f.is_multi_agency).sort((a,b) => (b.federal_agency_count||0) - (a.federal_agency_count||0));

    // SBIR agency breakdown
    const sbirAgency = {};
    firms.forEach(f => {
      (f.sbir_sttr_awards || []).forEach(a => {
        const agency = a.agency || 'Unknown';
        if (!sbirAgency[agency]) sbirAgency[agency] = { count: 0, value: 0 };
        sbirAgency[agency].count++;
        sbirAgency[agency].value += a.amount || 0;
      });
    });
    const sbirSorted = Object.entries(sbirAgency).sort((a,b) => b[1].count - a[1].count);

    document.getElementById('cross-agency-content').innerHTML = `
      <!-- Agency Summary -->
      <section>
        <div class="section-header"><h2 class="section-title">Federal Agency Relationships</h2></div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="chart-card">
            <div class="chart-card-header"><h3 class="section-title">Agencies by Firm Count</h3></div>
            <div class="chart-card-body">
              <div class="space-y-2">
                ${agencySorted.slice(0, 12).map(([agency, count]) => {
                  const pct = (count / firms.length * 100).toFixed(0);
                  const val = agencyValue[agency] || 0;
                  return `<div>
                    <div class="flex items-center justify-between text-sm mb-1">
                      <span class="font-medium text-gray-700">${escapeHtml(agency)}</span>
                      <span class="text-xs text-gray-500">${count} firms &bull; ${fmtMoney(val)}</span>
                    </div>
                    <div class="cluster-progress-bar"><div class="cluster-progress-fill" style="width:${pct}%;background:#2563EB"></div></div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-card-header"><h3 class="section-title">SBIR/STTR Awards by Sponsoring Agency</h3></div>
            <div class="chart-card-body">
              ${sbirSorted.length > 0 ? `<div class="space-y-2">
                ${sbirSorted.map(([agency, data]) => `
                  <div class="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100">
                    <span class="text-sm text-gray-700 font-medium">${escapeHtml(agency)}</span>
                    <div class="text-right">
                      <span class="text-sm font-bold text-purple-700">${data.count} awards</span>
                      <span class="text-xs text-gray-500 ml-2">${fmtMoney(data.value)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>` : '<p class="text-gray-400 text-sm">No SBIR/STTR data available</p>'}
            </div>
          </div>
        </div>
      </section>

      <!-- Multi-Agency Firms -->
      <section>
        <div class="section-header"><h2 class="section-title">Multi-Agency Firms (${multiAgencyFirms.length})</h2></div>
        <p class="text-sm text-gray-500 mb-4">Firms with contracts from more than one federal agency — indicating broader federal engagement and diversified revenue.</p>
        <div class="data-table-card">
          <div class="overflow-x-auto">
            <table class="data-table w-full">
              <thead>
                <tr>
                  <th>Firm Name</th>
                  <th>Agencies</th>
                  <th class="text-center">Agency Count</th>
                  <th class="text-right">Total Federal Value</th>
                  <th class="text-center">Readiness</th>
                </tr>
              </thead>
              <tbody>
                ${multiAgencyFirms.map(f => {
                  const slug = firmSlug(f);
                  return `<tr>
                    <td><a href="#firm/${escapeHtml(slug)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a>${f.entity_wide_flag ? ' <span class="text-amber-600 text-xs">⚠</span>' : ''}</td>
                    <td>${(f.awarding_agencies || []).map(a => `<span class="inline-block text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 mr-1 mb-0.5">${escapeHtml(a)}</span>`).join('')}</td>
                    <td class="text-center font-bold">${f.federal_agency_count || 0}</td>
                    <td class="text-right font-mono text-sm">${fmtMoney(f.total_federal_contract_value_3yr)}</td>
                    <td class="text-center">${readinessGradeBadge(f.readiness_grade, 'sm')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  // ============================================================
  // GAP ANALYSIS PAGE
  // ============================================================
  function renderGapAnalysis() {
    if (!state.firms.length) { setTimeout(renderGapAnalysis, 100); return; }
    const firms = state.firms;

    // Concentration Risk: single-agency firms
    const singleAgency = firms.filter(f => !f.is_multi_agency && (f.total_dod_contract_value_3yr || 0) > 0);
    const singleAgencyHigh = singleAgency.filter(f => (f.total_dod_contract_value_3yr || 0) > 1000000);

    // Certification gaps
    const noCerts = firms.filter(f => (f.certifications || []).length === 0 && (f.total_dod_contract_value_3yr || 0) > 0);
    const eligibleForCerts = noCerts.filter(f => !f.entity_wide_flag);

    // CMMC readiness
    const cmmcStats = {};
    firms.forEach(f => {
      const s = f.cmmc_status || 'Unknown';
      cmmcStats[s] = (cmmcStats[s] || 0) + 1;
    });

    // Declining firms
    const declining = firms.filter(f => f.trend_direction === 'Declining').sort((a,b) => (b.total_dod_contract_value_3yr||0)-(a.total_dod_contract_value_3yr||0));

    // Low readiness (D and F)
    const lowReadiness = firms.filter(f => f.readiness_grade === 'D' || f.readiness_grade === 'F');

    // Geographic gaps
    const clusterCounts = { North: 0, Central: 0, South: 0 };
    firms.forEach(f => { if (f.geographic_cluster) clusterCounts[f.geographic_cluster]++; });

    // Sector-readiness matrix
    const sectorReadiness = {};
    firms.forEach(f => {
      if (!sectorReadiness[f.sector]) sectorReadiness[f.sector] = {};
      const g = f.readiness_grade || '—';
      sectorReadiness[f.sector][g] = (sectorReadiness[f.sector][g] || 0) + 1;
    });

    document.getElementById('gap-analysis-content').innerHTML = `
      <!-- Summary Cards -->
      <section>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-card border-l-4 border-red-500">
            <div class="stat-card-value text-red-600">${singleAgencyHigh.length}</div>
            <div class="stat-card-label">Concentration Risk Firms</div>
            <div class="text-xs text-gray-400 mt-1">Single agency, &gt;$1M value</div>
          </div>
          <div class="stat-card border-l-4 border-amber-500">
            <div class="stat-card-value text-amber-600">${eligibleForCerts.length}</div>
            <div class="stat-card-label">No Certifications</div>
            <div class="text-xs text-gray-400 mt-1">Active firms, potential gaps</div>
          </div>
          <div class="stat-card border-l-4 border-purple-500">
            <div class="stat-card-value text-purple-600">${declining.length}</div>
            <div class="stat-card-label">Declining Trend</div>
            <div class="text-xs text-gray-400 mt-1">Decreasing federal engagement</div>
          </div>
          <div class="stat-card border-l-4 border-gray-500">
            <div class="stat-card-value text-gray-600">${lowReadiness.length}</div>
            <div class="stat-card-label">Low Readiness (D/F)</div>
            <div class="text-xs text-gray-400 mt-1">Below average scores</div>
          </div>
        </div>
      </section>

      <!-- Sector Readiness Matrix -->
      <section>
        <div class="section-header"><h2 class="section-title">Sector &times; Readiness Matrix</h2></div>
        <div class="data-table-card">
          <div class="overflow-x-auto">
            <table class="data-table w-full">
              <thead>
                <tr>
                  <th>Sector</th>
                  ${READINESS_GRADES.map(g => `<th class="text-center">${readinessGradeBadge(g, 'sm')}</th>`).join('')}
                  <th class="text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(sectorReadiness).map(([sector, grades]) => {
                  const cfg = getSectorConfig(sector);
                  const total = Object.values(grades).reduce((s,v) => s + v, 0);
                  return `<tr>
                    <td>${sectorBadgeHTML(sector)}</td>
                    ${READINESS_GRADES.map(g => `<td class="text-center font-mono">${grades[g] || 0}</td>`).join('')}
                    <td class="text-center font-bold">${total}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Concentration Risk -->
      <section>
        <div class="section-header"><h2 class="section-title">Concentration Risk — Single-Agency Dependence</h2></div>
        <p class="text-sm text-gray-500 mb-4">Firms with &gt;$1M in federal contracts from a single agency face revenue concentration risk. Diversification across agencies reduces vulnerability to budget shifts.</p>
        <div class="data-table-card">
          <div class="overflow-x-auto">
            <table class="data-table w-full">
              <thead>
                <tr><th>Firm Name</th><th>Sector</th><th>Agency</th><th class="text-right">DOD Value</th><th class="text-center">Readiness</th><th>Trend</th></tr>
              </thead>
              <tbody>
                ${singleAgencyHigh.slice(0, 20).map(f => {
                  const slug = firmSlug(f);
                  const agencies = f.awarding_agencies || ['DOD'];
                  return `<tr>
                    <td><a href="#firm/${escapeHtml(slug)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a></td>
                    <td>${sectorBadgeHTML(f.sector)}</td>
                    <td class="text-sm">${agencies.join(', ')}</td>
                    <td class="text-right font-mono text-sm">${fmtMoney(f.total_dod_contract_value_3yr)}</td>
                    <td class="text-center">${readinessGradeBadge(f.readiness_grade, 'sm')}</td>
                    <td>${trendBadgeHTML(f.trend_direction || 'Unknown')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          ${singleAgencyHigh.length > 20 ? `<div class="text-xs text-gray-400 text-center py-2">Showing 20 of ${singleAgencyHigh.length} firms</div>` : ''}
        </div>
      </section>

      <!-- Declining Firms -->
      <section>
        <div class="section-header"><h2 class="section-title">Declining Firms (${declining.length})</h2></div>
        <p class="text-sm text-gray-500 mb-4">Firms showing decreasing federal engagement over the analyzed period. May indicate contract losses, shifting priorities, or market exit.</p>
        <div class="data-table-card">
          <div class="overflow-x-auto">
            <table class="data-table w-full">
              <thead>
                <tr><th>Firm Name</th><th>Sector</th><th class="text-right">DOD Value</th><th class="text-center">Readiness</th><th>County</th></tr>
              </thead>
              <tbody>
                ${declining.slice(0, 15).map(f => {
                  const slug = firmSlug(f);
                  return `<tr>
                    <td><a href="#firm/${escapeHtml(slug)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a></td>
                    <td>${sectorBadgeHTML(f.sector)}</td>
                    <td class="text-right font-mono text-sm">${fmtMoney(f.total_dod_contract_value_3yr)}</td>
                    <td class="text-center">${readinessGradeBadge(f.readiness_grade, 'sm')}</td>
                    <td>${escapeHtml(f.county || '—')}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- CMMC Readiness -->
      <section>
        <div class="section-header"><h2 class="section-title">CMMC Compliance Status</h2></div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${Object.entries(cmmcStats).sort((a,b) => b[1]-a[1]).map(([status, count]) => {
            const colors = { 'Unknown': '#6B7280', 'Not Started': '#DC2626', 'In Progress': '#D97706', 'Level 1': '#2563EB', 'Level 2': '#059669', 'Level 3': '#059669' };
            return `<div class="stat-card text-center">
              <div class="stat-card-value" style="color:${colors[status] || '#6B7280'}">${count}</div>
              <div class="stat-card-label">${escapeHtml(status)}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
          Note: CMMC status data is limited. Most firms show "Unknown" status — this is itself a gap that further data collection should address.
        </div>
      </section>
    `;
  }

  // ============================================================
  // SECTOR PAGES
  // ============================================================
  function renderSectorPage(slug) {
    if (!state.firms.length) { setTimeout(() => renderSectorPage(slug), 100); return; }

    const sectorName = SECTOR_SLUGS[slug];
    if (!sectorName) {
      document.getElementById('sector-detail-content').innerHTML = '<div class="p-8 text-center text-gray-500">Sector not found.</div>';
      return;
    }

    const cfg = getSectorConfig(sectorName);
    const firms = state.firms.filter(f => f.sector === sectorName);
    const njFirms = firms.filter(f => !f.entity_wide_flag);
    const totalValue = njFirms.reduce((s, f) => s + (f.total_dod_contract_value_3yr || 0), 0);
    const sbirTotal = firms.reduce((s, f) => s + (f.sbir_sttr_total || 0), 0);

    // Subsector breakdown
    const subsectorCount = {};
    firms.forEach(f => {
      const sub = f.subsector || 'Unclassified';
      subsectorCount[sub] = (subsectorCount[sub] || 0) + 1;
    });
    const subsectorSorted = Object.entries(subsectorCount).sort((a,b) => b[1]-a[1]);

    // County breakdown
    const countyCount = {};
    const countyValue = {};
    firms.forEach(f => {
      if (f.county) {
        countyCount[f.county] = (countyCount[f.county] || 0) + 1;
        if (!f.entity_wide_flag) countyValue[f.county] = (countyValue[f.county] || 0) + (f.total_dod_contract_value_3yr || 0);
      }
    });
    const countySorted = Object.entries(countyCount).sort((a,b) => b[1]-a[1]);

    // Readiness dist
    const gradeDist = {};
    firms.forEach(f => { const g = f.readiness_grade || '—'; gradeDist[g] = (gradeDist[g] || 0) + 1; });

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
                <div class="stat-card-label">NJ DOD Value</div>
              </div>
              <div class="stat-card text-center min-w-[100px]">
                <div class="stat-card-value" style="color:${cfg.color}">${fmtMoney(sbirTotal)}</div>
                <div class="stat-card-label">SBIR/STTR</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="container mx-auto px-4 lg:px-6 py-8 space-y-8">

        <!-- Subsectors + Readiness -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="chart-card">
            <div class="chart-card-header"><h2 class="section-title">Subsectors</h2></div>
            <div class="chart-card-body">
              <div class="space-y-2">
                ${subsectorSorted.map(([sub, count]) => `
                  <div class="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100">
                    <span class="text-sm text-gray-700">${escapeHtml(sub)}</span>
                    <span class="text-sm font-bold" style="color:${cfg.color}">${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-card-header"><h2 class="section-title">Readiness Distribution</h2></div>
            <div class="chart-card-body">
              <div class="space-y-3">
                ${READINESS_GRADES.map(g => {
                  const count = gradeDist[g] || 0;
                  const pct = firms.length ? (count / firms.length * 100).toFixed(0) : 0;
                  const gc = GRADE_COLORS[g];
                  return `<div class="flex items-center gap-3">
                    ${readinessGradeBadge(g, 'sm')}
                    <div class="flex-1">
                      <div class="cluster-progress-bar"><div class="cluster-progress-fill" style="width:${pct}%;background:${gc.bg}"></div></div>
                    </div>
                    <span class="text-sm font-bold text-gray-700 w-12 text-right">${count}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Charts row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="chart-card">
            <div class="chart-card-header"><h2 class="section-title">Top 10 Firms by DOD Value</h2></div>
            <div class="chart-card-body"><canvas id="sector-top-chart-${slug}" height="260"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-header"><h2 class="section-title">Geographic Distribution</h2></div>
            <div class="chart-card-body">
              <div class="space-y-3">
                ${Object.entries(clusterDist).map(([name, count]) => {
                  const fills = { North: '#4ade80', Central: '#fbbf24', South: '#60a5fa' };
                  return `<div>
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

        <!-- Firms list -->
        <div>
          <div class="section-header"><h2 class="section-title">All Firms — ${escapeHtml(sectorName)}</h2></div>
          <div class="data-table-card">
            <div class="overflow-x-auto">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Firm Name</th>
                    <th>Subsector</th>
                    <th>County</th>
                    <th class="text-right">DOD Value (3yr)</th>
                    <th class="text-center">Readiness</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  ${firms.sort((a,b) => (b.total_dod_contract_value_3yr||0) - (a.total_dod_contract_value_3yr||0)).map(f => {
                    const s = firmSlug(f);
                    return `<tr>
                      <td><a href="#firm/${escapeHtml(s)}" class="firm-table-link">${escapeHtml(f.firm_name)}</a>${f.entity_wide_flag ? ' <span class="text-amber-600 text-xs">⚠</span>' : ''}</td>
                      <td class="text-xs text-gray-600">${escapeHtml(f.subsector || '—')}</td>
                      <td>${escapeHtml(f.county || '—')}</td>
                      <td class="text-right font-mono text-sm">${fmtMoney(f.total_dod_contract_value_3yr)}</td>
                      <td class="text-center">${readinessGradeBadge(f.readiness_grade, 'sm')}</td>
                      <td>${trendBadgeHTML(f.trend_direction || 'Unknown')}</td>
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
      const top10 = [...njFirms]
        .filter(f => f.total_dod_contract_value_3yr > 0)
        .sort((a,b) => b.total_dod_contract_value_3yr - a.total_dod_contract_value_3yr)
        .slice(0, 10);

      const ctx = document.getElementById(`sector-top-chart-${slug}`);
      if (!ctx || top10.length === 0) return;

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
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
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
