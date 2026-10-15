/**
 * MyCampus — Your Event Journey
 * Frontend Application Engine (Matching HackShift Wireframe & Palette)
 */

(function () {
  'use strict';

  // --- Constants & Parsing Logic ---
  const MONTH_NAMES = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11
  };

  function parseDateStringClient(str) {
    if (!str) return null;
    const cleanStr = str.trim();
    if (/^https?:\/\//i.test(cleanStr)) return null;

    let hours = 23, minutes = 59, seconds = 0;
    const timeMatch = cleanStr.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hours = h; minutes = m;
      }
    }

    const dmyMatch = cleanStr.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-_]+([A-Za-z]{3,9})[\s\-_]+(20\d{2})\b/i);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = MONTH_NAMES[dmyMatch[2].toLowerCase()];
      const year = parseInt(dmyMatch[3], 10);
      if (month !== undefined && day >= 1 && day <= 31) {
        const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    const ymdMatch = cleanStr.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }

    return null;
  }

  function sanitizeUrl(rawUrl) {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch (e) {}
    return '';
  }

  function parseEventClientSide(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return {
        title: 'New Campus Event',
        type: 'Hackathon',
        team: 'Avatars (3)',
        venue: 'Campus Innovation Hub',
        registrationUrl: '',
        stages: ['Reg', 'Idea', 'Sub'],
        activeStageIndex: 1
      };
    }

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // URL Extraction
    let registrationUrl = '';
    const urlRegex = /(https?:\/\/[^\s<>"'()]+)/gi;
    const urls = [];
    let m;
    while ((m = urlRegex.exec(rawText)) !== null) {
      const clean = sanitizeUrl(m[1]);
      if (clean) urls.push(clean);
    }
    if (urls.length > 0) {
      registrationUrl = urls.find(u => /reg|form|apply|join|devpost|unstop/i.test(u)) || urls[0];
    }

    // Type detection
    let type = 'Hackathon';
    if (/workshop|masterclass|bootcamp/i.test(rawText)) type = 'Workshop';
    else if (/conference|conf|summit/i.test(rawText)) type = 'Conference';
    else if (/symposium|paper/i.test(rawText)) type = 'Symposium';
    else if (/competition|contest|challenge/i.test(rawText)) type = 'Competition';

    // Title Extraction
    let title = '';
    for (const line of lines) {
      const prefixMatch = line.match(/^(?:event(?:\s+name)?|title|topic|hackathon|workshop|webinar):\s*(.+)$/i);
      if (prefixMatch && prefixMatch[1].trim()) {
        title = prefixMatch[1].trim().replace(/^[\*#\-_🔥🚀✨📢🏆🎉\s]+|[\*#\-_🔥🚀✨📢🏆🎉\s]+$/g, '').trim();
        break;
      }
    }
    if (!title && lines.length > 0) {
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];
        if (line.match(/^https?:\/\//i) || line.match(/^(venue|location|date|time|link|registration):/i)) continue;
        const cleaned = line.replace(/^[\*#\-_🔥🚀✨📢🏆🎉\s]+|[\*#\-_🔥🚀✨📢🏆🎉\s]+$/g, '').trim();
        if (cleaned.length >= 3 && cleaned.length <= 80) {
          title = cleaned;
          break;
        }
      }
    }
    if (!title) title = lines[0] ? lines[0].substring(0, 60) : 'Campus Event';

    // Venue Extraction
    let venue = 'Campus Innovation Hub';
    for (const line of lines) {
      const vMatch = line.match(/^(?:venue|location|place|where|held\s+at):\s*(.+)$/i);
      if (vMatch && vMatch[1].trim()) {
        venue = vMatch[1].trim().replace(/^[\*#\-_]+|[\*#\-_]+$/g, '').trim();
        break;
      }
    }

    // Milestones detection
    let stages = ['Reg', 'Idea', 'Sub'];
    const extractedDeadlines = [];
    lines.forEach(l => {
      const d = parseDateStringClient(l);
      if (d) {
        if (/abstract|idea/i.test(l)) extractedDeadlines.push({ label: 'Idea', date: d });
        else if (/reg/i.test(l)) extractedDeadlines.push({ label: 'Reg', date: d });
        else if (/submission|final|project/i.test(l)) extractedDeadlines.push({ label: 'Sub', date: d });
      }
    });

    return {
      title,
      type,
      team: 'Avatars (3)',
      venue,
      registrationUrl,
      stages,
      activeStageIndex: 1
    };
  }

  // --- Initial Default Events matching User's Wireframe Exactly ---
  const DEFAULT_EVENTS = [
    {
      id: 'event-innovatex',
      title: 'InnovateX Hackathon',
      type: 'Hackathon',
      team: 'Avatars (3)',
      teamSize: 3,
      venue: 'Campus Innovation Hub',
      registrationUrl: 'https://innovatex2026.dev/register',
      status: 'Registered',
      stages: ['Reg', 'Idea', 'Sub'],
      activeStageIndex: 1 // 1 means line reaches 'Idea' (50% progress)
    },
    {
      id: 'event-web3-workshop',
      title: 'Web3 Deep Dive Workshop',
      type: 'Workshop',
      team: 'Avatars (1)',
      teamSize: 3,
      venue: 'Computing Lab 4, Tech Block',
      registrationUrl: 'https://forms.gle/web3workshop2026',
      status: 'Registered',
      stages: ['Reg', 'Idea', 'Sub'],
      activeStageIndex: 1 // reaches 'Idea'
    },
    {
      id: 'event-p2p-conf',
      title: 'Campus P2P Tech Conf',
      type: 'Conference',
      team: 'Avatars (5)',
      teamSize: 3,
      venue: 'Main Seminar Auditorium',
      registrationUrl: 'https://p2ptechconf.org',
      status: 'Registered',
      stages: ['Reg', 'Idea', 'Sub'],
      activeStageIndex: 1 // reaches 'Idea'
    }
  ];

  // --- State ---
  const state = {
    teamCode: 'AVATAR',
    events: [],
    activeTab: 'timelines',
    searchQuery: '',
    ws: null,
    broadcastChannel: null,
    isDarkTheme: false,
    editingEventId: null
  };

  // --- DOM References ---
  const el = {
    themeSwitch: document.getElementById('theme-toggle-switch'),
    brandHomeBtn: document.getElementById('brand-home-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    pageTitleText: document.getElementById('page-title-text'),
    sidebarTeamCode: document.getElementById('sidebar-team-code'),
    btnCopyCode: document.getElementById('btn-copy-code'),
    btnSwitchTeam: document.getElementById('btn-switch-team'),
    syncDotBadge: document.getElementById('sync-dot-badge'),
    btnTopSearch: document.getElementById('btn-top-search'),
    userProfileBadge: document.getElementById('user-profile-badge'),
    inlineSearchContainer: document.getElementById('inline-search-container'),
    eventSearchInput: document.getElementById('event-search-input'),
    btnOpenAddEvent: document.getElementById('btn-open-add-event'),
    magicAddQuickInput: document.getElementById('magic-add-quick-input'),
    btnAnalyzeQuick: document.getElementById('btn-analyze-quick'),
    eventsListContainer: document.getElementById('events-list-container'),

    // Event Editor Modal
    modalEventEditor: document.getElementById('modal-event-editor'),
    modalEditorTitle: document.getElementById('modal-editor-title'),
    btnCloseEditorModal: document.getElementById('btn-close-editor-modal'),
    btnCancelEditorModal: document.getElementById('btn-cancel-editor-modal'),
    sampleChips: document.querySelectorAll('.sample-chip'),
    rawEventTextarea: document.getElementById('raw-event-textarea'),
    btnRunExtraction: document.getElementById('btn-run-extraction'),
    inputEventTitle: document.getElementById('input-event-title'),
    inputEventType: document.getElementById('input-event-type'),
    inputEventTeam: document.getElementById('input-event-team'),
    inputEventVenue: document.getElementById('input-event-venue'),
    inputEventUrl: document.getElementById('input-event-url'),
    milestoneStagesList: document.getElementById('milestone-stages-list'),
    btnAddMilestoneStage: document.getElementById('btn-add-milestone-stage'),
    btnSaveEventCard: document.getElementById('btn-save-event-card'),

    // Team Modal
    modalTeamSetup: document.getElementById('modal-team-setup'),
    btnCloseTeamModal: document.getElementById('btn-close-team-modal'),
    inputTeamCodeModal: document.getElementById('input-team-code-modal'),
    btnGenNewTeam: document.getElementById('btn-gen-new-team'),
    btnConfirmTeam: document.getElementById('btn-confirm-team'),

    toastShelf: document.getElementById('toast-shelf')
  };

  // --- Toast Shelf ---
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.innerHTML = `<span>✓</span> <span>${escapeHtml(msg)}</span>`;
    el.toastShelf.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(10px)';
      t.style.transition = 'all 0.3s ease';
      setTimeout(() => t.remove(), 300);
    }, 2800);
  }

  // --- Real-Time Sync & Persistence Engine ---
  function initSync(teamCode) {
    state.teamCode = teamCode.toUpperCase();
    localStorage.setItem('mycampus_team_code', state.teamCode);
    el.sidebarTeamCode.textContent = state.teamCode;

    // Load cached events
    const cached = localStorage.getItem(`mycampus_events_${state.teamCode}`);
    if (cached) {
      try {
        state.events = JSON.parse(cached);
      } catch (e) {
        state.events = DEFAULT_EVENTS;
      }
    } else {
      state.events = DEFAULT_EVENTS;
      saveEventsLocally(false);
    }

    // BroadcastChannel for cross-window / tab instant sync (works in file:// and static)
    try {
      if (state.broadcastChannel) state.broadcastChannel.close();
      state.broadcastChannel = new BroadcastChannel(`mycampus_chan_${state.teamCode}`);
      state.broadcastChannel.onmessage = (e) => {
        if (e.data && e.data.type === 'sync_events') {
          state.events = e.data.events || [];
          localStorage.setItem(`mycampus_events_${state.teamCode}`, JSON.stringify(state.events));
          renderEventsList();
          showToast('Updated live from teammate');
        }
      };
    } catch (err) {}

    // Storage event listener fallback
    window.addEventListener('storage', (e) => {
      if (e.key === `mycampus_events_${state.teamCode}`) {
        try {
          state.events = JSON.parse(e.newValue || '[]');
          renderEventsList();
        } catch (err) {}
      }
    });

    // WebSocket connection if running on Node / HTTP server
    connectWebSocket(state.teamCode);
  }

  function connectWebSocket(teamCode) {
    if (location.protocol === 'file:') {
      el.syncDotBadge.style.background = '#10B981';
      el.syncDotBadge.title = 'Local Tab Sync Active';
      return;
    }

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${location.host}`;

    try {
      if (state.ws) state.ws.close();
      state.ws = new WebSocket(wsUrl);

      state.ws.onopen = () => {
        el.syncDotBadge.style.background = '#10B981';
        el.syncDotBadge.title = 'WebSocket Synced';
        state.ws.send(JSON.stringify({ type: 'join', teamCode }));
      };

      state.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init' && data.events && data.events.length > 0) {
            state.events = data.events;
            saveEventsLocally(false);
            renderEventsList();
          } else if (data.type === 'sync_events' && data.events) {
            state.events = data.events;
            saveEventsLocally(false);
            renderEventsList();
            showToast('Teammate updated timeline');
          }
        } catch (e) {}
      };

      state.ws.onclose = () => {
        el.syncDotBadge.style.background = '#F59E0B';
        setTimeout(() => connectWebSocket(state.teamCode), 5000);
      };
    } catch (e) {
      el.syncDotBadge.style.background = '#10B981';
    }
  }

  function saveAndBroadcastEvents() {
    saveEventsLocally(true);
    renderEventsList();
  }

  function saveEventsLocally(broadcast = true) {
    localStorage.setItem(`mycampus_events_${state.teamCode}`, JSON.stringify(state.events));

    if (broadcast) {
      if (state.broadcastChannel) {
        state.broadcastChannel.postMessage({
          type: 'sync_events',
          teamCode: state.teamCode,
          events: state.events
        });
      }
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'sync_events',
          teamCode: state.teamCode,
          events: state.events
        }));
      }
    }
  }

  // --- Rendering Event Cards matching Wireframe ---
  function renderEventsList() {
    const container = el.eventsListContainer;
    container.innerHTML = '';

    let list = [...state.events];

    // Filter by search query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(e => 
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.type && e.type.toLowerCase().includes(q)) ||
        (e.team && e.team.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; background:var(--bg-card); border-radius:12px; border:1px dashed var(--card-border);">
          <p style="font-weight:600; color:var(--text-muted);">No events found.</p>
          <p style="font-size:0.85rem; color:var(--text-dim); margin-top:4px;">Use the Magic Add bar above to paste an event announcement.</p>
        </div>
      `;
      return;
    }

    list.forEach(event => {
      const card = document.createElement('div');
      card.className = 'timeline-card tilt-enabled';
      card.setAttribute('data-id', event.id);

      // Milestone stages
      const stages = event.stages || ['Reg', 'Idea', 'Sub'];
      const activeIdx = Math.max(0, Math.min(stages.length - 1, event.activeStageIndex !== undefined ? event.activeStageIndex : 1));

      // Calculate fill width percentage
      const progressPercent = stages.length > 1 ? (activeIdx / (stages.length - 1)) * 100 : 0;

      // Build milestone ticks
      const ticksHtml = stages.map((stg, i) => {
        const isReached = i <= activeIdx;
        return `
          <div class="milestone-tick ${isReached ? 'active' : ''}" data-stage-index="${i}" title="Click to advance to ${escapeHtml(stg)}">
            <span class="milestone-tick-label">${escapeHtml(stg)}</span>
          </div>
        `;
      }).join('');

      // Status class
      const status = event.status || 'Registered';
      const statusClass = `status-${status.toLowerCase()}`;

      // Card HTML
      card.innerHTML = `
        <!-- Left Column -->
        <div class="card-left">
          <h3 class="card-title">${escapeHtml(event.title)}</h3>
          <div class="card-type">Type: ${escapeHtml(event.type || 'Hackathon')}</div>
          <div class="card-team">Team: ${escapeHtml(event.team || 'Avatars (3)')}</div>
          <div class="card-badge-row">
            <span class="team-size-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Team of ${escapeHtml(event.teamSize || 3)}
            </span>
            <span class="status-badge-pill ${statusClass}" data-action="cycle-status" title="Click to change status">
              ${status}
            </span>
          </div>

          <div class="card-actions-mini">
            ${event.registrationUrl ? `
              <a href="${escapeHtml(event.registrationUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding: 2px 8px;" title="Open Registration Link">
                Link ↗
              </a>
            ` : ''}
            <button class="btn btn-secondary btn-sm" data-action="edit-event" style="font-size:0.75rem; padding: 2px 8px;">Edit</button>
            <button class="btn btn-secondary btn-sm" data-action="delete-event" style="font-size:0.75rem; padding: 2px 8px; color:#EF4444;">Delete</button>
          </div>
        </div>

        <!-- Right Column: Horizontal Milestone Track (matching screenshot) -->
        <div class="card-right">
          <div class="milestone-track-container">
            <div class="milestone-track-bar">
              <div class="milestone-track-fill" style="width: ${progressPercent}%;"></div>
              <div class="milestone-ticks-row">
                ${ticksHtml}
              </div>
            </div>
          </div>
        </div>
      `;

      // 3D Card Tilt Effect
      setup3DTilt(card);

      // Milestone tick click listener to advance progress
      card.querySelectorAll('.milestone-tick').forEach(tick => {
        tick.addEventListener('click', (e) => {
          e.stopPropagation();
          const newIdx = parseInt(tick.getAttribute('data-stage-index'), 10);
          event.activeStageIndex = newIdx;
          saveAndBroadcastEvents();
          showToast(`Milestone updated to ${stages[newIdx]}`);
        });
      });

      // Status pill cycle click
      const statusPill = card.querySelector('[data-action="cycle-status"]');
      if (statusPill) {
        statusPill.addEventListener('click', (e) => {
          e.stopPropagation();
          const cycle = ['Upcoming', 'Registered', 'Submitted', 'Done'];
          const cur = cycle.indexOf(event.status || 'Registered');
          event.status = cycle[(cur + 1) % cycle.length];
          saveAndBroadcastEvents();
          showToast(`Status set to ${event.status}`);
        });
      }

      // Edit Event
      const editBtn = card.querySelector('[data-action="edit-event"]');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(event);
        });
      }

      // Delete Event
      const deleteBtn = card.querySelector('[data-action="delete-event"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Remove "${event.title}" from timeline?`)) {
            state.events = state.events.filter(x => x.id !== event.id);
            saveAndBroadcastEvents();
            showToast('Event removed');
          }
        });
      }

      container.appendChild(card);
    });
  }

  // --- 3D Tilt on Hover ---
  function setup3DTilt(card) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const normX = (x - rect.width / 2) / (rect.width / 2);
      const normY = (y - rect.height / 2) / (rect.height / 2);

      const rotX = -normY * 4;
      const rotY = normX * 4;

      card.style.transform = `perspective(800px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }

  // --- Modal & Form Logic ---
  function openAddModal() {
    state.editingEventId = null;
    el.modalEditorTitle.textContent = 'Add & Parse Campus Event';
    el.rawEventTextarea.value = '';
    el.inputEventTitle.value = '';
    el.inputEventType.value = 'Hackathon';
    el.inputEventTeam.value = 'Avatars (3)';
    el.inputEventVenue.value = 'Campus Innovation Hub';
    el.inputEventUrl.value = '';
    renderMilestoneInputs(['Reg', 'Idea', 'Sub']);
    el.modalEventEditor.classList.add('active');
  }

  function openEditModal(event) {
    state.editingEventId = event.id;
    el.modalEditorTitle.textContent = 'Edit Event Timeline';
    el.rawEventTextarea.value = '';
    el.inputEventTitle.value = event.title || '';
    el.inputEventType.value = event.type || 'Hackathon';
    el.inputEventTeam.value = event.team || 'Avatars (3)';
    el.inputEventVenue.value = event.venue || '';
    el.inputEventUrl.value = event.registrationUrl || '';
    renderMilestoneInputs(event.stages || ['Reg', 'Idea', 'Sub']);
    el.modalEventEditor.classList.add('active');
  }

  function closeEditorModal() {
    el.modalEventEditor.classList.remove('active');
  }

  function renderMilestoneInputs(stages) {
    el.milestoneStagesList.innerHTML = '';
    stages.forEach((stg, i) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';
      row.innerHTML = `
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); width:50px;">Stage ${i + 1}</span>
        <input type="text" class="form-input milestone-stage-input" value="${escapeHtml(stg)}" style="padding:6px 10px;">
        <button type="button" class="btn btn-secondary btn-sm" style="color:#EF4444; padding:4px 8px;">&times;</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        row.remove();
      });
      el.milestoneStagesList.appendChild(row);
    });
  }

  function addMilestoneStageRow() {
    const count = el.milestoneStagesList.children.length;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); width:50px;">Stage ${count + 1}</span>
      <input type="text" class="form-input milestone-stage-input" value="Phase ${count + 1}" style="padding:6px 10px;">
      <button type="button" class="btn btn-secondary btn-sm" style="color:#EF4444; padding:4px 8px;">&times;</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      row.remove();
    });
    el.milestoneStagesList.appendChild(row);
  }

  async function handleQuickAnalyze() {
    const text = el.magicAddQuickInput.value.trim();
    if (!text) {
      showToast('Please type or paste event text');
      el.magicAddQuickInput.focus();
      return;
    }

    el.btnAnalyzeQuick.textContent = 'Parsing...';
    let extracted = null;

    if (location.protocol.startsWith('http')) {
      try {
        const resp = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const data = await resp.json();
        if (data.success && data.event) {
          extracted = {
            title: data.event.title,
            type: data.event.title.toLowerCase().includes('workshop') ? 'Workshop' : 'Hackathon',
            team: 'Avatars (3)',
            venue: data.event.venue,
            registrationUrl: data.event.registrationUrl,
            stages: ['Reg', 'Idea', 'Sub'],
            activeStageIndex: 1
          };
        }
      } catch (err) {}
    }

    if (!extracted) {
      extracted = parseEventClientSide(text);
    }

    el.btnAnalyzeQuick.textContent = 'Analyze';

    // Populate modal for verification
    openAddModal();
    el.rawEventTextarea.value = text;
    el.inputEventTitle.value = extracted.title;
    el.inputEventType.value = extracted.type;
    el.inputEventVenue.value = extracted.venue;
    el.inputEventUrl.value = extracted.registrationUrl;
    renderMilestoneInputs(extracted.stages);
    showToast('Event information analyzed!');
  }

  async function handleExtractionInModal() {
    const raw = el.rawEventTextarea.value.trim();
    if (!raw) {
      showToast('Please paste event text first');
      return;
    }

    el.btnRunExtraction.textContent = 'Extracting...';
    let extracted = null;

    if (location.protocol.startsWith('http')) {
      try {
        const resp = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: raw })
        });
        const data = await resp.json();
        if (data.success && data.event) {
          extracted = {
            title: data.event.title,
            type: data.event.title.toLowerCase().includes('workshop') ? 'Workshop' : 'Hackathon',
            team: 'Avatars (3)',
            venue: data.event.venue,
            registrationUrl: data.event.registrationUrl,
            stages: ['Reg', 'Idea', 'Sub']
          };
        }
      } catch (err) {}
    }

    if (!extracted) {
      extracted = parseEventClientSide(raw);
    }

    el.btnRunExtraction.textContent = 'Extract with AI / Parser';

    el.inputEventTitle.value = extracted.title;
    el.inputEventType.value = extracted.type;
    el.inputEventVenue.value = extracted.venue;
    el.inputEventUrl.value = extracted.registrationUrl;
    renderMilestoneInputs(extracted.stages);
    showToast('Fields extracted!');
  }

  function handleSaveEvent() {
    const title = el.inputEventTitle.value.trim();
    if (!title) {
      showToast('Event title is required');
      el.inputEventTitle.focus();
      return;
    }

    const stageInputs = el.milestoneStagesList.querySelectorAll('.milestone-stage-input');
    const stages = [];
    stageInputs.forEach(inp => {
      const v = inp.value.trim();
      if (v) stages.push(v);
    });

    if (stages.length === 0) {
      stages.push('Reg', 'Idea', 'Sub');
    }

    const type = el.inputEventType.value;
    const team = el.inputEventTeam.value.trim() || 'Avatars (3)';
    const venue = el.inputEventVenue.value.trim();
    const registrationUrl = sanitizeUrl(el.inputEventUrl.value.trim());

    if (state.editingEventId) {
      const existing = state.events.find(e => e.id === state.editingEventId);
      if (existing) {
        existing.title = title;
        existing.type = type;
        existing.team = team;
        existing.venue = venue;
        existing.registrationUrl = registrationUrl;
        existing.stages = stages;
      }
      showToast('Timeline updated!');
    } else {
      const newEv = {
        id: 'event_' + Date.now(),
        title,
        type,
        team,
        teamSize: 3,
        venue,
        registrationUrl,
        status: 'Registered',
        stages,
        activeStageIndex: 1
      };
      state.events.unshift(newEv);
      showToast('Added to timeline!');
    }

    saveAndBroadcastEvents();
    closeEditorModal();
    el.magicAddQuickInput.value = '';
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Initialization ---
  function init() {
    // Theme setup
    const savedTheme = localStorage.getItem('mycampus_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      el.themeSwitch.checked = true;
    }

    el.themeSwitch.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('mycampus_theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('mycampus_theme', 'light');
      }
    });

    // Team Sync Setup
    const savedCode = localStorage.getItem('mycampus_team_code') || 'AVATAR';
    initSync(savedCode);

    // Copy team code
    el.btnCopyCode.addEventListener('click', () => {
      navigator.clipboard.writeText(state.teamCode).then(() => {
        showToast(`Team code ${state.teamCode} copied!`);
      });
    });

    // Switch team modal
    el.btnSwitchTeam.addEventListener('click', () => {
      el.inputTeamCodeModal.value = state.teamCode;
      el.modalTeamSetup.classList.add('active');
    });

    el.btnCloseTeamModal.addEventListener('click', () => {
      el.modalTeamSetup.classList.remove('active');
    });

    el.btnGenNewTeam.addEventListener('click', () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      el.inputTeamCodeModal.value = code;
    });

    el.btnConfirmTeam.addEventListener('click', () => {
      const c = el.inputTeamCodeModal.value.trim().toUpperCase();
      if (!c || c.length < 3) {
        showToast('Please enter a team code');
        return;
      }
      initSync(c);
      el.modalTeamSetup.classList.remove('active');
      showToast(`Connected to team ${c}`);
    });

    // Navigation item tabs
    el.navItems.forEach(item => {
      item.addEventListener('click', () => {
        el.navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        state.activeTab = item.getAttribute('data-tab');

        if (state.activeTab === 'timelines') {
          el.pageTitleText.textContent = 'My Event Timelines';
        } else if (state.activeTab === 'events') {
          el.pageTitleText.textContent = 'My Events';
        } else {
          el.pageTitleText.textContent = 'Home Dashboard';
        }
        renderEventsList();
      });
    });

    // Top search toggle
    el.btnTopSearch.addEventListener('click', () => {
      const isHidden = el.inlineSearchContainer.style.display === 'none';
      el.inlineSearchContainer.style.display = isHidden ? 'block' : 'none';
      if (isHidden) el.eventSearchInput.focus();
    });

    el.eventSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderEventsList();
    });

    // Add Event & Quick Analyze
    el.btnOpenAddEvent.addEventListener('click', openAddModal);
    el.btnAnalyzeQuick.addEventListener('click', handleQuickAnalyze);
    el.magicAddQuickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleQuickAnalyze();
    });

    // Editor Modal actions
    el.btnCloseEditorModal.addEventListener('click', closeEditorModal);
    el.btnCancelEditorModal.addEventListener('click', closeEditorModal);
    el.btnRunExtraction.addEventListener('click', handleExtractionInModal);
    el.btnAddMilestoneStage.addEventListener('click', addMilestoneStageRow);
    el.btnSaveEventCard.addEventListener('click', handleSaveEvent);

    // Sample prompt chips inside modal
    el.sampleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-sample');
        if (type === 'hackathon') {
          el.rawEventTextarea.value = `InnovateX Hackathon 2026\nOrganized by Innovation Council\nVenue: Campus Innovation Hub\nRegister at: https://innovatex2026.dev/register\nDeadlines: Registration Open, Idea Abstract, Final Submission`;
        } else if (type === 'workshop') {
          el.rawEventTextarea.value = `Web3 Deep Dive Workshop\nVenue: Computing Lab 4, Tech Block\nApply link: https://forms.gle/web3workshop2026\nMilestones: Registration, Idea Draft, Project Submission`;
        } else if (type === 'conf') {
          el.rawEventTextarea.value = `Campus P2P Tech Conf 2026\nAnnual Student Peer-to-Peer Conference\nVenue: Main Seminar Auditorium\nPortal: https://p2ptechconf.org\nTimeline: Reg, Idea, Sub`;
        }
        handleExtractionInModal();
      });
    });

    // Drag and drop onto Magic Add Bar
    const quickBar = document.querySelector('.magic-add-bar');
    if (quickBar) {
      quickBar.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.magicAddQuickInput.style.borderColor = 'var(--brand-primary)';
      });
      quickBar.addEventListener('dragleave', () => {
        el.magicAddQuickInput.style.borderColor = '';
      });
      quickBar.addEventListener('drop', (e) => {
        e.preventDefault();
        el.magicAddQuickInput.style.borderColor = '';
        const dt = e.dataTransfer;
        const text = dt.getData('text');
        if (text) {
          el.magicAddQuickInput.value = text;
          handleQuickAnalyze();
        } else if (dt.files && dt.files[0]) {
          const file = dt.files[0];
          const reader = new FileReader();
          reader.onload = (re) => {
            el.magicAddQuickInput.value = re.target.result;
            handleQuickAnalyze();
          };
          reader.readAsText(file);
        }
      });
    }

    // Render initial list
    renderEventsList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
