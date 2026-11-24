# Heute Abend: auf GitHub bringen

Dauert etwa 10 Minuten. Danach läuft die App unter
`https://<dein-github-name>.github.io/teile-generator/` am Handy und am PC.

## 1. Repository anlegen

1. Auf github.com oben rechts **+** und dann **New repository**.
2. Name: `teile-generator`
3. Sichtbarkeit: **Public** (GitHub Pages ist bei privaten Repos nur mit bezahltem Konto möglich).
4. **Kein** README, keine .gitignore, keine Lizenz anhaken. Das ist alles schon im Ordner.
5. **Create repository**.

## 2. Dateien hochladen

### Weg A: Terminal am Mac (empfohlen)

Den Ordner `TeileGenerator` auf den Mac holen, dann im Terminal:

```bash
cd ~/Pfad/zu/TeileGenerator
git init -b main
git add .
git commit -m "Erste Version Teile-Generator"
git remote add origin https://github.com/<dein-github-name>/teile-generator.git
git push -u origin main
```

Beim ersten Push fragt Git nach Anmeldung. Am einfachsten vorher mit `brew install gh` und `gh auth login` anmelden.

### Weg B: nur im Browser

Im neuen Repo auf **uploading an existing file** klicken und den **Inhalt** des Ordners hineinziehen (nicht den Ordner selbst). Wichtig: der versteckte Ordner `.github` muss mit. Im Finder versteckte Dateien mit **Cmd + Shift + .** einblenden. Falls der Upload `.github` nicht mitnimmt, die Datei im Repo über **Add file > Create new file** mit dem Namen `.github/workflows/deploy.yml` anlegen und den Inhalt hineinkopieren.

`node_modules` und `dist` **nicht** hochladen (die gibt es im Ordner auch nicht).

## 3. GitHub Pages einschalten

1. Im Repo: **Settings > Pages**.
2. Bei **Source** auf **GitHub Actions** stellen.
3. Reiter **Actions** öffnen. Der Lauf „Deploy auf GitHub Pages“ startet automatisch (oder dort **Run workflow** drücken).
4. Nach 1 bis 2 Minuten steht der Link unter **Settings > Pages** und im Actions-Lauf.

## 4. Aufs Handy

Link am iPhone in Safari öffnen, **Teilen > Zum Home-Bildschirm**. Dann startet die App wie eine normale App.

## Später ändern

Jede Änderung, die auf `main` gepusht wird, baut die Seite automatisch neu. Wenn ein Test fehlschlägt, wird nichts veröffentlicht und die alte Version bleibt online.

## Wenn etwas hakt

* **Actions-Lauf rot bei „npm ci“**: Prüfen, ob `package-lock.json` mit hochgeladen wurde.
* **Seite weiß/leer**: Settings > Pages muss auf „GitHub Actions“ stehen, nicht auf „Deploy from a branch“.
* **404**: Ein paar Minuten warten, der erste Deploy braucht etwas.
