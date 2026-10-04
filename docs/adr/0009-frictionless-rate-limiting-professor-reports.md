# 0009. Frictionless Rate Limiting and Tokenized Professor Reports

Public classmate request submissions (`POST /api/requests/submit`) are protected against denial-of-service and storage exhaustion via an in-database token bucket (`rateLimits` collection) with an automatic MongoDB TTL index, avoiding third-party CAPTCHA friction. Professor access to attendance reports (`/prof/[token]`) relies on high-entropy 32-character tokens with explicit revocation tracking (`revokedAt`), providing transparent status feedback if an outdated link is clicked rather than an unhelpful HTTP 404.
