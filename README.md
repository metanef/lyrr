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
     - `14` ➔ *"quatorze"* ➔ **2 pieds**
     - `100` ➔ *"cent"* ➔ **1 pied**
     - `2026` ➔ *"deux mille vingt-six"* ➔ **4 pieds**

6. **Ajustement manuel instantané :**
   - En cliquant sur le badge d'une ligne dans la marge gauche, tu peux forcer manuellement le nombre de pieds si tu as un flow spécifique.

7. **Sauvegarde & Multi-projets :**
   - **Sauvegarde automatique locale (`localStorage`)** : tes paroles ne sont jamais perdues.
   - **Projets** : bouton en haut pour créer et basculer entre plusieurs chansons.
   - **Export** : copier le texte brut, copier avec les mesures `[4]`, ou télécharger un fichier `.txt`.

---

## Fichiers
- [index.html](file:///d:/DATA/01_DEV/01_NOW/lyrr/index.html) : Structure de l'application
- [style.css](file:///d:/DATA/01_DEV/01_NOW/lyrr/style.css) : Thème sombre et styles de l'éditeur
- [syllables.js](file:///d:/DATA/01_DEV/01_NOW/lyrr/syllables.js) : Moteur de phonétique française (syllabes, sigles, chiffres)
- [app.js](file:///d:/DATA/01_DEV/01_NOW/lyrr/app.js) : Synchronisation de l'affichage sur la ligne active et sauvegarde

---

## 🗺️ Roadmap & ToDo

### ✅ Déjà implémenté (v1.0)
- [x] **Éditeur de texte fluide** avec marge gauche synchronisée au scroll et aux retours à la ligne
- [x] **Comptage automatique des pieds/syllabes** en temps réel selon les règles phonétiques françaises
- [x] **Gestion des acronymes & sigles** : détection automatique et prononciation lettre par lettre (`PDG` = 3, `RATP` = 4, `FBI` = 3...)
- [x] **Gestion des nombres en chiffres** : conversion phonétique instantanée (`14` = 2, `100` = 1, `2026` = 4...)
- [x] **Décomposition sur la ligne active** : affichage au bout du vers cliqué sans perturber la frappe
- [x] **Ajustement manuel** : clic sur le badge d'un vers pour forcer un nombre de pieds particulier
- [x] **Sauvegarde locale automatique** (`localStorage`) pour ne jamais perdre ses sessions
- [x] **Gestionnaire multi-projets** : créer, basculer et gérer plusieurs textes
- [x] **Options d'export rapide** : texte brut, texte avec mesures `[4]`, téléchargement `.txt`
- [x] **100% autonome et local** : s'exécute d'un double-clic sur `index.html`, sans serveur ni dépendance

### 🚀 Prochaines étapes (v2.0)
- [ ] **Intégration du Genius Lyrics Optimizer (Tout-en-un local)** :
  - Intégrer les fonctionnalités du Genius Lyrics Optimizer directement dans l'application
  - Formatage et nettoyage automatique selon les règles de style Genius (gestion de la casse, ponctuation superflue, formatage des ad-libs)
  - Détection et insertion automatique des balises de sections : `[Intro]`, `[Couplet 1]`, `[Pré-refrain]`, `[Refrain]`, `[Pont]`, `[Outro]`
  - Normalisation des retours à la ligne et espaces pour les soumissions Genius
- [ ] **Dictionnaire de rimes & assonances local** : suggestion de rimes par proximité phonétique sans connexion internet
- [ ] **Surlignage visuel des rimes** : code couleur sur les fins de vers qui riment ensemble
- [ ] **Raccourcis clavier rapides** : pour insérer les tags de structure (`Ctrl+1` Couplet, `Ctrl+2` Refrain, etc.)

