# guitar-fretboard-master
Practice tool for scales, chords with interactive fretboard 

## GitHub Pages deployment

This repository includes an automated GitHub Actions workflow at `.github/workflows/deploy.yml` that builds and deploys the app whenever code is pushed to `main`.

### What to configure in your app

1. Ensure your React app has a `build` script in `package.json`.
2. If you are using **Create React App**, set:
   - `"homepage": "https://<username>.github.io/<repository-name>/"`
3. If you are using **Vite**, set your base path in `vite.config.*`:
   - `base: '/<repository-name>/'`

### GitHub repository settings

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the Actions tab) to trigger deployment.

After deployment, your site URL will be:

- `https://<username>.github.io/<repository-name>/`

If the site does not load immediately, wait 1–2 minutes and check the **Actions** tab for failures.
