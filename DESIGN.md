# DESIGN SYSTEM & DIRECTION
## Aplikasi Mobile Preventive Maintenance (PM) POS PINSYST & FMS
### Pertamina International

---

## 1. Identity & Character
- **Product Domain:** Industrial Field Engineering & Maintenance Management for Fuel Retail (SPBU & Forecourt Terminals).
- **Primary Users:** Field Technicians (Teknisi Lapangan), Site Supervisors (Pengawas SPBU), IT Operations Pertamina.
- **Tone & Mood:** Rugged, precise, highly functional, mission-critical, authoritative, no-nonsense.
- **Physical Environment Context:** Technicians operate on smartphones/tablets outdoors in fuel forecourts with glare/bright sun, or in dim cashier booths, wearing work gloves or operating one-handed.

---

## 2. Antislop Dials
- **ENERGY:** 2 (Focused industrial utility, clear state distinctions, no decorative hype)
- **RHYTHM:** 2 (Structured field-form flow, logical sectioning by hardware/subsystem)
- **MOTION:** 1 (Subtle, purposeful transitions only: tabs, accordion expansion, modal popups, submit confirmation; zero floaty/bouncy AI template animations)

---

## 3. Color Palette & Semantics (Pertamina Industrial)
- **Primary Brand Red:** `#ED1C24` (Pertamina Red - used with purpose on brand headers, primary call-to-actions, and error states).
- **Brand Deep Navy:** `#0B2545` (Pertamina Corporate Deep Navy - headers, dark badges, primary typography).
- **Secondary Slate Blue:** `#134074` / `#1D4ED8` (Section anchors, active tab indicators).
- **Neutral Foundations:**
  - Base Background: `#F8FAFC` (Slate 50 - high legibility outdoors, prevents eye fatigue).
  - Surface Cards: `#FFFFFF` (Solid white with crisp 1px borders `#E2E8F0`).
  - Text Primary: `#0F172A` (Slate 900 - maximum contrast ratio > 12:1 against white).
  - Text Muted: `#475569` (Slate 600 - contrast ratio > 5.5:1 against white, WCAG AA compliant).
  - Borders: `#CBD5E1` (Slate 300) and `#E2E8F0` (Slate 200).
- **Status & Checklist Indicators (Pertamina Standard `[B / R / X]`):**
  - **`B` (Baik / Good / Normal):** Background `#ECFDF5`, Border `#A7F3D0`, Text `#065F46` (Emerald Green).
  - **`R` (Rusak / Perlu Perbaikan):** Background `#FEF2F2`, Border `#FECACA`, Text `#991B1B` (Alert Red).
  - **`X` (Tidak Ada / N/A):** Background `#F1F5F9`, Border `#CBD5E1`, Text `#475569` (Neutral Slate).
- **No Gradients Policy:** Strictly zero blue-purple gradients, zero radial orbs, zero glow borders (R-01, R-13).

---

## 4. Typography
- **Font Family:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` for fast rendering on mobile devices without webfont layout shift.
- **Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` for Terminal IDs, Serial Numbers (SN), IP Addresses, and software version strings.
- **Hierarchy:**
  - Page Title: `text-xl font-bold tracking-tight text-slate-900`
  - Section Header: `text-base font-semibold text-slate-800`
  - Form Label: `text-xs font-semibold uppercase tracking-wider text-slate-600`
  - Field Value / Input: `text-sm text-slate-900`
  - Meta / Caption: `text-xs text-slate-500`

---

## 5. Touch Targets & Mobile Usability (R-03, Layoutmobile)
- **Minimum Tap Target:** 44px x 44px for all buttons, segmented controls, radio pills, and checklist selectors.
- **Segmented Checklist Controls:** Big thumb-friendly toggle buttons for `[B] Baik`, `[R] Rusak`, `[X] N/A` directly in line.
- **Bottom Navigation / Sticky Footer Bar:** Easy thumb reach for saving drafts, jumping sections, and submitting PM forms.
- **Single-Handed Operability:** Crucial actions positioned within lower thumb zones on portrait mobile screens.
- **Zero Horizontal Overflow:** All tables reflow into stacked cards on mobile screens (`< 768px`).

---

## 6. Functional & Quality Locks
- **Copywriting:** No em dash (`—`) anywhere in UI or copy (R-02).
- **States:** Every view implements Data, Loading, and Empty states (R-27).
- **Sign-off:** Digital signature canvas with touch/mouse support, clear button, and signature verification timestamp.
- **Offline & Local Storage:** Auto-saves form progress into browser `localStorage` so technicians do not lose data if cellular signal drops on the forecourt.

