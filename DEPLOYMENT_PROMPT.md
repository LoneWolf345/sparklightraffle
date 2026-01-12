# Reusable deployment preparation prompt

Use this prompt to prepare any Vite + React + TypeScript project for Docker-based OpenShift deployment.

```
You are preparing a Vite + React + TypeScript app for Docker-based OpenShift deployment.

Requirements:
- Use a multi-stage Dockerfile with a Node build stage and an Nginx runtime stage.
- Base image preference: Alpine, most recent stable Node.
- Use npm for installs and builds.
- Expose port 8080 and serve the app at "/".
- Support SPA routing (fallback to index.html).
- Provide a .dockerignore.
- Document build-time env vars (all VITE_*, Supabase keys, and API endpoints) in .env.example.
- Add README instructions for docker build/run and a Mermaid sequence diagram for build->push->deploy.
- Do not include OpenShift YAML manifests.

Please implement the Dockerfile, nginx config (if needed), .dockerignore, .env.example, and README updates.
```
