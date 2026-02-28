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

