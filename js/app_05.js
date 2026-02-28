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
    const sbirAwards = firm.sbir_sttr_awards || [];
    const hasYearData = firm.total_federal_value_by_year && Object.keys(firm.total_federal_value_by_year).length > 0;

    const html = `
      <!-- Header -->
      <div class="firm-detail-header" style="border-left: 5px solid ${cfg.color}">
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-2xl font-bold text-white leading-tight">${escapeHtml(firm.firm_name)}</h1>
              ${firm.entity_wide_flag ? entityWideBadge() : ''}
              ${verificationBadge(firm.verification_status)}
            </div>
            ${firm.dba_name ? `<div class="text-gray-400 text-sm mt-1">DBA: ${escapeHtml(firm.dba_name)}</div>` : ''}
            <div class="flex items-center gap-2 mt-3 flex-wrap">
              ${sectorBadgeHTML(firm.sector)}
              ${clusterBadgeHTML(firm.geographic_cluster)}
              ${trendBadgeHTML(firm.trend_direction || 'Unknown')}
            </div>
          </div>
          <div class="text-right flex items-start gap-4">
            <div>
              ${readinessGradeBadge(firm.readiness_grade, 'lg')}
              <div class="text-gray-400 text-xs mt-1">${firm.readiness_total}/100</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-white">${fmtMoney(firm.total_dod_contract_value_3yr)}</div>
              <div class="text-gray-400 text-xs mt-1 font-medium tracking-wider uppercase">DOD Value (3yr)</div>
              ${firm.entity_wide_flag ? '<div class="text-amber-500 text-xs mt-0.5">⚠ Entity-wide (nationwide)</div>' : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Grid layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left col -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Readiness Breakdown -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Readiness Score Breakdown</div>
            <div class="p-4">
              <div class="grid grid-cols-5 gap-3 mb-4">
                ${Object.entries(firm.readiness_components || {}).map(([key, val]) => {
                  const maxVals = { federal_engagement: 20, revenue_diversity: 20, growth_signal: 20, certifications: 20, data_quality: 20 };
                  const max = maxVals[key] || 20;
                  const pct = (val / max * 100).toFixed(0);
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return `<div class="text-center">
                    <div class="relative w-full bg-gray-100 rounded-full h-2 mb-1">
                      <div class="absolute top-0 left-0 h-2 rounded-full" style="width:${pct}%;background:${cfg.color}"></div>
                    </div>
                    <div class="text-xs text-gray-600 font-medium">${val}/${max}</div>
                    <div class="text-xs text-gray-400">${label}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Funding Trend (if year data available) -->
          ${hasYearData ? `
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Federal Funding Trend</div>
            <div class="chart-card-body" style="padding:16px;">
              <canvas id="firm-trend-chart-${escapeHtml(slug)}" height="200"></canvas>
            </div>
          </div>` : ''}

          <!-- SBIR/STTR Awards -->
          ${sbirAwards.length > 0 ? `
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">
              SBIR/STTR Awards (${sbirAwards.length} awards — ${fmtMoney(firm.sbir_sttr_total)})
            </div>
            <div class="p-4 space-y-3 max-h-96 overflow-y-auto">
              ${sbirAwards.sort((a,b) => (b.year||0)-(a.year||0)).map(a => `
                <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold text-purple-700 px-2 py-0.5 rounded-full bg-purple-100">${escapeHtml(a.program)} ${escapeHtml(a.phase)}</span>
                    <span class="text-sm font-bold text-gray-900">${fmtMoney(a.amount)}</span>
                  </div>
                  <div class="text-sm font-medium text-gray-800 mt-1">${escapeHtml(a.award_title || '')}</div>
                  <div class="text-xs text-gray-500 mt-1">${escapeHtml(a.agency)} &bull; ${a.year || '—'}${a.topic ? ` &bull; Topic: ${escapeHtml(a.topic)}` : ''}</div>
                  ${a.award_url ? `<a href="${escapeHtml(a.award_url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:text-blue-400 mt-1 inline-block">View on SBIR.gov →</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          <!-- Location -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Location</div>
            <div class="firm-detail-row"><span class="firm-detail-label">Address</span><span class="firm-detail-value">${escapeHtml(firm.address || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">City</span><span class="firm-detail-value">${escapeHtml(firm.city || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">County</span><span class="firm-detail-value">${escapeHtml(firm.county || '—')} County</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">ZIP Code</span><span class="firm-detail-value">${escapeHtml(firm.zip || '—')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Congressional District</span><span class="firm-detail-value">${escapeHtml(firm.congressional_district || '—')}</span></div>
          </div>

          <!-- Contract Data -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Contract Data</div>
            <div class="firm-detail-row"><span class="firm-detail-label">DOD Value (3yr)</span><span class="firm-detail-value font-mono font-semibold">${fmtMoneyFull(firm.total_dod_contract_value_3yr)}${firm.entity_wide_flag ? ' <span class="text-amber-600 text-xs">(entity-wide)</span>' : ''}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Federal Value (3yr)</span><span class="firm-detail-value font-mono">${fmtMoneyFull(firm.total_federal_contract_value_3yr)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">SBIR/STTR Total</span><span class="firm-detail-value font-mono">${fmtMoneyFull(firm.sbir_sttr_total)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Total Economic Footprint</span><span class="firm-detail-value font-mono font-semibold">${fmtMoneyFull(firm.total_economic_footprint)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Sector / Subsector</span><span class="firm-detail-value">${sectorBadgeHTML(firm.sector)} <span class="text-xs text-gray-500 ml-1">${escapeHtml(firm.subsector || '')}</span></span></div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Awarding Agencies</span>
              <span class="firm-detail-value">
                ${(firm.awarding_agencies || []).length > 0
                  ? (firm.awarding_agencies || []).map(a => `<span class="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1 mb-1">${escapeHtml(a)}</span>`).join('')
                  : '—'}
              </span>
            </div>
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

          <!-- Data Quality -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Data Quality &amp; Sources</div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Verification</span>
              <span class="firm-detail-value">${verificationBadge(firm.verification_status)}</span>
            </div>
            ${firm.verification_notes ? `<div class="firm-detail-row"><span class="firm-detail-label">Notes</span><span class="firm-detail-value text-xs text-gray-500">${escapeHtml(firm.verification_notes)}</span></div>` : ''}
            <div class="firm-detail-row">
              <span class="firm-detail-label">Data Sources</span>
              <span class="firm-detail-value">${(firm.data_source || []).map(s => `<span class="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1">${escapeHtml(s)}</span>`).join('')}</span>
            </div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Source Links</span>
              <span class="firm-detail-value">
                ${(firm.source_urls || []).map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-400 text-xs block">${escapeHtml(u.length > 60 ? u.substring(0, 60) + '…' : u)}</a>`).join('')}
              </span>
            </div>
            <div class="firm-detail-row"><span class="firm-detail-label">Last Updated</span><span class="firm-detail-value text-sm">${escapeHtml(firm.last_updated || '—')}</span></div>
          </div>
        </div>

        <!-- Right col -->
        <div class="space-y-6">
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Location Map</div>
            <div id="firm-mini-map-${escapeHtml(slug)}" class="firm-mini-map" style="height:220px;"></div>
          </div>

          <!-- Certifications -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Certifications</div>
            <div class="p-4">
              ${(firm.certifications || []).length > 0
                ? (firm.certifications || []).map(c => `<span class="cert-badge mr-1 mb-1">${escapeHtml(c)}</span>`).join('')
                : '<span class="text-sm text-gray-400">No certifications on record</span>'}
            </div>
          </div>

          <!-- Sector link -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Sector</div>
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
        const el = document.getElementById(mapId);
        if (!el) return;
        const miniMap = L.map(mapId, { zoomControl: false, scrollWheelZoom: false }).setView([firm.latitude, firm.longitude], 13);
        state.firmDetailMap = miniMap;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap', maxZoom: 18
        }).addTo(miniMap);
        L.circleMarker([firm.latitude, firm.longitude], {
          radius: 9, fillColor: cfg.color, color: '#fff', weight: 2, fillOpacity: 0.9
        }).addTo(miniMap);
      }, 150);
    }

    // Render funding trend chart
    if (hasYearData) {
      setTimeout(() => {
        const ctx = document.getElementById(`firm-trend-chart-${slug}`);
        if (!ctx) return;
        const years = Object.keys(firm.total_federal_value_by_year).sort();
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: years,
            datasets: [{
              label: 'Federal Obligations',
              data: years.map(y => firm.total_federal_value_by_year[y]),
              borderColor: cfg.color,
              backgroundColor: cfg.color + '22',
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: cfg.color,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtMoney(c.raw) } } },
            scales: {
              y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
              x: { ticks: { font: { size: 10 } }, grid: { display: false } }
            }
          }
        });
      }, 200);
    }
  }

