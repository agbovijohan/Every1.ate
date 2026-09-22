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

## Publier
1. Copier les images dans `assets/` avec les noms indiqués.
2. Envoyer le dossier `site/` entier sur l'hébergeur (index.html à la racine).

## Vidéos
Chargées depuis GitLab (mêmes URLs que Silex). Une seule balise `<video>` :
le navigateur prend la version 9:16 si l'écran fait ≤ 480px, sinon la version web.
Pour plus de fiabilité, les héberger dans `assets/` et remplacer les deux `src`
dans `index.html`.

## Formulaire
Envoi via Formspree (`https://formspree.io/f/mjyvnlvd`), inchangé.
