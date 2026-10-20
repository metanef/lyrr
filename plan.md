# Plan : Bloc-notes Lyrics & Compteur de Syllabes (Lyrr)

## Objectif
Créer une application web légère, esthétique et autonome sous forme d'un simple fichier `index.html` (avec CSS et JS intégrés ou modulaires, ouvrable d'un simple double-clic sans serveur ni installation), dédiée à l'écriture de paroles/rap avec calcul automatique du nombre de pieds/syllabes en temps réel pour chaque ligne.

---

## 1. Comment fonctionne le calcul des pieds/syllabes en français

1. **Règles phonétiques du français :**
   - Regroupement des voyelles et diphtongues (`eau`, `ai`, `ou`, `on`, `an`, `oi`, `eu`, `ui`, etc.) en une seule émission de voix (ex: *"suis"* = 1 syllabe, *"heureux"* = 2 syllabes).
   - Gestion des **e muets** finaux (souvent non prononcés en fin de ligne ou en flow parlé/rap, ex: *"monde"* = 1 ou 2 syllabes selon le style).
   - Découpage par mot et agrégation par ligne.

2. **Modes de comptage adaptés :**
   - **Mode Rap / Moderne (par défaut) :** Comptage basé sur la prononciation naturelle parlée/chantée.
   - **Ajustement manuel instantané :** Clic sur le compteur d'une ligne pour ajuster (+ / -) si l'artiste fait une diérèse ou prononce un 'e' différemment.

---

## 2. Architecture & Choix Techniques

- **100% Local & Zéro Dépendance :** Fonctionne directement avec le protocole `file://` (double-clic sur `index.html`).
- **Éditeur fluide :** Zone de texte synchronisée avec une marge latérale dynamique (gutter) affichant le nombre de syllabes aligné avec chaque ligne (même en cas de retours à la ligne).
- **Sauvegarde automatique locale :** Enregistrement en direct dans le `localStorage` du navigateur pour ne jamais perdre ses rimes/lyrics.
- **Design Studio / Dark Mode Premium :** Palette sombre, typographie soignée pour lyricistes, indicateurs visuels du rythme.

---

## 3. Tâches d'implémentation

- [x] **Tâche 1 : Algorithme de comptage syllabique français, acronymes & nombres**
  - Règles de découpage phonologique (voyelles composées, diphtongues, 'e' muet, apostrophes).
  - Gestion des acronymes prononcés lettre par lettre (ex: `PDG` = 3 pieds, `RATP` = 4 pieds, `FBI` = 3 pieds).
  - Gestion des nombres écrits en chiffres convertis en phonétique (ex: `14` = 2 pieds, `2026` = 4 pieds).
  - Vérification : 10/10 tests unitaires réussis.

- [x] **Tâche 2 : Structure HTML & Layout Éditeur synchronisé**
  - Architecture du bloc-notes avec gouttière latérale synchronisée au scroll et au saut de ligne.
  - Découpage par mesure de 4 temps (repères M1, M2, M3...).

- [x] **Tâche 3 : Design & Thème "Studio Lyrics" (CSS moderne)**
  - Palette sombre "Midnight Studio", design soigné, sans framework externe.
  - Badges colorés selon les métriques clés (8, 10, 12 alexandrin, 16 pieds).

- [x] **Tâche 4 : Fonctionnalités d'assistance aux lyricistes & Sous-découpe**
  - Sauvegarde automatique en direct dans `localStorage`.
  - Décomposition des syllabes insérée physiquement entre les vers lors du clic.
  - Sous-découpe des mots avec séparateur médian (`heu·reux`, `qua·torze`).
  - Code couleur épuré : sigles en cyan (`#67e8f9`), chiffres en orange (`#fcd34d`), sans étiquette textuelle intrusive.
  - Bandeau dépliable de légende sous le header (déplié par défaut, pliable en un clic).
  - Ajustement manuel des pieds au clic sur le badge d'une ligne.
  - Gestionnaire multi-textes (créer, charger, supprimer plusieurs projets de chansons).
  - Copie rapide (texte brut ou avec les pieds `[4]`) et téléchargement `.txt`.

- [x] **Tâche 5 : Tests & Validation**
  - Validation logique via Node.js réussie.
  - Fonctionne en local direct par double-clic sur `index.html`.

---

## 4. Prochaines évolutions (v2.0)
- [ ] **Intégration du Genius Lyrics Optimizer (Tout-en-un local)** :
  - Nettoyage et formatage selon les conventions Genius (majuscules en début de ligne, suppression de ponctuation inutile, formatage des ad-libs entre parenthèses).
  - Détection et insertion des balises de sections (`[Couplet 1]`, `[Refrain]`, `[Pont]`, etc.).
- [ ] Dictionnaire de rimes & assonances local.
- [ ] Raccourcis clavier pour insérer les balises de structure.

---

## Critères de réussite ("Done When")
- [x] Le fichier `index.html` s'ouvre d'un double-clic dans Chrome, Firefox, Edge, sans console d'erreur ni dépendance.
- [x] Chaque ligne affiche son nombre de syllabes en temps réel (ex: *"Je suis heureux"* affiche 4, *"PDG"* affiche 3, *"14"* affiche 2).
- [x] La décomposition s'affiche directement sur la ligne sans bloquer la saisie.
- [x] Le texte et les réglages sont préservés lors d'un rechargement de page.


