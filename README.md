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

### Lovable Publish

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

### OpenShift S2I Deployment

This project is configured for deployment on OpenShift using S2I (Source-to-Image) with RHEL8 Node.js 20.

#### Prerequisites

- Access to OpenShift cluster with **Tekton Pipelines 1.17.0**
- Permissions to create resources in the project namespace

#### CI/CD Pipeline (Tekton)

1. Create project if needed:
   ```bash
   oc new-project sparklight-raffle
   ```

2. Apply pipeline resources:
   ```bash
   oc apply -f openshift/pipeline/pipeline-pvc.yaml
   oc apply -f openshift/pipeline/pipeline.yaml
   ```

3. Start the pipeline:
   ```bash
   oc create -f openshift/pipeline/pipeline-run.yaml
   ```

#### Manual Deploy (Alternative)

1. Apply deployment resources:
   ```bash
   oc apply -f openshift/deployment.yaml
   oc apply -f openshift/service.yaml
   oc apply -f openshift/route.yaml
   oc apply -f openshift/network-policy.yaml
   ```

#### Configuration

- **Security Context Constraint:** nonroot-v2
- **Resource Limits:** CPU 200m-500m, Memory 256Mi-512Mi
- **Health Probes:** HTTP GET `/` on port 8080

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
