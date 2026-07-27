---
target: placement and consistency of creation actions across User Management sections
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-07-27T14-41-21Z
slug: src-components-usermanagement-tsx
---
# Impeccable Critique: User Management Creation Model

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|------:|-----------|
| 1 | Visibility of System Status | 3 | Busy states and toasts are good; hidden creation/edit state can survive tab changes. |
| 2 | Match System / Real World | 3 | Domain language is clear, but “Jagdbezirke” promises management while exposing only onboarding. |
| 3 | User Control and Freedom | 2 | User creation can be dismissed; profile and district creation cannot. |
| 4 | Consistency and Standards | 1 | Three sibling create tasks use three placements and interaction models. |
| 5 | Error Prevention | 3 | Constraints and confirmations are generally strong; district provisioning needs clearer consequence framing. |
| 6 | Recognition Rather Than Recall | 2 | The icon-only user action and changing locations force relearning. |
| 7 | Flexibility and Efficiency | 3 | Profile quick-add is efficient, but the pattern does not repeat across entities. |
| 8 | Aesthetic and Minimalist Design | 2 | Persistent forms compete with records and create uneven section anatomy. |
| 9 | Error Recovery | 2 | Creation relies heavily on toast feedback rather than contextual recovery. |
| 10 | Help and Documentation | 2 | District creation explains its purpose, but equivalent contextual framing is inconsistent. |
| **Total** | | **23/40** | **Functionally credible, structurally mixed** |

## Design Specificity Verdict

**LLM assessment:** The forest hierarchy, paper-like records, hunting terminology, and operational density feel authored for Streckenliste. The interaction architecture is less specific and resembles several admin patterns stitched together. The contradiction is most visible in creation: a floating icon toggle for users, a permanent quick-add row for hunter profiles, and a permanent onboarding form for districts.

**Deterministic scan:** The Impeccable detector returned `[]`: zero findings, rules, or locations across `UserManagement.tsx` and `JagdbezirkOnboarding.tsx`. This supports the conclusion that the problem is conceptual consistency, hierarchy, and disclosure rather than a detectable anti-pattern.

**Visual evidence:** Browser visualization was unavailable because the browser runtime reported `No browser is available`. Source structure and deterministic scanning were used as the fallback signal; no user-visible overlay was produced.

## Overall Impression

The surface begins calm and credible, then asks the administrator to relearn where “create” lives in every tab. The single biggest opportunity is to establish one section grammar: stable context and action first, then an intentional work surface.

## What's Working

- The tabs are mechanically strong: accessible relationships, roving focus, and keyboard navigation.
- Domain nouns, counts, tables/cards, and state colors fit the “Calm Digital Hunting Ledger” system.
- Busy labels, disabled states, mobile record cards, and protected destructive confirmations support operational confidence.

## Priority Issues

### [P1] Three sibling creation models

**Why it matters:** Similar actions in adjacent tabs should reward learning. Here, users must discover a different location, trigger, and cancellation model for each entity.

**Fix:** Add a stable toolbar to every tab with a dynamic section title/status on the left and one labelled creation action on the right. Every action opens a creation surface immediately below the toolbar.

**Suggested command:** `$impeccable layout`

### [P1] Misleading and unstable section header

**Why it matters:** The page heading remains “Benutzer” while Jägerprofile or Jagdbezirke is active, and the conditional add-user icon changes the top composition during tab switching.

**Fix:** Replace the static heading/action row with the active section toolbar. Reserve the action footprint so switching tabs does not move the content.

**Suggested command:** `$impeccable layout`

### [P2] District creation is under-signalled

**Why it matters:** Creating a district, its first administrator, and an invitation is a rare, consequential workflow, but it looks like an ordinary always-open form.

**Fix:** Use the same creation trigger and placement as other tabs, but open a larger staged card: district details, first administrator/invitation, then review and submit.

**Suggested command:** `$impeccable shape`

### [P2] Invisible state survives context changes

**Why it matters:** A user form, edit state, or merge state can remain live while hidden by another tab, then reappear unexpectedly.

**Fix:** Close and reset transient creation/edit/merge states on tab change, or explicitly signal preserved drafts. For this compact administration surface, reset-on-switch is the calmer default.

**Suggested command:** `$impeccable harden`

### [P2] Section anatomy and target sizing drift

**Why it matters:** Benutzer has a count, Jägerprofile repeats its title and count, and Jagdbezirk begins after an unexplained 40px gap. The add-user action is 40px on mobile, below the documented 44px target.

**Fix:** Standardize toolbar, disclosure-card spacing, action height, and empty-state anatomy across all three panels.

**Suggested command:** `$impeccable polish`

## Cognitive Load

Five checklist items fail or are weakened: single focus, visual hierarchy, minimal choices, recognition over recall, and progressive disclosure. The Jägerprofile view can expose three tabs, permanent creation, and edit/merge/archive actions simultaneously; repeated row actions push the immediate decision field beyond four visible options.

The inconsistent pattern creates pure extraneous load: administrators must remember where creation lives rather than learning one rule. Permanent forms also consume attention before creation intent exists.

## Emotional Journey

Arrival is calm: clear green hierarchy, counts, and familiar ledger surfaces. Confidence dips when the heading no longer matches the active tab and again when creation changes location and behavior. User creation feels hidden but deliberate; profile creation feels unavoidable; district creation feels consequential but visually ordinary. Success toasts close individual actions, yet the overall surface never develops a predictable rhythm.

## Persona Red Flags

**Occasional district administrator:** The lowest-frequency user is most likely to forget an icon-only action and must relearn the create pattern in each tab.

**Superadministrator:** “Jagdbezirke” suggests a browsable management area, but the panel exposes only onboarding. The scope can be misread.

**Mobile administrator:** Permanent forms consume the first viewport and push the records being managed below the fold. A stable labelled action followed by progressive disclosure is more efficient.

## Minor Observations

- The user header X cancels editing even though the add button did not initiate that edit.
- `MapPin` represents the district tab while `Landmark` represents the district creation form.
- The glass action treatment reads as a global or high-frequency control, but adding a user is local and occasional.
- `JagdbezirkOnboarding` adds `mt-10`, producing a unique gap below its tab.

## Questions to Consider

- Is “Jagdbezirke” a true management area, or a rare superadmin onboarding utility that should live outside these peer tabs?
- Should switching tabs discard unfinished creation state, or should the app preserve and visibly mark a draft?
- Does district creation need a review step before it provisions both an organization and its first administrator?
