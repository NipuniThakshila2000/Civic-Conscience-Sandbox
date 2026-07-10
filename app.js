const DATA_FILE = "./civic_conscience_fixture_data%20(1).json";

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
            const dims = Object.entries(profile.dimensions)
              .filter(([, detail]) => detail.legibility === "low")
              .map(([key]) => dimensionLabels[key]);
            return `
              <tr>
                <td><strong>${profile.label}</strong></td>
                <td>${pct(profile.population_share)}</td>
                <td>${pct(profile.current_relationships.overlap_score)}</td>
                <td>${pct(profile.current_relationships.tension_score)}</td>
                <td>${pct(profile.current_relationships.translation_capacity)}</td>
                <td>${dims.length ? dims.join(", ") : "No Low category recorded"}</td>
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
