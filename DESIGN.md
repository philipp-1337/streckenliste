---
name: Streckenliste
description: A calm, field-ready digital hunting ledger for districts, hunters, and harvest records.
colors:
  forest-primary: "#166534"
  forest-action: "#15803d"
  forest-ink: "#14532d"
  field-background: "#f0fdf4"
  paper: "#ffffff"
  neutral-ink: "#111827"
  neutral-muted: "#4b5563"
  neutral-border: "#d1d5db"
  warning: "#b45309"
  danger: "#dc2626"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  heading:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  field: "8px"
  control: "12px"
  surface: "16px"
  floating-nav: "36px"
spacing:
  compact: "8px"
  control: "12px"
  standard: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest-action}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.neutral-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.control}"
    padding: "16px"
---

# Design System: Streckenliste

## Overview

**Creative North Star: "Calm Digital Hunting Ledger"**

Streckenliste should feel like a dependable field ledger translated into a clear digital tool: quiet, legible, and trustworthy under repeated operational use. Hunting-green structure establishes place and identity, while paper-white work surfaces keep forms and records easy to scan.

Expression stays restrained. The interface earns character through precise green hierarchy, compact record-oriented layouts, and a small amount of translucent depth in persistent navigation and high-frequency actions.

**Key Characteristics:**

- Calm, task-first administrative surfaces
- Hunting-green hierarchy on a pale field background
- Dense records on desktop, touch-friendly cards on mobile
- Rounded but practical controls with explicit interaction states
- Motion used for feedback and continuity, never delay

## Colors

The palette combines deep forest greens with paper-white work surfaces and neutral text; amber and red are reserved for operational meaning.

### Primary

- **Ledger Forest:** The main structural green for headings, table headers, navigation state, and focus.
- **Working Green:** The action green for primary buttons and positive administrative actions.
- **Forest Ink:** The darkest green for secondary text and low-emphasis controls on pale green surfaces.

### Neutral

- **Field Wash:** The application background that distinguishes the workspace from white records.
- **Ledger Paper:** Forms, cards, dialogs, and table bodies.
- **Charcoal Ink:** Primary content and destructive-dialog headings.
- **Graphite Note:** Secondary descriptions and metadata.
- **Pencil Line:** Input borders and quiet separators.

### Tertiary

- **Amber Notice:** Warnings that require attention but do not block work.
- **Signal Red:** Destructive actions and errors only.

**The Meaning Before Decoration Rule.** Amber and red always communicate state or consequence; they are never ornamental accents.

## Typography

**Display Font:** System sans-serif  
**Body Font:** System sans-serif  

**Character:** Familiar platform typography keeps the PWA fast and field-ready. Hierarchy comes from size, weight, and green color rather than a decorative font pairing.

### Hierarchy

- **Display** (700, 2.25rem, 1.1): Application identity in the header.
- **Heading** (700, 1.25rem, 1.4): Route and primary section titles.
- **Title** (600, 1rem, 1.4): Forms, cards, and subsection labels.
- **Body** (400, 1rem, 1.5): Forms and task content, preserving the 16px mobile input floor.
- **Label** (500, 0.875rem, 1.4): Field labels, buttons, table headings, and compact controls.

**The Operational Readability Rule.** Interactive fields remain at least 16px on mobile; genuinely secondary metadata may use 12–14px.

## Layout

The app uses a centered workspace up to `max-w-7xl`, with 16px outer padding and 16–24px vertical section rhythm. Records use tables from the medium breakpoint upward and stacked cards below it. Forms collapse to a single column on narrow screens and add columns only when labels and values remain comfortably readable.

Persistent navigation floats above the safe area at the bottom of the viewport. Touch controls target at least 44px. Long identifiers and email addresses wrap rather than widening the page.

**The Same Task, Different Density Rule.** Mobile and desktop preserve the same information architecture; only density and presentation change.

## Elevation & Depth

Most task surfaces use quiet, conventional shadows against the pale field background. Translucent glass treatment belongs to persistent navigation and compact global action controls, where it communicates floating position. Dialogs receive the strongest elevation because they suspend the underlying task.

### Shadow Vocabulary

- **Record surface:** Tailwind `shadow`, used for forms, tables, and cards.
- **Floating control:** Layered soft shadow with a subtle white inset highlight.
- **Dialog:** Tailwind `shadow-2xl`, reserved for modal interruption.

**The Grounded Workspace Rule.** Records stay visually grounded; strong elevation is reserved for floating navigation and protected focus.

## Shapes

Inputs use gently curved 8px corners. Action controls and record cards use 12px corners, while prominent dialogs use 16px. The 36px pill is reserved for the floating bottom navigation. Borders are quiet separators, not decorative frames.

## Components

### Buttons

- **Shape:** Practical rounded controls with a 12px radius and a minimum 44px target.
- **Primary:** Working green with white text and compact horizontal padding.
- **Hover / Focus:** A darker green hover plus a visible two-pixel focus ring and offset.
- **Secondary:** Neutral text on transparent or pale gray surfaces.
- **Danger:** Signal red, used only when the action changes access or removes active state.

### Cards / Containers

- **Corner Style:** 12px for ordinary records; 16px for dialogs.
- **Background:** Ledger Paper on Field Wash.
- **Shadow Strategy:** Quiet record elevation; no stacked card-within-card decoration.
- **Internal Padding:** 16px by default, increasing to 20–24px for forms and dialogs.

### Inputs / Fields

- **Style:** White background, Pencil Line border, 8px radius, and 16px input text.
- **Focus:** Forest border with a translucent green ring.
- **Error / Disabled:** Error meaning is written in text; disabled state reduces opacity and changes the cursor without removing the label.

### Navigation

The bottom navigation is a translucent, safe-area-aware pill with icon-and-label destinations. Active destinations use Ledger Forest and a subtle light treatment. Navigation remains persistent and thumb-reachable.

### Record Tables and Cards

Desktop tables provide dense comparison with forest table headers. Mobile cards preserve every editable field and action in a vertical, touch-friendly sequence. The two presentations share data and behavior.

### Confirmations

Consequential actions use a focus-managed alert dialog with a safe initial focus, Escape handling, and explicit cancel and confirmation actions. Confirmation UI never expires automatically.

## Do's and Don'ts

### Do:

- **Do** preserve green as the structural product voice across headings, focus, navigation, and primary actions.
- **Do** provide mobile cards for multi-column operational tables.
- **Do** keep interactive targets at least 44px and keyboard focus clearly visible.
- **Do** use explicit loading, empty, error, disabled, and recovery states.
- **Do** respect reduced-motion preferences while preserving state feedback.

### Don't:

- **Don't** use destructive confirmations as transient toasts.
- **Don't** introduce color without operational meaning.
- **Don't** force mobile users to pan across desktop-shaped tables for core tasks.
- **Don't** use bounce or scale motion when reduced motion is requested.
- **Don't** add decorative glass surfaces to ordinary records or nested cards.
