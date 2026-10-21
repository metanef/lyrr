/**
 * Lyrr - French Syllable Counting Engine for Rap and Poetry
 * Handles: French phonetics, diphthongs, nasal vowels, mute 'e', acronyms, and numbers.
 */

(function (window) {
  'use strict';

  // Syllable count for each letter in French acronym pronunciation
  const LETTER_SYLLABLES = {
    'A': 1, // "a"
    'B': 1, // "bé"
    'C': 1, // "cé"
    'D': 1, // "dé"
    'E': 1, // "e"
    'F': 1, // "èf"
    'G': 1, // "gé"
    'H': 1, // "ash"
    'I': 1, // "i"
    'J': 1, // "ji"
    'K': 1, // "ka"
    'L': 1, // "èl"
    'M': 1, // "èm"
    'N': 1, // "èn"
    'O': 1, // "o"
    'P': 1, // "pé"
    'Q': 1, // "ku"
    'R': 1, // "èr"
    'S': 1, // "ès"
    'T': 1, // "té"
    'U': 1, // "u"
    'V': 1, // "vé"
    'W': 3, // "dou-ble-vé"
    'X': 1, // "iks"
    'Y': 2, // "i-grèk"
    'Z': 1  // "zèd"
  };

  /**
   * Converts an integer into French written words
   * E.g.: 14 -> "quatorze", 2026 -> "deux mille vingt-six"
   */
  function numberToFrenchWords(n) {
    if (isNaN(n)) return '';
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'zéro';

    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

    function convertBelow100(num) {
      if (num < 10) return units[num];
      if (num < 20) return teens[num - 10];

      const t = Math.floor(num / 10);
      const u = num % 10;

      if (t === 7) {
        if (u === 1) return 'soixante-et-onze';
        return 'soixante-' + teens[u];
      }
      if (t === 8) {
        if (u === 0) return 'quatre-vingts';
        return 'quatre-vingt-' + units[u];
      }
      if (t === 9) {
        return 'quatre-vingt-' + teens[u];
      }

      if (u === 1) return tens[t] + '-et-un';
      if (u > 1) return tens[t] + '-' + units[u];
      return tens[t];
    }

    function convertBelow1000(num) {
      let res = '';
      if (num >= 100) {
        const h = Math.floor(num / 100);
        const rem = num % 100;
        if (h === 1) {
          res += 'cent';
        } else {
          res += units[h] + (rem === 0 ? ' cents' : ' cent');
        }
        if (rem > 0) res += ' ' + convertBelow100(rem);
      } else {
        res = convertBelow100(num);
      }
      return res.trim();
    }

    if (n < 1000) return convertBelow1000(n);

    let result = '';
    const billions = Math.floor(n / 1000000000);
    let rem = n % 1000000000;
    const millions = Math.floor(rem / 1000000);
    rem = rem % 1000000;
    const thousands = Math.floor(rem / 1000);
    rem = rem % 1000;

    if (billions > 0) {
      result += (billions === 1 ? 'un milliard' : convertBelow1000(billions) + ' milliards') + ' ';
    }
    if (millions > 0) {
      result += (millions === 1 ? 'un million' : convertBelow1000(millions) + ' millions') + ' ';
    }
    if (thousands > 0) {
      if (thousands === 1) {
        result += 'mille ';
      } else {
        result += convertBelow1000(thousands) + ' mille ';
      }
    }
    if (rem > 0) {
      result += convertBelow1000(rem);
    }

    return result.trim();
  }

  /**
   * Detects if a token is an acronym (e.g. PDG, P.D.G., RATP, FBI, BPM, 404, etc.)
   */
  function isAcronym(token) {
    if (!token) return false;
    // Acronym with dots: P.D.G., F.B.I.
    if (/^[A-Za-z]\.[A-Za-z]\.(?:[A-Za-z]\.)*$/.test(token)) return true;
    
    // All uppercase word of 2 to 6 letters
    const cleaned = token.replace(/[^A-Za-z]/g, '');
    if (cleaned.length >= 2 && cleaned.length <= 6 && cleaned === cleaned.toUpperCase()) {
      // In rap and modern French, acronyms like PDG, RATP, FBI, HLM, SNCF, USA, OAS, CIA, VIP are common.
      // If no standard vowel is present (consonants only), it is 100% an acronym: e.g., PDG, RATP, SNCF, BPM, HLM
      if (!/[AEIOU]/.test(cleaned)) return true;
      // Well-known acronyms with vowels:
      const knownAcronyms = ['USA', 'FBI', 'CIA', 'RATP', 'ONU', 'OAS', 'VIP', 'ADN', 'URL', 'PDF', 'GPS', 'SMS', 'FAQ', 'TER', 'TGV', 'BAC', 'BEP', 'CAP', 'BTS', 'DUT', 'CM2', 'CP', 'CE1', 'CE2', 'RIP', 'RER', 'GIGN', 'CRS', 'SIDA', 'IVG', 'CD', 'DVD', 'USB', 'TV', 'PS', 'KO', 'OK', 'HS', 'DJ', 'MC'];
      if (knownAcronyms.includes(cleaned)) return true;
      // By default, a short all-uppercase word (>= 2 chars) is treated as an acronym
      return true;
    }
    return false;
  }

  /**
   * Counts syllables of an acronym spelled letter by letter
   */
  function countAcronymSyllables(token) {
    const letters = token.replace(/[^A-Za-z]/g, '').toUpperCase().split('');
    let count = 0;
    const parts = [];
    for (const l of letters) {
      const syl = LETTER_SYLLABLES[l] || 1;
      count += syl;
      parts.push(`${l}(${syl})`);
    }
    return { count, details: parts.join('-') };
  }

  // Dictionary of overrides and frequent words in rap/spoken flow
  const WORD_OVERRIDES = {
    // Frequent monosyllables
    'suis': 1, 'je': 1, 'tu': 1, 'il': 1, 'elle': 1, 'on': 1, 'nous': 1, 'vous': 1, 'ils': 1, 'elles': 1,
    'ce': 1, 'se': 1, 'me': 1, 'te': 1, 'le': 1, 'la': 1, 'les': 1, 'un': 1, 'une': 1, 'des': 1,
    'de': 1, 'du': 1, 'au': 1, 'aux': 1, 'en': 1, 'dans': 1, 'sur': 1, 'par': 1, 'pour': 1, 'sans': 1,
    'et': 1, 'ou': 1, 'mais': 1, 'donc': 1, 'or': 1, 'ni': 1, 'car': 1, 'que': 1, 'qui': 1, 'quoi': 1,
    'dont': 1, 'où': 1, 'quand': 1, 'comme': 1, 'si': 1, 'non': 1, 'oui': 1,
    // Contracted forms
    "c'est": 1, 'cest': 1, "j'ai": 1, 'jai': 1, "qu'on": 1, 'quon': 1, "d'un": 1, "d'une": 1,
    "j'suis": 1, "t'es": 1, "y'a": 1, "s'en": 1, "m'en": 1, "t'en": 1, "l'or": 1, "l'eau": 1, "l'air": 1,
    // Words with glide / diphthongs (1 syllable)
    'nuit': 1, 'bruit': 1, 'huit': 1, 'lui': 1, 'cuit': 1, 'pluie': 1, 'fuir': 1,
    'moi': 1, 'toi': 1, 'soi': 1, 'roi': 1, 'loi': 1, 'fois': 1, 'voix': 1, 'bois': 1, 'trois': 1,
    'bien': 1, 'rien': 1, 'chien': 1, 'lien': 1, 'tiens': 1, 'viens': 1, 'ciel': 1, 'miel': 1, 'fiel': 1,
    'yeux': 1, 'dieu': 1, 'vieux': 1, 'mieux': 1, 'pied': 1, 'pieds': 1,
    // 2-syllable words
    'heureux': 2, 'quatorze': 2, 'jamais': 2, 'toujours': 2, 'demain': 2, 'hier': 1,
    'matin': 2, 'soir': 1, 'paname': 2, 'paris': 2, 'monde': 1, 'france': 1,
    // Rap / music terms
    'street': 1, 'flow': 1, 'rap': 1, 'beat': 1, 'track': 1, 'kick': 1, 'snare': 1, 'clap': 1,
    'punchline': 2, 'freestyle': 2, 'microphone': 3, 'studio': 2, 'couplet': 2, 'refrain': 2
  };

  /**
   * Calculates the syllable count of an individual word
   */
  function countWordSyllables(rawWord, mode = 'rap') {
    if (!rawWord || !rawWord.trim()) return { count: 0, details: '' };

    const token = rawWord.trim();

    // 1. Raw number: e.g. 14 -> "quatorze" (2 syllables)
    if (/^\d+$/.test(token)) {
      const spelled = numberToFrenchWords(parseInt(token, 10));
      const res = countLineSyllables(spelled, mode);
      return {
        count: res.total,
        details: `${token} → "${spelled}" (${res.total})`,
        isNumber: true
      };
    }

    // 2. Acronym: e.g. PDG -> 3, FBI -> 3, RATP -> 4
    if (isAcronym(token)) {
      const acro = countAcronymSyllables(token);
      return {
        count: acro.count,
        details: `${token} [sigle] (${acro.details})`,
        isAcronym: true
      };
    }

    let word = token.toLowerCase();
    // Preserve accented letters, apostrophes, and hyphens
    word = word.replace(/[^a-zàâäéèêëîïôöùûüÿçœæ'-]/g, '');
    if (!word) return { count: 0, details: '' };

    // 3. Fast exception dictionary
    if (WORD_OVERRIDES[word] !== undefined) {
      return { count: WORD_OVERRIDES[word], details: word };
    }

    // 4. Compound words with hyphens (e.g. "rendez-vous", "peut-être")
    if (word.includes('-')) {
      const parts = word.split('-');
      let sum = 0;
      for (const p of parts) {
        if (p) sum += countWordSyllables(p, mode).count;
      }
      return { count: Math.max(1, sum), details: word };
    }

    // 5. Elisions with apostrophe (e.g. "j'suis", "t'as", "l'amour", "d'or")
    if (word.includes("'")) {
      const parts = word.split("'");
      let sum = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!p) continue;
        // Single elided consonant before apostrophe ("j'", "t'", "c'", "d'", "l'", "m'", "s'", "n'")
        // binds directly to following word without an extra vowel
        if (i === 0 && p.length === 1) {
          continue;
        }
        sum += countWordSyllables(p, mode).count;
      }
      return { count: Math.max(1, sum), details: word };
    }

    // 6. Phonetic reduction of complex vowels
    let s = word;

    // Triple vowel clusters
    s = s.replace(/eaux?/g, '@');
    s = s.replace(/œux?/g, '@');
    s = s.replace(/oeux?/g, '@');
    s = s.replace(/ouill/g, '@y');
    s = s.replace(/euill/g, '@y');
    s = s.replace(/ueill/g, '@y');
    s = s.replace(/aill/g, '@y');

    // Double vowel clusters (equivalent to 1 vocalic sound)
    s = s.replace(/eau/g, '@');
    s = s.replace(/aux?/g, '@');
    s = s.replace(/aie?s?/g, '@');
    s = s.replace(/ais|ait|aient/g, '@');
    s = s.replace(/ai/g, '@');
    s = s.replace(/oux?/g, '@');
    s = s.replace(/où/g, '@');
    s = s.replace(/ou/g, '@');
    s = s.replace(/eux?/g, '@');
    s = s.replace(/eût?|eû/g, '@');
    s = s.replace(/eu/g, '@');
    s = s.replace(/oix?|oie?s?|oit/g, '@');
    s = s.replace(/oi/g, '@');
    s = s.replace(/oe|œ/g, '@');
    s = s.replace(/ei/g, '@');
    s = s.replace(/ey/g, '@');
    s = s.replace(/ay/g, '@');

    // "ui" = 1 diphthong / glide: suis, huit, nuit, fuite, bruit
    s = s.replace(/ui/g, '@');

    // Frequent diphthong suffixes
    s = s.replace(/[iy]en(s)?$/g, '@');     // bien, lien, viens
    s = s.replace(/i(er|ez|ed)s?$/g, '@');   // pied, premier, panier, chantez

    // Semi-vowels / frequent synaeresis in rap and modern speech
    s = s.replace(/i([aeou])/g, '@');       // passion, ciel, yeux, studio
    s = s.replace(/u([aeio])/g, '@');       // lui, nuance

    // 7. Treatment of mute final 'e'
    if (mode === 'rap') {
      // In rap flow, final 'e' preceded by a consonant is almost never pronounced
      if (s.length > 2) {
        s = s.replace(/([^aeiouy@])ent$/g, '$1');          // mute verbal ending
        s = s.replace(/([aeiouy@][^aeiouy@]*)e[sz]?$/g, '$1'); // monde -> mond, portes -> ports
        s = s.replace(/([aeiouy@])e$/g, '$1');             // vie -> vi, joie -> joi
      }
    } else {
      // Classical mode: word-final 'e' can be elided before vowels
      s = s.replace(/([aeiouy@])e$/g, '$1');
    }

    // 8. Count remaining vowels
    const matches = s.match(/[@aeiouyàâäéèêëîïôöùûüÿœæ]/g);
    const count = matches ? matches.length : 1;

    return {
      count: Math.max(1, count),
      details: word
    };
  }

  const SYLLABLE_PARTS = {
    'heureux': 'heu·reux',
    'quatorze': 'qua·torze',
    'bitume': 'bi·tume',
    'plume': 'plume',
    'jamais': 'ja·mais',
    'toujours': 'tou·jours',
    'demain': 'de·main',
    'matin': 'ma·tin',
    'paris': 'pa·ris',
    'paname': 'pa·name',
    'studio': 'stu·dio',
    'couplet': 'cou·plet',
    'refrain': 're·frain',
    'punchline': 'punch·line',
    'freestyle': 'free·style',
    'microphone': 'mi·cro·phone',
    'calibre': 'ca·li·bre',
    'calibré': 'ca·li·bré',
    'passé': 'pas·sé',
    'musique': 'mu·sique',
    'rapide': 'ra·pide',
    'facile': 'fa·cile',
    'difficile': 'dif·fi·cile',
    'solitude': 'so·li·tude',
    'obscurité': 'obs·cu·ri·té',
    'horizon': 'ho·ri·zon',
    'liberté': 'li·ber·té',
    'souvenir': 'sou·ve·nir',
    'illusion': 'il·lu·sion',
    'passion': 'pas·sion',
    'ambition': 'am·bi·tion',
    'réflexion': 'ré·fle·xion',
    'action': 'ac·tion',
    'époque': 'é·poque'
  };

  function isVowel(c) {
    if (!c) return false;
    return "aeiouyàâäéèêëîïôöùûüÿœæ".includes(c.toLowerCase());
  }

  function matchCase(original, hyphenated) {
    if (original === original.toUpperCase()) return hyphenated.toUpperCase();
    if (original[0] === original[0].toUpperCase()) {
      return hyphenated.charAt(0).toUpperCase() + hyphenated.slice(1);
    }
    return hyphenated;
  }

  function splitFrenchSyllables(word, targetCount) {
    if (word.length <= 3) return word;
    const inseparable = /^(?:bl|br|ch|cl|cr|dr|fl|fr|gl|gr|pl|pr|tr|vr|ph|th|gn)/i;
    const chars = word.split('');
    let cuts = [];

    for (let i = 1; i < chars.length - 1; i++) {
      if (!isVowel(chars[i]) && i < chars.length - 1 && isVowel(chars[i + 1])) {
        if (isVowel(chars[i - 1])) {
          cuts.push(i);
        } else if (i >= 2 && isVowel(chars[i - 2])) {
          const pair = chars[i - 1] + chars[i];
          if (inseparable.test(pair)) {
            cuts.push(i - 1);
          } else {
            cuts.push(i);
          }
        }
      }
    }

    cuts = [...new Set(cuts)].sort((a, b) => a - b);
    if (cuts.length > targetCount - 1) {
      cuts = cuts.slice(0, targetCount - 1);
    }

    if (cuts.length === 0) return word;

    let result = '';
    let last = 0;
    for (const c of cuts) {
      if (c > last && c < word.length) {
        result += word.substring(last, c) + '·';
        last = c;
      }
    }
    result += word.substring(last);
    return result;
  }

  function hyphenateWord(token, count) {
    if (count <= 1) return token;

    // Acronym pronounced letter by letter
    if (isAcronym(token)) {
      const letters = token.replace(/[^A-Za-z]/g, '').toUpperCase().split('');
      return letters.join('·');
    }

    // Converted number
    if (/^\d+$/.test(token)) {
      const spelled = numberToFrenchWords(parseInt(token, 10));
      const words = spelled.split(/[\s-]+/);
      const parts = words.map(w => {
        const c = countWordSyllables(w).count;
        return hyphenateWord(w, c);
      });
      return `${token} (${parts.join('·')})`;
    }

    const lower = token.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿçœæ]/g, '');
    if (SYLLABLE_PARTS[lower]) {
      return matchCase(token, SYLLABLE_PARTS[lower]);
    }

    return splitFrenchSyllables(token, count);
  }

  /**
   * Analyzes a full line and returns the total syllable count along with details for each word
   */
  function countLineSyllables(line, mode = 'rap') {
    if (!line || !line.trim()) {
      return { total: 0, words: [], isEmpty: true };
    }

    // Tokenization (words, dotted or regular acronyms, numbers)
    const tokenRegex = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:'[A-Za-zÀ-ÖØ-öø-ÿ]+)?|[A-Z]\.[A-Z]\.(?:[A-Z]\.)?/g;
    const tokens = line.match(tokenRegex) || [];

    const wordsBreakdown = [];
    let total = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const wordInfo = countWordSyllables(token, mode);
      
      // Classical poetry mode: elision if word ends with 'e' and following word starts with a vowel
      if (mode === 'classique' && i < tokens.length - 1) {
        const nextToken = tokens[i + 1].toLowerCase();
        if (/^[aeiouyàâäéèêëîïôöùûü]/.test(nextToken) && /e[s]?$/i.test(token)) {
          wordInfo.count = Math.max(1, wordInfo.count - 1);
        }
      }

      total += wordInfo.count;
      wordsBreakdown.push({
        token,
        count: wordInfo.count,
        details: wordInfo.details,
        hyphenated: hyphenateWord(token, wordInfo.count),
        isAcronym: wordInfo.isAcronym || false,
        isNumber: wordInfo.isNumber || false
      });
    }

    return {
      total,
      words: wordsBreakdown,
      isEmpty: false
    };
  }

  // Export for browser and Node.js environments
  const LyrrSyllables = {
    countWordSyllables,
    countLineSyllables,
    numberToFrenchWords,
    isAcronym,
    countAcronymSyllables,
    hyphenateWord
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyrrSyllables;
  } else {
    window.LyrrSyllables = LyrrSyllables;
  }
})(typeof window !== 'undefined' ? window : globalThis);

