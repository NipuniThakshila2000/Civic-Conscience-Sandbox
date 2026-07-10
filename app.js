const DATA_FILE = "./JSON%20civic_conscience_fixture_data.json";

const app = document.querySelector("#app");

const state = {
  view: "overview",
  selectedProfile: "ecc_01",
  selectedIntervention: "int_02",
  draft:
    "This adjustment is a necessary fiscal correction. The ministry has decided the change will apply equally to everyone through established protocol.",
  rehearsalLog: [],
  scenarioLog: []
};

const dimensionLabels = {
  justice: "Justice",
  process: "Process",
  dignity: "Dignity",
  dishonour: "Dishonour",
  authority: "Authority",
  trust: "Trust"
};

const cohortPalette = {
  ecc_01: "#35c0a1",
  ecc_02: "#ff7a59",
  ecc_03: "#8a7df0",
  ecc_04: "#e0a331",
  ecc_05: "#d95f86",
  ecc_06: "#2f9cb3",
  ecc_07: "#c96f37",
  ecc_08: "#6fbf73",
  ecc_09: "#a66bd6",
  ecc_10: "#e06f9f"
};

const patternWords = {
  hardship_unacknowledged: ["necessary fiscal correction", "cost cutting", "adjustment", "reduction", "unavoidable"],
  institution_led_framing: ["ministry has decided", "department has decided", "government has decided", "official decision"],
  procedure_only_justification: ["established protocol", "formal review", "proper procedure", "standard process"],
  top_down_directive: ["must comply", "directive", "ordered", "mandated by office"],
  public_blame_framing: ["because people failed", "misuse", "irresponsible", "their behavior", "blame"],
  equality_without_equity_signal: ["applies equally", "same for everyone", "uniformly applied", "no exceptions"]
};

const clamp = (value) => Math.max(0, Math.min(1, value));
const pct = (value) => `${Math.round(value * 100)}%`;
const signed = (value) => `${value > 0 ? "+" : ""}${Math.round(value * 100)} pts`;
const titleCase = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function currentAggregate(data) {
  return {
    overlap: mean(data.ecc_profiles.map((profile) => profile.current_relationships.overlap_score)),
    tension: mean(data.ecc_profiles.map((profile) => profile.current_relationships.tension_score)),
    translation: mean(data.ecc_profiles.map((profile) => profile.current_relationships.translation_capacity))
  };
}

function idealGap(data, values) {
  return {
    overlap: data.ideal_condition.overlap_target - values.overlap,
    tension: Math.max(0, values.tension - data.ideal_condition.tension_target_max),
    translation: data.ideal_condition.translation_target - values.translation
  };
}

function graphEdges(data) {
  return data.interaction_graph?.edges || [];
}

function graphConnectivity(data) {
  const direct = data.interaction_graph?.connectivity_by_ecc;
  if (direct) {
    return data.ecc_profiles.map((profile) => direct[profile.ecc_id] || 0);
  }
  const edges = graphEdges(data);
  return data.ecc_profiles.map((profile) => {
    const profileEdges = edges.filter((edge) => edge.source === profile.ecc_id || edge.target === profile.ecc_id);
    return profileEdges.length ? mean(profileEdges.map((edge) => edge.intensity)) : 0;
  });
}

function fragmentationRisk(data, values = currentAggregate(data)) {
  const weights = data.fragmentation_index?.weights || {
    connectivity_gap: 0.4,
    tension: 0.35,
    translation_capacity: 0.25
  };
  const avgConnectivity = mean(graphConnectivity(data));
  const value = clamp(
    weights.connectivity_gap * (1 - avgConnectivity) +
      weights.tension * values.tension +
      weights.translation_capacity * (1 - values.translation)
  );
  const zones =
    data.fragmentation_index?.zones || [
      { label: "Low", range: [0, 0.33], meaning: "Cohorts remain cross-connected; shared civic goal intact." },
      { label: "Moderate", range: [0.33, 0.66], meaning: "Some cohorts drifting toward isolated interaction." },
      { label: "High", range: [0.66, 1], meaning: "Sustained isolation and unresolved tension." }
    ];
  const zone = zones.find((item) => value >= item.range[0] && value <= item.range[1]) || zones[zones.length - 1];
  return { value, zone, avgConnectivity };
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  };
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function nodeLayout(data) {
  const positions = [
    [80, 74],
    [204, 50],
    [336, 78],
    [462, 138],
    [424, 266],
    [298, 322],
    [166, 304],
    [70, 222],
    [238, 184],
    [354, 210]
  ];
  return new Map(
    data.ecc_profiles.map((profile, index) => [
      profile.ecc_id,
      {
        ...profile,
        x: positions[index]?.[0] || 240,
        y: positions[index]?.[1] || 180,
        r: 10 + profile.population_share * 72,
        color: cohortPalette[profile.ecc_id] || "#9fb0c2"
      }
    ])
  );
}

function notablePattern(profile) {
  const low = Object.entries(profile.dimensions)
    .filter(([, detail]) => detail.legibility === "low")
    .map(([key]) => dimensionLabels[key]);
  const high = Object.entries(profile.dimensions)
    .filter(([, detail]) => detail.legibility === "high")
    .map(([key]) => dimensionLabels[key]);
  if (low.length) return `Low clarity: ${low.join(", ")}`;
  return `High clarity: ${high.slice(0, 3).join(", ")}`;
}

function renderNodeGraph(data) {
  const nodes = nodeLayout(data);
  const edges = graphEdges(data);
  return `
    <div class="node-graph-wrap">
      <svg class="node-graph" viewBox="0 0 540 370" role="img" aria-label="ECC profile interaction graph">
        <defs>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        ${edges
          .map((edge, index) => {
            const source = nodes.get(edge.source);
            const target = nodes.get(edge.target);
            if (!source || !target) return "";
            const color = edge.character === "tension" ? "#d95f86" : source.color;
            const width = 1.2 + edge.intensity * 4.2;
            const duration = (4.2 - edge.intensity * 1.7).toFixed(2);
            return `
              <line class="graph-edge ${edge.character}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${color}" stroke-width="${width.toFixed(2)}" style="animation-duration:${duration}s; animation-delay:${(index * 0.18).toFixed(2)}s" />
            `;
          })
          .join("")}
        ${[...nodes.values()]
          .map(
            (node, index) => {
              const metrics = node.current_relationships;
              const tooltipX = node.x > 360 ? node.x - 178 : node.x + 22;
              const tooltipY = node.y > 220 ? node.y - 132 : node.y - 20;
              return `
              <g class="graph-node" tabindex="0" style="--cohort:${node.color}; animation-delay:${(index * 0.14).toFixed(2)}s">
                <circle cx="${node.x}" cy="${node.y}" r="${(node.r + 5).toFixed(1)}" fill="${node.color}" opacity="0.12" />
                <circle cx="${node.x}" cy="${node.y}" r="${node.r.toFixed(1)}" fill="${node.color}" filter="url(#softGlow)" />
                <text x="${node.x}" y="${node.y + node.r + 16}" text-anchor="middle">${node.ecc_id.replace("ecc_", "ECC ")}</text>
                <foreignObject class="node-tooltip" x="${tooltipX}" y="${tooltipY}" width="168" height="128">
                  <div xmlns="http://www.w3.org/1999/xhtml" class="node-card">
                    <strong>${node.label}</strong>
                    <span>Share ${pct(node.population_share)}</span>
                    <span>Overlap ${pct(metrics.overlap_score)}</span>
                    <span>Tension ${pct(metrics.tension_score)}</span>
                    <span>Translation ${pct(metrics.translation_capacity)}</span>
                    <em>Notable pattern: ${notablePattern(node)}</em>
                  </div>
                </foreignObject>
              </g>
            `;
            }
          )
          .join("")}
      </svg>
      <div class="graph-legend">
        <span>Node size = population share</span>
        <span>Edge weight = interaction strength</span>
        <span>Rose edges = tension-character interaction</span>
      </div>
    </div>
  `;
}

function renderFragmentationMeter(data, values = currentAggregate(data), compact = false) {
  const risk = fragmentationRisk(data, values);
  const angle = risk.value * 180;
  const needle = polarToCartesian(100, 100, 68, angle);
  return `
    <div class="frag-meter ${compact ? "compact" : ""}">
      <svg viewBox="0 0 200 124" role="img" aria-label="Fragmentation risk meter">
        <path d="${arcPath(100, 100, 76, 0, 59.4)}" class="meter-zone zone-low" />
        <path d="${arcPath(100, 100, 76, 59.4, 118.8)}" class="meter-zone zone-mid" />
        <path d="${arcPath(100, 100, 76, 118.8, 180)}" class="meter-zone zone-high" />
        <path d="${arcPath(100, 100, 76, 0, 180)}" class="meter-track" />
        <line class="meter-needle" x1="100" y1="100" x2="${needle.x.toFixed(2)}" y2="${needle.y.toFixed(2)}" />
        <circle cx="100" cy="100" r="5" class="meter-hub" />
      </svg>
      <div class="frag-value">${pct(risk.value)}</div>
      <div class="frag-zone">${risk.zone.label} fragmentation risk</div>
      <div class="small">${risk.zone.meaning}</div>
      <div class="chip-row frag-factors">
        <span class="chip">Density ${pct(risk.avgConnectivity)}</span>
        <span class="chip">Tension ${pct(values.tension)}</span>
        <span class="chip">Translation ${pct(values.translation)}</span>
      </div>
    </div>
  `;
}

function interventionEffect(profile, intervention) {
  const legibility = profile.dimensions[intervention.primary_dimension].legibility;
  const effect = intervention.effect_by_legibility[legibility];
  const overlapDelta = clamp(effect.translation_delta * 0.55 - effect.tension_delta * 0.35);
  return {
    overlap: clamp(profile.current_relationships.overlap_score + overlapDelta),
    tension: clamp(profile.current_relationships.tension_score + effect.tension_delta),
    translation: clamp(profile.current_relationships.translation_capacity + effect.translation_delta),
    tensionDelta: effect.tension_delta,
    translationDelta: effect.translation_delta,
    overlapDelta
  };
}

function interventionResults(data) {
  const intervention = data.interventions.find((item) => item.intervention_id === state.selectedIntervention);
  return data.ecc_profiles.map((profile) => ({
    profile,
    intervention,
    result: interventionEffect(profile, intervention)
  }));
}

function interventionAggregate(data) {
  const rows = interventionResults(data);
  return {
    overlap: mean(rows.map((row) => row.result.overlap)),
    tension: mean(rows.map((row) => row.result.tension)),
    translation: mean(rows.map((row) => row.result.translation))
  };
}

function findTriggeredSuggestions(data, draft, intervention) {
  const lowerDraft = draft.toLowerCase();
  const candidates = data.suggestion_bank.filter((suggestion) => {
    const words = patternWords[suggestion.trigger.pattern] || [];
    return words.some((word) => lowerDraft.includes(word));
  });

  const linked = intervention.linked_suggestions
    .map((id) => data.suggestion_bank.find((suggestion) => suggestion.id === id))
    .filter(Boolean);

  const combined = [...candidates, ...linked];
  return [...new Map(combined.map((suggestion) => [suggestion.id, suggestion])).values()];
}

function rehearsalPreview(data) {
  const intervention = data.interventions.find((item) => item.intervention_id === state.selectedIntervention);
  const suggestions = findTriggeredSuggestions(data, state.draft, intervention);
  const base = interventionAggregate(data);
  const adjustment = suggestions.reduce(
    (acc, suggestion) => ({
      tension: acc.tension + suggestion.projected_effect.tension_delta,
      translation: acc.translation + suggestion.projected_effect.translation_delta
    }),
    { tension: 0, translation: 0 }
  );

  return {
    intervention,
    suggestions,
    scores: {
      overlap: clamp(base.overlap + adjustment.translation * 0.35 - adjustment.tension * 0.2),
      tension: clamp(base.tension + adjustment.tension),
      translation: clamp(base.translation + adjustment.translation)
    }
  };
}

function renderMetric(label, value, note, mode = "") {
  return `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${pct(value)}</div>
      <div class="gauge ${mode}" style="--w:${pct(value)}"><span></span></div>
      <div class="metric-note">${note}</div>
    </div>
  `;
}

function renderRelationshipBars(values) {
  return `
    <div class="split-bars">
      <div class="bar-row"><strong>Overlap</strong><div class="bar" style="--w:${pct(values.overlap)}"><span></span></div><span>${pct(values.overlap)}</span></div>
      <div class="bar-row"><strong>Tension</strong><div class="bar tension" style="--w:${pct(values.tension)}"><span></span></div><span>${pct(values.tension)}</span></div>
      <div class="bar-row"><strong>Translation</strong><div class="bar" style="--w:${pct(values.translation)}"><span></span></div><span>${pct(values.translation)}</span></div>
    </div>
  `;
}

function renderOverview(data) {
  const aggregate = currentAggregate(data);
  const gap = idealGap(data, aggregate);
  return `
    <section class="view active">
      <div class="overview-hero">
        <div class="hero-copy">
          <div class="eyebrow">Policy Foresight | Live Overview</div>
          <h2>A pluralistic civic conscience, modeled through interaction</h2>
          <p>Every community carries distinct civic language for justice, trust, dignity, process, authority, and honour. This view reads those profiles as a living relationship field.</p>
        </div>
        <div class="overview-hero-grid">
          <div class="graph-panel">
            <div class="graph-title-row">
              <div>
                <h3>ECC Interaction Field</h3>
                <p>Profile nodes pulse with pairwise interaction strength from local fixture data.</p>
              </div>
            </div>
            ${renderNodeGraph(data)}
          </div>
          <div class="risk-panel">
            <h3>Fragmentation Risk</h3>
            ${renderFragmentationMeter(data, aggregate)}
          </div>
        </div>
      </div>
      <div class="grid three">
        ${renderMetric("Overlap condition", aggregate.overlap, `Ideal reference ${pct(data.ideal_condition.overlap_target)}`)}
        ${renderMetric("Tension condition", aggregate.tension, `Maximum reference ${pct(data.ideal_condition.tension_target_max)}`, "tension")}
        ${renderMetric("Translation condition", aggregate.translation, `Ideal reference ${pct(data.ideal_condition.translation_target)}`)}
      </div>
      <div class="grid two" style="margin-top:18px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">CCC Gap Register</h2>
              <p class="panel-subtitle">Common Civic Conscience is presented as distance from an ideal civic condition across relationships, not as one consolidated score.</p>
            </div>
          </div>
          <div class="panel-body">
            ${renderRelationshipBars(gap)}
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">ECC Method Note</h2>
              <p class="panel-subtitle">ECC records civic language legibility for each stakeholder group.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="notice">Low, Medium, and High indicate clarity, coherence, and translatability of civic language within a dimension. They are profile descriptors, not moral ranks, and the interface uses neutral category colors.</div>
            <div class="chip-row" style="margin-top:14px">
              ${Object.values(dimensionLabels).map((label) => `<span class="chip">${label}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Stakeholder Profile Register</h2>
            <p class="panel-subtitle">Population share and current relationship measurements from local fixture data.</p>
          </div>
        </div>
        <div class="panel-body table-wrap">
          ${renderProfileTable(data)}
        </div>
      </div>
    </section>
  `;
}

function renderProfileTable(data) {
  return `
    <table>
      <thead><tr><th>Stakeholder group</th><th>Share</th><th>Overlap</th><th>Tension</th><th>Translation</th><th>Notable legibility pattern</th></tr></thead>
      <tbody>
        ${data.ecc_profiles
          .map((profile) => {
            return `
              <tr>
                <td><strong>${profile.label}</strong></td>
                <td>${pct(profile.population_share)}</td>
                <td>${pct(profile.current_relationships.overlap_score)}</td>
                <td>${pct(profile.current_relationships.tension_score)}</td>
                <td>${pct(profile.current_relationships.translation_capacity)}</td>
                <td>${notablePattern(profile)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderExplorer(data) {
  const profile = data.ecc_profiles.find((item) => item.ecc_id === state.selectedProfile);
  return `
    <section class="view active">
      <div class="grid two">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">ECC Profile Explorer</h2>
              <p class="panel-subtitle">Select a stakeholder group to inspect dimension meanings and relationship posture.</p>
            </div>
          </div>
          <div class="panel-body profile-list">
            ${data.ecc_profiles
              .map(
                (item) => `
                  <button class="profile-button ${item.ecc_id === profile.ecc_id ? "active" : ""}" data-action="profile" data-id="${item.ecc_id}">
                    <strong>${item.label}</strong>
                    <span class="small">Share ${pct(item.population_share)} | O ${pct(item.current_relationships.overlap_score)} | T ${pct(item.current_relationships.tension_score)} | Tr ${pct(item.current_relationships.translation_capacity)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${profile.label}</h2>
              <p class="panel-subtitle">Legibility is interpretive clarity within the group's civic language, not virtue, compliance, or importance.</p>
            </div>
          </div>
          <div class="panel-body">
            ${renderRelationshipBars({
              overlap: profile.current_relationships.overlap_score,
              tension: profile.current_relationships.tension_score,
              translation: profile.current_relationships.translation_capacity
            })}
            <h3 class="section-heading" style="margin-top:22px">Six-Dimension ECC Profile</h3>
            <div class="dimension-matrix">
              ${Object.entries(profile.dimensions)
                .map(
                  ([key, detail]) => `
                    <div class="dim-box">
                      <div class="dim-name">${dimensionLabels[key]}</div>
                      <div class="legibility ${detail.legibility}">${titleCase(detail.legibility)}</div>
                      <div class="dim-meaning">${detail.meaning}</div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSandbox(data) {
  const intervention = data.interventions.find((item) => item.intervention_id === state.selectedIntervention);
  const rows = interventionResults(data);
  const rehearsal = rehearsalPreview(data);
  return `
    <section class="view active">
      <div class="grid two">
        <div class="panel intervention-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Intervention Sandbox</h2>
              <p class="panel-subtitle">Load a local intervention and preview its effect on each ECC profile.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="selector-row">
              <select id="interventionSelect" aria-label="Choose intervention">
                ${data.interventions.map((item) => `<option value="${item.intervention_id}" ${item.intervention_id === intervention.intervention_id ? "selected" : ""}>${item.label}</option>`).join("")}
              </select>
            </div>
            <h3 class="section-heading" style="margin-top:20px">${intervention.label}</h3>
            <p class="small">${intervention.description}</p>
            <div class="chip-row" style="margin-top:12px">
              <span class="chip">${titleCase(intervention.type)}</span>
              <span class="chip">${dimensionLabels[intervention.primary_dimension]} focus</span>
              <span class="chip">${intervention.risk_trigger_pattern ? titleCase(intervention.risk_trigger_pattern) : "No primary risk pattern"}</span>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Risk Trigger Register</h2>
              <p class="panel-subtitle">Flags emphasize dignity, trust, honour, and process sensitivities where relevant.</p>
            </div>
          </div>
          <div class="panel-body alert-list">
            ${renderRiskAlerts(data, intervention)}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:18px">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Profile Effect Preview</h2>
            <p class="panel-subtitle">Each row compares current relationships with the selected intervention.</p>
          </div>
        </div>
        <div class="panel-body table-wrap">
          <table>
            <thead><tr><th>Stakeholder group</th><th>Overlap</th><th>Tension</th><th>Translation</th><th>Dimension trigger</th></tr></thead>
            <tbody>
              ${rows
                .map(
                  ({ profile, result }) => `
                    <tr>
                      <td><strong>${profile.label}</strong></td>
                      <td>${pct(result.overlap)} <span class="delta ${result.overlapDelta >= 0 ? "down" : "up"}">${signed(result.overlapDelta)}</span></td>
                      <td>${pct(result.tension)} <span class="delta ${result.tensionDelta >= 0 ? "up" : "down"}">${signed(result.tensionDelta)}</span></td>
                      <td>${pct(result.translation)} <span class="delta ${result.translationDelta >= 0 ? "down" : "up"}">${signed(result.translationDelta)}</span></td>
                      <td>${dimensionLabels[intervention.primary_dimension]}: ${titleCase(profile.dimensions[intervention.primary_dimension].legibility)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid two" style="margin-top:18px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Narrative & Dialogue Rehearsal</h2>
              <p class="panel-subtitle">Draft public language, preview profile reactions, revise, and rerun. Suggestions use a static rules-based lookup from local fixture data.</p>
            </div>
          </div>
          <div class="panel-body">
            <textarea id="draftText" aria-label="Draft public language">${state.draft}</textarea>
            <div class="selector-row" style="margin-top:12px">
              <button class="primary-action" data-action="runRehearsal">Run preview</button>
              <button class="secondary-action" data-action="applyRewrite">Apply first rewrite</button>
            </div>
            <h3 class="section-heading" style="margin-top:20px">Iteration Trend Strip</h3>
            <div class="trend">
              ${state.rehearsalLog.length ? state.rehearsalLog.map(renderTrendItem).join("") : `<div class="trend-item"><div class="number">No entries</div><div class="small">Run preview to begin tracking changes.</div></div>`}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Suggestion Panel</h2>
              <p class="panel-subtitle">Diagnosis, reframing suggestion, example rewrite, and projected relationship effects.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="metric-grid" style="margin-bottom:14px">
              ${renderMetric("Overlap", rehearsal.scores.overlap, "Projected")}
              ${renderMetric("Tension", rehearsal.scores.tension, "Projected", "tension")}
              ${renderMetric("Translation", rehearsal.scores.translation, "Projected")}
            </div>
            <div class="grid">
              ${rehearsal.suggestions.length ? rehearsal.suggestions.map(renderSuggestion).join("") : `<div class="notice">No risk pattern was detected in the current draft. Keep the acknowledgement, rationale, and verification path visible.</div>`}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderRiskAlerts(data, intervention) {
  const suggestions = intervention.linked_suggestions
    .map((id) => data.suggestion_bank.find((item) => item.id === id))
    .filter(Boolean);

  if (!suggestions.length) {
    return `<div class="notice">No fixture-linked risk trigger is attached to this intervention.</div>`;
  }

  return suggestions
    .map(
      (suggestion) => `
        <div class="alert">
          <strong>${dimensionLabels[suggestion.trigger.dimension]} trigger:</strong> ${titleCase(suggestion.trigger.pattern)}<br />
          ${suggestion.diagnosis}
        </div>
      `
    )
    .join("");
}

function renderSuggestion(suggestion) {
  return `
    <div class="suggestion">
      <div><strong>${dimensionLabels[suggestion.trigger.dimension]} diagnosis:</strong> ${suggestion.diagnosis}</div>
      <div><strong>Reframing:</strong> ${suggestion.suggestion}</div>
      <div><strong>Example rewrite:</strong> ${suggestion.example_rewrite}</div>
      <div class="chip-row">
        <span class="chip">Tension ${signed(suggestion.projected_effect.tension_delta)}</span>
        <span class="chip">Translation ${signed(suggestion.projected_effect.translation_delta)}</span>
      </div>
    </div>
  `;
}

function renderTrendItem(entry) {
  return `
    <div class="trend-item">
      <div class="number">Run ${entry.iteration}</div>
      <div class="small">Tension ${pct(entry.scores.tension)}</div>
      <div class="small">Translation ${pct(entry.scores.translation)}</div>
      <div class="small">${entry.flags} risk ${entry.flags === 1 ? "flag" : "flags"}</div>
    </div>
  `;
}

function renderDashboard(data) {
  const aggregate = currentAggregate(data);
  const gap = idealGap(data, aggregate);
  const intervention = interventionAggregate(data);
  const interventionGap = idealGap(data, intervention);
  return `
    <section class="view active">
      <div class="grid two">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">CCC Dashboard</h2>
              <p class="panel-subtitle">Gap against ideal civic condition across Overlap, Tension, and Translation capacity.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="metric-grid">
              ${renderMetric("Overlap gap", Math.max(0, gap.overlap), "Current distance")}
              ${renderMetric("Tension excess", Math.max(0, gap.tension), "Above maximum", "tension")}
              ${renderMetric("Translation gap", Math.max(0, gap.translation), "Current distance")}
            </div>
          </div>
        </div>
        <div class="panel dark-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Fragmentation Risk</h2>
              <p class="panel-subtitle">Uses the same interaction density, tension, and translation computation as the Overview meter.</p>
            </div>
          </div>
          <div class="panel-body">
            ${renderFragmentationMeter(data, aggregate, true)}
          </div>
        </div>
      </div>
      <div class="grid two" style="margin-top:18px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Selected Intervention Gap</h2>
              <p class="panel-subtitle">Projected CCC condition after current sandbox selection.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="metric-grid">
              ${renderMetric("Overlap gap", Math.max(0, interventionGap.overlap), "Projected distance")}
              ${renderMetric("Tension excess", Math.max(0, interventionGap.tension), "Projected excess", "tension")}
              ${renderMetric("Translation gap", Math.max(0, interventionGap.translation), "Projected distance")}
            </div>
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">CCC Relationship Table</h2>
            <p class="panel-subtitle">CCC is derived by comparing profiles across relationships instead of collapsing them into one rating.</p>
          </div>
        </div>
        <div class="panel-body table-wrap">
          <table>
            <thead><tr><th>Relationship</th><th>Current</th><th>Ideal condition</th><th>Gap interpretation</th></tr></thead>
            <tbody>
              <tr><td>Overlap</td><td>${pct(aggregate.overlap)}</td><td>${pct(data.ideal_condition.overlap_target)}</td><td>${pct(Math.max(0, gap.overlap))} more shared civic language needed</td></tr>
              <tr><td>Tension</td><td>${pct(aggregate.tension)}</td><td>${pct(data.ideal_condition.tension_target_max)} maximum</td><td>${pct(Math.max(0, gap.tension))} above the reference ceiling</td></tr>
              <tr><td>Translation capacity</td><td>${pct(aggregate.translation)}</td><td>${pct(data.ideal_condition.translation_target)}</td><td>${pct(Math.max(0, gap.translation))} more cross-profile interpretability needed</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderLog(data) {
  const scenarios = [...data.sample_scenario_log, ...state.scenarioLog];
  return `
    <section class="view active">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Scenario Comparison Log</h2>
            <p class="panel-subtitle">Saved comparison entries show intervention selections and CCC relationship gaps.</p>
          </div>
          <button class="primary-action" data-action="saveScenario">Save current scenario</button>
        </div>
        <div class="panel-body log-grid">
          ${scenarios
            .map(
              (scenario) => `
                <div class="scenario-card">
                  <div>
                    <strong>${scenario.label}</strong>
                    <div class="small">${new Date(scenario.timestamp).toLocaleString()}</div>
                    <div class="chip-row" style="margin-top:10px">
                      ${scenario.interventions_applied.length ? scenario.interventions_applied.map((id) => `<span class="chip">${data.interventions.find((item) => item.intervention_id === id)?.label || id}</span>`).join("") : `<span class="chip">Baseline condition</span>`}
                    </div>
                  </div>
                  <div>
                    ${renderRelationshipBars({
                      overlap: scenario.ccc_gap.overlap,
                      tension: scenario.ccc_gap.tension,
                      translation: scenario.ccc_gap.translation
                    })}
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderShell(data) {
  const views = [
    ["overview", "Overview"],
    ["explorer", "ECC Profile Explorer"],
    ["sandbox", "Intervention Sandbox"],
    ["dashboard", "CCC Dashboard"],
    ["log", "Scenario Comparison Log"]
  ];

  const viewHtml = {
    overview: renderOverview,
    explorer: renderExplorer,
    sandbox: renderSandbox,
    dashboard: renderDashboard,
    log: renderLog
  }[state.view](data);

  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-inner">
          <div class="agency-line"><span>Office of Civic Relationship Analysis</span><span class="seal">CC</span></div>
          <div class="title-row">
            <div>
              <h1>Civic Conscience Sandbox</h1>
              <p class="lede">A local analytical workspace for reading ECC profiles, previewing civic relationship effects, and rehearsing public language before comparing CCC gaps.</p>
            </div>
            <div class="status-pill">Local fixture data only</div>
          </div>
        </div>
      </header>
      <nav class="nav" aria-label="Primary">
        ${views.map(([id, label]) => `<button class="${state.view === id ? "active" : ""}" data-action="view" data-id="${id}">${label}</button>`).join("")}
      </nav>
      <main class="main">${viewHtml}</main>
    </div>
  `;
}

function wireEvents(data) {
  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (action === "view") {
      state.view = target.getAttribute("data-id");
      renderShell(data);
    }
    if (action === "profile") {
      state.selectedProfile = target.getAttribute("data-id");
      renderShell(data);
    }
    if (action === "runRehearsal") {
      const draft = document.querySelector("#draftText")?.value || "";
      state.draft = draft;
      const preview = rehearsalPreview(data);
      state.rehearsalLog.push({
        iteration: state.rehearsalLog.length + 1,
        scores: preview.scores,
        flags: preview.suggestions.length
      });
      renderShell(data);
    }
    if (action === "applyRewrite") {
      const preview = rehearsalPreview(data);
      const first = preview.suggestions[0];
      if (first) {
        state.draft = first.example_rewrite;
        renderShell(data);
      }
    }
    if (action === "saveScenario") {
      const aggregate = interventionAggregate(data);
      state.scenarioLog.unshift({
        scenario_id: `scn_local_${Date.now()}`,
        label: data.interventions.find((item) => item.intervention_id === state.selectedIntervention).label,
        timestamp: new Date().toISOString(),
        interventions_applied: [state.selectedIntervention],
        ccc_gap: aggregate
      });
      renderShell(data);
    }
  });

  app.addEventListener("change", (event) => {
    if (event.target.id === "interventionSelect") {
      state.selectedIntervention = event.target.value;
      renderShell(data);
    }
  });

  app.addEventListener("input", (event) => {
    if (event.target.id === "draftText") {
      state.draft = event.target.value;
    }
  });
}

async function boot() {
  try {
    const response = await fetch(DATA_FILE);
    if (!response.ok) throw new Error("Fixture file unavailable");
    const data = await response.json();
    state.scenarioLog = [];
    renderShell(data);
    wireEvents(data);
  } catch (error) {
    app.innerHTML = `<main class="main"><div class="panel"><div class="panel-body">Unable to load local fixture data. Start a local web server from this folder and open the served address.</div></div></main>`;
  }
}

boot();
