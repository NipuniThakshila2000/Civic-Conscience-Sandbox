const DATA_FILE = "./JSON%20civic_conscience_fixture_data.json";

const app = document.querySelector("#app");

const state = {
  view: "overview",
  selectedProfile: "ecc_01",
  selectedIntervention: "int_02",
  interventionText: "A news segment claims hidden motives are driving a public agency decision and urges citizens to withhold trust until officials prove otherwise.",
  draft:
    "This adjustment is a necessary fiscal correction. The ministry has decided the change will apply equally to everyone through established protocol.",
  rehearsalLog: [],
  scenarioLog: [],
  builderRole: "reviewer",
  customProfiles: [],
  promotedCustomIds: [],
  profileAudit: [],
  builderStatus: "",
  builderForm: {
    religion: "aggregate",
    caste: "aggregate",
    creed: "aggregate",
    language: "aggregate",
    location: "aggregate",
    marital_status: "aggregate",
    dimensions: {
      justice: "medium",
      process: "medium",
      dignity: "medium",
      dishonour: "medium",
      authority: "medium",
      trust: "medium"
    }
  },
  interactionProfiles: ["ecc_01", "ecc_05"],
  interactionType: "policy_rollout",
  evidenceStatus: "Use Retrieve historical precedents after selecting profiles and a situation type.",
  tourActive: false,
  tourStep: 0
};

const MIN_POPULATION_SHARE = 0.025;
const REVIEWER_ROLES = new Set(["reviewer", "senior_reviewer"]);

const dimensionLabels = {
  justice: "Justice",
  process: "Process",
  dignity: "Dignity",
  dishonour: "Dishonour",
  authority: "Authority",
  trust: "Trust"
};

const populationAttributes = {
  religion: ["Aggregate", "Multi-faith civic mix", "Minority faith cluster", "No dominant affiliation"],
  caste: ["Aggregate", "Cross-caste mix", "Status-sensitive mix", "Low salience / not coded"],
  creed: ["Aggregate", "Proceduralist", "Restorative", "Skeptical"],
  language: ["Aggregate", "Multilingual", "Local-language dominant", "Institution-language dominant"],
  location: ["Aggregate", "Urban", "Peri-urban", "Rural", "Service corridor"],
  marital_status: ["Aggregate", "Mixed household status", "Married household cluster", "Single / youth-heavy cluster"]
};

const attributeShareFactors = {
  aggregate: 1,
  "multi-faith civic mix": 0.78,
  "minority faith cluster": 0.42,
  "no dominant affiliation": 0.62,
  "cross-caste mix": 0.74,
  "status-sensitive mix": 0.52,
  "low salience / not coded": 0.86,
  proceduralist: 0.76,
  restorative: 0.68,
  skeptical: 0.58,
  multilingual: 0.72,
  "local-language dominant": 0.66,
  "institution-language dominant": 0.69,
  urban: 0.72,
  "peri-urban": 0.56,
  rural: 0.58,
  "service corridor": 0.44,
  "mixed household status": 0.82,
  "married household cluster": 0.70,
  "single / youth-heavy cluster": 0.54
};

const situationTypes = {
  shared_public_event: {
    label: "Shared public event",
    weights: { dignity: 0.22, dishonour: 0.22, trust: 0.18, authority: 0.14, justice: 0.12, process: 0.12 }
  },
  policy_rollout: {
    label: "Policy rollout",
    weights: { process: 0.26, trust: 0.22, justice: 0.18, authority: 0.16, dignity: 0.12, dishonour: 0.06 }
  },
  resource_location_dispute: {
    label: "Resource/location dispute",
    weights: { justice: 0.25, dignity: 0.21, trust: 0.18, process: 0.16, authority: 0.12, dishonour: 0.08 }
  },
  service_co_location: {
    label: "Service co-location",
    weights: { dignity: 0.22, process: 0.22, trust: 0.2, authority: 0.14, justice: 0.14, dishonour: 0.08 }
  },
  media_narrative_exposure: {
    label: "Media narrative exposure",
    weights: { trust: 0.28, dishonour: 0.22, dignity: 0.18, authority: 0.14, justice: 0.1, process: 0.08 }
  }
};

const historicalEvidence = [
  {
    type: "shared_public_event",
    dimensions: ["trust", "dishonour", "dignity"],
    headline: "Shared public event followed by rumor circulation and public-order stress",
    source: "BBC News",
    date: "2022-09-18",
    url: "https://www.bbc.com/news/uk-england-leicestershire-62943952",
    summary: "A public gathering and later circulation of claims created a pattern of trust, dignity, and dishonour pressure around a shared civic space."
  },
  {
    type: "policy_rollout",
    dimensions: ["process", "trust", "authority"],
    headline: "Vaccine rollout coverage showed operational trust and process strain",
    source: "Vanity Fair",
    date: "2021-02-02",
    url: "https://www.vanityfair.com/news/2021/02/how-the-covid-19-vaccine-rollout-was-hobbled",
    summary: "Coverage of a large public-health rollout documented administrative coordination problems and trust effects without treating uptake as a single community forecast."
  },
  {
    type: "policy_rollout",
    dimensions: ["trust", "dignity", "process"],
    headline: "Public-health rollout slowed where trust, access, and outreach gaps persisted",
    source: "TIME",
    date: "2021-03-17",
    url: "https://time.com/5947967/israel-covid-vaccine-rollout/",
    summary: "Reporting on a vaccination campaign described how access, trusted messengers, and public confidence affected participation."
  },
  {
    type: "resource_location_dispute",
    dimensions: ["justice", "trust", "authority"],
    headline: "Economic scarcity and service disruption produced resource-pressure protests",
    source: "The Guardian",
    date: "2022-04-01",
    url: "https://www.theguardian.com/world/2022/apr/01/sri-lanka-protesters-try-to-storm-presidents-house-as-economic-crisis-deepens",
    summary: "Coverage of shortages and public protests is included as precedent for resource pressure patterns, not as an incident prediction."
  },
  {
    type: "media_narrative_exposure",
    dimensions: ["trust", "process", "dishonour"],
    headline: "Mainstream coverage can be repurposed into misleading narrative frames",
    source: "arXiv",
    date: "2023-08-12",
    url: "https://arxiv.org/abs/2308.06459",
    summary: "Researchers found mainstream articles can be co-shared with misinformation narratives, relevant to trust and narrative-exposure analysis."
  },
  {
    type: "media_narrative_exposure",
    dimensions: ["trust", "authority", "dignity"],
    headline: "Vaccine misinformation research mapped narrative exposure and trust effects",
    source: "arXiv",
    date: "2021-06-15",
    url: "https://arxiv.org/abs/2106.08423",
    summary: "A public research record on misinformation communities is used here as historical precedent for narrative exposure patterns."
  }
];

const cohortPalette = {
  ecc_01: "#9ef1cd",
  ecc_02: "#ff9b7f",
  ecc_03: "#b3a8ff",
  ecc_04: "#f2c76b",
  ecc_05: "#ef91af",
  ecc_06: "#86d6e5",
  ecc_07: "#e5aa75",
  ecc_08: "#a6e7aa",
  ecc_09: "#caa0f0",
  ecc_10: "#f0a2c1"
};

const patternWords = {
  hardship_unacknowledged: ["necessary fiscal correction", "cost cutting", "adjustment", "reduction", "unavoidable"],
  institution_led_framing: ["ministry has decided", "department has decided", "government has decided", "official decision"],
  procedure_only_justification: ["established protocol", "formal review", "proper procedure", "standard process"],
  top_down_directive: ["must comply", "directive", "ordered", "mandated by office"],
  public_blame_framing: ["because people failed", "misuse", "irresponsible", "their behavior", "blame"],
  equality_without_equity_signal: ["applies equally", "same for everyone", "uniformly applied", "no exceptions"]
};

const interventionPrompts = [
  "A new audit rule gives enforcement teams stronger authority to inspect procurement records across agencies.",
  "A household support payment is reduced to close a fiscal shortfall during a budget correction.",
  "Officials publish decision records, timelines, and appeal routes for a public licensing process.",
  "The head of government changes with little public preparation or advance explanation.",
  "Several department heads are reassigned after an internal review of administrative performance.",
  "A regulatory body is merged with another department and its procedures are rewritten.",
  "A news segment claims hidden motives are driving a public agency decision and urges citizens to withhold trust until officials prove otherwise.",
  "Coverage highlights verified follow-through, published timelines, and public accountability checks.",
  "Prices rise sharply after a broad economic contraction affects household income.",
  "A service shortfall announcement implies affected users caused the problem through misuse."
];

const interventionKeywords = {
  int_01: ["audit", "corruption", "enforcement", "inspect", "procurement", "authority"],
  int_02: ["subsidy", "support payment", "household", "reduced", "reduction", "fiscal", "shortfall"],
  int_03: ["publish", "records", "disclosure", "transparent", "timeline", "appeal", "licensing"],
  int_04: ["head of government", "top executive", "prime minister", "president", "leadership changes"],
  int_05: ["cabinet", "reshuffle", "department heads", "reassigned", "ministers"],
  int_06: ["regulatory body", "merged", "restructured", "procedures rewritten", "department"],
  int_07: ["hidden motives", "withhold trust", "failure", "distrust", "secret", "news segment"],
  int_08: ["verified", "follow-through", "accountability", "public checks", "trust-building"],
  int_09: ["prices", "economic contraction", "downturn", "income", "inflation", "shock"],
  int_10: ["misuse", "blame", "caused the problem", "irresponsible", "fault", "shortfall announcement"]
};

const tourSteps = [
  {
    view: "overview",
    title: "Start with the relationship map",
    text: "Read the Overview, hover an ECC card in the interaction field, and note which profiles carry more tension or translation pressure.",
    action: "Hover an ECC card to open its light box.",
    target: "ECC Interaction Field"
  },
  {
    view: "explorer",
    title: "Inspect an ECC profile",
    text: "Select a stakeholder group and read its six-dimension legibility profile. Low, Medium, and High describe clarity, not moral rank.",
    action: "Choose a profile from the left register.",
    target: "Profile register"
  },
  {
    view: "sandbox",
    title: "Type an intervention",
    text: "Enter a proposed policy, message, leadership change, shock, or narrative. The warning panel categorizes it before simulation.",
    action: "Press Simulate after the category warning looks right.",
    target: "Intervention text box"
  },
  {
    view: "sandbox",
    title: "Rehearse the narrative",
    text: "Draft the public language and run the rehearsal. The suggestion panel flags dignity, trust, honour, process, authority, or justice risks.",
    action: "Run preview, revise, then run again.",
    target: "Narrative rehearsal"
  },
  {
    view: "dashboard",
    title: "Read the CCC gap",
    text: "Use the CCC Dashboard to compare overlap, tension, translation, fragmentation risk, and the ECC interaction field in one place.",
    action: "Check whether the gap narrows or widens.",
    target: "CCC metrics and interaction field"
  },
  {
    view: "log",
    title: "Save and compare scenarios",
    text: "Save the current scenario so it appears in the comparison log alongside baseline and prior entries.",
    action: "Use Save current scenario when you want to keep a run.",
    target: "Save scenario button"
  }
];

const clamp = (value) => Math.max(0, Math.min(1, value));
const clampSigned = (value) => Math.max(-1, Math.min(1, value));
const pct = (value) => `${Math.round(value * 100)}%`;
const signed = (value) => `${value > 0 ? "+" : ""}${Math.round(value * 100)} pts`;
const titleCase = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reviewerCanBuild() {
  return REVIEWER_ROLES.has(state.builderRole);
}

function promotedCustomProfiles() {
  return state.customProfiles.filter((profile) => state.promotedCustomIds.includes(profile.ecc_id));
}

function analysisProfiles(data, includePromoted = false) {
  return includePromoted ? [...data.ecc_profiles, ...promotedCustomProfiles()] : data.ecc_profiles;
}

function eligibleBuilderProfiles(data) {
  return [...data.ecc_profiles, ...state.customProfiles].filter((profile) => profile.population_share >= MIN_POPULATION_SHARE);
}

function currentAggregate(data, includePromoted = false) {
  const profiles = analysisProfiles(data, includePromoted);
  return {
    overlap: mean(profiles.map((profile) => profile.current_relationships.overlap_score)),
    tension: mean(profiles.map((profile) => profile.current_relationships.tension_score)),
    translation: mean(profiles.map((profile) => profile.current_relationships.translation_capacity))
  };
}

function idealGap(data, values) {
  return {
    overlap: data.ideal_condition.overlap_target - values.overlap,
    tension: Math.max(0, values.tension - data.ideal_condition.tension_target_max),
    translation: data.ideal_condition.translation_target - values.translation
  };
}

function dimensionScore(legibility) {
  return { low: 0.2, medium: 0.55, high: 0.88 }[legibility] || 0.55;
}

function estimatePopulationShare(form = state.builderForm) {
  const selected = Object.entries(form)
    .filter(([key]) => key !== "dimensions")
    .map(([, value]) => value);
  const factor = selected.reduce((product, value) => product * (attributeShareFactors[value] || 1), 1);
  return clamp(0.18 * factor);
}

function dimensionMeaning(key, legibility, attributes) {
  const attributeText = Object.entries(attributes)
    .filter(([, value]) => value !== "aggregate")
    .map(([name, value]) => `${titleCase(name)}: ${titleCase(value)}`)
    .join("; ");
  const base = attributeText || "Aggregate reviewer-defined population segment";
  return `${titleCase(legibility)} legibility for ${dimensionLabels[key].toLowerCase()} in a custom profile. ${base}.`;
}

function buildCustomProfileFromState(overrides = {}) {
  const attributes = Object.fromEntries(Object.entries(state.builderForm).filter(([key]) => key !== "dimensions"));
  const dimensions = Object.fromEntries(
    Object.entries(state.builderForm.dimensions).map(([key, legibility]) => [
      key,
      {
        legibility,
        meaning: dimensionMeaning(key, legibility, attributes)
      }
    ])
  );
  const populationShare = estimatePopulationShare();
  const values = Object.values(state.builderForm.dimensions).map(dimensionScore);
  const lowCount = Object.values(state.builderForm.dimensions).filter((value) => value === "low").length;
  const highCount = Object.values(state.builderForm.dimensions).filter((value) => value === "high").length;
  const labelParts = Object.entries(attributes)
    .filter(([, value]) => value !== "aggregate")
    .slice(0, 3)
    .map(([, value]) => titleCase(value));
  return {
    ecc_id: overrides.ecc_id || `custom_${Date.now()}`,
    label: overrides.label || (labelParts.length ? `Custom: ${labelParts.join(" + ")}` : `Custom Aggregate Profile ${state.customProfiles.length + 1}`),
    population_share: populationShare,
    attributes,
    dimensions,
    current_relationships: {
      overlap_score: clamp(mean(values) * 0.58 + 0.14),
      tension_score: clamp(0.18 + lowCount * 0.055 - highCount * 0.018),
      translation_capacity: clamp(mean(values) * 0.62 + 0.08)
    },
    risk_flags: [],
    custom: true,
    draft: Boolean(overrides.draft),
    promoted: false
  };
}

function draftCustomProfile() {
  if (!reviewerCanBuild() || estimatePopulationShare() < MIN_POPULATION_SHARE) return null;
  return buildCustomProfileFromState({
    ecc_id: "custom_draft",
    label: "Draft Custom Community",
    draft: true
  });
}

function graphProfiles(data, includeCustom = false) {
  const draft = includeCustom ? draftCustomProfile() : null;
  const customProfiles = includeCustom ? state.customProfiles.filter((profile) => profile.population_share >= MIN_POPULATION_SHARE) : promotedCustomProfiles();
  const liveProfiles = draft ? [...customProfiles, draft] : customProfiles;
  return [...data.ecc_profiles, ...liveProfiles];
}

function dimensionDistance(source, target, dimension) {
  return Math.abs(dimensionScore(source.dimensions[dimension].legibility) - dimensionScore(target.dimensions[dimension].legibility));
}

function customInteractionEdge(customProfile, targetProfile) {
  const dimensions = Object.keys(dimensionLabels);
  const distances = dimensions.map((dimension) => dimensionDistance(customProfile, targetProfile, dimension));
  const avgDistance = mean(distances);
  const sharedLegibility = dimensions.filter((dimension) => customProfile.dimensions[dimension].legibility === targetProfile.dimensions[dimension].legibility).length;
  const highPressureDimensions = dimensions.filter((dimension) => dimensionDistance(customProfile, targetProfile, dimension) > 0.5);
  const attributeSpecificity = customProfile.attributes
    ? Object.values(customProfile.attributes).filter((value) => value !== "aggregate").length / Object.keys(customProfile.attributes).length
    : 0;
  const intensity = clamp(0.18 + (1 - avgDistance) * 0.46 + sharedLegibility * 0.035 + customProfile.population_share * 0.35 - attributeSpecificity * 0.08);
  const character = highPressureDimensions.includes("trust") || highPressureDimensions.includes("dignity") || highPressureDimensions.length >= 3 ? "tension" : "overlap";
  return {
    source: customProfile.ecc_id,
    target: targetProfile.ecc_id,
    intensity,
    character,
    derived: true,
    dimensions: highPressureDimensions
  };
}

function graphEdges(data, includeCustom = false) {
  const baseEdges = data.interaction_graph?.edges || [];
  const draft = includeCustom ? draftCustomProfile() : null;
  const customProfiles = (includeCustom ? state.customProfiles : promotedCustomProfiles()).filter((profile) => profile.population_share >= MIN_POPULATION_SHARE);
  const activeCustomProfiles = draft ? [...customProfiles, draft] : customProfiles;
  if (!activeCustomProfiles.length) return baseEdges;

  const baseProfiles = data.ecc_profiles;
  const derivedEdges = activeCustomProfiles.flatMap((customProfile) => {
    const strongestPresetEdges = baseProfiles
      .map((profile) => customInteractionEdge(customProfile, profile))
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 4);
    const customPeerEdges = activeCustomProfiles
      .filter((profile) => profile.ecc_id !== customProfile.ecc_id)
      .map((profile) => customInteractionEdge(customProfile, profile))
      .filter((edge) => edge.source < edge.target);
    return [...strongestPresetEdges, ...customPeerEdges];
  });

  return [...baseEdges, ...derivedEdges];
}

function graphConnectivity(data, includeCustom = false) {
  const profiles = graphProfiles(data, includeCustom);
  const direct = data.interaction_graph?.connectivity_by_ecc;
  if (direct && !promotedCustomProfiles().length && !includeCustom) {
    return data.ecc_profiles.map((profile) => direct[profile.ecc_id] || 0);
  }
  const edges = graphEdges(data, includeCustom);
  return profiles.map((profile) => {
    const profileEdges = edges.filter((edge) => edge.source === profile.ecc_id || edge.target === profile.ecc_id);
    return profileEdges.length ? mean(profileEdges.map((edge) => edge.intensity)) : 0;
  });
}

function fragmentationRisk(data, values = currentAggregate(data), includeCustom = false) {
  const weights = data.fragmentation_index?.weights || {
    connectivity_gap: 0.4,
    tension: 0.35,
    translation_capacity: 0.25
  };
  const avgConnectivity = mean(graphConnectivity(data, includeCustom));
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

function nodeLayout(data, includeCustom = false) {
  const positions = [
    [44, 28],
    [304, 28],
    [564, 28],
    [44, 206],
    [564, 206],
    [44, 384],
    [304, 384],
    [564, 384],
    [174, 562],
    [434, 562]
  ];
  const baseNodes = data.ecc_profiles.map((profile, index) => [
      profile.ecc_id,
      {
        ...profile,
        x: positions[index]?.[0] || 240,
        y: positions[index]?.[1] || 180,
        width: 196,
        height: 110,
        color: cohortPalette[profile.ecc_id] || "#9fb0c2"
      }
    ]);
  const draft = includeCustom ? draftCustomProfile() : null;
  const customProfiles = (includeCustom ? state.customProfiles : promotedCustomProfiles()).filter((profile) => profile.population_share >= MIN_POPULATION_SHARE);
  const customNodes = (draft ? [...customProfiles, draft] : customProfiles)
    .map((profile, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      return [
        profile.ecc_id,
        {
          ...profile,
          x: 44 + column * 260,
          y: 756 + row * 156,
          width: 196,
          height: 110,
          color: "#d7f6e9",
          custom: true
        }
      ];
    });
  return new Map([...baseNodes, ...customNodes]);
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

function classifyIntervention(data, text) {
  const lowerText = text.toLowerCase();
  const scored = data.interventions.map((intervention) => {
    const keywords = interventionKeywords[intervention.intervention_id] || [];
    const keywordScore = keywords.reduce((score, keyword) => score + (lowerText.includes(keyword) ? 3 : 0), 0);
    const labelWords = intervention.label.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
    const labelScore = labelWords.reduce((score, word) => score + (lowerText.includes(word) ? 1 : 0), 0);
    const typeScore = lowerText.includes(intervention.type.replaceAll("_", " ")) ? 2 : 0;
    return { intervention, score: keywordScore + labelScore + typeScore };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].intervention : data.interventions[0];
}

function effectSummary(data, intervention) {
  const rows = data.ecc_profiles.map((profile) => interventionEffect(profile, intervention));
  const avgTensionDelta = mean(rows.map((row) => row.tensionDelta));
  const avgTranslationDelta = mean(rows.map((row) => row.translationDelta));
  const elevated = rows.filter((row) => row.tensionDelta > 0.06 || row.translationDelta < -0.04).length;
  const direction =
    avgTensionDelta > 0.02
      ? "raises average tension"
      : avgTensionDelta < -0.02
        ? "reduces average tension"
        : "leaves average tension broadly stable";
  const translation =
    avgTranslationDelta > 0.02
      ? "improves translation capacity"
      : avgTranslationDelta < -0.02
        ? "weakens translation capacity"
        : "keeps translation capacity broadly stable";
  return `Collectively, this scenario ${direction} and ${translation}. ${elevated} of ${rows.length} ECC profiles cross the higher-sensitivity threshold, so the table should be read as a profile-by-profile warning map rather than a single verdict.`;
}

function updateCategorizationPanel(data, text) {
  const categorized = classifyIntervention(data, text);
  const label = document.querySelector("#categoryLabel");
  const dimension = document.querySelector("#categoryDimension");
  const pattern = document.querySelector("#categoryPattern");
  if (label) label.textContent = categorized.label;
  if (dimension) dimension.textContent = dimensionLabels[categorized.primary_dimension];
  if (pattern) pattern.textContent = categorized.risk_trigger_pattern ? titleCase(categorized.risk_trigger_pattern) : "no primary risk pattern";
  const riskRegister = document.querySelector("#riskTriggerRegister");
  if (riskRegister) riskRegister.innerHTML = renderRiskAlerts(data, categorized);
}

function renderNodeGraph(data, options = {}) {
  const includeCustom = Boolean(options.includeCustom);
  const nodes = nodeLayout(data, includeCustom);
  const edges = graphEdges(data, includeCustom);
  const customCount = [...nodes.values()].filter((node) => node.custom).length;
  const customRows = customCount ? Math.ceil(customCount / 3) : 0;
  const graphHeight = customCount ? 746 + customRows * 156 : 704;
  const anchor = (node) => ({
    x: node.x + node.width / 2,
    y: node.y + node.height / 2
  });
  return `
    <div class="node-graph-wrap">
      <svg class="node-graph ${customCount ? "has-custom-band" : ""}" data-hover-node="" viewBox="0 0 804 ${graphHeight}" style="--graph-h:${graphHeight}px" role="img" aria-label="ECC profile interaction graph">
        <defs>
          <marker id="lineDot" markerWidth="4" markerHeight="4" refX="2" refY="2">
            <circle cx="2" cy="2" r="1.6" fill="#1f2329" />
          </marker>
        </defs>
        ${
          customCount
            ? `
              <g class="custom-band-marker">
                <line x1="24" y1="720" x2="780" y2="720" />
                <text x="44" y="742">Custom Community Builder profiles: derived interactions update from reviewer-defined attributes and ECC dimensions</text>
              </g>
            `
            : ""
        }
        ${edges
          .map((edge, index) => {
            const source = nodes.get(edge.source);
            const target = nodes.get(edge.target);
            if (!source || !target) return "";
            const sourceAnchor = anchor(source);
            const targetAnchor = anchor(target);
            const color = edge.derived ? (edge.character === "tension" ? "#a97016" : "#1a7f8f") : edge.character === "tension" ? "#1f2329" : "#6f767d";
            const width = 0.8 + edge.intensity * 2.2;
            const duration = (4.2 - edge.intensity * 1.7).toFixed(2);
            const midY = (sourceAnchor.y + targetAnchor.y) / 2;
            return `
              <path class="graph-edge ${edge.character} ${edge.derived ? "derived" : ""}" d="M ${sourceAnchor.x.toFixed(1)} ${sourceAnchor.y.toFixed(1)} C ${sourceAnchor.x.toFixed(1)} ${midY.toFixed(1)}, ${targetAnchor.x.toFixed(1)} ${midY.toFixed(1)}, ${targetAnchor.x.toFixed(1)} ${targetAnchor.y.toFixed(1)}" stroke="${color}" stroke-width="${width.toFixed(2)}" style="animation-duration:${duration}s; animation-delay:${(index * 0.18).toFixed(2)}s" />
            `;
          })
          .join("")}
        ${[...nodes.values()]
          .map(
            (node, index) => {
              const metrics = node.current_relationships;
              const cardTitle = node.label.replace("Economically Insecure ", "Econ. Insecure ").replace("Reciprocity-Sensitive ", "Reciprocity ").replace("Marginalized ", "Marg. ").replace("Custom: ", "Custom ");
              return `
              <g class="graph-node ${node.custom ? "custom-graph-node" : ""}" data-node="${node.ecc_id}" tabindex="0" style="--cohort:${node.color}; animation-delay:${(index * 0.14).toFixed(2)}s">
                <foreignObject class="system-node" x="${node.x}" y="${node.y}" width="${node.width.toFixed(1)}" height="${node.height.toFixed(1)}">
                  <div xmlns="http://www.w3.org/1999/xhtml" class="system-card" style="--cohort:${node.color}">
                    <div class="system-card-head"><span class="role-mark"></span><strong>${cardTitle}</strong></div>
                    <div class="system-card-body">
                      <span></span><span></span><span></span><span></span><span></span><span></span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            `;
            }
          )
          .join("")}
        <g class="tooltip-layer">
          ${[...nodes.values()]
            .map((node) => {
              const metrics = node.current_relationships;
              const tooltipX = node.x > 500 ? node.x - 4 : node.x + 40;
              const tooltipY = node.y > 480 ? node.y - 110 : node.y + 58;
              return `
                <foreignObject class="node-tooltip tooltip-${node.ecc_id}" data-tooltip="${node.ecc_id}" x="${tooltipX}" y="${tooltipY}" width="184" height="136">
                  <div xmlns="http://www.w3.org/1999/xhtml" class="node-card">
                    <strong>${node.label}</strong>
                    <span>Share ${pct(node.population_share)}</span>
                    <span>Overlap ${pct(metrics.overlap_score)}</span>
                    <span>Tension ${pct(metrics.tension_score)}</span>
                    <span>Translation ${pct(metrics.translation_capacity)}</span>
                    <em>${node.draft ? "Live draft, derived graph edges" : node.custom ? "Stored custom profile, derived graph edges" : "Notable pattern"}: ${notablePattern(node)}</em>
                  </div>
                </foreignObject>
              `;
            })
            .join("")}
        </g>
      </svg>
      <div class="graph-legend">
        <span>Card color = ECC cohort hue</span>
        <span>Edge weight = interaction strength</span>
        <span>Rose edges = tension-character interaction</span>
        ${customCount ? `<span>Green/amber derived edges = custom community interactions</span><span>Draft node updates from builder controls</span>` : ""}
      </div>
    </div>
  `;
}

function renderFragmentationMeter(data, values = currentAggregate(data), compact = false, includeCustom = false) {
  const risk = fragmentationRisk(data, values, includeCustom);
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
  return analysisProfiles(data, true).map((profile) => ({
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

function selectedInteractionProfiles(data) {
  const profiles = eligibleBuilderProfiles(data);
  return state.interactionProfiles.map((id) => profiles.find((profile) => profile.ecc_id === id)).filter(Boolean);
}

function interactionAnalysis(data) {
  const profiles = selectedInteractionProfiles(data);
  const situation = situationTypes[state.interactionType];
  if (profiles.length < 2) return null;

  const dimensionRows = Object.keys(dimensionLabels).map((dimension) => {
    const scores = profiles.map((profile) => dimensionScore(profile.dimensions[dimension].legibility));
    const spread = Math.max(...scores) - Math.min(...scores);
    const lowCount = profiles.filter((profile) => profile.dimensions[dimension].legibility === "low").length;
    const highCount = profiles.filter((profile) => profile.dimensions[dimension].legibility === "high").length;
    const pressure = clamp(spread * (situation.weights[dimension] || 0.1) + lowCount * 0.035 + highCount * 0.01);
    return {
      dimension,
      spread,
      pressure,
      lowCount,
      highCount
    };
  });
  const weightedPressure = clamp(dimensionRows.reduce((sum, row) => sum + row.pressure, 0));
  const sharedHigh = dimensionRows.filter((row) => row.highCount === profiles.length).length;
  const avg = {
    overlap: mean(profiles.map((profile) => profile.current_relationships.overlap_score)),
    tension: mean(profiles.map((profile) => profile.current_relationships.tension_score)),
    translation: mean(profiles.map((profile) => profile.current_relationships.translation_capacity))
  };
  const shift = {
    overlap: clampSigned(-weightedPressure * 0.22 + sharedHigh * 0.012),
    tension: clamp(weightedPressure * 0.34),
    translation: clampSigned(-weightedPressure * 0.26 + sharedHigh * 0.015)
  };
  const topDimensions = [...dimensionRows].sort((a, b) => b.pressure - a.pressure).slice(0, 3);
  const strain = {
    social: clamp(weightedPressure * 0.72 + topDimensions.some((row) => row.dimension === "dignity" || row.dimension === "dishonour") * 0.08),
    economic: clamp(weightedPressure * 0.58 + topDimensions.some((row) => row.dimension === "justice") * 0.08),
    institutional: clamp(weightedPressure * 0.68 + topDimensions.some((row) => row.dimension === "process" || row.dimension === "authority") * 0.09),
    civic: clamp(weightedPressure * 0.64 + topDimensions.some((row) => row.dimension === "trust") * 0.1)
  };
  return { profiles, situation, dimensionRows, topDimensions, avg, shift, strain };
}

function evidenceMatches(data) {
  const analysis = interactionAnalysis(data);
  if (!analysis) return [];
  const dimensions = new Set(analysis.topDimensions.map((row) => row.dimension));
  return historicalEvidence
    .map((item) => ({
      ...item,
      score: (item.type === state.interactionType ? 2 : 0) + item.dimensions.filter((dimension) => dimensions.has(dimension)).length
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function renderDecisionSupportNotice(extra = "") {
  return `<div class="notice decision-notice"><strong>Decision support only, requires human review.</strong> Outputs are pattern-level, aggregation-floor protected, and should not be read as specific-incident predictions.${extra ? ` ${extra}` : ""}</div>`;
}

function renderAttributeSelect(name, value, disabled) {
  return `
    <label class="builder-field">
      <span>${titleCase(name)}</span>
      <select data-action="builderAttribute" data-field="${name}" ${disabled ? "disabled" : ""}>
        ${populationAttributes[name]
          .map((option) => {
            const normalized = option.toLowerCase();
            return `<option value="${normalized}" ${value === normalized ? "selected" : ""}>${option}</option>`;
          })
          .join("")}
      </select>
    </label>
  `;
}

function renderDimensionSelect(key, value, disabled) {
  return `
    <label class="builder-field compact-field">
      <span>${dimensionLabels[key]}</span>
      <select data-action="builderDimension" data-field="${key}" ${disabled ? "disabled" : ""}>
        ${["low", "medium", "high"].map((level) => `<option value="${level}" ${value === level ? "selected" : ""}>${titleCase(level)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderCustomProfileCard(profile) {
  const promoted = state.promotedCustomIds.includes(profile.ecc_id);
  return `
    <div class="builder-card">
      <div>
        <strong>${profile.label}</strong>
        <div class="small">Share ${pct(profile.population_share)} | O ${pct(profile.current_relationships.overlap_score)} | T ${pct(profile.current_relationships.tension_score)} | Tr ${pct(profile.current_relationships.translation_capacity)}</div>
      </div>
      <div class="chip-row">
        ${Object.entries(profile.dimensions)
          .map(([key, detail]) => `<span class="chip">${dimensionLabels[key]} ${titleCase(detail.legibility)}</span>`)
          .join("")}
      </div>
      <div class="builder-card-actions">
        <button class="${promoted ? "secondary-action" : "primary-action"}" data-action="togglePromoteCustom" data-id="${profile.ecc_id}">
          ${promoted ? "Promoted to main modules" : "Promote to main modules"}
        </button>
        <button class="danger-action" data-action="removeCustomProfile" data-id="${profile.ecc_id}">Remove custom profile</button>
      </div>
    </div>
  `;
}

function renderSelectedInteractionProfiles(data) {
  const selected = selectedInteractionProfiles(data);
  if (!selected.length) return `<div class="notice">No profiles selected for the situational interaction.</div>`;
  return `
    <div class="selected-profile-strip">
      ${selected
        .map(
          (profile) => `
            <span class="selected-profile-pill">
              <strong>${profile.label}</strong>
              <button data-action="removeInteractionProfile" data-id="${profile.ecc_id}" aria-label="Remove ${profile.label} from situational interaction">Remove</button>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInteractionReport(data) {
  const analysis = interactionAnalysis(data);
  if (!analysis) return `<div class="notice">Select at least two eligible profiles at or above the aggregation floor to generate a situational interaction report.</div>`;
  return `
    <div class="metric-grid">
      ${renderMetric("Overlap shift", Math.abs(analysis.shift.overlap), `${signed(analysis.shift.overlap)} pattern movement`)}
      ${renderMetric("Tension shift", analysis.shift.tension, `${signed(analysis.shift.tension)} pattern movement`, "tension")}
      ${renderMetric("Translation shift", Math.abs(analysis.shift.translation), `${signed(analysis.shift.translation)} pattern movement`)}
    </div>
    <h3 class="section-heading" style="margin-top:20px">Dimension attribution</h3>
    <div class="dimension-matrix">
      ${analysis.topDimensions
        .map(
          (row) => `
            <div class="dim-box">
              <div class="dim-name">${dimensionLabels[row.dimension]}</div>
              <div class="legibility ${row.pressure > 0.16 ? "low" : row.pressure > 0.09 ? "medium" : "high"}">${pct(row.pressure)} pressure</div>
              <div class="dim-meaning">Spread ${pct(row.spread)} across selected profiles. Low-legibility count ${row.lowCount}; shared high-legibility count ${row.highCount}.</div>
            </div>
          `
        )
        .join("")}
    </div>
    <h3 class="section-heading" style="margin-top:20px">Strain Manifestation report</h3>
    <div class="strain-grid">
      ${Object.entries(analysis.strain)
        .map(([band, value]) => `<div class="strain-band"><strong>${titleCase(band)}</strong><div class="bar ${band === "institutional" ? "tension" : ""}" style="--w:${pct(value)}"><span></span></div><span>${pct(value)} pattern strain</span></div>`)
        .join("")}
    </div>
  `;
}

function renderEvidencePanel(data) {
  const matches = evidenceMatches(data);
  return `
    ${renderDecisionSupportNotice("Historical precedent is retrieved as citation context only, without confidence scoring.")}
    <div class="selector-row" style="margin-top:12px">
      <button class="secondary-action" data-action="retrieveEvidence">Retrieve historical precedents</button>
      <span class="small">${state.evidenceStatus}</span>
    </div>
    <div class="evidence-list">
      ${
        matches.length
          ? matches
              .map(
                (item) => `
                  <article class="evidence-item">
                    <div class="evidence-date">${new Date(item.date).toLocaleDateString()}</div>
                    <h3>${item.headline}</h3>
                    <p>${item.summary}</p>
                    <a href="${item.url}" target="_blank" rel="noreferrer">${item.source} source link</a>
                  </article>
                `
              )
              .join("")
          : `<div class="notice">No sufficiently broad precedent is available for the current combination. Broaden the selected dimensions or situation type.</div>`
      }
    </div>
  `;
}

function renderCommunityBuilder(data) {
  const disabled = !reviewerCanBuild();
  const estimatedShare = estimatePopulationShare();
  const floorBlocked = estimatedShare < MIN_POPULATION_SHARE;
  const profiles = eligibleBuilderProfiles(data);
  return `
    <section class="view active builder-view">
      ${renderDecisionSupportNotice(`Minimum output share floor: ${pct(MIN_POPULATION_SHARE)}. Custom profiles remain separate until a reviewer explicitly promotes them.`)}
      <div class="grid two" style="margin-top:18px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Custom Community Builder</h2>
              <p class="panel-subtitle">Reviewer-gated construction of custom ECC profiles using the preset library structure.</p>
            </div>
            <label class="role-picker">
              <span>Role</span>
              <select data-action="builderRole">
                <option value="reviewer" ${state.builderRole === "reviewer" ? "selected" : ""}>Reviewer</option>
                <option value="senior_reviewer" ${state.builderRole === "senior_reviewer" ? "selected" : ""}>Senior reviewer</option>
                <option value="observer" ${state.builderRole === "observer" ? "selected" : ""}>Observer</option>
              </select>
            </label>
          </div>
          <div class="panel-body">
            ${disabled ? `<div class="notice">Profile creation is locked until a defined reviewer role is selected.</div>` : ""}
            <div class="builder-form">
              ${Object.entries(populationAttributes).map(([name]) => renderAttributeSelect(name, state.builderForm[name], disabled)).join("")}
            </div>
            <h3 class="section-heading" style="margin-top:20px">Six ECC dimensions</h3>
            <div class="builder-form dimension-form">
              ${Object.entries(state.builderForm.dimensions).map(([key, value]) => renderDimensionSelect(key, value, disabled)).join("")}
            </div>
            <div class="floor-readout ${floorBlocked ? "blocked" : ""}">
              Estimated population share: <strong>${pct(estimatedShare)}</strong>
              <span>${floorBlocked ? `Below ${pct(MIN_POPULATION_SHARE)} floor. Broaden filters before creation.` : "Aggregation floor satisfied."}</span>
            </div>
            <div class="selector-row" style="margin-top:14px">
              <button class="primary-action" data-action="createCustomProfile" ${disabled || floorBlocked ? "disabled" : ""}>Create custom profile</button>
              <span class="small">${state.builderStatus}</span>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Separate Custom Profile Store</h2>
              <p class="panel-subtitle">Profiles created here do not enter the preset ECC library or main modules unless promoted.</p>
            </div>
          </div>
          <div class="panel-body custom-store">
            ${state.customProfiles.length ? state.customProfiles.map(renderCustomProfileCard).join("") : `<div class="notice">No custom profiles have been created in this session.</div>`}
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Situational Interaction</h2>
            <p class="panel-subtitle">Place two or more eligible profiles into a situation type and inspect pattern-level movement.</p>
          </div>
          <label class="role-picker">
            <span>Situation</span>
            <select data-action="interactionType">
              ${Object.entries(situationTypes).map(([id, detail]) => `<option value="${id}" ${state.interactionType === id ? "selected" : ""}>${detail.label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="panel-body">
          ${renderSelectedInteractionProfiles(data)}
          <div class="profile-select-grid">
            ${profiles
              .map(
                (profile) => `
                  <label class="profile-check">
                    <input type="checkbox" data-action="interactionProfile" value="${profile.ecc_id}" ${state.interactionProfiles.includes(profile.ecc_id) ? "checked" : ""} />
                    <span><strong>${profile.label}</strong><em>${profile.custom ? "Custom" : "Preset"} | Share ${pct(profile.population_share)}</em></span>
                  </label>
                `
              )
              .join("")}
          </div>
          <div class="interaction-report" style="margin-top:18px">${renderInteractionReport(data)}</div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">ECC Interaction Field: Custom Community Layer</h2>
            <p class="panel-subtitle">Created custom communities appear in the lower band immediately. Derived edges update whenever reviewer-defined ECC dimensions change before creation or new custom profiles are added.</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderNodeGraph(data, { includeCustom: true })}
        </div>
      </div>
      <div class="grid two" style="margin-top:18px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">News-Grounded Evidence</h2>
              <p class="panel-subtitle">Public coverage and research links are shown as historical precedent, not forecasts.</p>
            </div>
          </div>
          <div class="panel-body">${renderEvidencePanel(data)}</div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Profile Creation Audit</h2>
              <p class="panel-subtitle">Visible log of creator role, filters used, and timestamp for each created profile.</p>
            </div>
          </div>
          <div class="panel-body audit-list">
            ${
              state.profileAudit.length
                ? state.profileAudit
                    .map(
                      (entry) => `
                        <div class="audit-item">
                          <strong>${entry.profileLabel}</strong>
                          <span>${new Date(entry.timestamp).toLocaleString()} by ${titleCase(entry.creator)}</span>
                          <code>${entry.filters}</code>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="notice">No profile creation events have been logged.</div>`
            }
          </div>
        </div>
      </div>
    </section>
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
  const categorized = classifyIntervention(data, state.interventionText);
  const intervention = data.interventions.find((item) => item.intervention_id === state.selectedIntervention);
  const rows = interventionResults(data);
  const rehearsal = rehearsalPreview(data);
  return `
    <section class="view active">
      <div class="panel sandbox-guide-panel" style="margin-bottom:18px">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Sandbox workflow</h2>
            <p class="panel-subtitle">Use this sequence to move from a proposed intervention to profile effects and narrative rehearsal.</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderSandboxGuide()}
        </div>
      </div>
      <div class="grid two">
        <div class="panel intervention-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Intervention Sandbox</h2>
              <p class="panel-subtitle">Type an intervention, review its local category warning, then press Simulate to update the profile preview.</p>
            </div>
          </div>
          <div class="panel-body">
            <textarea id="interventionText" aria-label="Describe intervention">${state.interventionText}</textarea>
            <div class="selector-row" style="margin-top:12px">
              <button class="primary-action" data-action="simulateIntervention">Simulate</button>
              <button class="secondary-action" data-action="shuffleIntervention">Load another sample</button>
            </div>
            <h3 class="section-heading" style="margin-top:20px">Categorization warning</h3>
            <div class="notice">
              Current text is categorized as <strong id="categoryLabel">${categorized.label}</strong>. If simulated, the model will use the <span id="categoryDimension">${dimensionLabels[categorized.primary_dimension]}</span> dimension and the <span id="categoryPattern">${categorized.risk_trigger_pattern ? titleCase(categorized.risk_trigger_pattern) : "no primary risk pattern"}</span> warning pattern.
            </div>
            <h3 class="section-heading" style="margin-top:20px">Sample intervention text</h3>
            <div class="prompt-bank">
              ${interventionPrompts
                .map((prompt, index) => `<button class="prompt-chip" data-action="useInterventionPrompt" data-index="${index}">${prompt}</button>`)
                .join("")}
            </div>
            <h3 class="section-heading" style="margin-top:20px">Active simulation: ${intervention.label}</h3>
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
          <div class="panel-body alert-list" id="riskTriggerRegister">
            ${renderRiskAlerts(data, categorized)}
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
          <div class="effect-summary">${effectSummary(data, intervention)}</div>
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

function renderSandboxGuide() {
  const steps = [
    ["1", "Write", "Type the intervention in plain language, or load one of the prepared sample texts."],
    ["2", "Review warning", "Read the category, focus dimension, and risk pattern before changing the active simulation."],
    ["3", "Simulate", "Press Simulate to apply the categorized intervention to all ECC profiles."],
    ["4", "Read effects", "Use the preview table to compare Overlap, Tension, Translation, and dimension triggers."],
    ["5", "Rehearse", "Draft public language, run preview, and use the suggestion panel to reduce avoidable tension."],
    ["6", "Compare", "Open the Scenario Comparison Log and save the current scenario when it is worth retaining."]
  ];
  return `
    <div class="sandbox-steps">
      ${steps
        .map(
          ([number, title, text], index) => `
            <div class="sandbox-step">
              <div class="sandbox-step-number">${number}</div>
              <strong>${title}</strong>
              <span>${text}</span>
            </div>
            ${index < steps.length - 1 ? `<div class="sandbox-step-arrow" aria-hidden="true">→</div>` : ""}
          `
        )
        .join("")}
    </div>
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
  const aggregate = currentAggregate(data, true);
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
            <h2 class="panel-title">ECC Interaction Field</h2>
            <p class="panel-subtitle">Node-based profile interaction diagram used to contextualize CCC gap movement.</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderNodeGraph(data)}
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
      ${state.promotedCustomIds.length ? renderDecisionSupportNotice("This log includes reviewer-promoted custom profiles in saved local scenarios.") : ""}
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

function renderTourOverlay() {
  if (!state.tourActive) return "";
  const step = tourSteps[state.tourStep];
  return `
    <div class="tour-scrim">
      <section class="tour-card" aria-live="polite">
        <div class="tour-count">Step ${state.tourStep + 1} of ${tourSteps.length}</div>
        <h2>${step.title}</h2>
        <p>${step.text}</p>
        <div class="tour-action">${step.action}</div>
        <div class="tour-pointer">
          <span class="pointer-arrow">↖</span>
          <span>Look here: ${step.target}</span>
        </div>
        <div class="tour-controls">
          <button class="secondary-action" data-action="tourBack" ${state.tourStep === 0 ? "disabled" : ""}>Back</button>
          <button class="secondary-action" data-action="tourStop">Finish</button>
          <button class="primary-action" data-action="tourNext">${state.tourStep === tourSteps.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </section>
    </div>
  `;
}

function renderShell(data) {
  const views = [
    ["overview", "Overview"],
    ["explorer", "ECC Profile Explorer"],
    ["sandbox", "Intervention Sandbox"],
    ["builder", "Custom Community Builder"],
    ["dashboard", "CCC Dashboard"],
    ["log", "Scenario Comparison Log"]
  ];

  const viewHtml = {
    overview: renderOverview,
    explorer: renderExplorer,
    sandbox: renderSandbox,
    builder: renderCommunityBuilder,
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
        <button class="tour-start ${state.tourActive ? "active" : ""}" data-action="tourStart">Take guided round</button>
      </nav>
      <main class="main ${state.tourActive ? "tour-mode" : ""}">${viewHtml}</main>
      ${renderTourOverlay()}
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
      state.tourActive = false;
      renderShell(data);
    }
    if (action === "tourStart") {
      state.tourActive = true;
      state.tourStep = 0;
      state.view = tourSteps[0].view;
      renderShell(data);
    }
    if (action === "tourNext") {
      if (state.tourStep >= tourSteps.length - 1) {
        state.tourActive = false;
      } else {
        state.tourStep += 1;
        state.view = tourSteps[state.tourStep].view;
      }
      renderShell(data);
    }
    if (action === "tourBack") {
      if (state.tourStep > 0) {
        state.tourStep -= 1;
        state.view = tourSteps[state.tourStep].view;
      }
      renderShell(data);
    }
    if (action === "tourStop") {
      state.tourActive = false;
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
    if (action === "useInterventionPrompt") {
      const index = Number(target.getAttribute("data-index"));
      state.interventionText = interventionPrompts[index] || state.interventionText;
      renderShell(data);
    }
    if (action === "shuffleIntervention") {
      const currentIndex = interventionPrompts.indexOf(state.interventionText);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % interventionPrompts.length : 0;
      state.interventionText = interventionPrompts[nextIndex];
      renderShell(data);
    }
    if (action === "simulateIntervention") {
      const text = document.querySelector("#interventionText")?.value || state.interventionText;
      state.interventionText = text;
      state.selectedIntervention = classifyIntervention(data, text).intervention_id;
      renderShell(data);
    }
    if (action === "saveScenario") {
      const aggregate = interventionAggregate(data);
      state.scenarioLog.unshift({
        scenario_id: `scn_local_${Date.now()}`,
        label: data.interventions.find((item) => item.intervention_id === state.selectedIntervention).label,
        timestamp: new Date().toISOString(),
        interventions_applied: [state.selectedIntervention],
        custom_profiles_included: state.promotedCustomIds,
        ccc_gap: aggregate
      });
      renderShell(data);
    }
    if (action === "createCustomProfile") {
      if (!reviewerCanBuild()) {
        state.builderStatus = "Creation blocked: reviewer role required.";
        renderShell(data);
        return;
      }
      const profile = buildCustomProfileFromState();
      if (profile.population_share < MIN_POPULATION_SHARE) {
        state.builderStatus = `Creation blocked: estimated share is below ${pct(MIN_POPULATION_SHARE)}.`;
        renderShell(data);
        return;
      }
      state.customProfiles.unshift(profile);
      state.interactionProfiles = [...new Set([...state.interactionProfiles, profile.ecc_id])].slice(-4);
      state.profileAudit.unshift({
        profileId: profile.ecc_id,
        profileLabel: profile.label,
        creator: state.builderRole,
        timestamp: new Date().toISOString(),
        filters: Object.entries(profile.attributes)
          .map(([key, value]) => `${key}=${value}`)
          .join("; ")
      });
      state.builderStatus = `${profile.label} created in separate custom store.`;
      renderShell(data);
    }
    if (action === "togglePromoteCustom") {
      const id = target.getAttribute("data-id");
      if (state.promotedCustomIds.includes(id)) {
        state.promotedCustomIds = state.promotedCustomIds.filter((profileId) => profileId !== id);
        state.builderStatus = "Custom profile removed from main module promotion list.";
      } else {
        state.promotedCustomIds.push(id);
        state.builderStatus = "Custom profile promoted to Sandbox, CCC Dashboard, and Scenario Log calculations.";
      }
      renderShell(data);
    }
    if (action === "removeCustomProfile") {
      const id = target.getAttribute("data-id");
      const removed = state.customProfiles.find((profile) => profile.ecc_id === id);
      state.customProfiles = state.customProfiles.filter((profile) => profile.ecc_id !== id);
      state.promotedCustomIds = state.promotedCustomIds.filter((profileId) => profileId !== id);
      state.interactionProfiles = state.interactionProfiles.filter((profileId) => profileId !== id);
      state.profileAudit.unshift({
        profileId: id,
        profileLabel: removed?.label || id,
        creator: state.builderRole,
        timestamp: new Date().toISOString(),
        filters: "removed custom profile from builder store and interaction layer"
      });
      state.builderStatus = removed ? `${removed.label} removed from custom store and interaction selections.` : "Custom profile removed.";
      state.evidenceStatus = "Profile selection changed; retrieve historical precedents to refresh citation context.";
      renderShell(data);
    }
    if (action === "removeInteractionProfile") {
      const id = target.getAttribute("data-id");
      state.interactionProfiles = state.interactionProfiles.filter((profileId) => profileId !== id);
      state.evidenceStatus = "Profile removed from situational interaction; retrieve historical precedents to refresh citation context.";
      renderShell(data);
    }
    if (action === "retrieveEvidence") {
      const matches = evidenceMatches(data);
      const analysis = interactionAnalysis(data);
      state.evidenceStatus = analysis
        ? `${matches.length} historical precedent item${matches.length === 1 ? "" : "s"} matched to ${situationTypes[state.interactionType].label.toLowerCase()} and current tension dimensions.`
        : "Select at least two eligible profiles before retrieving historical precedents.";
      renderShell(data);
    }
  });

  app.addEventListener("change", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (action === "builderRole") {
      state.builderRole = target.value;
      state.builderStatus = reviewerCanBuild() ? "Reviewer profile creation controls enabled." : "Observer role can inspect but not create custom profiles.";
      renderShell(data);
    }
    if (action === "builderAttribute") {
      state.builderForm[target.getAttribute("data-field")] = target.value;
      state.builderStatus = "Draft filters updated; aggregation floor recalculated.";
      renderShell(data);
    }
    if (action === "builderDimension") {
      state.builderForm.dimensions[target.getAttribute("data-field")] = target.value;
      state.builderStatus = "Draft ECC dimensions updated.";
      renderShell(data);
    }
    if (action === "interactionType") {
      state.interactionType = target.value;
      state.evidenceStatus = "Situation changed; retrieve historical precedents to refresh citation context.";
      renderShell(data);
    }
    if (action === "interactionProfile") {
      const id = target.value;
      if (target.checked) {
        state.interactionProfiles = [...new Set([...state.interactionProfiles, id])];
      } else {
        state.interactionProfiles = state.interactionProfiles.filter((profileId) => profileId !== id);
      }
      state.evidenceStatus = "Profile selection changed; retrieve historical precedents to refresh citation context.";
      renderShell(data);
    }
  });

  app.addEventListener("input", (event) => {
    if (event.target.id === "draftText") {
      state.draft = event.target.value;
    }
    if (event.target.id === "interventionText") {
      state.interventionText = event.target.value;
      updateCategorizationPanel(data, state.interventionText);
    }
  });

  app.addEventListener("mouseover", (event) => {
    const node = event.target.closest(".graph-node");
    if (!node) return;
    const graph = node.closest(".node-graph");
    if (graph) graph.setAttribute("data-hover-node", node.getAttribute("data-node"));
  });

  app.addEventListener("mouseout", (event) => {
    const node = event.target.closest(".graph-node");
    if (!node) return;
    const graph = node.closest(".node-graph");
    if (graph) graph.setAttribute("data-hover-node", "");
  });

  app.addEventListener("focusin", (event) => {
    const node = event.target.closest(".graph-node");
    if (!node) return;
    const graph = node.closest(".node-graph");
    if (graph) graph.setAttribute("data-hover-node", node.getAttribute("data-node"));
  });

  app.addEventListener("focusout", (event) => {
    const node = event.target.closest(".graph-node");
    if (!node) return;
    const graph = node.closest(".node-graph");
    if (graph) graph.setAttribute("data-hover-node", "");
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
