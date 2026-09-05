<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aqua Glassmorphism Theme (UI/UX Guidelines)
The official design language for this application is **"Aqua Glassmorphism"**. When creating or updating UI components, you MUST adhere to the following rules:

1. **Color Palette:**
   - **Primary**: `#1C73AB` (Corporate Blue). Use for main text, primary layout structures.
   - **Accent**: `#2891C8` to `#7FD4E3` (Cyan/Aqua). Use for gradients, glowing effects, and primary actions.
   - **Background**: `#F4F1EE` (Soft Off-White). Do not use pure white backgrounds for the body.
   - **Status Colors**: `#16a34a` (Success/Neon Green), `#ef4444` (Danger/Red), `#f59e0b` (Pending/Orange).

2. **Glassmorphism (The Core Identity):**
   - Use semi-transparent white backgrounds for cards and containers: `background: rgba(255, 255, 255, 0.6)` (or similar opacity).
   - Apply heavy backdrop filters to create a frosted glass effect: `backdrop-filter: blur(40px) saturate(200%)`.
   - Add subtle white borders to glass elements to define edges: `border: 1px solid rgba(255, 255, 255, 0.4)`.

3. **Shapes & Animations:**
   - **Curved Edges**: Use large border radii (e.g., `20px` for main cards, `border-radius: 0 0 20px 20px` for master headers). Avoid sharp 90-degree corners.
   - **Micro-interactions**: Implement smooth transitions. Interactive elements should lift on hover (`transform: translateY(-5px)`) rather than just changing color.
   - **Entry Animations**: Use smooth fade-in-up animations for page loads.

4. **Mobile Responsiveness:**
   - Ensure all tables have horizontal scrolling (`overflow-x: auto`) on mobile.
   - Convert multi-column grids to single-column on screens `<= 768px`.
   - Make buttons touch-friendly (minimum `44px` height).
   - Ensure modals take up `95vw` on mobile screens.

5. **Aesthetics Over Basic MVP:**
   - Always prioritize a premium, modern, and polished look over basic generic HTML/CSS. If a component looks "default" or plain, it violates the Aqua Theme.
