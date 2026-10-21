/**
 * Lyrr - Genius Lyrics Optimizer Engine
 * Local & offline formatter conforming to Genius.com community standards.
 * Handles: Section detection, artist formatting, ad-lib parenthesizing,
 * French rap spelling/accent fixes, repetition expansions, and line capitalization.
 */

(function (window) {
  'use strict';

  // --- Genius Section Definitions ---
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
      // Preserve short uppercase artist acronyms (SCH, PLK, RK, NTM, 13...)
      if (w.toUpperCase() === w && w.length <= 4) return w;
      return toTitleCase(w);
    }).join(' ');
  }

  function identifyGeniusHeader(lineStr) {
    let text = lineStr.trim();
    if (!text) return null;

    // Strip decorative boundary characters
    text = text.replace(/^[-=~*#_]+\s*/, '').replace(/\s*[-=~*#_]+$/, '').trim();
    // Strip starting section numbering (e.g. "1. Intro", "2) Couplet")
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

  // Rap slang, verlan, street terms, US trap/drill, and ad-libs whitelist to preserve from spellcheck
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

    // Normalize quotes & apostrophes
    line = line.replace(/[’‘`´]/g, "'").replace(/[“”«»]/g, '"');
    // Strip timestamps: [01:23.45], (02:14)
    line = line.replace(/^\[?\d{1,2}:\d{2}(?:\.\d+)?\]?\s*/, '');
    // Strip line numbering: "1. ", "12) "
    line = line.replace(/^\d+[\.\)\-]\s+/, '');

    // End-of-line repetitions: (x2), x2, (bis), etc.
    let repeatCount = 1;
    const repRegex = /\s*\(?(?:x\s*(\d+)|repeat\s*x?\s*(\d+)|\*(\d+)|bis)\)?\.?$/i;
    const repMatch = line.match(repRegex);
    if (repMatch) {
      repeatCount = parseInt(repMatch[1] || repMatch[2] || repMatch[3] || '2', 10);
      line = line.replace(repRegex, '').trim();
      stats.repetitionsExpanded++;
    }

    // End-of-line punctuation: strip trailing commas, periods, colons, semicolons
    // Preserve '?', '!', and '...'
    const prevLen = line.length;
    line = line.replace(/\.\.\./g, '___ELLIPSIS___');
    line = line.replace(/[,;.:]+$/, '').trim();
    line = line.replace(/___ELLIPSIS___/g, '...');
    if (line.length !== prevLen) {
      stats.punctuationCleaned++;
    }

    // Format ad-libs in brackets or asterisks: [skrrt] -> (Skrrt), *ouh* -> (Ouh)
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

    // Targeted French rap lyrics spellcheck (if enabled)
    if (enableSpellcheck) {
      line = correctLyricsSpelling(line, stats);
    }

    // Capitalize first word of parenthesized ad-libs: (yeah, yeah) -> (Yeah, yeah)
    line = line.replace(/\(([^)]+)\)/g, (m, inner) => {
      const trimmed = inner.trim();
      if (!trimmed) return m;
      const capitalizedInner = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      return `(${capitalizedInner})`;
    });

    // Capitalize word following a leading ad-lib: (Skrrt) j'accélère -> (Skrrt) J'accélère
    line = line.replace(/^(\([^\)]+\)\s+)([a-zà-öø-ÿ])/i, (m, prefix, char) => {
      stats.linesCapitalized++;
      return prefix + char.toUpperCase();
    });

    // Mandatory capitalization at start of line
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

    // Clean internal multiple whitespace
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

      // Metadata lines to remove
      if (/^(paroles|lyrics|compositeur|auteur|produced by|written by|source)[\s:]/i.test(trimmed)) {
        continue;
      }

      // Section header detection
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

      // Empty refrain recall placeholder? E.g. "(Refrain)", "Repeat Chorus", "[Refrain]"
      if (/^\(?\s*(?:repeat\s+)?(?:refrain|chorus|hook)\s*(?:x\s*\d+)?\s*\)?$/i.test(trimmed)) {
        if (primaryRefrainLines.length > 0) {
          curSection.lines.push(...primaryRefrainLines);
          stats.repetitionsExpanded++;
          continue;
        }
      }

      // Individual lyric line
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

    // Reference to first non-empty primary refrain
    for (const s of rawSections) {
      if (s.isRefrain && s.lines.length > 0) {
        primaryRefrainLines = [...s.lines];
        break;
      }
    }

    // Automatic injection if a subsequent refrain was declared without lyrics
    for (const s of rawSections) {
      if (s.isRefrain && s.lines.length === 0 && primaryRefrainLines.length > 0) {
        s.lines = [...primaryRefrainLines];
        stats.repetitionsExpanded++;
      }
    }

    // Final assembly: 1 blank line between sections, 0 internal blank lines
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

  // Export for browser and Node.js environments
  const LyrrGenius = {
    GENIUS_SECTION_MAP,
    toTitleCase,
    formatArtistName,
    identifyGeniusHeader,
    SLANG_WHITELIST,
    WORD_SPELL_MAP,
    PHRASE_SPELL_RULES,
    preserveCase,
    correctLyricsSpelling,
    cleanLyricLine,
    formatLyricsGeniusLocal
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyrrGenius;
  } else {
    window.LyrrGenius = LyrrGenius;
  }
})(typeof window !== 'undefined' ? window : globalThis);
