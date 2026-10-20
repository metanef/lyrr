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
  const btnGeniusApiKey = document.getElementById('btnGeniusApiKey');
  const apiKeyStatusText = document.getElementById('apiKeyStatusText');
  const btnGeniusClear = document.getElementById('btnGeniusClear');
  const btnGeniusFormatLocal = document.getElementById('btnGeniusFormatLocal');
  const btnGeniusFormatAi = document.getElementById('btnGeniusFormatAi');
  const formatAiBtnText = document.getElementById('formatAiBtnText');

  const geniusInputLyrics = document.getElementById('geniusInputLyrics');
  const geniusCharCount = document.getElementById('geniusCharCount');

  const geniusOutputTools = document.getElementById('geniusOutputTools');
  const btnGeniusSendToStudio = document.getElementById('btnGeniusSendToStudio');
  const btnGeniusCopy = document.getElementById('btnGeniusCopy');
  const geniusCopyText = document.getElementById('geniusCopyText');

  const geniusOutputCard = document.getElementById('geniusOutputCard');
  const geniusStateEmpty = document.getElementById('geniusStateEmpty');
  const geniusStateLoading = document.getElementById('geniusStateLoading');
  const geniusOutputLyrics = document.getElementById('geniusOutputLyrics');
  const geniusErrorBox = document.getElementById('geniusErrorBox');
  const geniusErrorMessage = document.getElementById('geniusErrorMessage');
  const btnGeniusFallbackLocal = document.getElementById('btnGeniusFallbackLocal');

  // API Key Modal Selectors
  const apiKeyModal = document.getElementById('apiKeyModal');
  const btnCloseApiKeyModal = document.getElementById('btnCloseApiKeyModal');
  const inputGeminiApiKey = document.getElementById('inputGeminiApiKey');
  const btnToggleApiKeyVisibility = document.getElementById('btnToggleApiKeyVisibility');
  const btnRemoveApiKey = document.getElementById('btnRemoveApiKey');
  const btnCancelApiKey = document.getElementById('btnCancelApiKey');
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');

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

      let syllableResult = null;
      let count = 0;

      if (lineText.trim().length > 0) {
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

      // Ligne de décomposition : uniquement sur la ligne active quand elle contient du texte
      let breakdownHtml = '';
      if (isActive && lineText.trim().length > 0) {
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
            <div class="active-line-total">${count} ${count > 1 ? 'pieds' : 'pied'}</div>
          </div>
        `;
      }

      const rowActiveClass = isActive ? 'active' : '';
      const inputWidth = Math.max(80, Math.round(measureTextWidth(lineText)) + 24);

      html += `
        <div class="line-row ${rowActiveClass}" data-index="${i}">
          <div class="line-gutter">
            <span class="syllable-badge ${meterClass}" data-line="${i}" title="${count > 0 ? `${count} pieds (clic pour ajuster)` : ''}">
              ${count > 0 ? count : ''}
            </span>
          </div>
          <div class="line-main">
            ${breakdownHtml}
            <input type="text" class="line-input" data-index="${i}" style="width: ${inputWidth}px;" value="${escapeHtml(lineText)}" spellcheck="false" autocomplete="off" placeholder="${i === 0 ? 'Écris tes lyrics ici...' : ''}">
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

    // Restaurer le focus si spécifié
    if (focusIndex !== null) {
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

  // --- Ajustement manuel au clic sur le badge de la marge ---
  function handleBadgeClick(lineIndex) {
    const currentLine = lines[lineIndex] || '';
    if (!currentLine.trim()) return;

    const naturalCount = LyrrSyllables.countLineSyllables(currentLine, MODE).total;
    const currentOverride = (currentSong.overrides && currentSong.overrides[lineIndex] !== undefined)
      ? currentSong.overrides[lineIndex]
      : naturalCount;

    const userInput = prompt(`Ajuster le nombre de pieds pour la ligne ${lineIndex + 1} :\n"${currentLine}"\n(Calcul automatique : ${naturalCount} pieds)`, currentOverride);
    if (userInput !== null) {
      const val = parseInt(userInput.trim(), 10);
      if (!isNaN(val) && val >= 0) {
        if (!currentSong.overrides) currentSong.overrides = {};
        currentSong.overrides[lineIndex] = val;
        scheduleAutoSave();
        renderAllLines(lineIndex);
        showToast(`Ligne ${lineIndex + 1} fixée à ${val} pieds`);
      }
    }
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

    // Navigation clavier (Enter, Backspace, Delete, Flèches)
    editorLinesContainer.addEventListener('keydown', (e) => {
      const input = e.target.closest('.line-input');
      if (!input) return;

      const index = parseInt(input.dataset.index, 10);
      const val = input.value;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      // TOUCHE ENTRÉE : couper la ligne et créer une nouvelle ligne en-dessous
      if (e.key === 'Enter') {
        e.preventDefault();
        const left = val.slice(0, start);
        const right = val.slice(end);
        lines[index] = left;
        lines.splice(index + 1, 0, right);

        // Décaler les overrides si présents
        if (currentSong.overrides) {
          const newOverrides = {};
          for (const [k, v] of Object.entries(currentSong.overrides)) {
            const ki = parseInt(k, 10);
            if (ki <= index) newOverrides[ki] = v;
            else newOverrides[ki + 1] = v;
          }
          currentSong.overrides = newOverrides;
        }

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

    // Clic sur le badge de la marge pour ajuster
    editorLinesContainer.addEventListener('click', (e) => {
      const badge = e.target.closest('.syllable-badge');
      if (badge && badge.dataset.line !== undefined) {
        handleBadgeClick(parseInt(badge.dataset.line, 10));
      }
    });

    // Clic pour fermer la ligne de pieds si on clique à droite de l'éditeur ou dans une zone vide
    editorLinesContainer.addEventListener('mousedown', (e) => {
      // 1. Clic sur un badge dans la marge : ne pas fermer (l'événement click gère l'ajustement)
      if (e.target.closest('.syllable-badge')) return;

      // 2. Clic sur la ligne de décomposition : garder ouvert
      if (e.target.closest('.line-breakdown')) return;

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

    // Clic en-dehors de l'éditeur : referme la ligne de décomposition
    document.addEventListener('mousedown', (e) => {
      if (!editorLinesContainer.contains(e.target)) {
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

  // --- Genius Lyrics Optimizer Logic ---
  const GENIUS_SYSTEM_PROMPT = `
Persona: Tu es un Éditeur Senior chez Genius.com, expert en transcription et en mise en page de paroles de chansons. Ta mission est de nettoyer et de formater des textes bruts pour qu'ils respectent scrupuleusement le guide de style officiel de la plateforme Genius.

Task: Convertir les paroles brutes fournies par l'utilisateur en un texte parfaitement formaté selon les standards de contribution Genius.

Constraints:
- Titres de sections : Doivent être entre crochets, ex: [Couplet 1], [Refrain], [Outro]. 
- Casing : La première lettre de chaque ligne doit être une majuscule. Les titres de sections doivent avoir une majuscule au début (ex: [Chorus] et non [CHORUS]).
- Ponctuation : Supprime les virgules en fin de ligne. Garde uniquement la ponctuation interne nécessaire à la compréhension. Pas de points finaux en fin de phrase sauf exception rare.
- Structure : Une seule ligne d'espace entre les sections. Pas d'espaces doubles entre les lignes d'un même couplet.
- Nettoyage : Supprime les mentions inutiles comme "Repeat x2". À la place, copie-colle la section répétée.

Step-by-Step Instructions:
1. Analyse : Identifie les différentes parties de la chanson (Intro, Couplets, Refrains, Pont, Outro).
2. Normalisation des headers : Traduis ou reformate les indicateurs de section en utilisant le format standard [Nom de la section].
3. Correction de la casse : Applique la majuscule systématique en début de ligne.
4. Épuration : Retire la ponctuation superflue en fin de ligne (virgules, points).
5. Vérification : Assure-toi que le texte est fluide et professionnel.

IMPORTANT: Ne renvoie QUE les paroles formitées, sans texte d'introduction ni de conclusion.
  `.trim();

  function openApiKeyModal() {
    if (!apiKeyModal) return;
    const currentKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
    if (inputGeminiApiKey) inputGeminiApiKey.value = currentKey;
    apiKeyModal.classList.add('open');
    if (inputGeminiApiKey) inputGeminiApiKey.focus();
  }

  function closeApiKeyModal() {
    if (apiKeyModal) apiKeyModal.classList.remove('open');
  }

  function updateApiKeyStatus() {
    const key = (localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '').trim();
    if (apiKeyStatusText) {
      apiKeyStatusText.textContent = key ? 'Clé API ✓' : 'Clé API';
    }
    if (btnGeniusApiKey) {
      if (key) {
        btnGeniusApiKey.style.borderColor = 'rgba(250, 204, 21, 0.4)';
        btnGeniusApiKey.style.color = '#facc15';
      } else {
        btnGeniusApiKey.style.borderColor = '';
        btnGeniusApiKey.style.color = '';
      }
    }
  }

  function setGeniusState(state, outputText = '', errorText = '') {
    if (geniusStateEmpty) geniusStateEmpty.style.display = state === 'empty' ? 'flex' : 'none';
    if (geniusStateLoading) geniusStateLoading.style.display = state === 'loading' ? 'flex' : 'none';
    if (geniusOutputLyrics) {
      geniusOutputLyrics.style.display = state === 'output' ? 'block' : 'none';
      if (state === 'output') geniusOutputLyrics.textContent = outputText;
    }
    if (geniusErrorBox) {
      geniusErrorBox.style.display = state === 'error' ? 'flex' : 'none';
      if (state === 'error' && geniusErrorMessage) {
        geniusErrorMessage.textContent = errorText || "Une erreur est survenue lors du formattage. Veuillez réessayer.";
      }
    }

    if (geniusOutputTools) {
      geniusOutputTools.style.display = state === 'output' ? 'flex' : 'none';
    }

    if (geniusOutputCard) {
      if (state === 'output' && outputText) {
        geniusOutputCard.classList.add('has-content');
      } else {
        geniusOutputCard.classList.remove('has-content');
      }
    }

    if (btnGeniusFormatAi) {
      btnGeniusFormatAi.disabled = (state === 'loading') || !geniusInputLyrics.value.trim();
    }
    if (formatAiBtnText) {
      formatAiBtnText.textContent = state === 'loading' ? 'Traitement...' : 'Formater les paroles';
    }
  }

  async function formatLyricsWithGemini(rawLyrics) {
    const apiKey = (localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '').trim();
    if (!apiKey) {
      openApiKeyModal();
      throw new Error('Veuillez configurer votre clé API Google Gemini pour lancer le formatage IA (ou utilisez les Règles Locales).');
    }

    const delays = [1000, 2000, 4000, 8000, 16000];
    const maxRetries = 5;
    let retryCount = 0;

    const modelsToTry = [
      'gemini-2.5-flash-preview-09-2025',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    async function callApi(modelIdx = 0) {
      const modelName = modelsToTry[modelIdx] || 'gemini-1.5-flash';
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: rawLyrics }] }],
            systemInstruction: { parts: [{ text: GENIUS_SYSTEM_PROMPT }] }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Erreur HTTP ${response.status}`;
          if ((response.status === 404 || errMsg.toLowerCase().includes('not found')) && modelIdx < modelsToTry.length - 1) {
            console.warn(`Modèle ${modelName} indisponible, essai avec ${modelsToTry[modelIdx + 1]}...`);
            return callApi(modelIdx + 1);
          }
          throw new Error(errMsg);
        }

        const data = await response.json();
        const formatted = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!formatted) throw new Error("Réponse vide renvoyée par le modèle.");
        return formatted.trim();
      } catch (err) {
        if (retryCount < maxRetries) {
          await new Promise(res => setTimeout(res, delays[retryCount]));
          retryCount++;
          return callApi(modelIdx);
        }
        throw err;
      }
    }

    return await callApi(0);
  }

  function formatLyricsLocal(raw) {
    if (!raw || !raw.trim()) return '';

    const linesRaw = raw.split(/\r?\n/);
    const processedLines = [];

    const HEADER_REGEX = /^(?:\[|\()? *(intro|couplet(?:\s*\d+)?|verse(?:\s*\d+)?|refrain|chorus|hook|pont|bridge|outro|pre-refrain|pr[ée]-chorus) *(?:\:|\-)? *(?:\]|\))? *$/i;

    function normalizeHeader(str) {
      const m = str.match(HEADER_REGEX);
      if (!m) return null;
      const name = m[1].toLowerCase().trim();
      if (name.includes('intro')) return '[Intro]';
      if (name.includes('outro')) return '[Outro]';
      if (name.includes('refrain') || name.includes('chorus') || name.includes('hook')) return '[Refrain]';
      if (name.includes('pont') || name.includes('bridge')) return '[Pont]';
      if (name.includes('pre') || name.includes('pré')) return '[Pré-refrain]';
      if (name.includes('couplet') || name.includes('verse')) {
        const num = name.replace(/[^0-9]/g, '');
        return num ? `[Couplet ${num}]` : '[Couplet]';
      }
      return null;
    }

    let lastWasEmpty = false;

    for (let i = 0; i < linesRaw.length; i++) {
      let line = linesRaw[i].trim();

      if (!line) {
        if (!lastWasEmpty && processedLines.length > 0) {
          processedLines.push('');
          lastWasEmpty = true;
        }
        continue;
      }

      const normHeader = normalizeHeader(line);
      if (normHeader) {
        if (processedLines.length > 0 && !lastWasEmpty) {
          processedLines.push('');
        }
        processedLines.push(normHeader);
        lastWasEmpty = false;
        continue;
      }

      let repeatMatch = line.match(/\s*\(?(?:x\s*(\d+)|repeat\s*x?\s*(\d+))\)?$/i);
      let repeatCount = 1;
      if (repeatMatch) {
        repeatCount = parseInt(repeatMatch[1] || repeatMatch[2] || '2', 10);
        line = line.replace(/\s*\(?(?:x\s*(\d+)|repeat\s*x?\s*(\d+))\)?$/i, '').trim();
      }

      line = line.replace(/[,;.:]+$/, '');

      if (line.length > 0) {
        line = line.charAt(0).toUpperCase() + line.slice(1);
      }

      for (let r = 0; r < repeatCount; r++) {
        processedLines.push(line);
      }
      lastWasEmpty = false;
    }

    return processedLines.join('\n');
  }

  function switchTab(tabId) {
    if (tabId === 'genius') {
      tabBtnStudio.classList.remove('active');
      tabBtnGenius.classList.add('active');
      tabPaneStudio.classList.remove('active');
      tabPaneGenius.classList.add('active');

      // Écriture automatique des paroles du Studio dans l'optimiseur Genius
      const studioText = (lines || []).join('\n');
      if (studioText.trim()) {
        geniusInputLyrics.value = studioText;
        const len = studioText.length;
        geniusCharCount.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
        if (btnGeniusFormatAi) {
          btnGeniusFormatAi.disabled = false;
        }
      }
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
      }
    });

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

    // Genius Formatter Handlers
    updateApiKeyStatus();

    geniusInputLyrics.addEventListener('input', () => {
      const len = geniusInputLyrics.value.length;
      geniusCharCount.textContent = `${len} caractère${len > 1 ? 's' : ''}`;
      if (btnGeniusFormatAi) {
        btnGeniusFormatAi.disabled = !geniusInputLyrics.value.trim();
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
      if (btnGeniusFormatAi) btnGeniusFormatAi.disabled = false;
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

    // Formatage Local (Règles sans IA)
    btnGeniusFormatLocal.addEventListener('click', () => {
      const raw = geniusInputLyrics.value.trim();
      if (!raw) {
        showToast('Collez d\'abord vos paroles brutes.');
        return;
      }
      const formatted = formatLyricsLocal(raw);
      setGeniusState('output', formatted);
      showToast('Formaté avec les règles Genius !');
    });

    btnGeniusFallbackLocal.addEventListener('click', () => {
      const raw = geniusInputLyrics.value.trim();
      if (!raw) return;
      const formatted = formatLyricsLocal(raw);
      setGeniusState('output', formatted);
    });

    // Formatage IA (Gemini 2.5 Flash)
    btnGeniusFormatAi.addEventListener('click', async () => {
      const raw = geniusInputLyrics.value.trim();
      if (!raw) return;

      setGeniusState('loading');
      try {
        const formatted = await formatLyricsWithGemini(raw);
        setGeniusState('output', formatted);
        showToast('Paroles formatées avec succès par Gemini !');
      } catch (err) {
        console.error('Erreur Genius AI Formatter:', err);
        setGeniusState('error', '', err.message || "Une erreur est survenue lors du formattage.");
      }
    });

    // Modal Clé API
    btnGeniusApiKey.addEventListener('click', openApiKeyModal);
    btnCloseApiKeyModal.addEventListener('click', closeApiKeyModal);
    btnCancelApiKey.addEventListener('click', closeApiKeyModal);
    apiKeyModal.addEventListener('click', (e) => {
      if (e.target === apiKeyModal) closeApiKeyModal();
    });

    btnToggleApiKeyVisibility.addEventListener('click', () => {
      if (inputGeminiApiKey.type === 'password') {
        inputGeminiApiKey.type = 'text';
        btnToggleApiKeyVisibility.textContent = 'Masquer';
      } else {
        inputGeminiApiKey.type = 'password';
        btnToggleApiKeyVisibility.textContent = 'Afficher';
      }
    });

    btnSaveApiKey.addEventListener('click', () => {
      const keyVal = inputGeminiApiKey.value.trim();
      if (keyVal) {
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, keyVal);
        showToast('Clé API enregistrée localement !');
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
        showToast('Clé API supprimée.');
      }
      updateApiKeyStatus();
      closeApiKeyModal();
    });

    btnRemoveApiKey.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
      inputGeminiApiKey.value = '';
      updateApiKeyStatus();
      closeApiKeyModal();
      showToast('Clé API supprimée.');
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
