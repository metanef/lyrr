# Lyrr - Bloc-notes Lyrics & Compteur de Syllabes

Application web locale pour l'écriture de paroles de rap et chansons, avec décompte automatique des pieds / syllabes par ligne en temps réel.

## Lancement

Aucune installation, aucun serveur ni dépendance :
👉 **Double-cliquez simplement sur [index.html](index.html)** dans votre explorateur de fichiers ou navigateur.

---

## Fonctionnalités

1. **Décompte des syllabes dans la marge :**
   - Chaque ligne affiche son nombre de pieds sur la marge de gauche en chiffres bruts monospace.
   - Les vers inactifs restent dans un gris subtil et discret.
   - Le vers actif ressort avec une lueur violette néon.
   - Édition directe du nombre de pieds en cliquant sur le chiffre (validation par Entrée).

2. **Décomposition syllabique à droite du vers actif :**
   - Le vers en cours d'édition affiche immédiatement la découpe phonétique de chaque mot (`heu·reux¹ · qua·torze¹`).
   - Typographie fine et discrète séparée par des points médians (`·`).
   - Détection des sigles en bleu cyan (`P·D·G`) et des nombres en ambre (`14`).
   - Masquable en un clic via l'interrupteur "Détail" dans la barre de statut.

3. **Mode Zen plein écran (`Alt + Z`) :**
   - Masque l'en-tête et les barres d'outils pour une immersion d'écriture sans distraction.
   - Quittable à tout moment avec **Échap** ou **Alt + Z**.

4. **Barre de statut basse minimaliste :**
   - Récapitulatif instantané du nombre de vers, du total de pieds et de la moyenne par ligne.
   - Accès rapide au Mode Zen et au toggle de décomposition.

5. **Gestion automatique des sigles & acronymes :**
   - Les sigles en majuscules sont prononcés lettre par lettre :
     - `PDG` ➔ **3 pieds** (P-D-G)
     - `RATP` ➔ **4 pieds**
     - `FBI` ➔ **3 pieds**

6. **Gestion automatique des nombres en chiffres :**
   - Les chiffres sont traduits phonétiquement en temps réel :
     - `14` ➔ _"quatorze"_ ➔ **2 pieds**
     - `100` ➔ _"cent"_ ➔ **1 pied**
     - `2026` ➔ _"deux mille vingt-six"_ ➔ **4 pieds**

7. **Sauvegarde & Multi-projets :**
   - **Sauvegarde automatique locale (`localStorage`)** : vos paroles restent enregistrées dans votre navigateur.
   - **Projets** : gestionnaire pour créer et basculer entre plusieurs chansons.
   - **Export** : copier le texte brut, copier avec les mesures `[4]`, ou télécharger un fichier `.txt`.

8. **Onglet Genius Lyrics Optimizer (100% Local & Instantané) :**
   - Bascule immédiate entre **Studio Lyrics** et **Genius Optimizer** depuis la navigation.
   - **Moteur Senior Local :** nettoyage et mise en page instantanés sans clé API ni serveur :
     - **Normalisation des en-têtes de sections :** `[Intro]`, `[Couplet 1 : Artiste]`, `[Refrain]`, `[Pré-refrain]`, `[Pont]`, `[Outro]`.
     - **Expansion automatique des refrains :** tout rappel isolé duplique automatiquement les paroles complètes du refrain.
     - **Multiplicateurs :** répétitions de lignes `(x2)` automatiquement dupliquées.
     - **Ponctuation & Ad-libs :** suppression des virgules et points finaux superflus, parenthèses uniformisées `(Skrrt)`.
     - **Correction orthographique ciblée :** respecte le slang, l'argot et les néologismes.
   - **Synchronisation bidirectionnelle :** importer depuis le Studio et renvoyer vers le Studio en un clic.

---

## Fichiers

- [index.html](index.html) : Structure de l'application (Studio + Onglet Genius)
- [style.css](style.css) : Thème sombre et styles complets
- [syllables.js](syllables.js) : Moteur de phonétique française (syllabes, sigles, chiffres)
- [app.js](app.js) : Logique de l'éditeur, raccourcis et optimiseur Genius

---

## ⌨️ Raccourcis Clavier

- `Alt + 1` à `Alt + 6` : Insérer des sections (`[Couplet 1]`, `[Refrain]`, `[Pont]`, etc.)
- `Alt + A` : Encadrer en ad-lib `( ... )`
- `Alt + X` : Ajouter la répétition `(x2)`
- `Alt + D` : Supprimer la ligne active
- `Alt + ↑ / ↓` : Déplacer la ligne vers le haut ou le bas
- `Alt + Z` : Mode Zen plein écran
- `Ctrl + S` : Sauvegarde manuelle immédiate
- `Échap` : Quitter le mode Zen / fermer les fenêtres modales

---

## 🗺️ Roadmap & ToDo

### ✅ Déjà implémenté (v1.5)

- [x] **Éditeur de texte fluide** avec marge gauche synchronisée au scroll et aux retours à la ligne
- [x] **Comptage automatique des pieds/syllabes** en temps réel selon les règles phonétiques françaises
- [x] **Gestion des acronymes & sigles** : détection automatique et prononciation lettre par lettre (`PDG` = 3, `RATP` = 4, `FBI` = 3...)
- [x] **Gestion des nombres en chiffres** : conversion phonétique instantanée (`14` = 2, `100` = 1, `2026` = 4...)
- [x] **Marge épurée en chiffres bruts** : sobre en gris, lueur violette sur la ligne active et édition directe au clic
- [x] **Décomposition syllabique sur la ligne active** : affichage typographique avec sous-découpe (`·`) et compteurs discrets
- [x] **Mode Zen plein écran (`Alt + Z`)** : écriture sans distraction avec masquage des menus
- [x] **Barre de statut basse** : vers, total pieds, moyenne et interrupteur détail
- [x] **Onglet Genius Lyrics Optimizer 100% Local & Instantané** (normalisation, duplication des refrains/répétitions, ponctuation, majuscules)
- [x] **Synchronisation bidirectionnelle Studio ↔ Genius**
- [x] **Sauvegarde locale automatique** (`localStorage`) pour ne jamais perdre ses sessions
- [x] **Gestionnaire multi-projets** : créer, basculer et gérer plusieurs chansons
- [x] **Raccourcis clavier complets** : sections, ad-libs, répétitions, déplacement de lignes
- [x] **Correction orthographique rap & chanson** : respect de l'argot, du slang US et des néologismes
- [x] **100% autonome et local** : aucune dépendance, aucun serveur

### 🚀 Prochaines étapes (v2.0)

- [ ] **Mode PWA (installable hors-ligne)** : installation native sur bureau et mobile
