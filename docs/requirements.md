## Packages
framer-motion | Complex page transitions and animations
zustand | Lightweight state management to pass analysis results between pages
clsx | Conditional class names (utility)
tailwind-merge | Merging tailwind classes (utility)

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
}
File uploads handled via FormData to /api/analyze/document
Analysis results are transient (client-side state), not persisted in DB based on schema
