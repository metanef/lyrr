# Lyrr - Bloc-notes Lyrics & Compteur de Syllabes

Application web locale pour l'écriture de paroles de rap et chansons, avec décompte automatique des pieds / syllabes par ligne en temps réel.

## Lancement

Aucune installation, aucun serveur ni dépendance :
👉 **Double-clique simplement sur [index.html](file:///d:/DATA/01_DEV/01_NOW/lyrr/index.html)** dans ton explorateur Windows.

---

## Fonctionnalités

1. **Décompte des syllabes dans la marge (sans numéros de ligne) :**
   - Chaque ligne affiche son nombre de pieds sur la marge de gauche (avec code couleur dynamique selon la longueur).
   - Colonne ultra-épurée : uniquement le badge du nombre de pieds, centré et cliquable.

2. **Décomposition et sous-découpe syllabique entre les vers :**
   - Quand tu cliques sur une ligne, **une nouvelle ligne s'intercale physiquement entre le vers précédent et le vers actif** :
     - Les mots de plus d'un pied affichent leur **sous-découpe phonétique** (ex : `heu·reux [2]`, `qua·torze [2]`, `mi·cro·phone [3]`, `P·D·G [3]`, `14 (qua·torze) [2]`).
     - **Code couleur épuré** : les sigles s'affichent en bleu cyan et les nombres en orange ambré sans étiquette encombrante.
     - Les lignes au-dessus et en-dessous s'écartent avec une animation fluide.
     - Cliquer à droite de l'éditeur ou dans le vide referme immédiatement la ligne de décomposition.
   - **Navigation & frappe 100% naturelle :** Touche Entrée pour insérer un vers, Retour arrière pour fusionner, Flèches Haut/Bas pour naviguer entre les lignes, collage multi-lignes automatique et barre de défilement toujours accessible.

3. **Bandeau de légende du code couleur sous le header (dépliable & déplié de base) :**
   - Situé juste sous la barre supérieure, il récapitule visuellement les types de mots avec des exemples interactifs :
     - **Mots standards** (texte normal, séparation par `·`)
     - **Sigles & Acronymes** (badge cyan, épelés lettre par lettre : `P·D·G`, `R·A·T·P`)
     - **Chiffres & Nombres** (badge orange ambré, convertis en mots : `14` ➔ `qua·torze`)
   - Déplié par défaut à l'ouverture, repliable d'un simple clic sur son en-tête.

4. **Gestion automatique des sigles & acronymes :**
   - Les sigles en majuscules sont prononcés lettre par lettre :
     - `PDG` ➔ **3 pieds** (P-D-G)
     - `RATP` ➔ **4 pieds**
     - `FBI` ➔ **3 pieds**

5. **Gestion automatique des nombres en chiffres :**
   - Les chiffres sont traduits phonétiquement en temps réel :
     - `14` ➔ _"quatorze"_ ➔ **2 pieds**
     - `100` ➔ _"cent"_ ➔ **1 pied**
     - `2026` ➔ _"deux mille vingt-six"_ ➔ **4 pieds**

6. **Ajustement manuel instantané :**
   - En cliquant sur le badge d'une ligne dans la marge gauche, tu peux forcer manuellement le nombre de pieds si tu as un flow spécifique.

7. **Sauvegarde & Multi-projets :**
   - **Sauvegarde automatique locale (`localStorage`)** : tes paroles ne sont jamais perdues.
   - **Projets** : bouton en haut pour créer et basculer entre plusieurs chansons.
   - **Export** : copier le texte brut, copier avec les mesures `[4]`, ou télécharger un fichier `.txt`.

8. **Onglet Genius Lyrics Optimizer (100% Local & Instantané) :**
   - Bascule immédiate entre **Studio Lyrics** et **Genius Optimizer** depuis la barre de navigation supérieure.
   - **Moteur Senior Local Dédié :** nettoyage et mise en page instantanés sans aucune clé API, sans serveur et sans quota :
     - **Normalisation des en-têtes de sections :** `[Intro]`, `[Couplet 1 : Artiste]`, `[Refrain]`, `[Pré-refrain]`, `[Pont]`, `[Outro]`, `[Solo]`, `[Break]`, `[Interlude]`.
     - **Expansion automatique des refrains :** tout rappel isolé type `Refrain`, `(Refrain)` ou `Repeat Chorus` duplique automatiquement les paroles complètes du refrain de la chanson.
     - **Multiplicateurs étendus :** `[Refrain x2]` et répétitions de lignes `(x2)`, `x2`, `(bis)` automatiquement dupliqués.
     - **Ponctuation épurée :** suppression des virgules et points finaux superflus, préservation stricte de `?`, `!` et `...`.
     - **Ad-libs & Majuscules :** transformation des crochets `[skrrt]` et étoiles en parenthèses `(Skrrt)` avec majuscules systématiques sur chaque début de ligne et ad-lib.
     - **Bilan d'optimisation interactif :** affichage immédiat des statistiques des corrections effectuées (sections, majuscules, ponctuations, répétitions).
   - **Synchronisation bidirectionnelle :** bouton "Importer du Studio" pour charger vos lyrics en un clic, et bouton "Renvoyer au Studio" pour réinjecter le texte formaté dans l'éditeur de pieds.

---

## Fichiers

- [index.html](lyrr/index.html) : Structure de l'application (Studio + Onglet Genius)
- [style.css](lyrr/style.css) : Thème sombre et styles complets (Studio + Genius Formatter)
- [syllables.js](lyrr/syllables.js) : Moteur de phonétique française (syllabes, sigles, chiffres)
- [app.js](lyrr/app.js) : Logique de l'éditeur, comptage temps réel et optimiseur Genius

---

## 🗺️ Roadmap & ToDo

### ✅ Déjà implémenté (v1.5)

- [x] **Éditeur de texte fluide** avec marge gauche synchronisée au scroll et aux retours à la ligne
- [x] **Comptage automatique des pieds/syllabes** en temps réel selon les règles phonétiques françaises
- [x] **Gestion des acronymes & sigles** : détection automatique et prononciation lettre par lettre (`PDG` = 3, `RATP` = 4, `FBI` = 3...)
- [x] **Gestion des nombres en chiffres** : conversion phonétique instantanée (`14` = 2, `100` = 1, `2026` = 4...)
- [x] **Décomposition sur la ligne active** : affichage intercalé entre les vers avec sous-découpe (`·`)
- [x] **Code couleur épuré & légende dépliable** sous le header (sans mentions textuelles encombrantes)
- [x] **Onglet Genius Lyrics Optimizer 100% Local & Instantané** (moteur Senior complet, sans clé API ni quota, avec bilan interactif)
- [x] **Synchronisation bidirectionnelle Studio ↔ Genius**
- [x] **Ajustement manuel** : clic sur le badge d'un vers pour forcer un nombre de pieds particulier
- [x] **Sauvegarde locale automatique** (`localStorage`) pour ne jamais perdre ses sessions
- [x] **Gestionnaire multi-projets** : créer, basculer et gérer plusieurs textes
- [x] **Raccourcis clavier rapides & flow d'écriture** :
  - `Alt + 1` : `[Couplet 1, 2...]` (auto-incrémentation)
  - `Alt + 2` : `[Refrain]`
  - `Alt + 3` : `[Pré]` (pré-refrain / pré-couplet)
  - `Alt + 4` : `[Pont]`
  - `Alt + 5` : `[Intro]`
  - `Alt + 6` : `[Outro]`
  - `Alt + A` : Formater la ligne ou la sélection en Ad-lib `( ... )`
  - `(` : Auto-encadrement de la sélection
  - `Alt + X` : Répétition `(x2)` en fin de vers
  - `Alt + D` : Supprimer la ligne active
  - `Alt + ↑ / ↓` : Déplacer la ligne active
  - `Ctrl + S` : Sauvegarde manuelle immédiate
- [x] **Correction orthographique ciblée** pour le français avec protection intégrale du slang US, de l'argot et des néologismes
- [x] **100% autonome et local** : s'exécute d'un double-clic sur `index.html`, sans serveur ni dépendance

### 🚀 Prochaines étapes (v2.0)

- [ ] **Dictionnaire de rimes & assonances local** : suggestion de rimes par proximité phonétique sans connexion internet
- [ ] **Surlignage visuel des rimes** : code couleur sur les fins de vers qui riment ensemble
