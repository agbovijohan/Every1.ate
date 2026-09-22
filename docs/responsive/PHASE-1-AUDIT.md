# EVERY1.ATE — Refonte responsive · Phase 1 : audit

Source analysée : export HTML Silex 3.9.0 fourni par le client (le fichier CSS
`/css/index-7a263712….css` généré par Silex n'a pas été fourni).

Breakpoint : desktop `> 480px` / mobile `<= 480px` — c'est le breakpoint du mode
**Mobile** de Silex 3 (GrapesJS), donc tout le layout mobile peut se régler
dans le Style Manager en mode Mobile, sans code custom.

---

## 1. Écarts entre le brief et l'export

| Élément annoncé | Présent dans l'export ? |
|---|---|
| `it50hf` (vidéo desktop) | Oui |
| `ieeh-2-2` (vidéo mobile) | Oui |
| `Container-logo`, `hero-logo`, `hero-statement`, `open-project-form` | Oui |
| `Container-logo Mobile`, `icone logo mobile`, `logo typo mobile` | **Non** |
| `mobile-fixed-bar`, `mobile-fixed-icon`, `mobile-fixed-clock`, `Mobile fixed open` | **Non** |
| Marquee avec 6 textes différents | Export : 6 × « THE CREATIVE & STRATEGIC KITCHEN. » — **version à jour fournie : `silex/marquee.html`** |
| Ordre footer : Main → Marquee → Meta | **Non** — Main → Meta → Marquee (marquee hors de `#footer`) |

Les noms contenant des espaces (`Container-logo Mobile`, …) sont des **noms de
calques** Silex, pas des IDs HTML valides.

## 2. Inventaire du code custom

| # | Emplacement | Rôle | Problème | Verdict |
|---|---|---|---|---|
| A | `<script>` dans `#Top-bar` | Horloge | Doublon de G (2 `setInterval`) | SUPPRIMER (Phase 2) |
| B | `<style>` dans `#Container-logo` | `mix-blend-mode` sur `#ildzb` | `#i8fkg`, `#idani` n'existent pas | GARDER, nettoyer (Phase 3) |
| C | `<style>` dans `#brigade-pierre` | Hover portraits (img scale) | Doublon de E → double transform | SUPPRIMER (Phase 5) |
| D | `<style>` + HTML marquee | Marquee | Textes : OK (référence `silex/marquee.html`, 75s, padding 18vw). Reste : position (doit être entre Footer Main et Footer Meta) | GARDER, position à corriger (Phase 6) |
| E | `<style>` « INTERACTIONS + FORM » | Hovers + formulaire | Panneau `min 580px` → cassé sur mobile ; `#footer-email/#footer-portfolio` inexistants | GARDER, compléter mobile plus tard |
| F | HTML formulaire | Formulaire | — | GARDER |
| G | `<script>` DOMContentLoaded | Vidéo + horloge + form + mails | Partie vidéo cible `ieeh-2` (inexistant) ; mails ciblent `footer-email`/`footer-portfolio` (inexistants) | GARDER, retirer la partie vidéo (Phase 2) |
| H | `<style>` vidéo | Switch vidéo | Cible `ith50hf` (faux ID) → `it50hf` jamais masquée sur mobile | SUPPRIMER (Phase 2) |
| I | `<script>` resize vidéo | Switch vidéo JS | Cible `ith50hf` → sort immédiatement, ne fait rien | SUPPRIMER (Phase 2) |

## 3. Bugs / risques identifiés

1. **Vidéo** : 3 logiques (G, H, I), aucune ne vise `it50hf` → sur mobile les
   deux vidéos sont affichées.
2. **Vidéos sans `playsinline`** → autoplay non garanti sur iPhone.
3. **Courier Prime n'est pas chargée** (Google Fonts ne charge que Arimo) →
   fallback Courier New / monospace système, rendu différent sur Android.
4. **IDs brigade avec `#`** : `#brigade-johan` etc. → sélecteurs CSS classiques
   inopérants.
5. **Brigade** : portraits (`i0uzh`) et textes (`iayiq`) dans deux conteneurs
   séparés → empilement portrait/nom impossible sans réorganisation CSS
   (`display: contents` + `order` en Phase 5).
6. **Email footer** : `iw30hi-2` est un texte, pas un lien ; le JS vise
   `footer-email` qui n'existe pas → email non cliquable.
7. `href` sur des `div` (`irponj`, `open-project-form`) : sans effet ; le CTA
   n'est pas focusable au clavier.
8. `lang=""` vide → mettre `fr` dans les réglages de page.

## 4. Pièces manquantes pour la Phase 2

- Le CSS publié par Silex (`/css/index-….css`).
- Un export HTML à jour (avec les éléments mobile et le marquee actuel).
