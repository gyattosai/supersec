# 0005. Encapsulated Data Layer for Privacy Enforcement

To enforce the zero-leak guarantee of the three-tier privacy model, Next.js page components and route handlers are forbidden from executing raw, ad-hoc `payload.find()` queries. All data access must pass through strongly-typed domain access modules in `src/lib/data/*` that automatically apply compile-time field projection allowlists (`select: publicFields`) and handle access overrides, ensuring that private student data cannot be leaked by developer oversight.
