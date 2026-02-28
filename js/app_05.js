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
            <div class="firm-detail-row"><span class="firm-detail-label">Address</span><span class="firm-detail-value">${escapeHtml(firm.address || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">City</span><span class="firm-detail-value">${escapeHtml(firm.city || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">County</span><span class="firm-detail-value">${escapeHtml(firm.county || '\u2014')} County</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">ZIP Code</span><span class="firm-detail-value">${escapeHtml(firm.zip || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Congressional District</span><span class="firm-detail-value">${escapeHtml(firm.congressional_district || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Geographic Cluster</span><span class="firm-detail-value">${clusterBadgeHTML(firm.geographic_cluster)}</span></div>
          </div>

          <!-- Contract Data -->
          <div class="firm-detail-section">
            <div class="firm-detail-section-header">Contract Data</div>
            <div class="firm-detail-row"><span class="firm-detail-label">DOD Value (3yr)</span><span class="firm-detail-value font-mono font-semibold">${fmtMoneyFull(firm.total_dod_contract_value_3yr)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Federal Value (3yr)</span><span class="firm-detail-value font-mono">${fmtMoneyFull(firm.total_federal_contract_value_3yr)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Sector</span><span class="firm-detail-value">${sectorBadgeHTML(firm.sector)}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Subsector</span><span class="firm-detail-value">${escapeHtml(firm.subsector || '\u2014')}</span></div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Awarding Agencies</span>
              <span class="firm-detail-value">
                ${(firm.awarding_agencies || []).length > 0
                  ? (firm.awarding_agencies || []).map(a => `<span class="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1 mb-1">${escapeHtml(a)}</span>`).join('')
                  : '\u2014'}
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
            <div class="firm-detail-row"><span class="firm-detail-label">Employee Count</span><span class="firm-detail-value">${escapeHtml(firm.employee_count || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">CAGE Code</span><span class="firm-detail-value font-mono">${escapeHtml(firm.cage_code || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">UEI (SAM)</span><span class="firm-detail-value font-mono">${escapeHtml(firm.duns_uei || '\u2014')}</span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">NAICS (Primary)</span><span class="firm-detail-value"><span class="font-mono mr-2">${escapeHtml(firm.naics_primary || '\u2014')}</span><span class="text-gray-500 text-xs">${escapeHtml(firm.naics_description || '')}</span></span></div>
            <div class="firm-detail-row"><span class="firm-detail-label">Website</span><span class="firm-detail-value">${firm.website ? `<a href="${escapeHtml(firm.website)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 text-sm">${escapeHtml(firm.website)}</a>` : '\u2014'}</span></div>
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
              <span class="firm-detail-value ${firm.confidence_score === 'High' ? 'confidence-high' : firm.confidence_score === 'Medium' ? 'confidence-medium' : 'confidence-low'}">${escapeHtml(firm.confidence_score || '\u2014')}</span>
            </div>
            <div class="firm-detail-row">
              <span class="firm-detail-label">Data Sources</span>
              <span class="firm-detail-value">${(firm.data_source || []).map(s => `<span class="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1">${escapeHtml(s)}</span>`).join('')}</span>
            </div>
            <div class="firm-detail-row"><span class="firm-detail-label">Last Updated</span><span class="firm-detail-value text-sm">${escapeHtml(firm.last_updated || '\u2014')}</span></div>
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
                  <div class="text-xs text-gray-500 mt-0.5">View all firms in this sector \u2192</div>
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
          attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
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
