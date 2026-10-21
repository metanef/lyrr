/**
 * Lyrr - Lyrics Studio & Syllable Counter
 * Line-by-Line Document Editor with live syllable counter & local Genius optimizer
 */

(function () {
  'use strict';

  // --- DOM Selectors ---
  const editorLinesContainer = document.getElementById('editorLinesContainer');
  const songTitleInput = document.getElementById('songTitleInput');
  const saveIndicator = document.getElementById('saveIndicator');
  const saveText = document.getElementById('saveText');

  // Statistics
  const statLineCount = document.getElementById('statLineCount');
  const statSyllableCount = document.getElementById('statSyllableCount');
  const statAvgCount = document.getElementById('statAvgCount');

  // Dropdown & Export
  const exportDropdown = document.getElementById('exportDropdown');
  const btnExportMenu = document.getElementById('btnExportMenu');
  const btnCopyRaw = document.getElementById('btnCopyRaw');
  const btnCopyDetailed = document.getElementById('btnCopyDetailed');
  const btnDownloadTxt = document.getElementById('btnDownloadTxt');
  const btnClearText = document.getElementById('btnClearText');

  // Projects Modal
  const btnOpenProjects = document.getElementById('btnOpenProjects');
  const projectsModal = document.getElementById('projectsModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const songsListContainer = document.getElementById('songsListContainer');
  const btnNewSong = document.getElementById('btnNewSong');

  // Toast Notification
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Tab Navigation
  const tabBtnStudio = document.getElementById('tabBtnStudio');
  const tabBtnGenius = document.getElementById('tabBtnGenius');
  const tabPaneStudio = document.getElementById('tabPaneStudio');
  const tabPaneGenius = document.getElementById('tabPaneGenius');

  // Genius Optimizer Selectors
  const btnGeniusImportStudio = document.getElementById('btnGeniusImportStudio');
  const btnGeniusClear = document.getElementById('btnGeniusClear');
  const btnGeniusFormat = document.getElementById('btnGeniusFormat');

  const geniusInputLyrics = document.getElementById('geniusInputLyrics');

  const geniusOutputTools = document.getElementById('geniusOutputTools');
  const btnGeniusSendToStudio = document.getElementById('btnGeniusSendToStudio');
  const btnGeniusCopy = document.getElementById('btnGeniusCopy');
  const geniusCopyText = document.getElementById('geniusCopyText');

  const geniusOutputCard = document.getElementById('geniusOutputCard');
  const geniusStatsSummary = document.getElementById('geniusStatsSummary');
  const geniusStateEmpty = document.getElementById('geniusStateEmpty');
  const geniusOutputLyrics = document.getElementById('geniusOutputLyrics');

  // --- Application State ---
  const STORAGE_KEY = 'lyrr_studio_songs_v3';
  const STORAGE_KEY_ACTIVE_TAB = 'lyrr_active_tab';
  const STORAGE_KEY_SHOW_BREAKDOWN = 'lyrr_show_breakdown';
  const MODE = 'rap';

  let showBreakdown = true;

  // Off-screen canvas helper to accurately measure text width
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  function measureTextWidth(text) {
    if (!measureCtx) return (text || '').length * 9.5;
    measureCtx.font = "16px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
    return measureCtx.measureText(text || '').width;
  }

  let songs = [];
  let currentSong = null;
  let lines = [];
  let activeLineIndex = null;
  let editingBadgeIndex = null;
  let saveTimeout = null;

  // --- History Management (Undo / Redo) ---
  const MAX_HISTORY = 80;
  let undoStack = [];
  let redoStack = [];
  let isTypingBurst = false;
  let typingBurstTimer = null;
  let isPerformingUndoRedo = false;

  const DEFAULT_LYRICS = 
`Je suis heureux
PDG
14
RATP ou FBI
C'est la vie sur le bitume
J'écris mes textes à la plume`;

  // --- Local Storage Initialization & Persistence ---
  function loadStoredData() {
    try {
      const rawSongs = localStorage.getItem(STORAGE_KEY) || 
                       localStorage.getItem('lyrr_studio_songs_v2') || 
                       localStorage.getItem('lyrr_studio_songs_v1');
      if (rawSongs) {
        songs = JSON.parse(rawSongs);
      }
    } catch (e) {
      console.warn('Unable to load songs from local storage', e);
      songs = [];
    }

    if (!Array.isArray(songs) || songs.length === 0) {
      const initialSong = {
        id: 'song_' + Date.now(),
        title: 'Session Démo',
        content: DEFAULT_LYRICS,
        overrides: {},
        updatedAt: Date.now()
      };
      songs = [initialSong];
      currentSong = initialSong;
      saveSongs();
    } else {
      currentSong = songs[0];
    }

    // Load lines for active project
    lines = (currentSong.content || '').split('\n');
    if (lines.length === 0) lines = [''];
  }

  function saveSongs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
      showSaveStatus(true);
    } catch (e) {
      console.error('Local storage save error', e);
      showSaveStatus(false);
    }
  }

  // --- History Snapshot Helpers (Undo / Redo) ---
  function getActiveCaretPos() {
    if (activeLineIndex === null || !editorLinesContainer) return 0;
    const activeInput = editorLinesContainer.querySelector(`.line-input[data-index="${activeLineIndex}"]`);
    return activeInput ? activeInput.selectionStart : 0;
  }

  function createSnapshot() {
    return {
      lines: lines.slice(),
      overrides: currentSong && currentSong.overrides ? { ...currentSong.overrides } : {},
      activeLineIndex: activeLineIndex,
      caretPos: getActiveCaretPos()
    };
  }

  function areSnapshotsEqual(s1, s2) {
    if (!s1 || !s2) return false;
    if (s1.lines.length !== s2.lines.length) return false;
    for (let i = 0; i < s1.lines.length; i++) {
      if (s1.lines[i] !== s2.lines[i]) return false;
    }
    const o1 = s1.overrides || {};
    const o2 = s2.overrides || {};
    const k1 = Object.keys(o1);
    const k2 = Object.keys(o2);
    if (k1.length !== k2.length) return false;
    for (const k of k1) {
      if (o1[k] !== o2[k]) return false;
    }
    return true;
  }

  function pushUndoSnapshot(snapshot = null) {
    if (isPerformingUndoRedo) return;
    const snap = snapshot || createSnapshot();
    if (undoStack.length > 0 && areSnapshotsEqual(undoStack[undoStack.length - 1], snap)) {
      return;
    }
    undoStack.push(snap);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  }

  function performUndo() {
    if (isTypingBurst) {
      isTypingBurst = false;
      clearTimeout(typingBurstTimer);
    }
    if (editingBadgeIndex !== null) {
      cancelBadgeEdit();
    }
    if (undoStack.length === 0) {
      showToast('Rien à annuler');
      return;
    }

    const currentState = createSnapshot();
    redoStack.push(currentState);
    if (redoStack.length > MAX_HISTORY) redoStack.shift();

    const previousState = undoStack.pop();
    isPerformingUndoRedo = true;
    try {
      lines = previousState.lines.slice();
      if (currentSong) {
        currentSong.overrides = { ...previousState.overrides };
        currentSong.content = lines.join('\n');
      }
      activeLineIndex = previousState.activeLineIndex !== null
        ? Math.min(Math.max(0, previousState.activeLineIndex), lines.length - 1)
        : 0;
      scheduleAutoSave();
      renderAllLines(activeLineIndex, previousState.caretPos);
      showToast('Annuler (Ctrl+Z)');
    } finally {
      isPerformingUndoRedo = false;
    }
  }

  function performRedo() {
    if (isTypingBurst) {
      isTypingBurst = false;
      clearTimeout(typingBurstTimer);
    }
    if (editingBadgeIndex !== null) {
      cancelBadgeEdit();
    }
    if (redoStack.length === 0) {
      showToast('Rien à rétablir');
      return;
    }

    const currentState = createSnapshot();
    undoStack.push(currentState);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();

    const nextState = redoStack.pop();
    isPerformingUndoRedo = true;
    try {
      lines = nextState.lines.slice();
      if (currentSong) {
        currentSong.overrides = { ...nextState.overrides };
        currentSong.content = lines.join('\n');
      }
      activeLineIndex = nextState.activeLineIndex !== null
        ? Math.min(Math.max(0, nextState.activeLineIndex), lines.length - 1)
        : 0;
      scheduleAutoSave();
      renderAllLines(activeLineIndex, nextState.caretPos);
      showToast('Rétablir (Ctrl+Y)');
    } finally {
      isPerformingUndoRedo = false;
    }
  }

  function scheduleAutoSave() {
    if (saveIndicator) {
      saveIndicator.classList.add('saving');
      saveText.textContent = 'Enregistrement...';
    }
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (currentSong) {
        currentSong.title = songTitleInput.value.trim() || 'Sans titre';
        currentSong.content = lines.join('\n');
        currentSong.updatedAt = Date.now();
        saveSongs();
      }
    }, 400);
  }

  function showSaveStatus(success) {
    if (saveIndicator) {
      saveIndicator.classList.remove('saving');
      saveText.textContent = success ? 'Enregistré' : 'Erreur';
    }
  }

  function showToast(msg) {
    if (!toastNotification || !toastMessage) return;
    toastMessage.textContent = msg;
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2500);
  }

  function commitTypingAndSnapshot() {
    isTypingBurst = false;
    clearTimeout(typingBurstTimer);
    pushUndoSnapshot();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildBreakdownChipsHtml(words) {
    if (!words || !words.length) return '';
    return words.map((w, idx) => {
      const extraClass = w.isAcronym ? 'acronym' : (w.isNumber ? 'number' : '');
      const dot = idx < words.length - 1 ? '<span class="chip-dot">·</span>' : '';
      return `<div class="word-chip ${extraClass}"><span class="chip-token">${escapeHtml(w.hyphenated || w.token)}</span><span class="chip-count">${w.count}</span></div>${dot}`;
    }).join('');
  }

  // --- Line-by-Line Document Rendering ---
  function renderAllLines(focusIndex = null, caretPos = null) {
    if (!editorLinesContainer) return;

    const overrides = currentSong.overrides || {};
    let totalLinesCount = 0;
    let totalSyllablesCount = 0;

    let html = '';

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNum = i + 1;
      const isActive = (i === activeLineIndex);
      const isTag = /^\[[^\]]+\]$/.test(lineText.trim());

      let syllableResult = null;
      let count = 0;

      if (lineText.trim().length > 0 && !isTag) {
        totalLinesCount++;
        if (overrides[i] !== undefined) {
          count = overrides[i];
        } else {
          syllableResult = LyrrSyllables.countLineSyllables(lineText, MODE);
          count = syllableResult.total;
        }
        totalSyllablesCount += count;
      }

      // Mark meter as empty if 0 syllables calculated
      const meterClass = (count === 0) ? 'empty' : '';

      // Syllable breakdown: active line only, when non-empty, not a section tag, and showBreakdown is true
      let breakdownHtml = '';
      if (showBreakdown && isActive && lineText.trim().length > 0 && !isTag) {
        if (!syllableResult) {
          syllableResult = LyrrSyllables.countLineSyllables(lineText, MODE);
        }
        breakdownHtml = `
          <div class="line-breakdown">
            <div class="breakdown-chips">${buildBreakdownChipsHtml(syllableResult.words)}</div>
          </div>
        `;
      }

      const rowActiveClass = isActive ? 'active' : '';
      const inputWidth = Math.max(80, Math.round(measureTextWidth(lineText)) + 24);
      const inputExtraClass = isTag ? 'section-tag-input' : '';

      let badgeHtml = '';
      if (isTag) {
        badgeHtml = `<span class="syllable-badge tag-badge" title="Tag de structure">TAG</span>`;
      } else if (editingBadgeIndex === i) {
        badgeHtml = `
          <input type="text" 
                 class="badge-edit-input" 
                 data-line="${i}" 
                 value="${count > 0 ? count : ''}" 
                 maxlength="3" 
                 autocomplete="off" 
                 spellcheck="false" 
                 title="Entrée pour valider, Échap pour annuler">
        `;
      } else {
        const badgeTitle = count > 0 
          ? `${count} pieds (clic pour modifier)` 
          : 'Clic pour fixer les pieds';
        badgeHtml = `
          <span class="syllable-badge ${meterClass}" data-line="${i}" title="${badgeTitle}">
            ${count > 0 ? count : ''}
          </span>
        `;
      }

      html += `
        <div class="line-row ${rowActiveClass}" data-index="${i}">
          <div class="line-gutter">
            ${badgeHtml}
          </div>
          <div class="line-main">
            <input type="text" class="line-input ${inputExtraClass}" data-index="${i}" style="width: ${inputWidth}px;" value="${escapeHtml(lineText)}" spellcheck="false" autocomplete="off" placeholder="${i === 0 ? 'Écris tes lyrics ici...' : ''}">
            ${breakdownHtml}
          </div>
        </div>
      `;
    }

    editorLinesContainer.innerHTML = html;

    // Update global statistics
    updateGlobalStats();

    // Restore focus (priority to gutter badge input if currently active)
    if (editingBadgeIndex !== null) {
      const badgeInput = editorLinesContainer.querySelector(`.badge-edit-input[data-line="${editingBadgeIndex}"]`);
      if (badgeInput) {
        badgeInput.focus();
        badgeInput.select();
      }
    } else if (focusIndex !== null) {
      const targetInput = editorLinesContainer.querySelector(`.line-input[data-index="${focusIndex}"]`);
      if (targetInput) {
        targetInput.focus();
        if (caretPos !== null) {
          const safePos = Math.min(caretPos, targetInput.value.length);
          targetInput.setSelectionRange(safePos, safePos);
        }
      }
    }
  }

  // --- Active Line Focus Management ---
  function setActiveLine(index, forceCaretPos = null) {
    if (activeLineIndex === index && forceCaretPos === null) return;
    activeLineIndex = index;
    renderAllLines(index, forceCaretPos);
  }

  // --- Direct Inline Syllable Badge Edit & Commit ---
  function commitBadgeEdit(lineIndex, rawVal) {
    if (editingBadgeIndex === null && rawVal === undefined) return;
    editingBadgeIndex = null;

    const trimmed = (rawVal !== undefined && rawVal !== null ? String(rawVal) : '').trim();

    if (trimmed === '') {
      // If input is empty: clear manual override to restore automatic syllable counting
      if (currentSong && currentSong.overrides && currentSong.overrides[lineIndex] !== undefined) {
        pushUndoSnapshot();
        delete currentSong.overrides[lineIndex];
        scheduleAutoSave();
        showToast(`Ligne ${lineIndex + 1} : calcul automatique rétabli`);
      }
    } else {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val) && val >= 0) {
        if (!currentSong.overrides) currentSong.overrides = {};
        if (currentSong.overrides[lineIndex] !== val) {
          pushUndoSnapshot();
          currentSong.overrides[lineIndex] = val;
          scheduleAutoSave();
          showToast(`Ligne ${lineIndex + 1} fixée à ${val} pieds`);
        }
      }
    }

    const currentLineLen = (lines[lineIndex] || '').length;
    renderAllLines(lineIndex, currentLineLen);
  }

  function cancelBadgeEdit() {
    if (editingBadgeIndex === null) return;
    const prevLine = editingBadgeIndex;
    editingBadgeIndex = null;
    const currentLineLen = (lines[prevLine] || '').length;
    renderAllLines(prevLine, currentLineLen);
  }

  // --- Global Stats Calculation ---
  function updateGlobalStats() {
    let totalLinesCount = 0;
    let totalSyllablesCount = 0;
    const overrides = (currentSong && currentSong.overrides) ? currentSong.overrides : {};

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (lineText.trim().length > 0) totalLinesCount++;
      if (/^\[.*\]$/.test(lineText.trim())) continue;

      if (overrides[i] !== undefined) {
        totalSyllablesCount += overrides[i];
      } else if (lineText.trim().length > 0) {
        totalSyllablesCount += LyrrSyllables.countLineSyllables(lineText, MODE).total;
      }
    }

    statLineCount.textContent = totalLinesCount;
    statSyllableCount.textContent = totalSyllablesCount;
    const avg = totalLinesCount > 0 ? (totalSyllablesCount / totalLinesCount).toFixed(1) : '0';
    statAvgCount.textContent = avg;
  }

  // --- Line Editor Event Listeners & Shortcuts ---
  function initEditorEvents() {
    // Focus in on a line text input
    editorLinesContainer.addEventListener('focusin', (e) => {
      const input = e.target.closest('.line-input');
      if (input) {
        const index = parseInt(input.dataset.index, 10);
        if (activeLineIndex !== index) {
          const caret = input.selectionStart;
          setActiveLine(index, caret);
        }
      }
    });

    function updateLineVisuals(input, index, lineText) {
      lines[index] = lineText;
      input.value = lineText;
      scheduleAutoSave();

      // Instantly adjust input width to content length
      const inputWidth = Math.max(80, Math.round(measureTextWidth(lineText)) + 24);
      input.style.width = inputWidth + 'px';

      const isTag = /^\[.*\]$/.test(lineText.trim());
      input.classList.toggle('section-tag-input', isTag);

      const syllableResult = LyrrSyllables.countLineSyllables(lineText, MODE);
      let count = syllableResult.total;
      if (currentSong && currentSong.overrides && currentSong.overrides[index] !== undefined) {
        count = currentSong.overrides[index];
      }

      // Update left gutter syllable badge
      const row = input.closest('.line-row');
      if (row && editingBadgeIndex !== index) {
        const badge = row.querySelector('.syllable-badge');
        if (badge) {
          if (isTag) {
            badge.className = 'syllable-badge tag-badge';
            badge.textContent = 'TAG';
            badge.title = 'Tag de structure';
          } else {
            const meterClass = (count === 0) ? 'empty' : '';
            badge.className = `syllable-badge ${meterClass}`.trim();
            badge.textContent = count > 0 ? count : '';
            badge.title = count > 0 ? `${count} pieds (clic pour modifier)` : 'Clic pour fixer les pieds';
          }
        }
      }

      // Update syllable breakdown tokens on the right
      if (row) {
        const main = row.querySelector('.line-main');
        if (main) {
          let breakdownEl = main.querySelector('.line-breakdown');
          if (showBreakdown && lineText.trim().length > 0 && !isTag) {
            const chipsHtml = buildBreakdownChipsHtml(syllableResult.words);
            if (!breakdownEl) {
              breakdownEl = document.createElement('div');
              breakdownEl.className = 'line-breakdown';
              main.appendChild(breakdownEl);
            }
            breakdownEl.innerHTML = `<div class="breakdown-chips">${chipsHtml}</div>`;
          } else if (breakdownEl) {
            breakdownEl.remove();
          }
        }
      }

      updateGlobalStats();
    }

    // Real-time text input (stable, smooth, jitter-free)
    editorLinesContainer.addEventListener('input', (e) => {
      const input = e.target.closest('.line-input');
      if (!input) return;

      const index = parseInt(input.dataset.index, 10);

      // Manage typing burst for undo history snapshotting
      if (!isTypingBurst) {
        pushUndoSnapshot();
        isTypingBurst = true;
      }
      clearTimeout(typingBurstTimer);
      typingBurstTimer = setTimeout(() => {
        isTypingBurst = false;
      }, 700);

      updateLineVisuals(input, index, input.value);
    });

    function shiftOverrides(fromIndex, delta) {
      if (!currentSong || !currentSong.overrides) return;
      const newOverrides = {};
      for (const [k, v] of Object.entries(currentSong.overrides)) {
        const ki = parseInt(k, 10);
        if (ki <= fromIndex) newOverrides[ki] = v;
        else newOverrides[ki + delta] = v;
      }
      currentSong.overrides = newOverrides;
    }

    function removeOverrideAndShift(removedIndex) {
      if (!currentSong || !currentSong.overrides) return;
      const newOverrides = {};
      for (const [k, v] of Object.entries(currentSong.overrides)) {
        const ki = parseInt(k, 10);
        if (ki < removedIndex) newOverrides[ki] = v;
        else if (ki > removedIndex) newOverrides[ki - 1] = v;
      }
      currentSong.overrides = newOverrides;
    }

    // Keyboard navigation and editor shortcuts
    editorLinesContainer.addEventListener('keydown', (e) => {
      // Case 1: Direct interaction inside gutter badge edit input
      const badgeInput = e.target.closest('.badge-edit-input');
      if (badgeInput) {
        const lineIndex = parseInt(badgeInput.dataset.line, 10);

        if (e.key === 'Enter') {
          e.preventDefault();
          commitBadgeEdit(lineIndex, badgeInput.value);
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          cancelBadgeEdit();
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const currentVal = parseInt(badgeInput.value || '0', 10);
          badgeInput.value = currentVal + 1;
          badgeInput.select();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const currentVal = parseInt(badgeInput.value || '0', 10);
          badgeInput.value = Math.max(0, currentVal - 1);
          badgeInput.select();
          return;
        }

        // Allow only digits 0-9 and common control/navigation keys
        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
          e.preventDefault();
        }
        return;
      }

      // Case 2: Regular line input interaction
      const input = e.target.closest('.line-input');
      if (!input) return;

      const index = parseInt(input.dataset.index, 10);
      const val = input.value;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      // ======================================================================
      // UNDO / REDO (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
      // ======================================================================
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const isZ = (e.key === 'z' || e.key === 'Z');
        const isY = (e.key === 'y' || e.key === 'Y');

        if (isZ && !e.shiftKey) {
          e.preventDefault();
          performUndo();
          return;
        }

        if (isY || (isZ && e.shiftKey)) {
          e.preventDefault();
          performRedo();
          return;
        }
      }

      // Space key: commit current typing burst for next undo
      if (e.key === ' ') {
        isTypingBurst = false;
        clearTimeout(typingBurstTimer);
      }

      // ======================================================================
      // QUICK KEYBOARD SHORTCUTS (Structure tags, Ad-libs, Editing)
      // ======================================================================

      // ALT + Top-row number keys (AZERTY: &, é, ", ', (, - | QWERTY: 1..6)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        let tag = null;

        const isKey1 = (e.code === 'Digit1' || e.key === '&' || e.key === '1') && e.code !== 'Numpad1';
        const isKey2 = (e.code === 'Digit2' || e.key === 'é' || e.key === 'É' || e.key === '2') && e.code !== 'Numpad2';
        const isKey3 = (e.code === 'Digit3' || e.key === '"' || e.key === '3') && e.code !== 'Numpad3';
        const isKey4 = (e.code === 'Digit4' || e.key === '\'' || e.key === '4') && e.code !== 'Numpad4';
        const isKey5 = (e.code === 'Digit5' || e.key === '(' || e.key === '5') && e.code !== 'Numpad5';
        const isKey6 = (e.code === 'Digit6' || e.key === '-' || e.key === '6') && e.code !== 'Numpad6';

        if (isKey1) {
          // Count existing verses for auto-increment [Couplet 1], [Couplet 2]...
          let coupletCount = 0;
          for (let c = 0; c < lines.length; c++) {
            if (/^\[Couplet(?:\s+(\d+))?/i.test(lines[c].trim())) coupletCount++;
          }
          tag = coupletCount > 0 ? `[Couplet ${coupletCount + 1}]` : '[Couplet 1]';
        } else if (isKey2) {
          tag = '[Refrain]';
        } else if (isKey3) {
          tag = '[Pré]';
        } else if (isKey4) {
          tag = '[Pont]';
        } else if (isKey5) {
          tag = (start < end) ? null : '[Intro]';
        } else if (isKey6) {
          tag = '[Outro]';
        }

        if (tag) {
          e.preventDefault();
          commitTypingAndSnapshot();

          if (!val.trim()) {
            // Empty line: becomes section tag and inserts an empty line below ready to write
            lines[index] = tag;
            lines.splice(index + 1, 0, '');
            shiftOverrides(index, 1);
            scheduleAutoSave();
            renderAllLines(index + 1, 0);
          } else {
            // Non-empty line: inserts section tag above current line
            lines.splice(index, 0, tag);
            shiftOverrides(index - 1, 1);
            scheduleAutoSave();
            renderAllLines(index + 1, start);
          }
          showToast(`${tag} inséré !`);
          return;
        }
      }

      // ALT + A: Format as Ad-lib (wrap in parentheses)
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        commitTypingAndSnapshot();
        if (start < end) {
          const selected = val.slice(start, end);
          const wrapped = `(${selected})`;
          const newText = val.slice(0, start) + wrapped + val.slice(end);
          updateLineVisuals(input, index, newText);
          input.setSelectionRange(start + 1, end + 1);
        } else {
          const trimmed = val.trim();
          let newText = '';
          if (!trimmed) {
            newText = '()';
          } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            newText = trimmed.slice(1, -1).trim();
          } else {
            newText = `(${trimmed})`;
          }
          updateLineVisuals(input, index, newText);
          input.setSelectionRange(newText.length, newText.length);
        }
        showToast('Ad-lib formaté ( ) !');
        return;
      }

      // '(' or ')' Key: Auto-wrap selection with ( ) or Auto-close () (VS Code style)
      const isParenKey = (e.key === '(' || e.key === ')');
      if (isParenKey && !e.ctrlKey && !e.metaKey) {
        if (start < end) {
          // Case 1: Text selected -> Auto-wrap selection with ( )
          e.preventDefault();
          commitTypingAndSnapshot();

          const selected = val.slice(start, end);
          const wrapped = `(${selected})`;
          const newText = val.slice(0, start) + wrapped + val.slice(end);

          updateLineVisuals(input, index, newText);
          // Keep inner content selected for immediate visual feedback (VS Code behavior)
          input.setSelectionRange(start + 1, end + 1);
          return;
        } else if (!e.altKey && e.key === '(') {
          // Case 2: No text selected and typed '(' -> Auto-close () with caret inside (|)
          e.preventDefault();
          commitTypingAndSnapshot();

          const newText = val.slice(0, start) + '()' + val.slice(end);
          updateLineVisuals(input, index, newText);
          input.setSelectionRange(start + 1, start + 1);
          return;
        } else if (!e.altKey && e.key === ')' && start === end && val.charAt(start) === ')') {
          // Case 3: Typed ')' right before an existing ')' -> Step over it
          e.preventDefault();
          input.setSelectionRange(start + 1, start + 1);
          return;
        }
      }

      // Backspace between empty parentheses: delete both ()
      if (e.key === 'Backspace' && start === end && start > 0 && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (val.charAt(start - 1) === '(' && val.charAt(start) === ')') {
          e.preventDefault();
          commitTypingAndSnapshot();

          const newText = val.slice(0, start - 1) + val.slice(start + 1);
          updateLineVisuals(input, index, newText);
          input.setSelectionRange(start - 1, start - 1);
          return;
        }
      }

      // ALT + X: Quick repetition (x2) at end of line
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        commitTypingAndSnapshot();
        const trimmed = val.trim();
        if (/\s*\(x2\)$/i.test(trimmed)) {
          lines[index] = trimmed.replace(/\s*\(x2\)$/i, '');
        } else {
          lines[index] = trimmed ? `${trimmed} (x2)` : '(x2)';
        }
        scheduleAutoSave();
        renderAllLines(index, lines[index].length);
        showToast('Répétition (x2) mise à jour !');
        return;
      }

      // ALT + D: Quickly delete current line
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        commitTypingAndSnapshot();
        if (lines.length > 1) {
          lines.splice(index, 1);
          removeOverrideAndShift(index);
          scheduleAutoSave();
          const targetIndex = Math.min(index, lines.length - 1);
          renderAllLines(targetIndex, (lines[targetIndex] || '').length);
          showToast('Ligne supprimée !');
        } else {
          lines[0] = '';
          if (currentSong) currentSong.overrides = {};
          scheduleAutoSave();
          renderAllLines(0, 0);
        }
        return;
      }

      // ALT + Up Arrow: Move line up
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowUp') {
        if (index > 0) {
          e.preventDefault();
          commitTypingAndSnapshot();
          const temp = lines[index];
          lines[index] = lines[index - 1];
          lines[index - 1] = temp;

          if (currentSong && currentSong.overrides) {
            const oCur = currentSong.overrides[index];
            const oPrev = currentSong.overrides[index - 1];
            delete currentSong.overrides[index];
            delete currentSong.overrides[index - 1];
            if (oCur !== undefined) currentSong.overrides[index - 1] = oCur;
            if (oPrev !== undefined) currentSong.overrides[index] = oPrev;
          }

          scheduleAutoSave();
          renderAllLines(index - 1, start);
        }
        return;
      }

      // ALT + Down Arrow: Move line down
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowDown') {
        if (index < lines.length - 1) {
          e.preventDefault();
          commitTypingAndSnapshot();
          const temp = lines[index];
          lines[index] = lines[index + 1];
          lines[index + 1] = temp;

          if (currentSong && currentSong.overrides) {
            const oCur = currentSong.overrides[index];
            const oNext = currentSong.overrides[index + 1];
            delete currentSong.overrides[index];
            delete currentSong.overrides[index + 1];
            if (oCur !== undefined) currentSong.overrides[index + 1] = oCur;
            if (oNext !== undefined) currentSong.overrides[index] = oNext;
          }

          scheduleAutoSave();
          renderAllLines(index + 1, start);
        }
        return;
      }

      // Enter key: Split current line and insert a new line below
      if (e.key === 'Enter') {
        e.preventDefault();
        commitTypingAndSnapshot();
        const left = val.slice(0, start);
        const right = val.slice(end);
        lines[index] = left;
        lines.splice(index + 1, 0, right);
        shiftOverrides(index, 1);
        scheduleAutoSave();
        setActiveLine(index + 1, 0);
        return;
      }

      // Backspace key: If caret is at line start, merge with previous line
      if (e.key === 'Backspace' && start === 0 && end === 0) {
        if (index > 0) {
          e.preventDefault();
          commitTypingAndSnapshot();
          const prevLen = lines[index - 1].length;
          lines[index - 1] += val;
          lines.splice(index, 1);
          removeOverrideAndShift(index);
          scheduleAutoSave();
          setActiveLine(index - 1, prevLen);
        }
        return;
      }

      // Delete key: If caret is at line end, merge with next line
      if (e.key === 'Delete' && start === val.length && end === val.length) {
        if (index < lines.length - 1) {
          e.preventDefault();
          commitTypingAndSnapshot();
          lines[index] += lines[index + 1];
          lines.splice(index + 1, 1);
          removeOverrideAndShift(index + 1);
          scheduleAutoSave();
          renderAllLines(index, start);
        }
        return;
      }

      // Up Arrow: Move to previous line
      if (e.key === 'ArrowUp') {
        if (index > 0) {
          e.preventDefault();
          setActiveLine(index - 1, start);
        }
        return;
      }

      // Down Arrow: Move to next line
      if (e.key === 'ArrowDown') {
        if (index < lines.length - 1) {
          e.preventDefault();
          setActiveLine(index + 1, start);
        }
        return;
      }
    });

    // Multi-line paste handling
    editorLinesContainer.addEventListener('paste', (e) => {
      const input = e.target.closest('.line-input');
      if (!input) return;

      const clipboardData = (e.clipboardData || window.clipboardData);
      if (!clipboardData) return;

      const pastedText = clipboardData.getData('text');
      if (!pastedText || !pastedText.includes('\n')) return; // Allow native single-line paste

      e.preventDefault();
      commitTypingAndSnapshot();
      const index = parseInt(input.dataset.index, 10);
      const val = input.value;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      const pastedLines = pastedText.replace(/\r/g, '').split('\n');
      const leftPart = val.slice(0, start);
      const rightPart = val.slice(end);

      lines[index] = leftPart + pastedLines[0];

      for (let j = 1; j < pastedLines.length; j++) {
        lines.splice(index + j, 0, pastedLines[j]);
      }

      const lastPastedIndex = index + pastedLines.length - 1;
      const targetCaret = lines[lastPastedIndex].length;
      lines[lastPastedIndex] += rightPart;

      scheduleAutoSave();
      setActiveLine(lastPastedIndex, targetCaret);
    });

    // Auto-commit badge edit on blur (click outside badge input)
    editorLinesContainer.addEventListener('focusout', (e) => {
      const badgeInput = e.target.closest('.badge-edit-input');
      if (badgeInput && editingBadgeIndex !== null) {
        const lineIndex = parseInt(badgeInput.dataset.line, 10);
        commitBadgeEdit(lineIndex, badgeInput.value);
      }
    });

    // Click on gutter syllable badge to make it directly editable
    editorLinesContainer.addEventListener('click', (e) => {
      const badge = e.target.closest('.syllable-badge');
      if (badge && badge.dataset.line !== undefined && !badge.classList.contains('tag-badge')) {
        const lineIdx = parseInt(badge.dataset.line, 10);
        if (editingBadgeIndex !== null && editingBadgeIndex !== lineIdx) {
          const prevInput = editorLinesContainer.querySelector('.badge-edit-input');
          if (prevInput) {
            commitBadgeEdit(editingBadgeIndex, prevInput.value);
          }
        }
        editingBadgeIndex = lineIdx;
        activeLineIndex = lineIdx;
        renderAllLines();
      }
    });

    // Editor click handling: clicking anywhere on a line activates edit mode
    editorLinesContainer.addEventListener('mousedown', (e) => {
      // 1. Click on gutter badge or badge edit input: do not interfere
      if (e.target.closest('.syllable-badge') || e.target.closest('.badge-edit-input')) return;

      // If another badge was being edited, commit it first
      if (editingBadgeIndex !== null) {
        const badgeInput = editorLinesContainer.querySelector('.badge-edit-input');
        if (badgeInput) {
          commitBadgeEdit(editingBadgeIndex, badgeInput.value);
        }
      }

      // 2. Click on a line row (text, tokens, or trailing empty space)
      const row = e.target.closest('.line-row');
      if (row) {
        const index = parseInt(row.dataset.index, 10);
        const input = row.querySelector('.line-input');

        // If click wasn't directly on text input (e.g. click in trailing area)
        if (e.target !== input) {
          e.preventDefault();
          if (activeLineIndex !== index) {
            setActiveLine(index, (lines[index] || '').length);
          } else if (input) {
            input.focus();
            const len = (lines[index] || '').length;
            input.setSelectionRange(len, len);
          }
        }
        return;
      }

      // 3. Click in empty space below all lines
      if (lines.length > 0) {
        const lastIndex = lines.length - 1;
        if (activeLineIndex !== lastIndex) {
          setActiveLine(lastIndex, (lines[lastIndex] || '').length);
        } else {
          const lastInput = editorLinesContainer.querySelector(`.line-input[data-index="${lastIndex}"]`);
          if (lastInput) {
            lastInput.focus();
            const len = (lines[lastIndex] || '').length;
            lastInput.setSelectionRange(len, len);
          }
        }
      }
    });

    // Click outside editor: commit badge edit if active
    document.addEventListener('mousedown', (e) => {
      if (!editorLinesContainer.contains(e.target)) {
        if (editingBadgeIndex !== null) {
          const badgeInput = editorLinesContainer.querySelector('.badge-edit-input');
          if (badgeInput) {
            commitBadgeEdit(editingBadgeIndex, badgeInput.value);
          }
        }
      }
    });
  }

  // --- Export & Clipboard ---
  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(successMsg);
  }

  function exportRawLyrics() {
    copyToClipboard(lines.join('\n'), 'Paroles brutes copiées !');
  }

  function exportDetailedLyrics() {
    const overrides = currentSong.overrides || {};
    const formatted = lines.map((line, i) => {
      if (!line.trim()) return '';
      const count = overrides[i] !== undefined 
        ? overrides[i] 
        : LyrrSyllables.countLineSyllables(line, MODE).total;
      return `${line}  [${count}]`;
    }).join('\n');

    copyToClipboard(formatted, 'Paroles avec nombre de pieds copiées !');
  }

  function downloadTxtFile() {
    const title = (songTitleInput.value.trim() || 'lyrics').replace(/[^a-z0-9_-]/gi, '_');
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Fichier ${title}.txt téléchargé !`);
  }

  // --- Projects & Songs Management ---
  function openProjectsModal() {
    renderSongsList();
    projectsModal.classList.add('open');
  }

  function closeProjectsModal() {
    projectsModal.classList.remove('open');
  }

  function renderSongsList() {
    if (!songsListContainer) return;
    let html = '';
    for (const s of songs) {
      const isActive = (s.id === currentSong.id);
      const dateStr = new Date(s.updatedAt || Date.now()).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      const linesCount = (s.content || '').split('\n').filter(l => l.trim()).length;

      html += `
        <div class="song-item ${isActive ? 'active' : ''}" data-id="${s.id}">
          <div class="song-item-info">
            <span class="song-item-title">${escapeHtml(s.title || 'Sans titre')}</span>
            <span class="song-item-date">${linesCount} vers • Modifié le ${dateStr}</span>
          </div>
          ${songs.length > 1 ? `
            <button class="btn-icon-sm btn-delete-song" data-id="${s.id}" title="Supprimer ce texte"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          ` : ''}
        </div>
      `;
    }
    songsListContainer.innerHTML = html;
  }

  function switchSong(songId) {
    const found = songs.find(s => s.id === songId);
    if (!found) return;

    currentSong = found;
    songTitleInput.value = currentSong.title || '';
    lines = (currentSong.content || '').split('\n');
    if (lines.length === 0) lines = [''];
    activeLineIndex = 0;

    undoStack = [];
    redoStack = [];
    isTypingBurst = false;
    clearTimeout(typingBurstTimer);

    renderAllLines(0, 0);
    closeProjectsModal();
    showToast(`Texte chargé : "${currentSong.title}"`);
  }

  function createNewSong() {
    const newSong = {
      id: 'song_' + Date.now(),
      title: 'Nouveau Texte ' + (songs.length + 1),
      content: '',
      overrides: {},
      updatedAt: Date.now()
    };
    songs.unshift(newSong);
    saveSongs();
    switchSong(newSong.id);
  }

  function deleteSong(songId) {
    if (songs.length <= 1) return;
    if (!confirm('Es-tu sûr de vouloir supprimer ce texte ?')) return;

    songs = songs.filter(s => s.id !== songId);
    if (currentSong.id === songId) {
      currentSong = songs[0];
    }
    saveSongs();
    switchSong(currentSong.id);
  }

  // --- Genius Optimizer Delegation (see genius.js) ---
  function formatLyricsGeniusLocal(raw, options) {
    if (typeof LyrrGenius !== 'undefined' && LyrrGenius.formatLyricsGeniusLocal) {
      return LyrrGenius.formatLyricsGeniusLocal(raw, options);
    }
    return { text: raw, stats: {} };
  }

  function setGeniusState(state, outputText = '', stats = null) {
    if (geniusStateEmpty) {
      geniusStateEmpty.style.display = (state === 'empty') ? 'flex' : 'none';
    }

    if (geniusOutputLyrics) {
      geniusOutputLyrics.style.display = (state === 'output') ? 'block' : 'none';
      if (state === 'output') {
        geniusOutputLyrics.textContent = outputText;
      }
    }

    if (geniusOutputTools) {
      geniusOutputTools.style.display = (state === 'output') ? 'flex' : 'none';
    }

    if (geniusOutputCard) {
      if (state === 'output' && outputText) {
        geniusOutputCard.classList.add('has-content');
      } else {
        geniusOutputCard.classList.remove('has-content');
      }
    }

    if (geniusStatsSummary) {
      if (state === 'output' && stats) {
        let summaryHtml = `
          <div class="genius-stat-badge success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Conforme Genius</span></div>
        `;
        if (stats.headersFormatted > 0) {
          summaryHtml += `<div class="genius-stat-badge highlight"><span>${stats.headersFormatted} section${stats.headersFormatted > 1 ? 's' : ''} [ ]</span></div>`;
        }
        if (stats.linesCapitalized > 0) {
          summaryHtml += `<div class="genius-stat-badge"><span>${stats.linesCapitalized} majuscule${stats.linesCapitalized > 1 ? 's' : ''}</span></div>`;
        }
        if (stats.punctuationCleaned > 0) {
          summaryHtml += `<div class="genius-stat-badge"><span>${stats.punctuationCleaned} ponctuation${stats.punctuationCleaned > 1 ? 's' : ''}</span></div>`;
        }
        if (stats.repetitionsExpanded > 0) {
          summaryHtml += `<div class="genius-stat-badge highlight"><span>${stats.repetitionsExpanded} répétition${stats.repetitionsExpanded > 1 ? 's' : ''}</span></div>`;
        }
        if (stats.adlibsCleaned > 0) {
          summaryHtml += `<div class="genius-stat-badge"><span>${stats.adlibsCleaned} ad-lib${stats.adlibsCleaned > 1 ? 's' : ''} ( )</span></div>`;
        }
        if (stats.spellingCorrected > 0) {
          summaryHtml += `<div class="genius-stat-badge highlight"><span>${stats.spellingCorrected} orthographe corrigée${stats.spellingCorrected > 1 ? 's' : ''}</span></div>`;
        }
        geniusStatsSummary.innerHTML = summaryHtml;
        geniusStatsSummary.style.display = 'flex';
      } else {
        geniusStatsSummary.style.display = 'none';
      }
    }
  }

  function switchTab(tabId) {
    if (tabId === 'genius') {
      tabBtnStudio.classList.remove('active');
      tabBtnGenius.classList.add('active');
      tabPaneStudio.classList.remove('active');
      tabPaneGenius.classList.add('active');
    } else {
      tabBtnGenius.classList.remove('active');
      tabBtnStudio.classList.add('active');
      tabPaneGenius.classList.remove('active');
      tabPaneStudio.classList.add('active');
    }
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tabId);
  }

  // --- General Initialization ---
  function init() {
    loadStoredData();
    songTitleInput.value = currentSong.title || '';
    activeLineIndex = 0;

    // Song title auto-save
    songTitleInput.addEventListener('input', scheduleAutoSave);

    // Export dropdown
    btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!exportDropdown.contains(e.target)) {
        exportDropdown.classList.remove('open');
      }
    });

    btnCopyRaw.addEventListener('click', () => {
      exportDropdown.classList.remove('open');
      exportRawLyrics();
    });

    btnCopyDetailed.addEventListener('click', () => {
      exportDropdown.classList.remove('open');
      exportDetailedLyrics();
    });

    btnDownloadTxt.addEventListener('click', () => {
      exportDropdown.classList.remove('open');
      downloadTxtFile();
    });

    btnClearText.addEventListener('click', () => {
      exportDropdown.classList.remove('open');
      if (confirm('Effacer tout le texte de ce projet ?')) {
        pushUndoSnapshot();
        lines = [''];
        if (currentSong) currentSong.overrides = {};
        scheduleAutoSave();
        renderAllLines(0, 0);
      }
    });

    // Projects modal
    btnOpenProjects.addEventListener('click', openProjectsModal);
    btnCloseModal.addEventListener('click', closeProjectsModal);
    projectsModal.addEventListener('click', (e) => {
      if (e.target === projectsModal) closeProjectsModal();
    });

    btnNewSong.addEventListener('click', createNewSong);

    songsListContainer.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete-song');
      if (deleteBtn) {
        e.stopPropagation();
        deleteSong(deleteBtn.dataset.id);
        return;
      }
      const item = e.target.closest('.song-item');
      if (item) {
        switchSong(item.dataset.id);
      }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Global Undo / Redo shortcuts
      const isZ = (e.key === 'z' || e.key === 'Z');
      const isY = (e.key === 'y' || e.key === 'Y');

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (!e.target || e.target.id !== 'geniusInputLyrics') {
          if (isZ && !e.shiftKey) {
            e.preventDefault();
            performUndo();
            return;
          }
          if (isY || (isZ && e.shiftKey)) {
            e.preventDefault();
            performRedo();
            return;
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentSong) {
          currentSong.title = songTitleInput.value.trim() || 'Sans titre';
          currentSong.content = lines.join('\n');
          saveSongs();
          showToast('Enregistré manuellement !');
        }
      } else if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        toggleZenMode();
      } else if (e.key === 'Escape') {
        if (document.body.classList.contains('zen-mode')) {
          document.body.classList.remove('zen-mode');
          showToast('Mode Zen désactivé');
          return;
        }
        // Escape key to close modals and dropdowns
        if (shortcutsModal) shortcutsModal.classList.remove('open');
        if (projectsModal) closeProjectsModal();
        if (exportDropdown) exportDropdown.classList.remove('open');
      }
    });

    // Zen Mode (Fullscreen focus Alt+Z)
    const btnZenMode = document.getElementById('btnZenMode');
    function toggleZenMode() {
      const isZen = document.body.classList.toggle('zen-mode');
      if (isZen) {
        showToast('Mode Zen activé (Échap ou Alt+Z pour quitter)');
      } else {
        showToast('Mode Zen désactivé');
      }
    }
    if (btnZenMode) {
      btnZenMode.addEventListener('click', toggleZenMode);
    }

    // Keyboard Shortcuts Modal
    const btnOpenShortcuts = document.getElementById('btnOpenShortcuts');
    const shortcutsModal = document.getElementById('shortcutsModal');
    const btnCloseShortcutsModal = document.getElementById('btnCloseShortcutsModal');

    if (btnOpenShortcuts && shortcutsModal) {
      btnOpenShortcuts.addEventListener('click', () => {
        shortcutsModal.classList.add('open');
      });
    }

    if (btnCloseShortcutsModal && shortcutsModal) {
      btnCloseShortcutsModal.addEventListener('click', () => {
        shortcutsModal.classList.remove('open');
      });
    }

    if (shortcutsModal) {
      shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
          shortcutsModal.classList.remove('open');
        }
      });
    }

    // Tab navigation
    tabBtnStudio.addEventListener('click', () => switchTab('studio'));
    tabBtnGenius.addEventListener('click', () => switchTab('genius'));
    const savedTab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB) || 'studio';
    switchTab(savedTab);

    // Genius Writing Guide toggle (expanded by default)
    const geniusGuideWrapper = document.getElementById('geniusGuideWrapper');
    const geniusGuideHeader = document.getElementById('geniusGuideHeader');
    const btnGeniusLoadExample = document.getElementById('btnGeniusLoadExample');

    if (geniusGuideHeader && geniusGuideWrapper) {
      geniusGuideHeader.addEventListener('click', (e) => {
        if (e.target.closest('#btnGeniusLoadExample') || e.target.closest('.genius-actions')) return;
        geniusGuideWrapper.classList.toggle('collapsed');
      });
    }

    if (btnGeniusLoadExample) {
      btnGeniusLoadExample.addEventListener('click', (e) => {
        e.stopPropagation();
        const exampleSong = `intro:
yo, tout le monde est la,
on est dans la zone (skrrt)

couplet 1 - booba
j'arrive dans le game, sans faire de bruit
meme si les rues sont sombres, la nuit nous suit
j'suis deja pret pour le combat
qui est la ? personne ne repond...
tout est ecrit, tout est dit (ouh, ouh)

refrain (x2)
on trace notre chemin jusqu'au sommet
jamais on n'oubliera d'ou l'on vient

couplet 2 feat ninho
le temps passe vite mais j'garde le cap
chaque seconde compte sur la map
mon equipe avance pas a pas x2

Refrain`;

        geniusInputLyrics.value = exampleSong;
        if (btnGeniusFormat) btnGeniusFormat.disabled = false;
        showToast('Exemple type chargé dans les paroles brutes !');
      });
    }

    // Syllable breakdown toggle (localStorage persistence)
    const checkShowBreakdown = document.getElementById('checkShowBreakdown');
    if (checkShowBreakdown) {
      const savedBreakdown = localStorage.getItem(STORAGE_KEY_SHOW_BREAKDOWN);
      if (savedBreakdown !== null) {
        showBreakdown = (savedBreakdown === 'true');
        checkShowBreakdown.checked = showBreakdown;
      }
      checkShowBreakdown.addEventListener('change', () => {
        showBreakdown = checkShowBreakdown.checked;
        localStorage.setItem(STORAGE_KEY_SHOW_BREAKDOWN, showBreakdown);
        renderAllLines(activeLineIndex);
        showToast(showBreakdown ? 'Détail des pieds activé' : 'Détail des pieds masqué');
      });
    }

    // Spellcheck toggle (localStorage persistence)
    const checkGeniusSpellcheck = document.getElementById('checkGeniusSpellcheck');
    const STORAGE_KEY_GENIUS_SPELLCHECK = 'lyrr_genius_spellcheck';
    if (checkGeniusSpellcheck) {
      const savedSpell = localStorage.getItem(STORAGE_KEY_GENIUS_SPELLCHECK);
      if (savedSpell !== null) {
        checkGeniusSpellcheck.checked = (savedSpell === 'true');
      }
      checkGeniusSpellcheck.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEY_GENIUS_SPELLCHECK, checkGeniusSpellcheck.checked);
      });
    }

    // Genius Optimizer event handlers
    geniusInputLyrics.addEventListener('keydown', (e) => {
      const isParen = (e.key === '(' || e.key === ')');
      if (isParen && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const start = geniusInputLyrics.selectionStart;
        const end = geniusInputLyrics.selectionEnd;
        if (start < end) {
          e.preventDefault();
          const val = geniusInputLyrics.value;
          const selected = val.slice(start, end);
          geniusInputLyrics.setRangeText(`(${selected})`, start, end, 'select');
          geniusInputLyrics.setSelectionRange(start + 1, end + 1);
          if (btnGeniusFormat) btnGeniusFormat.disabled = false;
        } else if (e.key === '(') {
          e.preventDefault();
          const startPos = geniusInputLyrics.selectionStart;
          geniusInputLyrics.setRangeText('()', startPos, startPos, 'end');
          geniusInputLyrics.setSelectionRange(startPos + 1, startPos + 1);
          if (btnGeniusFormat) btnGeniusFormat.disabled = false;
        } else if (e.key === ')' && geniusInputLyrics.value.charAt(start) === ')') {
          e.preventDefault();
          geniusInputLyrics.setSelectionRange(start + 1, start + 1);
        }
      } else if (e.key === 'Backspace' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const start = geniusInputLyrics.selectionStart;
        const end = geniusInputLyrics.selectionEnd;
        if (start === end && start > 0) {
          const val = geniusInputLyrics.value;
          if (val.charAt(start - 1) === '(' && val.charAt(start) === ')') {
            e.preventDefault();
            geniusInputLyrics.setRangeText('', start - 1, start + 1, 'end');
            geniusInputLyrics.setSelectionRange(start - 1, start - 1);
          }
        }
      }
    });

    geniusInputLyrics.addEventListener('input', () => {
      if (btnGeniusFormat) {
        btnGeniusFormat.disabled = !geniusInputLyrics.value.trim();
      }
    });

    btnGeniusClear.addEventListener('click', () => {
      geniusInputLyrics.value = '';
      setGeniusState('empty');
    });

    btnGeniusImportStudio.addEventListener('click', () => {
      const studioText = lines.join('\n').trim();
      if (!studioText) {
        showToast('Le Studio est vide !');
        return;
      }
      geniusInputLyrics.value = studioText;
      if (btnGeniusFormat) btnGeniusFormat.disabled = false;
      showToast('Paroles importées depuis le Studio !');
    });

    btnGeniusSendToStudio.addEventListener('click', () => {
      const output = geniusOutputLyrics.textContent.trim();
      if (!output) return;
      if (currentSong) {
        pushUndoSnapshot();
        currentSong.content = output;
        lines = output.split('\n');
        if (lines.length === 0) lines = [''];
        saveSongs();
        renderAllLines(0, 0);
        showToast('Paroles transférées vers le Studio !');
        switchTab('studio');
      }
    });

    btnGeniusCopy.addEventListener('click', () => {
      const textToCopy = geniusOutputLyrics.textContent;
      if (!textToCopy) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showGeniusCopied();
        }).catch(() => fallbackCopy(textToCopy));
      } else {
        fallbackCopy(textToCopy);
      }

      function fallbackCopy(val) {
        const ta = document.createElement('textarea');
        ta.value = val;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showGeniusCopied();
      }

      function showGeniusCopied() {
        geniusCopyText.textContent = 'Copié !';
        btnGeniusCopy.classList.add('copied');
        showToast('Format Genius copié dans le presse-papier !');
        setTimeout(() => {
          geniusCopyText.textContent = 'Copier';
          btnGeniusCopy.classList.remove('copied');
        }, 2000);
      }
    });

    // Instant Local Formatting (Senior Genius Engine)
    btnGeniusFormat.addEventListener('click', () => {
      const raw = geniusInputLyrics.value.trim();
      if (!raw) {
        showToast('Collez d\'abord vos paroles brutes.');
        return;
      }
      const enableSpellcheck = checkGeniusSpellcheck ? checkGeniusSpellcheck.checked : true;
      const result = formatLyricsGeniusLocal(raw, { enableSpellcheck });
      setGeniusState('output', result.text, result.stats);
      showToast('Paroles optimisées selon les standards Genius !');
    });

    initEditorEvents();
    renderAllLines(0, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
