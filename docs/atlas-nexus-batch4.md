# Atlas × Nexus Batch 4 — Global module refinement

Batch 4 extends the established Atlas × Nexus foundation through ILTO's
remaining modules and the cross-Project management tools. It is a frontend
composition and visual-semantics change only: API adapters, query keys,
business calculations and resource contracts are unchanged.

## Shared composition

`ModulePage`, `ModuleHeader`, `ModuleTabs` and `ModuleSectionHeader` establish a
small common vocabulary for module width, spacing, identity, actions and view
navigation. They deliberately do not generate pages or own domain state. The
Dashboard, Horizon, Work, Learning, Infrastructure, Finances, Health, Social,
Appearance, Logistics and Settings pages use these pieces while their existing
queries, editors, charts and resource controls remain in place.

The header reserves cyan for identity and primary focus. Operational states use
the shared success, warning, destructive and information tokens. Colors that
identify distinct domain categories—such as event, wardrobe, asset and workout
types—remain differentiated because removing them would reduce comprehension.

## Module hierarchy

- Horizon keeps adding a calendar block as its primary action and retains the
  existing calendar periods and source-owned behavior.
- Dashboard keeps all existing calculations, but groups domain health, the
  weekly digest, KPIs and quick actions into clearer responsive panels.
- Learning keeps import as the page-level action. Work, Finances, Health,
  Social, Appearance and Logistics keep creation beside the relevant data view
  rather than duplicating controls in the page header.
- Infrastructure keeps node management and refresh at the page level, with
  nodes, resource history and Git activity separated by consistent headings.
- Settings uses a narrower reading width and pairs API/time-zone settings on
  desktop while preserving the existing save/reset behavior.

## Projects management

The legacy management deep links remain available and URL-backed. Project
records now use responsive cards with one clear workspace action and separated
maintenance actions. Board columns have bounded, explicit horizontal overflow;
Sprint and Milestone lists use elevated panels; Gantt keeps its necessary
timeline scroll; Architecture keeps one-Project repository scope. Filters and
empty/error/loading behavior remain the existing implementations.

The resource dialogs continue to use the shared Dialog, Button, Input and Label
primitives. The V0.1.17 FocusSession concurrency behavior, persistent note
drafts and deletion confirmation-token lifecycle were not changed. The
Project NOW/NEXT/EXPLORE workspace was intentionally left outside this batch.

## Responsive and accessibility boundary

Page actions wrap instead of clipping, module views scroll only within their
navigation strip, data grids collapse to one column, and mobile pages retain
bottom-navigation clearance. Board and Gantt remain deliberately horizontal
because compressing their status/time axes would remove meaning. Shared view
buttons expose `aria-pressed`; Radix management tabs, links, forms and dialogs
retain keyboard behavior; global reduced-motion rules continue to apply.

Automated validation uses Vitest/jsdom and mocked HTTP where APIs are involved.
It does not constitute live-browser, touch-device, visual-regression or
live-backend validation. Dashboard density, long translated labels, wide Gantt
ranges, virtual-keyboard behavior and all module empty/error states should be
reviewed manually before deployment.
