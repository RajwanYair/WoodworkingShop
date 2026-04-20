# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **Do NOT** create a public GitHub issue
2. Email the security concern with details to the maintainer
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

## Security Best Practices for Contributors

### Code Security

- **No Hardcoded Credentials**: Never commit passwords, API keys, or tokens
- **Input Validation**: Validate and sanitize all user input
- **Use GitHub Secrets**: For tokens and sensitive CI variables

### Dependency Security

- Keep dependencies updated via Dependabot
- Review security advisories for dependencies
- Run `npm audit` to check for known vulnerabilities

## Security Checklist

- [ ] No hardcoded credentials in code
- [ ] All user input validated
- [ ] Dependencies are up-to-date
- [ ] `npm audit` reports no critical vulnerabilities
