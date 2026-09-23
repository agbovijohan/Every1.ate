# EVERY1.ATE — site statique

3 fichiers + 1 dossier, publiables tels quels sur n'importe quel hébergeur
(Netlify, Vercel, OVH, o2switch, GitHub Pages…) ou importables dans un éditeur.

```
site/
├── index.html   structure + contenu
├── style.css    tout le design (desktop, tablette ≤ 900px, mobile ≤ 480px)
├── script.js    horloge Paris + animation hero mobile + formulaire
└── assets/      images (voir assets/LISEZ-MOI.txt)
```

## Publier sur Netlify (relié à GitHub)
Le fichier `netlify.toml` (à la racine du dépôt) indique à Netlify de publier
le dossier `site/`. Aucun réglage à faire.

1. Créer un compte sur netlify.com avec « Sign up with GitHub ».
2. Add new site → Import an existing project → GitHub → `agbovijohan/Every1.ate`.
3. Branch to deploy : `claude/every1ate-responsive-redesign-emjjtf`.
4. Laisser les autres champs tels quels → Deploy.

Ensuite, chaque modification poussée sur cette branche met le site à jour
automatiquement (1 minute environ).

## Vidéos
Chargées depuis GitLab (mêmes URLs que Silex). Une seule balise `<video>` :
le navigateur prend la version 9:16 si l'écran fait ≤ 480px, sinon la version web.
Pour plus de fiabilité, les héberger dans `assets/` et remplacer les deux `src`
dans `index.html`.

## Formulaire
Envoi via Formspree (`https://formspree.io/f/mjyvnlvd`), inchangé.
