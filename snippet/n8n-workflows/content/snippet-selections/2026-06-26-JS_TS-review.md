# Breakdown Review — 2026-06-26 — JS/TS

Issue: #20
Date: 2026-06-26
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — koala73/worldmonitor

- file_path: src/utils/supplier-route-risk.ts
- snippet_url: https://github.com/koala73/worldmonitor/blob/main/src/utils/supplier-route-risk.ts

file_intent: Trade route disruption risk scorer
breakdown_what: Computes geopolitical trade-route risk between two countries by finding overlapping maritime routes, collecting transit chokepoints, filtering out intra-regional ones that don't apply to the pair's coastal alignment, and returning a structured risk assessment with level, disruption score, and recommendation.
breakdown_responsibility: Translates raw country-pair inputs into the risk verdicts the worldmonitor dashboard displays to analysts — it's the layer that connects geopolitical chokepoint data to the specific corridors affected when a Suez Canal or Strait of Hormuz disruption occurs.
breakdown_clever: The `sharedCoast` filter is the key subtlety: if both countries share a coastline side, only an allowlist of relevant intra-regional chokepoints is kept — preventing genuinely short routes (Spain→Morocco) from inheriting oceanic chokepoint risk scores they'd never encounter.
project_context: A self-hosted real-time global intelligence dashboard that aggregates 65+ providers and 500+ curated news feeds across geopolitics, energy, finance, and military domains, synthesized by AI into situational-awareness briefs — used by analysts who need a unified interface for monitoring world events across five specialized dashboard variants.

### Reformatted Snippet

```typescript
export function computeSupplierRouteRisk(
  exporterIso2: string,
  importerIso2: string,
  chokepointScores: ChokepointScoreMap,
): SupplierRouteRisk {
  const exporterCluster = getCluster(exporterIso2);
  const importerCluster = getCluster(importerIso2);
  const hasExporterCluster = !!exporterCluster;
  const hasImporterCluster = !!importerCluster;
  const routeIds = findOverlappingRoutes(
    exporterIso2,
    importerIso2,
  );
  const hasRouteData =
    hasExporterCluster &&
    hasImporterCluster &&
    routeIds.length > 0;
  let transitChokepoints = collectTransitChokepoints(
    routeIds,
    chokepointScores,
  );
  const sharedCoast =
    exporterCluster?.coastSide === importerCluster?.coastSide
      ? exporterCluster?.coastSide
      : null;
  if (
    sharedCoast &&
    INTRA_REGIONAL_CHOKEPOINTS[sharedCoast]
  ) {
    const allowed = INTRA_REGIONAL_CHOKEPOINTS[sharedCoast]!;
    transitChokepoints = transitChokepoints.filter(cp =>
      allowed.has(cp.chokepointId),
    );
  }
  const riskLevel = determineRiskLevel(
    transitChokepoints,
    hasRouteData,
  );
  const maxDisruptionScore =
    transitChokepoints.length > 0
      ? Math.max(
          ...transitChokepoints.map(
            cp => cp.disruptionScore,
          ),
        )
      : 0;
  const recommendation = buildRecommendation(
    riskLevel,
    transitChokepoints,
  );
  return {
    exporterIso2,
    importerIso2,
    routeIds,
    transitChokepoints,
    riskLevel,
    maxDisruptionScore,
    recommendation,
  };
}
```

## Repo 2 — google-labs-code/design.md

- file_path: packages/cli/src/linter/linter/rules/orphaned-tokens.ts
- snippet_url: https://github.com/google-labs-code/design.md/blob/main/packages/cli/src/linter/linter/rules/orphaned-tokens.ts

file_intent: Unused design token linter rule
breakdown_what: Scans all component property values to collect referenced symbol paths, derives their color family names by stripping MD3 role prefixes, then flags any defined color whose family appears nowhere in component usage and isn't a Material Design 3 standard color.
breakdown_responsibility: Prevents design-system drift by catching color tokens defined but never wired to a component — otherwise the token set silently bloats, and AI agents reading DESIGN.md would generate UI using colors the design system has functionally abandoned.
breakdown_clever: The `colorFamily()` function strips MD3 role prefixes (`on-`, `inverse-`, `-container`, `-fixed`, `-dim`) before comparing — so if `primary-container` is referenced, `primary` counts as covered even if it appears nowhere directly. This prevents false positives for role-variant token families.
project_context: A format specification from Google Labs that gives AI coding agents a persistent, structured description of a project's visual identity — developers write a DESIGN.md file once, and tools like GitHub Copilot, Cursor, or Claude Code read it to generate visually consistent UI without repeated manual prompting.

### Reformatted Snippet

```typescript
function colorFamily(name: string): string {
  let n = name;
  n = n.replace(/^on-/, '');
  n = n.replace(/^inverse-/, '');
  n = n.replace(/^on-/, '');
  n = n.replace(/-container.*$/, '');
  n = n.replace(/-fixed.*$/, '');
  n = n.replace(/-(dim|bright|tint|variant)$/, '');
  return n;
}

const MD3_STANDARD_FAMILIES = new Set([
  'primary', 'secondary', 'tertiary',
  'error', 'surface', 'background', 'outline',
]);

export function orphanedTokens(
  state: DesignSystemState
): RuleFinding[] {
  if (state.components.size === 0) return [];

  const referencedPaths = new Set<string>();
  for (const [, comp] of state.components) {
    for (const [, value] of comp.properties) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'type' in value
      ) {
        for (const [key, symValue] of state.symbolTable) {
          if (symValue === value) {
            referencedPaths.add(key);
          }
        }
      }
    }
  }

  const referencedFamilies = new Set<string>();
  for (const path of referencedPaths) {
    if (path.startsWith('colors.')) {
      referencedFamilies.add(
        colorFamily(path.slice('colors.'.length))
      );
    }
  }

  const findings: RuleFinding[] = [];
  for (const [name] of state.colors) {
    const path = `colors.${name}`;
    if (referencedPaths.has(path)) continue;
    const family = colorFamily(name);
    if (referencedFamilies.has(family)) continue;
    if (MD3_STANDARD_FAMILIES.has(family)) continue;
    findings.push({
      path,
      message:
        `'${name}' is defined but never ` +
        `referenced by any component.`,
    });
  }
  return findings;
}
```
