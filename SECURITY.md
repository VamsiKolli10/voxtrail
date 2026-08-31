# Security policy

## Supported versions

Only the latest commit on the protected `main` branch is supported for security fixes. This is a personal MVP and does not provide a service-level guarantee.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Contact the repository owner privately through GitHub private vulnerability reporting or the repository’s configured security contact.

Include a description, severity, affected route/component/dependency, reproduction steps or proof of concept, impact, and suggested mitigation. Do not include user data, credentials, API keys, or unredacted logs.

## Secret handling

Keep secrets in local `.env` files or Firebase/GitHub secret stores. Rotate any credential that may have been exposed, then review audit logs and provider usage. Follow [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) and [MONITORING_LOGGING.md](MONITORING_LOGGING.md).
