/**
 * Lyrr - Studio de Paroles & Compteur de Syllabes
 * Éditeur Ligne-par-Ligne avec ligne de décomposition insérée entre les vers
 */

(function () {
  'use strict';

  // --- Sélecteurs DOM ---
  const editorLinesContainer = document.getElementById('editorLinesContainer');
  const songTitleInput = document.getElementById('songTitleInput');
  const saveIndicator = document.getElementById('saveIndicator');
  const saveText = document.getElementById('saveText');

  // Stats
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

  // Toast
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Tabs Navigation
  const tabBtnStudio = document.getElementById('tabBtnStudio');
  const tabBtnGenius = document.getElementById('tabBtnGenius');
  const tabPaneStudio = document.getElementById('tabPaneStudio');
  const tabPaneGenius = document.getElementById('tabPaneGenius');

  // Genius Optimizer Selectors
  const btnGeniusImportStudio = document.getElementById('btnGeniusImportStudio');
  const btnGeniusClear = document.getElementById('btnGeniusClear');
  const btnGeniusFormat = document.getElementById('btnGeniusFormat');
  const formatBtnText = document.getElementById('formatBtnText');

  const geniusInputLyrics = document.getElementById('geniusInputLyrics');
  const geniusCharCount = document.getElementById('geniusCharCount');

  const geniusOutputTools = document.getElementById('geniusOutputTools');
  const btnGeniusSendToStudio = document.getElementById('btnGeniusSendToStudio');
  const btnGeniusCopy = document.getElementById('btnGeniusCopy');
  const geniusCopyText = document.getElementById('geniusCopyText');

  const geniusOutputCard = document.getElementById('geniusOutputCard');
  const geniusStatsSummary = document.getElementById('geniusStatsSummary');
  const geniusStateEmpty = document.getElementById('geniusStateEmpty');
  const geniusOutputLyrics = document.getElementById('geniusOutputLyrics');

  // --- État de l'application ---
  const STORAGE_KEY = 'lyrr_studio_songs_v3';
  const STORAGE_KEY_GEMINI_KEY = 'lyrr_gemini_api_key';
  const STORAGE_KEY_ACTIVE_TAB = 'lyrr_active_tab';
  const MODE = 'rap';

  // Canvas helper pour mesurer précisément la largeur du texte
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

  const DEFAULT_LYRICS = 
`Je suis heureux
PDG
14
RATP ou FBI
C'est la vie sur le bitume
J'écris mes textes à la plume`;

  // --- Initialisation du stockage local ---
  function loadStoredData() {
    try {
      const rawSongs = localStorage.getItem(STORAGE_KEY) || 
                       localStorage.getItem('lyrr_studio_songs_v2') || 
                       localStorage.getItem('lyrr_studio_songs_v1');
      if (rawSongs) {
        songs = JSON.parse(rawSongs);
      }
    } catch (e) {
      console.warn('Impossible de charger les chansons', e);
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

    // Charger les lignes du projet actif
    lines = (currentSong.content || '').split('\n');
    if (lines.length === 0) lines = [''];
  }

  function saveSongs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
      showSaveStatus(true);
    } catch (e) {
      console.error('Erreur sauvegarde locale', e);
      showSaveStatus(false);
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

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Rendu de l'éditeur ligne par ligne ---
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

      // Couleur du badge de pieds
      let meterClass = '';
      if (count === 0) {
        meterClass = 'empty';
      } else if (count === 8) {
        meterClass = 'meter-8';
      } else if (count === 10) {
        meterClass = 'meter-10';
      } else if (count === 12) {
        meterClass = 'meter-12';
      } else if (count === 16) {
        meterClass = 'meter-16';
      } else if (count < 6) {
        meterClass = 'meter-short';
      }

      // Ligne de décomposition : uniquement sur la ligne active quand elle contient du texte et n'est pas un tag
      let breakdownHtml = '';
      if (isActive && lineText.trim().length > 0 && !isTag) {
        if (!syllableResult) {
          syllableResult = LyrrSyllables.countLineSyllables(lineText, MODE);
        }

        let chipsHtml = '';
        for (const w of syllableResult.words) {
          let extraClass = '';

          if (w.isAcronym) {
            extraClass = 'acronym';
          } else if (w.isNumber) {
            extraClass = 'number';
          }

          chipsHtml += `
            <div class="word-chip ${extraClass}">
              <span class="chip-token">${escapeHtml(w.hyphenated || w.token)}</span>
              <span class="chip-count">${w.count}</span>
            </div>
          `;
        }

        breakdownHtml = `
          <div class="line-breakdown">
            <div class="breakdown-chips">${chipsHtml}</div>
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
            ${breakdownHtml}
            <input type="text" class="line-input ${inputExtraClass}" data-index="${i}" style="width: ${inputWidth}px;" value="${escapeHtml(lineText)}" spellcheck="false" autocomplete="off" placeholder="${i === 0 ? 'Écris tes lyrics ici...' : ''}">
          </div>
        </div>
      `;
    }

    editorLinesContainer.innerHTML = html;

    // Mise à jour des stats globales
    statLineCount.textContent = totalLinesCount;
    statSyllableCount.textContent = totalSyllablesCount;
    const avg = totalLinesCount > 0 ? (totalSyllablesCount / totalLinesCount).toFixed(1) : '0';
    statAvgCount.textContent = avg;

    // Restaurer le focus (priorité à l'input d'édition directe du badge si actif)
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

  // --- Gestion du focus et de la frappe ---
  function setActiveLine(index, forceCaretPos = null) {
    if (activeLineIndex === index && forceCaretPos === null) return;
    activeLineIndex = index;
    renderAllLines(index, forceCaretPos);
  }

  // --- Validation et enregistrement de l'ajustement direct du badge ---
  function commitBadgeEdit(lineIndex, rawVal) {
    if (editingBadgeIndex === null && rawVal === undefined) return;
    editingBadgeIndex = null;

    const trimmed = (rawVal !== undefined && rawVal !== null ? String(rawVal) : '').trim();

    if (trimmed === '') {
      // Si le champ est vidé : on supprime l'override pour rétablir le calcul automatique
      if (currentSong && currentSong.overrides && currentSong.overrides[lineIndex] !== undefined) {
        delete currentSong.overrides[lineIndex];
        scheduleAutoSave();
        showToast(`Ligne ${lineIndex + 1} : calcul automatique rétabli`);
      }
    } else {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val) && val >= 0) {
        if (!currentSong.overrides) currentSong.overrides = {};
        currentSong.overrides[lineIndex] = val;
        scheduleAutoSave();
        showToast(`Ligne ${lineIndex + 1} fixée à ${val} pieds`);
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

  // --- Écouteurs d'événements de l'éditeur ---
  function initEditorEvents() {
    // Focus sur un input de ligne
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

    // Modification du texte d'une ligne
    editorLinesContainer.addEventListener('input', (e) => {
      const input = e.target.closest('.line-input');
      if (input) {
        const index = parseInt(input.dataset.index, 10);
        lines[index] = input.value;
        scheduleAutoSave();
        // Mettre à jour l'affichage en gardant la position du curseur
        const caret = input.selectionStart;
        renderAllLines(index, caret);
      }
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

    // Navigation clavier et raccourcis rapides
    editorLinesContainer.addEventListener('keydown', (e) => {
      // Cas 1 : Interaction directe sur l'input de réglage du badge
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

        // Autoriser uniquement les chiffres 0-9 et les touches de contrôle courantes
        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
          e.preventDefault();
        }
        return;
      }

      // Cas 2 : Interaction sur un input de ligne ordinaire
      const input = e.target.closest('.line-input');
      if (!input) return;

      const index = parseInt(input.dataset.index, 10);
      const val = input.value;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      // ======================================================================
      // RACCOURCIS CLAVIER RAPIDES (Tags de structure, Ad-libs, Édition)
      // ======================================================================

      // ALT + 1..6 : Insertion intelligente de tags de structure
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        let tag = null;
        if (e.key === '1') {
          // Compter les couplets existants pour auto-incrémentation [Couplet 1], [Couplet 2]...
          let coupletCount = 0;
          for (let c = 0; c < lines.length; c++) {
            if (/^\[Couplet(?:\s+(\d+))?/i.test(lines[c].trim())) coupletCount++;
          }
          tag = coupletCount > 0 ? `[Couplet ${coupletCount + 1}]` : '[Couplet 1]';
        } else if (e.key === '2') {
          tag = '[Refrain]';
        } else if (e.key === '3') {
          tag = '[Pré]';
        } else if (e.key === '4') {
          tag = '[Pont]';
        } else if (e.key === '5') {
          tag = '[Intro]';
        } else if (e.key === '6') {
          tag = '[Outro]';
        }

        if (tag) {
          e.preventDefault();
          if (!val.trim()) {
            // Ligne vide : devient le tag, et crée une ligne vide en-dessous prête à écrire
            lines[index] = tag;
            lines.splice(index + 1, 0, '');
            shiftOverrides(index, 1);
            scheduleAutoSave();
            renderAllLines(index + 1, 0);
          } else {
            // Ligne avec texte : insère le tag au-dessus
            lines.splice(index, 0, tag);
            shiftOverrides(index - 1, 1);
            scheduleAutoSave();
            renderAllLines(index + 1, start);
          }
          showToast(`${tag} inséré !`);
          return;
        }
      }

      // ALT + A : Formater en Ad-lib (entourer de parenthèses)
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (start < end) {
          const selected = val.slice(start, end);
          const wrapped = `(${selected})`;
          lines[index] = val.slice(0, start) + wrapped + val.slice(end);
          scheduleAutoSave();
          renderAllLines(index, start + wrapped.length);
        } else {
          const trimmed = val.trim();
          if (!trimmed) {
            lines[index] = '()';
            scheduleAutoSave();
            renderAllLines(index, 1);
          } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            lines[index] = trimmed.slice(1, -1).trim();
            scheduleAutoSave();
            renderAllLines(index, lines[index].length);
          } else {
            lines[index] = `(${trimmed})`;
            scheduleAutoSave();
            renderAllLines(index, lines[index].length);
          }
        }
        showToast('Ad-lib formaté ( ) !');
        return;
      }

      // TOUCHE '(' : si du texte est sélectionné, entourer automatiquement (style VS Code)
      if (e.key === '(' && start < end && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const selected = val.slice(start, end);
        const wrapped = `(${selected})`;
        lines[index] = val.slice(0, start) + wrapped + val.slice(end);
        scheduleAutoSave();
        renderAllLines(index, start + wrapped.length);
        return;
      }

      // ALT + X : Répétition rapide (x2) en fin de ligne
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
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

      // ALT + D : Supprimer rapidement la ligne courante
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (lines.length > 1) {
          lines.splice(index, 1);
          if (currentSong && currentSong.overrides) {
            const newOverrides = {};
            for (const [k, v] of Object.entries(currentSong.overrides)) {
              const ki = parseInt(k, 10);
              if (ki < index) newOverrides[ki] = v;
              else if (ki > index) newOverrides[ki - 1] = v;
            }
            currentSong.overrides = newOverrides;
          }
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

      // ALT + FLÈCHE HAUT : monter la ligne
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowUp') {
        if (index > 0) {
          e.preventDefault();
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

      // ALT + FLÈCHE BAS : descendre la ligne
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowDown') {
        if (index < lines.length - 1) {
          e.preventDefault();
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

      // TOUCHE ENTRÉE : couper la ligne et créer une nouvelle ligne en-dessous
      if (e.key === 'Enter') {
        e.preventDefault();
        const left = val.slice(0, start);
        const right = val.slice(end);
        lines[index] = left;
        lines.splice(index + 1, 0, right);
        shiftOverrides(index, 1);
        scheduleAutoSave();
        setActiveLine(index + 1, 0);
        return;
      }

      // TOUCHE RETOUR ARRIÈRE (Backspace) : si au début de la ligne, fusionner avec la ligne précédente
      if (e.key === 'Backspace' && start === 0 && end === 0) {
        if (index > 0) {
          e.preventDefault();
          const prevLen = lines[index - 1].length;
          lines[index - 1] += val;
          lines.splice(index, 1);

          // Réajuster les overrides
          if (currentSong.overrides) {
            const newOverrides = {};
            for (const [k, v] of Object.entries(currentSong.overrides)) {
              const ki = parseInt(k, 10);
              if (ki < index) newOverrides[ki] = v;
              else if (ki > index) newOverrides[ki - 1] = v;
            }
            currentSong.overrides = newOverrides;
          }

          scheduleAutoSave();
          setActiveLine(index - 1, prevLen);
        }
        return;
      }

      // TOUCHE SUPPR (Delete) : si à la fin de la ligne, fusionner avec la ligne suivante
      if (e.key === 'Delete' && start === val.length && end === val.length) {
        if (index < lines.length - 1) {
          e.preventDefault();
          lines[index] += lines[index + 1];
          lines.splice(index + 1, 1);

          if (currentSong.overrides) {
            const newOverrides = {};
            for (const [k, v] of Object.entries(currentSong.overrides)) {
              const ki = parseInt(k, 10);
              if (ki <= index) newOverrides[ki] = v;
              else if (ki > index + 1) newOverrides[ki - 1] = v;
            }
            currentSong.overrides = newOverrides;
          }

          scheduleAutoSave();
          renderAllLines(index, start);
        }
        return;
      }

      // FLÈCHE HAUT : monter à la ligne du dessus
      if (e.key === 'ArrowUp') {
        if (index > 0) {
          e.preventDefault();
          setActiveLine(index - 1, start);
        }
        return;
      }

      // FLÈCHE BAS : descendre à la ligne du dessous
      if (e.key === 'ArrowDown') {
        if (index < lines.length - 1) {
          e.preventDefault();
          setActiveLine(index + 1, start);
        }
        return;
      }
    });

    // COLLER DU TEXTE MULTI-LIGNES
    editorLinesContainer.addEventListener('paste', (e) => {
      const input = e.target.closest('.line-input');
      if (!input) return;

      const clipboardData = (e.clipboardData || window.clipboardData);
      if (!clipboardData) return;

      const pastedText = clipboardData.getData('text');
      if (!pastedText || !pastedText.includes('\n')) return; // Laisser le comportement par défaut si une seule ligne

      e.preventDefault();
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

    // Validation automatique lors du blur (clic ailleurs) de l'input d'édition du badge
    editorLinesContainer.addEventListener('focusout', (e) => {
      const badgeInput = e.target.closest('.badge-edit-input');
      if (badgeInput && editingBadgeIndex !== null) {
        const lineIndex = parseInt(badgeInput.dataset.line, 10);
        commitBadgeEdit(lineIndex, badgeInput.value);
      }
    });

    // Clic sur le badge de la marge pour le rendre éditable directement
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

    // Clic pour fermer la ligne de pieds si on clique à droite de l'éditeur ou dans une zone vide
    editorLinesContainer.addEventListener('mousedown', (e) => {
      // 1. Clic sur un badge dans la marge ou sur l'input d'édition : ne pas fermer
      if (e.target.closest('.syllable-badge') || e.target.closest('.badge-edit-input')) return;

      // 2. Clic sur la ligne de décomposition : garder ouvert
      if (e.target.closest('.line-breakdown')) return;

      // Si un badge était en cours d'édition et qu'on clique ailleurs
      if (editingBadgeIndex !== null) {
        const badgeInput = editorLinesContainer.querySelector('.badge-edit-input');
        if (badgeInput) {
          commitBadgeEdit(editingBadgeIndex, badgeInput.value);
        }
      }

      // 3. Clic sur un input de texte
      const input = e.target.closest('.line-input');
      if (input) {
        const textWidth = measureTextWidth(input.value);
        // Si le clic se trouve à droite du texte (au-delà du texte + marge de 25px)
        if (e.offsetX > textWidth + 25) {
          e.preventDefault();
          input.blur();
          if (activeLineIndex !== null) {
            activeLineIndex = null;
            renderAllLines();
          }
          return;
        }
        return;
      }

      // 4. Clic à droite du texte (dans .line-main ou .line-row) ou en-dessous dans l'espace vide
      if (activeLineIndex !== null) {
        e.preventDefault();
        activeLineIndex = null;
        renderAllLines();
      }
    });

    // Clic en-dehors de l'éditeur : valide l'édition en cours et referme la décomposition
    document.addEventListener('mousedown', (e) => {
      if (!editorLinesContainer.contains(e.target)) {
        if (editingBadgeIndex !== null) {
          const badgeInput = editorLinesContainer.querySelector('.badge-edit-input');
          if (badgeInput) {
            commitBadgeEdit(editingBadgeIndex, badgeInput.value);
          }
        }
        if (activeLineIndex !== null) {
          activeLineIndex = null;
          renderAllLines();
        }
      }
    });
  }

  // --- Exportation & Copie ---
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

  // --- Gestion des Projets / Chansons ---
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
            <button class="btn-icon-sm btn-delete-song" data-id="${s.id}" title="Supprimer ce texte">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
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

  // --- Genius Lyrics Optimizer Logic (100% Local & Instant) ---
  const GENIUS_SECTION_MAP = [
    { match: /^(intro|introduction)/i, label: 'Intro', isRefrain: false },
    { match: /^(outro|conclusion|fin)/i, label: 'Outro', isRefrain: false },
    { match: /^(pr[ée]-?refrain|pre-?chorus|pr[ée]-?hook|prerefrain|prechorus)/i, label: 'Pré-refrain', isRefrain: false },
    { match: /^(post-?refrain|post-?chorus|post-?hook|postrefrain|postchorus)/i, label: 'Post-refrain', isRefrain: false },
    { match: /^(refrain|chorus|hook)/i, label: 'Refrain', isRefrain: true },
    { match: /^(pont|bridge|transition)/i, label: 'Pont', isRefrain: false },
    { match: /^(couplet|verse|strophe|partie)/i, label: 'Couplet', isRefrain: false },
    { match: /^(interlude|skit)/i, label: 'Interlude', isRefrain: false },
    { match: /^(break|breakdown|drop)/i, label: 'Break', isRefrain: false },
    { match: /^(solo(?:\s+(?:guitare|piano|sax))?)/i, label: 'Solo', isRefrain: false }
  ];

  function toTitleCase(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function formatArtistName(artistStr) {
    if (!artistStr) return '';
    return artistStr.trim().split(/\s+/).map(w => {
      // Préserver les acronymes courts d'artistes (SCH, PLK, RK, NTM, 13...)
      if (w.toUpperCase() === w && w.length <= 4) return w;
      return toTitleCase(w);
    }).join(' ');
  }

  function identifyGeniusHeader(lineStr) {
    let text = lineStr.trim();
    if (!text) return null;

    // Retirer décorations
    text = text.replace(/^[-=~*#_]+\s*/, '').replace(/\s*[-=~*#_]+$/, '').trim();
    // Retirer numérotation de début (ex: "1. Intro", "2) Couplet")
    text = text.replace(/^\d+[\.\)\-]\s+/, '').trim();

    const hasEnclosing = (/^\[.*\]$/.test(text)) || (/^\(.*\)$/.test(text));
    let content = text.replace(/^[\[\(]\s*/, '').replace(/\s*[\]\)]$/, '').trim();

    let mult = 1;
    const multRegex = /\s*\(?(?:x\s*(\d+)|repeat\s*x?\s*(\d+)|\*(\d+)|bis)\)?\.?$/i;
    const multMatch = content.match(multRegex);
    if (multMatch) {
      mult = parseInt(multMatch[1] || multMatch[2] || multMatch[3] || '2', 10);
      content = content.replace(multRegex, '').trim();
    }

    let secPart = content;
    let artistPart = '';

    const artistSplitRegex = /^(.*?)(?:\s*(?:[:\-|–—]|feat\.?|ft\.?)\s*|\s+\()([^\)]+)\)?$/i;
    const splitMatch = content.match(artistSplitRegex);
    if (splitMatch && splitMatch[1] && splitMatch[2]) {
      const p1 = splitMatch[1].trim();
      const p2 = splitMatch[2].trim().replace(/\)$/, '');
      const isKnown = GENIUS_SECTION_MAP.some(s => s.match.test(p1));
      if (isKnown) {
        secPart = p1;
        artistPart = p2;
      }
    }

    let matchedDef = null;
    for (const sec of GENIUS_SECTION_MAP) {
      if (sec.match.test(secPart)) {
        matchedDef = sec;
        break;
      }
    }

    if (!matchedDef) {
      if (hasEnclosing && content.length <= 45 && !/[.!?]/.test(content)) {
        const cleanCustom = content.charAt(0).toUpperCase() + content.slice(1);
        return {
          formatted: `[${cleanCustom}]`,
          multiplier: mult,
          isRefrain: /refrain|chorus|hook/i.test(cleanCustom)
        };
      }
      return null;
    }

    const numMatch = secPart.match(/\b(\d+)\b/);
    let finalLabel = matchedDef.label;
    if (numMatch && (matchedDef.label === 'Couplet' || matchedDef.label === 'Partie')) {
      finalLabel += ` ${numMatch[1]}`;
    }

    if (artistPart) {
      finalLabel += ` : ${formatArtistName(artistPart)}`;
    }

    return {
      formatted: `[${finalLabel}]`,
      multiplier: mult,
      isRefrain: matchedDef.isRefrain
    };
  }

  // Whitelist de termes d'argot, verlan, street, US trap/drill, interjections à préserver impérativement
  const SLANG_WHITELIST = new Set([
    'wesh', 'binks', 'bicrave', 'bicraver', 'gadji', 'gadjo', 'reuf', 'reufré', 'reum', 'reup',
    'daron', 'daronne', 'kiffer', 'kiff', 'kiffe', 'zbeul', 'tarpin', 'peuf', 'ter-ter', 'charbon',
    'charbonner', 'charbonne', 'caler', 'hess', 'zer', 'iencli', 'ien-cli', 'beuh', 'meuf', 'keuf',
    'teubé', 'relou', 'chelou', 'vénère', 'chanmé', 'zarbi', 'bédo', 'bedo', 'seum', 'kho', 'khoya',
    'fréro', 'frérot', 'frero', 'frerot', 'moula', 'mola', 'go', 'bae', 'tipeu', 'narvalo', 'taga',
    'teh', 'chouf', 'chouffe', 'shmeta', 'condé', 'conde', 'tise', 'tiser', 'taff', 'taffer', 'brolik',
    'bécanne', 'becanne', 'gamos', 'pilon', 'pera', 'pe-ra', 'zik', 'dégun', 'degun', 'fada', 'skeu',
    'cimer', 'poucave', 'zgeg', 'chicha', 'boulot', 'blaze', 'oseille', 'flouze', 'pèze', 'peze',
    'maille', 'lovés', 'loves', 'biff', 'gun', 'schlass', 'beurette', 'babtou', 'renoi', 'céfran',
    'cefran', 'keus', 'pécho', 'pecho', 'choppé', 'choppe', 'calba',
    'skrrt', 'skrt', 'draco', 'drip', 'sauce', 'ops', 'opps', 'shawty', 'flex', 'flexer',
    'trap', 'trappeur', 'plug', 'gang', 'hood', 'bro', 'homie', 'goat', 'chill', 'chillin', 'vibe',
    'flow', 'beat', 'drill', 'feat', 'ft', 'fade', 'cash', 'racks', 'stack', 'bad', 'mood', 'bitch',
    'hustle', 'game', 'mic', 'drop', 'cliqua', 'squad', 'beef', 'spin', 'glide', 'slide', 'cap',
    'glock', 'choppa', 'lean', 'weed', 'blunt', 'joint', 'dope', 'ice', 'chain', 'grillz',
    'ouais', 'nan', 'nah', 'nope', 'yep', 'yo', 'yeah', 'skkrt', 'brrr', 'grrr', 'bang', 'paw'
  ]);

  const WORD_SPELL_MAP = {
    'deja': 'déjà',
    'déja': 'déjà',
    'dejà': 'déjà',
    'meme': 'même',
    'memes': 'mêmes',
    'tres': 'très',
    'etre': 'être',
    'bientot': 'bientôt',
    'plutot': 'plutôt',
    'aussitot': 'aussitôt',
    'apres': 'après',
    'pres': 'près',
    'pret': 'prêt',
    'prets': 'prêts',
    'prete': 'prête',
    'pretes': 'prêtes',
    'tete': 'tête',
    'tetes': 'têtes',
    'reve': 'rêve',
    'reves': 'rêves',
    'rever': 'rêver',
    'reveur': 'rêveur',
    'fete': 'fête',
    'fetes': 'fêtes',
    'feter': 'fêter',
    'foret': 'forêt',
    'forets': 'forêts',
    'fenetre': 'fenêtre',
    'fenetres': 'fenêtres',
    'arrete': 'arrête',
    'arretes': 'arrêtes',
    'arreter': 'arrêter',
    'coeur': 'cœur',
    'coeurs': 'cœurs',
    'soeur': 'sœur',
    'soeurs': 'sœurs',
    'noeud': 'nœud',
    'noeuds': 'nœuds',
    'voeu': 'vœu',
    'voeux': 'vœux',
    'voila': 'voilà',
    'plait': 'plaît',
    'connait': 'connaît',
    'reconnait': 'reconnaît',
    'disparait': 'disparaît',
    'parait': 'paraît',
    'naitre': 'naître',
    'toujour': 'toujours',
    'jamai': 'jamais',
    'parceque': 'parce que',
    'quelquun': "quelqu'un",
    'quelquune': "quelqu'une",
    'daccord': "d'accord",
    'aujourdhui': "aujourd'hui",
    'ecrit': 'écrit',
    'ecrite': 'écrite',
    'ecrits': 'écrits',
    'repond': 'répond',
    'repondu': 'répondu',
    'repondre': 'répondre',
    'equipe': 'équipe',
    'equipes': 'équipes',
    'verite': 'vérité',
    'realite': 'réalité',
    'liberte': 'liberté',
    'fidelite': 'fidélité',
    'societe': 'société',
    'annee': 'année',
    'annees': 'années',
    'soiree': 'soirée',
    'soirees': 'soirées',
    'journee': 'journée',
    'journees': 'journées'
  };

  const PHRASE_SPELL_RULES = [
    { regex: /\b(est|sont|suis|es|sommes|êtes|était|étaient|être)\s+la\b/gi, replace: '$1 là' },
    { regex: /\bqui\s+est\s+la\b/gi, replace: 'qui est là' },
    { regex: /\bpas\s+a\s+pas\b/gi, replace: 'pas à pas' },
    { regex: /\bpeu\s+a\s+peu\b/gi, replace: 'peu à peu' },
    { regex: /\bpeut\s+etre\b/gi, replace: 'peut-être' },
    { regex: /\bpeut-etre\b/gi, replace: 'peut-être' },
    { regex: /\bau\s+dela\b/gi, replace: 'au-delà' },
    { regex: /\bau-dela\b/gi, replace: 'au-delà' },
    { regex: /\bla\s+bas\b/gi, replace: 'là-bas' },
    { regex: /\bla-bas\b/gi, replace: 'là-bas' },
    { regex: /\bc'est\s+a\s+dire\b/gi, replace: "c'est-à-dire" },
    { regex: /\bc'est-a-dire\b/gi, replace: "c'est-à-dire" },
    { regex: /\bvis\s+a\s+vis\b/gi, replace: "vis-à-vis" },
    { regex: /\bvis-a-vis\b/gi, replace: "vis-à-vis" },
    { regex: /\bgrace\s+a\b/gi, replace: 'grâce à' },
    { regex: /\bgrâce\s+a\b/gi, replace: 'grâce à' },
    { regex: /\btout\s+a\s+fait\b/gi, replace: 'tout à fait' },
    { regex: /\btout\s+a\s+coup\b/gi, replace: 'tout à coup' },
    { regex: /\bface\s+a\b/gi, replace: 'face à' },
    { regex: /\bquant\s+a\b/gi, replace: 'quant à' },
    { regex: /\bjusqu['’\s]*a\b/gi, replace: "jusqu'à" },
    { regex: /\bbien\s+sur\b/gi, replace: 'bien sûr' },
    { regex: /\ba\s+coup\s+sur\b/gi, replace: 'à coup sûr' },
    { regex: /\bpour\s+sur\b/gi, replace: 'pour sûr' },
    { regex: /\bsur\s+et\s+certain\b/gi, replace: 'sûr et certain' },
    { regex: /\bquelque\s+soit\b/gi, replace: 'quel que soit' },
    { regex: /\bquelque\s+soient\b/gi, replace: 'quel que soient' },
    { regex: /\bca\s+(va|fait|marche|tourne|chauffe|part|roule|plane|donne|vient|sent|ressemble|me|te|nous|vous|lui|leur|commence)\b/gi, replace: 'ça $1' },
    { regex: /\bc'est\s+ca\b/gi, replace: "c'est ça" },
    { regex: /\bcomme\s+ca\b/gi, replace: 'comme ça' },
    { regex: /\bpour\s+ca\b/gi, replace: 'pour ça' },
    { regex: /\btout\s+ca\b/gi, replace: 'tout ça' },
    { regex: /\bsans\s+ca\b/gi, replace: 'sans ça' },
    { regex: /\bd['’]ou\b/gi, replace: "d'où" },
    { regex: /\bpar\s+ou\b/gi, replace: 'par où' },
    { regex: /\bla\s+ou\b/gi, replace: 'là où' },
    { regex: /\blà\s+ou\b/gi, replace: 'là où' },
    { regex: /\bvers\s+ou\b/gi, replace: 'vers où' },
    { regex: /\bjusqu['’]ou\b/gi, replace: "jusqu'où" },
    { regex: /\bou\s+(tu\s+vas|je\s+vais|on\s+va|il\s+va|elle\s+va|nous\s+allons|vous\s+allez|ils\s+vont)\b/gi, replace: 'où $1' },
    { regex: /\b(a)\s+(la|l'|le|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|côté|jamais|fond|mort|peine|nouveau|part|travers|bout|cause|ce\s+point|cet|cette|ces|qui|quoi|chacun|tous|toutes|deux|trois|quatre|dix|cent|mille)\b/gi, replace: 'à $2' }
  ];

  function preserveCase(original, replacement) {
    if (original === original.toUpperCase() && original.length > 1) {
      return replacement.toUpperCase();
    }
    if (original.charAt(0) === original.charAt(0).toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  function correctLyricsSpelling(line, stats) {
    let updated = line;

    for (const rule of PHRASE_SPELL_RULES) {
      updated = updated.replace(rule.regex, (match, ...args) => {
        let rep = rule.replace;
        if (rep.includes('$')) {
          rep = rep.replace(/\$(\d+)/g, (_, num) => args[parseInt(num, 10) - 1] || '');
        }
        if (match.toLowerCase() !== rep.toLowerCase()) {
          stats.spellingCorrected++;
        }
        return preserveCase(match, rep);
      });
    }

    updated = updated.replace(/\b([a-zA-Zà-öø-ÿ]+)\b/g, (match) => {
      const lower = match.toLowerCase();
      if (SLANG_WHITELIST.has(lower)) {
        return match;
      }
      if (WORD_SPELL_MAP[lower]) {
        const target = WORD_SPELL_MAP[lower];
        if (match !== target) {
          stats.spellingCorrected++;
          return preserveCase(match, target);
        }
      }
      return match;
    });

    return updated;
  }

  function cleanLyricLine(lineStr, stats, enableSpellcheck = true) {
    let line = lineStr.trim();
    if (!line) return { line: '', repeatCount: 1 };

    // Normaliser quotes & apostrophes
    line = line.replace(/[’‘`´]/g, "'").replace(/[“”«»]/g, '"');
    // Retirer timestamps : [01:23.45], (02:14)
    line = line.replace(/^\[?\d{1,2}:\d{2}(?:\.\d+)?\]?\s*/, '');
    // Retirer numérotation de ligne : "1. ", "12) "
    line = line.replace(/^\d+[\.\)\-]\s+/, '');

    // Répétitions en fin de ligne : (x2), x2, (bis), etc.
    let repeatCount = 1;
    const repRegex = /\s*\(?(?:x\s*(\d+)|repeat\s*x?\s*(\d+)|\*(\d+)|bis)\)?\.?$/i;
    const repMatch = line.match(repRegex);
    if (repMatch) {
      repeatCount = parseInt(repMatch[1] || repMatch[2] || repMatch[3] || '2', 10);
      line = line.replace(repRegex, '').trim();
      stats.repetitionsExpanded++;
    }

    // Ponctuation de fin de ligne : retirer virgules, points finaux, deux-points, points-virgules
    // Conserver '?', '!', et '...'
    const prevLen = line.length;
    line = line.replace(/\.\.\./g, '___ELLIPSIS___');
    line = line.replace(/[,;.:]+$/, '').trim();
    line = line.replace(/___ELLIPSIS___/g, '...');
    if (line.length !== prevLen) {
      stats.punctuationCleaned++;
    }

    // Formater les ad-libs écrits avec des crochets ou étoiles : [skrrt] -> (Skrrt), *ouh* -> (Ouh)
    line = line.replace(/\[([a-zA-Z\s!?,']+?)\]/g, (m, p) => {
      if (p.length < 25 && !GENIUS_SECTION_MAP.some(s => s.match.test(p))) {
        stats.adlibsCleaned++;
        return `(${toTitleCase(p.trim())})`;
      }
      return m;
    });

    line = line.replace(/\*([a-zA-Z\s!?,']+?)\*/g, (m, p) => {
      stats.adlibsCleaned++;
      return `(${toTitleCase(p.trim())})`;
    });

    // Correction orthographique ciblée (si activée)
    if (enableSpellcheck) {
      line = correctLyricsSpelling(line, stats);
    }

    // Mettre une majuscule au premier mot des ad-libs entre parenthèses : (yeah, yeah) -> (Yeah, yeah)
    line = line.replace(/\(([^)]+)\)/g, (m, inner) => {
      const trimmed = inner.trim();
      if (!trimmed) return m;
      const capitalizedInner = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      return `(${capitalizedInner})`;
    });

    // Majuscule du mot suivant un ad-lib au début de la ligne : (Skrrt) j'accélère -> (Skrrt) J'accélère
    line = line.replace(/^(\([^\)]+\)\s+)([a-zà-öø-ÿ])/i, (m, prefix, char) => {
      stats.linesCapitalized++;
      return prefix + char.toUpperCase();
    });

    // Majuscule obligatoire en début de ligne
    if (line.length > 0) {
      if (line.startsWith('(')) {
        if (line.length > 1 && line.charAt(1) >= 'a' && line.charAt(1) <= 'z') {
          line = '(' + line.charAt(1).toUpperCase() + line.slice(2);
          stats.linesCapitalized++;
        }
      } else {
        const first = line.charAt(0);
        if (first >= 'a' && first <= 'z') {
          line = first.toUpperCase() + line.slice(1);
          stats.linesCapitalized++;
        }
      }
    }

    // Nettoyer les espaces multiples internes
    line = line.replace(/[ \t]{2,}/g, ' ');

    return { line, repeatCount };
  }

  function formatLyricsGeniusLocal(raw, options = {}) {
    const enableSpellcheck = options.enableSpellcheck !== false;

    if (!raw || !raw.trim()) {
      return {
        text: '',
        stats: {
          headersFormatted: 0,
          linesCapitalized: 0,
          punctuationCleaned: 0,
          repetitionsExpanded: 0,
          adlibsCleaned: 0,
          spellingCorrected: 0
        }
      };
    }

    let stats = {
      headersFormatted: 0,
      linesCapitalized: 0,
      punctuationCleaned: 0,
      repetitionsExpanded: 0,
      adlibsCleaned: 0,
      spellingCorrected: 0
    };

    const linesRaw = raw.split(/\r?\n/);
    const rawSections = [];
    let curSection = {
      header: null,
      lines: [],
      multiplier: 1,
      isRefrain: false
    };

    let primaryRefrainLines = [];

    for (let i = 0; i < linesRaw.length; i++) {
      const trimmed = linesRaw[i].trim();
      if (!trimmed) continue;

      // Métadonnées à supprimer
      if (/^(paroles|lyrics|compositeur|auteur|produced by|written by|source)[\s:]/i.test(trimmed)) {
        continue;
      }

      // Est-ce un en-tête de section ?
      const headerInfo = identifyGeniusHeader(trimmed);
      if (headerInfo) {
        stats.headersFormatted++;
        if (curSection.header || curSection.lines.length > 0) {
          rawSections.push(curSection);
        }
        curSection = {
          header: headerInfo.formatted,
          lines: [],
          multiplier: headerInfo.multiplier || 1,
          isRefrain: headerInfo.isRefrain
        };
        continue;
      }

      // Est-ce un rappel de refrain sans paroles ? Ex: "(Refrain)", "Repeat Chorus", "[Refrain]"
      if (/^\(?\s*(?:repeat\s+)?(?:refrain|chorus|hook)\s*(?:x\s*\d+)?\s*\)?$/i.test(trimmed)) {
        if (primaryRefrainLines.length > 0) {
          curSection.lines.push(...primaryRefrainLines);
          stats.repetitionsExpanded++;
          continue;
        }
      }

      // Ligne de parole individuelle
      const { line: cleanLine, repeatCount } = cleanLyricLine(trimmed, stats, enableSpellcheck);
      if (cleanLine) {
        for (let r = 0; r < repeatCount; r++) {
          curSection.lines.push(cleanLine);
        }
      }
    }

    if (curSection.header || curSection.lines.length > 0) {
      rawSections.push(curSection);
    }

    // Référence du premier refrain non-vide
    for (const s of rawSections) {
      if (s.isRefrain && s.lines.length > 0) {
        primaryRefrainLines = [...s.lines];
        break;
      }
    }

    // Injection automatique si un refrain ultérieur a été déclaré sans paroles
    for (const s of rawSections) {
      if (s.isRefrain && s.lines.length === 0 && primaryRefrainLines.length > 0) {
        s.lines = [...primaryRefrainLines];
        stats.repetitionsExpanded++;
      }
    }

    // Assemblage final : 1 saut de ligne entre sections, 0 saut interne
    const finalBlocks = [];
    for (const s of rawSections) {
      const blockLines = [];
      if (s.header) {
        blockLines.push(s.header);
      }
      const count = Math.max(1, s.multiplier || 1);
      for (let m = 0; m < count; m++) {
        blockLines.push(...s.lines);
      }
      if (blockLines.length > 0) {
        finalBlocks.push(blockLines.join('\n'));
      }
    }

    return {
      text: finalBlocks.join('\n\n').trim(),
      stats
    };
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
          <div class="genius-stat-badge success">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Conforme Genius</span>
          </div>
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

  // --- Initialisation générale ---
  function init() {
    loadStoredData();
    songTitleInput.value = currentSong.title || '';
    activeLineIndex = 0;

    // Titre de chanson
    songTitleInput.addEventListener('input', scheduleAutoSave);

    // Dropdown Export
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
        lines = [''];
        if (currentSong) currentSong.overrides = {};
        scheduleAutoSave();
        renderAllLines(0, 0);
      }
    });

    // Modal Projets
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

    // Raccourci Ctrl+S pour sauvegarder manuellement
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentSong) {
          currentSong.title = songTitleInput.value.trim() || 'Sans titre';
          currentSong.content = lines.join('\n');
          saveSongs();
          showToast('Enregistré manuellement !');
        }
      } else if (e.key === 'Escape') {
        // Touche Echap pour fermer les modals et dropdowns
        if (shortcutsModal) shortcutsModal.classList.remove('open');
        if (projectsModal) closeProjectsModal();
        if (exportDropdown) exportDropdown.classList.remove('open');
      }
    });

    // Modal Raccourcis Clavier
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

    // Toggle Légende Code Couleur (déplié de base)
    const legendBarWrapper = document.getElementById('legendBarWrapper');
    const legendToggleBtn = document.getElementById('legendToggleBtn');
    if (legendToggleBtn && legendBarWrapper) {
      legendToggleBtn.addEventListener('click', () => {
        legendBarWrapper.classList.toggle('collapsed');
      });
    }

    // Tabs Navigation
    tabBtnStudio.addEventListener('click', () => switchTab('studio'));
    tabBtnGenius.addEventListener('click', () => switchTab('genius'));
    const savedTab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB) || 'studio';
    switchTab(savedTab);

    // Toggle Guide d'écriture Genius (déplié de base)
    const geniusGuideWrapper = document.getElementById('geniusGuideWrapper');
    const geniusGuideHeader = document.getElementById('geniusGuideHeader');
    const btnGeniusLoadExample = document.getElementById('btnGeniusLoadExample');

    if (geniusGuideHeader && geniusGuideWrapper) {
      geniusGuideHeader.addEventListener('click', (e) => {
        if (e.target.closest('#btnGeniusLoadExample')) return;
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
        const len = exampleSong.length;
        geniusCharCount.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
        if (btnGeniusFormat) btnGeniusFormat.disabled = false;
        showToast('Exemple type chargé dans les paroles brutes !');
      });
    }

    // Toggle Correction Orthographique (persistance localStorage)
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

    // Genius Optimizer Handlers
    geniusInputLyrics.addEventListener('input', () => {
      const len = geniusInputLyrics.value.length;
      geniusCharCount.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
      if (btnGeniusFormat) {
        btnGeniusFormat.disabled = !geniusInputLyrics.value.trim();
      }
    });

    btnGeniusClear.addEventListener('click', () => {
      geniusInputLyrics.value = '';
      geniusCharCount.textContent = '0 caractères';
      setGeniusState('empty');
    });

    btnGeniusImportStudio.addEventListener('click', () => {
      const studioText = lines.join('\n').trim();
      if (!studioText) {
        showToast('Le Studio est vide !');
        return;
      }
      geniusInputLyrics.value = studioText;
      const len = studioText.length;
      geniusCharCount.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
      if (btnGeniusFormat) btnGeniusFormat.disabled = false;
      showToast('Paroles importées depuis le Studio !');
    });

    btnGeniusSendToStudio.addEventListener('click', () => {
      const output = geniusOutputLyrics.textContent.trim();
      if (!output) return;
      if (currentSong) {
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

    // Formatage Instantané Local (Moteur Senior Genius)
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
