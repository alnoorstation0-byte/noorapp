<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Desert Glassmorphism Theme (UI/UX Guidelines)
The official design language for this application is **"Desert Glassmorphism"**, inspired by golden sands, warm clay, and the heritage of horse/camel care. When creating or updating UI components, you MUST adhere to the following rules:

1. **Desert Core Palette:**
   - **Primary (Deep Tent Brown)**: `#2C1A12` - Used for main text, headings, and navbars.
   - **Accent (Golden Sand)**: `#C29B62` - Used for primary buttons, active icons, and branding.
   - **Highlight/Hover (Terracotta Clay)**: `#A8573C` - Used for alerts, hover states, and depth.
   - **Background (Dune Pearl)**: `#FDFBF7` - Main app background.
   - **Success (Oasis Green)**: `#4E734F` - Success states and stock availability.

2. **Desert Glass Effects (The Core Identity):**
   - **Cards/Windows**: Gradient glass `background: linear-gradient(135deg, rgba(255, 253, 250, 0.8) 0%, rgba(255, 253, 250, 0.45) 100%)`.
   - **Backdrop Filters**: `backdrop-filter: blur(24px) saturate(160%)`.
   - **Borders**: Thin glowing borders `border: 1px solid rgba(194, 155, 98, 0.3)`.
   - **Shadows**: Warm sandy shadows `box-shadow: 0 4px 6px rgba(44, 26, 18, 0.08)`.
   - **Hover States**: Cards should lift on hover with intensified terracotta shadow `box-shadow: 0 10px 15px rgba(168, 87, 60, 0.15); transform: translateY(-5px);`.

3. **Typography & Spacing:**
   - Use `rgba(44, 26, 18, 0.6)` for muted, secondary, or descriptive text.
   - Maintain rounded corners (`border-radius: 16px` for cards, `12px` for buttons).

4. **Mobile Responsiveness:**
   - Ensure all tables have horizontal scrolling (`overflow-x: auto`) on mobile.
   - Convert multi-column grids to single-column on screens `<= 768px`.
   - Make buttons touch-friendly (minimum `44px` height).
   - Ensure modals take up `95vw` on mobile screens.

5. **Aesthetics Over Basic MVP:**
   - Always prioritize a premium, modern, and polished look over basic generic HTML/CSS. 

</RULE>
