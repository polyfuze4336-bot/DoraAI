# DORA Visual Design Language

## Product Character

DORA is an executive intelligence product: calm, exact, evidence-led, and operationally useful. It borrows Apple's discipline of hierarchy, whitespace, precision, progressive disclosure, and restrained motion without imitating an Apple product.

The interface must not resemble a portal, generic dashboard template, BI report, or conversational assistant. It should make a management decision legible before exposing the underlying analysis.

## Design Tokens

### Colour roles

| Role            | Token       | Use                                         |
| --------------- | ----------- | ------------------------------------------- |
| Warm canvas     | `--canvas`  | Application background                      |
| Mineral surface | `--surface` | Cards and primary content surfaces          |
| Graphite        | `--ink`     | Body text and data                          |
| Deep navy       | `--navy`    | Brand, primary actions, navigation          |
| Controlled teal | `--teal`    | Positive/current signals and selected state |
| Restrained cyan | `--cyan`    | AI, forecast, and active reasoning accents  |
| Amber           | `--amber`   | Risks requiring attention                   |
| Red             | `--danger`  | Material warnings and failures only         |

Semantic colour is always paired with text, an icon, or a shape. Colour alone never communicates state.

### Typography

- **Newsreader Variable:** executive statements, important prices, and high-level numeric values.
- **Manrope Variable:** navigation, controls, labels, body copy, and tables.
- Font size does not scale with viewport width.
- Letter spacing is always zero.
- Uppercase is reserved for short eyebrows and section context.

### Shape and depth

- Core cards use 12px radius; controls use 7-9px radius.
- Cards are never nested inside cards.
- Shadows are low-opacity navy and communicate hierarchy, not decoration.
- Glass effects are limited to floating controls, overlays, and sticky navigation.
- Hairline borders retain structure in high-density views.

### Motion

- Initial surface reveal: 250-400ms, ease-out.
- Hover lift: no more than 2px.
- Number changes use a damped spring.
- Charts animate only when data changes.
- AI text may stream with a pause/resume control.
- Skeleton shimmer communicates loading without moving layout.
- `prefers-reduced-motion` collapses all nonessential motion.

## Information Hierarchy

1. Decision statement.
2. Material exposure and decision window.
3. Supporting signals, forecast, and scenario.
4. Confidence, freshness, source, and evidence.
5. Operational details through progressive disclosure.

Desktop uses a persistent domain rail and a 12-column intelligence canvas. Tablet replaces the rail with sticky horizontal domain navigation while preserving two-column analytical composition where space permits.

## Component State Contract

Meaningful data surfaces accept `state: "ready" | "loading" | "empty" | "error"`.

| State     | Behaviour                                                      |
| --------- | -------------------------------------------------------------- |
| `ready`   | Render current validated content                               |
| `loading` | Render stable-dimension skeletons with `aria-busy`             |
| `empty`   | Explain what is absent and how it becomes available            |
| `error`   | Explain the failure and preserve trust in prior validated data |

The shared `StateBoundary` owns these patterns. Components must not invent unrelated spinners, empty illustrations, or error colours.

## Reusable Components

| Component             | Responsibility                                                   |
| --------------------- | ---------------------------------------------------------------- |
| `DoraCard`            | Foundational surface, hierarchy, and state boundary              |
| `InsightCard`         | Evidence-backed interpretation and confidence                    |
| `SignalCard`          | One material deterministic signal                                |
| `RiskBadge`           | Semantic severity label                                          |
| `ConfidenceIndicator` | Compact confidence visualization                                 |
| `TrendIndicator`      | Direction and magnitude                                          |
| `PriceTicker`         | Compact live-to-source commodity quote                           |
| `SourceBadge`         | Source identity                                                  |
| `FreshnessIndicator`  | Fresh, delayed, stale, or unknown state                          |
| `ForecastCard`        | Deterministic forecast with chart and horizon                    |
| `ExecutiveBriefCard`  | Grounded management brief with optional streaming                |
| `EvidenceDrawer`      | Source excerpts, relevance, and timestamps                       |
| `ScenarioCard`        | Expandable deterministic scenario inputs and impacts             |
| `MarketPulse`         | Composite market factor view                                     |
| `AgentActivity`       | Shared reasoning pipeline activity; not autonomous agent theatre |
| `NotificationPanel`   | Material alerts and requested outputs only                       |

The interactive state lab is available at `/design-system` in local development.

## Accessibility

- Meet WCAG 2.2 AA contrast and keyboard requirements.
- Use native buttons, headings, lists, and landmarks.
- Radix primitives provide focus management for drawers, popovers, tabs, and collapsibles.
- Tooltips name unfamiliar icon controls.
- Charts have explicit accessible labels and stable dimensions.
- Streaming output uses a polite live region and can be paused.
- Loading states retain layout dimensions and expose `aria-busy`.
