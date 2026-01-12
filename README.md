# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment

### Docker (OpenShift-friendly)

This deployment uses a multi-stage Docker build with an Nginx runtime, listening on port `8080` and serving the app at `/`.

#### Build-time environment variables

Vite injects environment variables at build time, so provide them during the Docker build. See `.env.example` for the required Supabase values and add your API variables with the `VITE_` prefix.

```bash
docker build \\
  --build-arg VITE_SUPABASE_URL="https://your-project.supabase.co" \\
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="your-key" \\
  --build-arg VITE_API_BASE_URL="https://api.example.com" \\
  -t sparklight-raffle:latest .
```

#### Run locally

```bash
docker run --rm -p 8080:8080 sparklight-raffle:latest
```

#### Deployment flow (Docker-based)

```mermaid
sequenceDiagram
  autonumber
  participant Dev as Developer
  participant Build as Docker Build
  participant Registry as Image Registry
  participant OCP as OpenShift

  Dev->>Build: docker build (with VITE_* build args)
  Build-->>Dev: Image artifact
  Dev->>Registry: docker push
  Registry-->>OCP: Image pull
  OCP-->>Dev: App running on port 8080
```

### Reusable deployment prompt

Use the following prompt to prepare any Vite + React project for the same Docker-based deployment flow:

```
You are preparing a Vite + React + TypeScript app for Docker-based OpenShift deployment.

Requirements:
- Use a multi-stage Dockerfile with a Node build stage and an Nginx runtime stage.
- Base image preference: Alpine, most recent stable Node.
- Expose port 8080 and serve the app at "/".
- Support SPA routing (fallback to index.html).
- Provide a .dockerignore.
- Document build-time env vars (all VITE_*, Supabase keys, and API endpoints) in .env.example.
- Add README instructions for docker build/run and a Mermaid sequence diagram for build->push->deploy.
- Do not include OpenShift YAML manifests.

Please implement the Dockerfile, nginx config (if needed), .dockerignore, .env.example, and README updates.
```

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
