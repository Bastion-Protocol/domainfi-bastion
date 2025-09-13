# Bastion Protocol Environment Setup & Security Best Practices

## 1. Environment Variables

- **Never commit real private keys or secrets to version control.**
- Always use `.env` files for local development and CI/CD secrets management for production.
- Use the provided `.env.example` files as templates for your real `.env` files in each package/app.

## 2. Key Management

- Store private keys in environment variables, not in code or config files.
- Use a secure secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, 1Password) for production deployments.
- Rotate keys regularly and restrict their permissions to only what is necessary.
- For local development, use test keys only. Never use mainnet keys on testnets or in public repos.

## 3. API Keys & Sensitive Data

- Treat all API keys (Alchemy, Infura, Snowtrace, etc.) as secrets.
- Use `.env` files locally and secret managers in production.
- Never log or expose secrets in frontend code or error messages.

## 4. Database URLs

- Store database connection strings in environment variables.
- Use different databases for development, staging, and production.

## 5. Contract & Token Addresses

- Populate contract and token addresses in `.env` files after deployment.
- Use separate addresses for each network (Doma, Fuji, Avalanche, etc.).

## 6. Frontend & API URLs

- Set frontend and API URLs in `.env` files for each environment (local, staging, production).

## 7. Example Workflow

1. Copy `.env.example` to `.env` in each relevant directory.
2. Fill in the required values for your environment.
3. Add `.env` to your `.gitignore` to prevent accidental commits.

---

**Stay secure!**
