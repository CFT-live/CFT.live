# Security Policy

## Reporting a Vulnerability

If you believe you’ve found a security vulnerability, please **do not** open a public GitHub issue.

Preferred reporting method:

1. Use GitHub’s **Private Vulnerability Reporting** / **Security Advisories** feature (if enabled on the repository).
2. Provide:
   - A clear description of the issue and impact
   - Steps to reproduce (PoC if possible)
   - Affected components (paths, endpoints, workers)
   - Any suggested mitigation

If private reporting is not available, open a GitHub issue **without** sensitive details and ask maintainers for a secure channel.

## Supported Versions

Security fixes are provided on a best-effort basis for the latest version on the default branch.

## Scope Notes

This repo includes:

- A Next.js frontend deployed to Cloudflare Workers
- Cloudflare Workers (Durable Objects)
- Solidity smart contracts and related tooling

Please treat anything involving wallets, private keys, signatures, and on-chain value movement as high severity.
