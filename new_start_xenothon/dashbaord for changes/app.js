const STORAGE_KEY = "chronos-dashboard-demo-state";
const SIMULATION_MS = 1000;
const TOTAL_TICKS = 60;
const START_HOUR = 8;

const DYNAMIC_FEATURES = [
  "hr",
  "map_mean",
  "sbp",
  "dbp",
  "rr",
  "spo2",
  "temp_c",
  "pulse_pressure",
  "gcs_total",
  "fio2_frac",
  "pao2",
  "paco2_abg",
  "ph_abg",
  "pf_ratio",
  "sf_ratio",
  "vent_active",
  "vasopressor_active",
  "ne_equivalent_dose",
  "crrt_active",
  "lactate",
  "creatinine",
  "platelets",
  "bilirubin_total",
  "wbc",
  "sodium",
  "potassium",
  "bicarbonate",
  "hemoglobin",
  "glucose",
  "urine_ml",
  "urine_ml_per_kg",
  "sofa_resp",
  "sofa_coag",
  "sofa_liver",
  "sofa_renal",
  "sofa_cardio",
  "sofa_cns",
  "sofa_approx",
  "shock_index",
  "delta_sofa_6h",
  "ards_flag",
  "aki_stage",
  "aki_stage_creat",
  "aki_stage_uo",
  "hours_since_admission",
  "hours_since_infection",
];

const FEATURE_META = {
  hr: { label: "Heart rate", unit: "bpm", min: 45, max: 160, decimals: 0 },
  map_mean: { label: "MAP mean", unit: "mmHg", min: 45, max: 110, decimals: 0 },
  sbp: { label: "Systolic BP", unit: "mmHg", min: 80, max: 180, decimals: 0 },
  dbp: { label: "Diastolic BP", unit: "mmHg", min: 35, max: 105, decimals: 0 },
  rr: { label: "Respiratory rate", unit: "/min", min: 8, max: 40, decimals: 0 },
  spo2: { label: "SpO2", unit: "%", min: 80, max: 100, decimals: 0 },
  temp_c: { label: "Temperature", unit: "C", min: 35, max: 40.5, decimals: 1 },
  pulse_pressure: { label: "Pulse pressure", unit: "mmHg", min: 20, max: 100, decimals: 0 },
  gcs_total: { label: "GCS total", unit: "", min: 3, max: 15, decimals: 0 },
  fio2_frac: { label: "FiO2 fraction", unit: "", min: 0.21, max: 1, decimals: 2 },
  pao2: { label: "PaO2", unit: "mmHg", min: 45, max: 200, decimals: 0 },
  paco2_abg: { label: "PaCO2", unit: "mmHg", min: 20, max: 80, decimals: 0 },
  ph_abg: { label: "ABG pH", unit: "", min: 7, max: 7.6, decimals: 2 },
  pf_ratio: { label: "P/F ratio", unit: "", min: 70, max: 500, decimals: 0 },
  sf_ratio: { label: "S/F ratio", unit: "", min: 80, max: 500, decimals: 0 },
  vent_active: { label: "Vent active", unit: "0/1", min: 0, max: 1, decimals: 0 },
  vasopressor_active: { label: "Vasopressor active", unit: "0/1", min: 0, max: 1, decimals: 0 },
  ne_equivalent_dose: { label: "NE equivalent dose", unit: "mcg/kg/min", min: 0, max: 0.6, decimals: 2 },
  crrt_active: { label: "CRRT active", unit: "0/1", min: 0, max: 1, decimals: 0 },
  lactate: { label: "Lactate", unit: "mmol/L", min: 0.4, max: 8, decimals: 1 },
  creatinine: { label: "Creatinine", unit: "mg/dL", min: 0.5, max: 5.5, decimals: 1 },
  platelets: { label: "Platelets", unit: "K/uL", min: 20, max: 450, decimals: 0 },
  bilirubin_total: { label: "Bilirubin total", unit: "mg/dL", min: 0.2, max: 8, decimals: 1 },
  wbc: { label: "WBC", unit: "K/uL", min: 2, max: 30, decimals: 1 },
  sodium: { label: "Sodium", unit: "mmol/L", min: 120, max: 155, decimals: 0 },
  potassium: { label: "Potassium", unit: "mmol/L", min: 2.5, max: 6.5, decimals: 1 },
  bicarbonate: { label: "Bicarbonate", unit: "mmol/L", min: 10, max: 35, decimals: 0 },
  hemoglobin: { label: "Hemoglobin", unit: "g/dL", min: 6, max: 17, decimals: 1 },
  glucose: { label: "Glucose", unit: "mg/dL", min: 60, max: 360, decimals: 0 },
  urine_ml: { label: "Urine output", unit: "ml", min: 0, max: 240, decimals: 0 },
  urine_ml_per_kg: { label: "Urine per kg", unit: "ml/kg", min: 0, max: 3, decimals: 2 },
  sofa_resp: { label: "SOFA resp", unit: "", min: 0, max: 4, decimals: 0 },
  sofa_coag: { label: "SOFA coag", unit: "", min: 0, max: 4, decimals: 0 },
  sofa_liver: { label: "SOFA liver", unit: "", min: 0, max: 4, decimals: 0 },
  sofa_renal: { label: "SOFA renal", unit: "", min: 0, max: 4, decimals: 0 },
  sofa_cardio: { label: "SOFA cardio", unit: "", min: 0, max: 4, decimals: 0 },
  sofa_cns: { label: "SOFA CNS", unit: "", min: 0, max: 4, decimals: 0 },
  sofa_approx: { label: "SOFA approx", unit: "", min: 0, max: 20, decimals: 0 },
  shock_index: { label: "Shock index", unit: "", min: 0.4, max: 2.2, decimals: 2 },
  delta_sofa_6h: { label: "Delta SOFA 6h", unit: "", min: -3, max: 6, decimals: 1 },
  ards_flag: { label: "ARDS flag", unit: "0/1", min: 0, max: 1, decimals: 0 },
  aki_stage: { label: "AKI stage", unit: "", min: 0, max: 3, decimals: 0 },
  aki_stage_creat: { label: "AKI stage creat", unit: "", min: 0, max: 3, decimals: 0 },
  aki_stage_uo: { label: "AKI stage uo", unit: "", min: 0, max: 3, decimals: 0 },
  hours_since_admission: { label: "Hours since admission", unit: "h", min: 0, max: 240, decimals: 0 },
  hours_since_infection: { label: "Hours since infection", unit: "h", min: 0, max: 240, decimals: 0 },
};

const STAFF = {
  doctors: [
    { id: "doc-1", name: "Dr. Maya Rao", dutyStart: "08:00", dutyEnd: "16:00" },
    { id: "doc-2", name: "Dr. Arjun Sen", dutyStart: "16:00", dutyEnd: "23:59" },
    { id: "doc-3", name: "Dr. Leah Thomas", dutyStart: "00:00", dutyEnd: "08:00" },
  ],
  nurses: [
    { id: "nurse-1", name: "Nurse Asha", dutyStart: "08:00", dutyEnd: "20:00" },
    { id: "nurse-2", name: "Nurse Vikram", dutyStart: "08:00", dutyEnd: "20:00" },
    { id: "nurse-3", name: "Nurse Mira", dutyStart: "20:00", dutyEnd: "08:00" },
  ],
};

const PATIENT_BLUEPRINTS = [
  {
    id: "icu-101",
    name: "Ravi Kumar",
    age: 58,
    unit: "ICU Ward A",
    admissionType: "ICU",
    qrCode: "QR-ICU-101",
    doctorIds: ["doc-1", "doc-2"],
    nurseIds: ["nurse-1", "nurse-2"],
    constants: {
      body_weight_kg: 76,
      charlson_comorbidity_index: 4,
      oasis: 29,
      oasis_prob: 0.31,
      sapsii: 44,
      sapsii_prob: 0.34,
    },
    baseDynamics: {
      hr: 98, map_mean: 69, sbp: 104, dbp: 57, rr: 22, spo2: 94, temp_c: 37.8, pulse_pressure: 47,
      gcs_total: 13, fio2_frac: 0.44, pao2: 78, paco2_abg: 44, ph_abg: 7.34, pf_ratio: 175, sf_ratio: 215,
      vent_active: 1, vasopressor_active: 1, ne_equivalent_dose: 0.14, crrt_active: 0,
      lactate: 3.4, creatinine: 1.8, platelets: 135, bilirubin_total: 1.2, wbc: 14.1,
      sodium: 136, potassium: 4.8, bicarbonate: 20, hemoglobin: 10.8, glucose: 182,
      urine_ml: 38, urine_ml_per_kg: 0.5, sofa_resp: 2, sofa_coag: 1, sofa_liver: 0, sofa_renal: 1,
      sofa_cardio: 2, sofa_cns: 1, sofa_approx: 7, shock_index: 0.94, delta_sofa_6h: 1.2,
      ards_flag: 0, aki_stage: 1, aki_stage_creat: 1, aki_stage_uo: 0, hours_since_admission: 14, hours_since_infection: 3,
    },
  },
  {
    id: "icu-102",
    name: "Sara John",
    age: 67,
    unit: "ICU Ward A",
    admissionType: "ICU",
    qrCode: "QR-ICU-102",
    doctorIds: ["doc-1"],
    nurseIds: ["nurse-2"],
    constants: {
      body_weight_kg: 68,
      charlson_comorbidity_index: 6,
      oasis: 34,
      oasis_prob: 0.39,
      sapsii: 49,
      sapsii_prob: 0.43,
    },
    baseDynamics: {
      hr: 121, map_mean: 61, sbp: 92, dbp: 49, rr: 30, spo2: 89, temp_c: 38.4, pulse_pressure: 43,
      gcs_total: 11, fio2_frac: 0.62, pao2: 65, paco2_abg: 51, ph_abg: 7.29, pf_ratio: 112, sf_ratio: 140,
      vent_active: 1, vasopressor_active: 1, ne_equivalent_dose: 0.22, crrt_active: 1,
      lactate: 4.9, creatinine: 3.2, platelets: 92, bilirubin_total: 2.6, wbc: 18.6,
      sodium: 132, potassium: 5.5, bicarbonate: 17, hemoglobin: 9.7, glucose: 224,
      urine_ml: 18, urine_ml_per_kg: 0.26, sofa_resp: 3, sofa_coag: 2, sofa_liver: 1, sofa_renal: 3,
      sofa_cardio: 3, sofa_cns: 2, sofa_approx: 14, shock_index: 1.32, delta_sofa_6h: 2.1,
      ards_flag: 1, aki_stage: 2, aki_stage_creat: 2, aki_stage_uo: 2, hours_since_admission: 30, hours_since_infection: 8,
    },
  },
  {
    id: "icu-103",
    name: "Imran Ali",
    age: 46,
    unit: "ICU Ward A",
    admissionType: "General",
    qrCode: "QR-ICU-103",
    doctorIds: ["doc-2"],
    nurseIds: ["nurse-1", "nurse-3"],
    constants: {
      body_weight_kg: 83,
      charlson_comorbidity_index: 2,
      oasis: 17,
      oasis_prob: 0.15,
      sapsii: 26,
      sapsii_prob: 0.18,
    },
    baseDynamics: {
      hr: 84, map_mean: 79, sbp: 122, dbp: 72, rr: 18, spo2: 97, temp_c: 36.9, pulse_pressure: 50,
      gcs_total: 15, fio2_frac: 0.28, pao2: 92, paco2_abg: 39, ph_abg: 7.4, pf_ratio: 310, sf_ratio: 365,
      vent_active: 0, vasopressor_active: 0, ne_equivalent_dose: 0, crrt_active: 0,
      lactate: 1.3, creatinine: 1.1, platelets: 228, bilirubin_total: 0.7, wbc: 10.8,
      sodium: 139, potassium: 4.2, bicarbonate: 24, hemoglobin: 12.5, glucose: 126,
      urine_ml: 85, urine_ml_per_kg: 1.02, sofa_resp: 1, sofa_coag: 0, sofa_liver: 0, sofa_renal: 0,
      sofa_cardio: 0, sofa_cns: 0, sofa_approx: 2, shock_index: 0.69, delta_sofa_6h: -0.4,
      ards_flag: 0, aki_stage: 0, aki_stage_creat: 0, aki_stage_uo: 0, hours_since_admission: 10, hours_since_infection: 0,
    },
  },
];

let appState = loadState();
let timerId = null;
const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  hydrateSelects();
  bindEvents();
  renderAll();
});

function cacheDom() {
  [
    "startSimulationBtn", "pauseSimulationBtn", "resetSimulationBtn", "simulationStatus",
    "simulationClock", "simulationTick", "dynamicFeatureList", "wardSummary", "staffDutyList",
    "patientList", "topRiskBadge", "selectedPatientName", "selectedPatientMeta", "selectedPatientRisk",
    "selectedEvent", "selectedTimeline", "selectedDoctors", "selectedNurses", "shapList", "patientInfo",
    "notificationList", "instructionForm", "instructionDoctorId", "instructionText", "instructionList",
    "administerForm", "administerNurseId", "administerDoctorId", "administerMedicine", "administerList",
    "complaintForm", "complaintTarget", "complaintText", "complaintList", "parameterTable",
  ].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return mergeState(JSON.parse(saved));
    } catch (error) {
      console.warn("Unable to parse saved state, using defaults.", error);
    }
  }
  return mergeState({});
}

function mergeState(saved) {
  const doctors = STAFF.doctors.map((doctor) => {
    const persisted = saved.staff?.doctors?.find((item) => item.id === doctor.id);
    return { ...doctor, ...(persisted || {}) };
  });
  const nurses = STAFF.nurses.map((nurse) => {
    const persisted = saved.staff?.nurses?.find((item) => item.id === nurse.id);
    return { ...nurse, ...(persisted || {}) };
  });
  const patients = PATIENT_BLUEPRINTS.map((blueprint, patientIndex) => buildPatientState(blueprint, patientIndex));
  return {
    currentTick: saved.currentTick || 0,
    running: false,
    selectedPatientId: saved.selectedPatientId || patients[0].id,
    previousTopPatientId: saved.previousTopPatientId || null,
    notifications: saved.notifications || [],
    complaints: saved.complaints || [],
    instructions: saved.instructions || [],
    administered: saved.administered || [],
    staff: { doctors, nurses },
    patients,
  };
}

function buildPatientState(blueprint, patientIndex) {
  const dynamics = {};
  DYNAMIC_FEATURES.forEach((featureName) => {
    dynamics[featureName] = blueprint.baseDynamics[featureName];
  });
  const patient = {
    ...blueprint,
    patientIndex,
    dynamics,
    risk: 0,
    event: "none",
    timeline: "12h",
    shapDrivers: [],
    history: [],
  };
  recomputePatient(patient, 0);
  return patient;
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentTick: appState.currentTick,
    selectedPatientId: appState.selectedPatientId,
    previousTopPatientId: appState.previousTopPatientId,
    notifications: appState.notifications.slice(0, 40),
    complaints: appState.complaints,
    instructions: appState.instructions,
    administered: appState.administered,
    staff: appState.staff,
  }));
}

function hydrateSelects() {
  dom.instructionDoctorId.innerHTML = appState.staff.doctors.map((doctor) => `<option value="${doctor.id}">${doctor.name}</option>`).join("");
  dom.administerDoctorId.innerHTML = appState.staff.doctors.map((doctor) => `<option value="${doctor.id}">${doctor.name}</option>`).join("");
  dom.administerNurseId.innerHTML = appState.staff.nurses.map((nurse) => `<option value="${nurse.id}">${nurse.name}</option>`).join("");
}

function bindEvents() {
  dom.startSimulationBtn.addEventListener("click", startSimulation);
  dom.pauseSimulationBtn.addEventListener("click", pauseSimulation);
  dom.resetSimulationBtn.addEventListener("click", resetSimulation);

  dom.instructionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const patient = getSelectedPatient();
    const text = dom.instructionText.value.trim();
    if (!patient || !text) return;
    appState.instructions.unshift({
      id: createId("instruction"),
      patientId: patient.id,
      doctorId: dom.instructionDoctorId.value,
      text,
      createdAtTick: appState.currentTick,
    });
    dom.instructionText.value = "";
    persistState();
    renderAll();
  });

  dom.administerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const patient = getSelectedPatient();
    const medicine = dom.administerMedicine.value.trim();
    if (!patient || !medicine) return;
    appState.administered.unshift({
      id: createId("admin"),
      patientId: patient.id,
      nurseId: dom.administerNurseId.value,
      doctorId: dom.administerDoctorId.value,
      medicine,
      createdAtTick: appState.currentTick,
    });
    dom.administerMedicine.value = "";
    persistState();
    renderAll();
  });

  dom.complaintForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const patient = getSelectedPatient();
    const text = dom.complaintText.value.trim();
    if (!patient || !text) return;
    appState.complaints.unshift({
      id: createId("complaint"),
      patientId: patient.id,
      target: dom.complaintTarget.value,
      text,
      status: "open",
      resolvedByPatient: false,
      resolvedByNurse: false,
      createdAtTick: appState.currentTick,
    });
    dom.complaintText.value = "";
    persistState();
    renderAll();
  });
}

function startSimulation() {
  if (timerId) return;
  appState.running = true;
  timerId = window.setInterval(stepSimulation, SIMULATION_MS);
  renderAll();
}

function pauseSimulation() {
  appState.running = false;
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  renderAll();
}

function resetSimulation() {
  pauseSimulation();
  appState = mergeState({
    complaints: appState.complaints,
    instructions: appState.instructions,
    administered: appState.administered,
    selectedPatientId: appState.selectedPatientId,
    staff: appState.staff,
  });
  persistState();
  hydrateSelects();
  renderAll();
}

function stepSimulation() {
  appState.currentTick += 1;
  if (appState.currentTick > TOTAL_TICKS) {
    pauseSimulation();
    appState.currentTick = TOTAL_TICKS;
  }

  appState.patients.forEach((patient) => {
    recomputePatient(patient, appState.currentTick);
  });

  createNotificationsForTick();
  persistState();
  renderAll();

  if (appState.currentTick >= TOTAL_TICKS) {
    pauseSimulation();
  }
}

function recomputePatient(patient, tick) {
  const dynamics = {};
  DYNAMIC_FEATURES.forEach((featureName, featureIndex) => {
    const meta = FEATURE_META[featureName];
    dynamics[featureName] = clampAndRound(
      simulateFeature({
        patient,
        tick,
        featureName,
        featureIndex,
        base: patient.baseDynamics[featureName],
      }),
      meta.min,
      meta.max,
      meta.decimals
    );
  });

  dynamics.body_weight_kg = patient.constants.body_weight_kg;
  dynamics.pulse_pressure = clampAndRound(dynamics.sbp - dynamics.dbp, FEATURE_META.pulse_pressure.min, FEATURE_META.pulse_pressure.max, 0);
  dynamics.shock_index = clampAndRound(dynamics.hr / Math.max(dynamics.sbp, 1), FEATURE_META.shock_index.min, FEATURE_META.shock_index.max, 2);
  dynamics.sf_ratio = clampAndRound(dynamics.spo2 / Math.max(dynamics.fio2_frac, 0.21), FEATURE_META.sf_ratio.min, FEATURE_META.sf_ratio.max, 0);
  dynamics.pf_ratio = clampAndRound(dynamics.pao2 / Math.max(dynamics.fio2_frac, 0.21), FEATURE_META.pf_ratio.min, FEATURE_META.pf_ratio.max, 0);
  dynamics.aki_stage_creat = Math.min(3, Math.round(dynamics.creatinine >= 3 ? 2 : dynamics.creatinine >= 1.8 ? 1 : 0));
  dynamics.aki_stage_uo = Math.min(3, Math.round(dynamics.urine_ml_per_kg < 0.3 ? 2 : dynamics.urine_ml_per_kg < 0.5 ? 1 : 0));
  dynamics.aki_stage = Math.max(dynamics.aki_stage_creat, dynamics.aki_stage_uo);
  dynamics.ards_flag = dynamics.pf_ratio < 200 ? 1 : 0;
  dynamics.sofa_resp = scoreResp(dynamics);
  dynamics.sofa_cardio = scoreCardio(dynamics);
  dynamics.sofa_renal = scoreRenal(dynamics);
  dynamics.sofa_coag = scoreCoag(dynamics);
  dynamics.sofa_liver = scoreLiver(dynamics);
  dynamics.sofa_cns = scoreCns(dynamics);
  dynamics.sofa_approx = dynamics.sofa_resp + dynamics.sofa_cardio + dynamics.sofa_renal + dynamics.sofa_coag + dynamics.sofa_liver + dynamics.sofa_cns;
  dynamics.delta_sofa_6h = clampAndRound(dynamics.sofa_approx - patient.baseDynamics.sofa_approx, FEATURE_META.delta_sofa_6h.min, FEATURE_META.delta_sofa_6h.max, 1);

  patient.dynamics = dynamics;

  const prediction = calculatePrediction(patient);
  patient.risk = prediction.risk;
  patient.event = prediction.event;
  patient.timeline = prediction.timeline;
  patient.shapDrivers = prediction.shapDrivers;
  patient.history.push({ tick, risk: patient.risk, event: patient.event });
  if (patient.history.length > 18) {
    patient.history = patient.history.slice(-18);
  }
}

function simulateFeature({ patient, tick, featureName, featureIndex, base }) {
  if (featureName === "hours_since_admission") {
    return base + tick;
  }
  if (featureName === "hours_since_infection") {
    return base === 0 ? 0 : base + tick;
  }
  if (["vent_active", "vasopressor_active", "crrt_active", "ards_flag"].includes(featureName)) {
    return binaryTrend(patient, featureName, tick);
  }

  const drift = Math.sin((tick + 1 + patient.patientIndex * 2) / (3 + (featureIndex % 5))) * amplitudeFor(featureName);
  const wobble = Math.cos((tick + featureIndex + patient.patientIndex) / 2.7) * amplitudeFor(featureName) * 0.45;
  const trend = patient.patientIndex === 1 ? amplitudeFor(featureName) * 0.05 * tick : patient.patientIndex === 2 ? -amplitudeFor(featureName) * 0.03 * tick : 0;
  return base + drift + wobble + trend;
}

function binaryTrend(patient, featureName, tick) {
  const base = patient.baseDynamics[featureName];
  if (featureName === "vent_active") {
    if (patient.id === "icu-103") return 0;
    return base;
  }
  if (featureName === "crrt_active") {
    if (patient.id === "icu-102") return 1;
    return base;
  }
  if (featureName === "vasopressor_active") {
    if (patient.id === "icu-102") return tick > 18 ? 1 : base;
    if (patient.id === "icu-101") return tick > 35 ? 0 : base;
    return 0;
  }
  if (featureName === "ards_flag") {
    return patient.id === "icu-102" || (patient.id === "icu-101" && tick > 22) ? 1 : 0;
  }
  return base;
}

function amplitudeFor(featureName) {
  const map = {
    hr: 8, map_mean: 5, sbp: 8, dbp: 6, rr: 3, spo2: 2, temp_c: 0.3, fio2_frac: 0.04, pao2: 8,
    paco2_abg: 4, ph_abg: 0.03, pf_ratio: 22, sf_ratio: 26, ne_equivalent_dose: 0.03, lactate: 0.35,
    creatinine: 0.18, platelets: 8, bilirubin_total: 0.2, wbc: 1.2, sodium: 1.4, potassium: 0.2,
    bicarbonate: 1.1, hemoglobin: 0.2, glucose: 16, urine_ml: 10, urine_ml_per_kg: 0.12, sofa_resp: 0.25,
    sofa_coag: 0.15, sofa_liver: 0.15, sofa_renal: 0.2, sofa_cardio: 0.2, sofa_cns: 0.18, sofa_approx: 0.4,
    shock_index: 0.05, delta_sofa_6h: 0.3, aki_stage: 0.15, aki_stage_creat: 0.15, aki_stage_uo: 0.15,
  };
  return map[featureName] || 1;
}

function calculatePrediction(patient) {
  const d = patient.dynamics;
  const contributions = [];
  pushContribution(contributions, "map_mean", severityLow(d.map_mean, 70, 55) * 18);
  pushContribution(contributions, "spo2", severityLow(d.spo2, 94, 86) * 16);
  pushContribution(contributions, "lactate", severityHigh(d.lactate, 2, 5) * 17);
  pushContribution(contributions, "creatinine", severityHigh(d.creatinine, 1.4, 3.5) * 13);
  pushContribution(contributions, "urine_ml_per_kg", severityLow(d.urine_ml_per_kg, 0.6, 0.2) * 14);
  pushContribution(contributions, "fio2_frac", severityHigh(d.fio2_frac, 0.4, 0.8) * 10);
  pushContribution(contributions, "shock_index", severityHigh(d.shock_index, 0.9, 1.4) * 12);
  pushContribution(contributions, "sofa_approx", severityHigh(d.sofa_approx, 6, 15) * 15);
  pushContribution(contributions, "rr", severityHigh(d.rr, 22, 34) * 7);
  pushContribution(contributions, "gcs_total", severityLow(d.gcs_total, 13, 8) * 8);
  pushContribution(contributions, "pf_ratio", severityLow(d.pf_ratio, 220, 100) * 11);
  pushContribution(contributions, "vasopressor_active", d.vasopressor_active ? 8 : 0);
  pushContribution(contributions, "crrt_active", d.crrt_active ? 6 : 0);

  const risk = clampAndRound(12 + contributions.reduce((sum, item) => sum + item.weight, 0), 4, 99, 0);
  const event = predictEvent(d, risk);
  const timeline = risk >= 90 ? "2h" : risk >= 75 ? "6h" : "12h";
  const shapDrivers = contributions
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((item) => ({
      feature: item.feature,
      label: FEATURE_META[item.feature].label,
      value: formatValue(item.feature, d[item.feature]),
      impact: `${clampAndRound(item.weight, 0, 100, 1)} pts`,
    }));
  return { risk, event, timeline, shapDrivers };
}

function predictEvent(dynamics, risk) {
  if (dynamics.aki_stage >= 2 && dynamics.urine_ml_per_kg < 0.4) return "AKI stage escalation";
  if (dynamics.ards_flag === 1 && dynamics.spo2 < 90) return "ARDS deterioration";
  if (dynamics.vasopressor_active === 1 && dynamics.map_mean < 65 && dynamics.lactate > 2) return "Hemodynamic collapse";
  if (risk < 35) return "Stable monitoring";
  return "Sepsis progression";
}

function pushContribution(collection, feature, weight) {
  if (weight > 0) {
    collection.push({ feature, weight });
  }
}

function severityHigh(value, softStart, hardEnd) {
  return normalize(value, softStart, hardEnd);
}

function severityLow(value, softStart, hardEnd) {
  return normalize(softStart - value, 0, softStart - hardEnd);
}

function normalize(value, min, max) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function scoreResp(d) {
  if (d.pf_ratio < 100) return 4;
  if (d.pf_ratio < 200) return 3;
  if (d.pf_ratio < 300) return 2;
  if (d.pf_ratio < 400) return 1;
  return 0;
}

function scoreCardio(d) {
  if (d.vasopressor_active && d.ne_equivalent_dose > 0.18) return 4;
  if (d.vasopressor_active && d.ne_equivalent_dose > 0.08) return 3;
  if (d.map_mean < 70) return 2;
  if (d.map_mean < 75) return 1;
  return 0;
}

function scoreRenal(d) {
  if (d.crrt_active || d.creatinine > 3.4 || d.urine_ml_per_kg < 0.3) return 4;
  if (d.creatinine > 2.0 || d.urine_ml_per_kg < 0.5) return 3;
  if (d.creatinine > 1.2) return 1;
  return 0;
}

function scoreCoag(d) {
  if (d.platelets < 50) return 4;
  if (d.platelets < 100) return 2;
  if (d.platelets < 150) return 1;
  return 0;
}

function scoreLiver(d) {
  if (d.bilirubin_total > 6) return 4;
  if (d.bilirubin_total > 2) return 2;
  if (d.bilirubin_total > 1.2) return 1;
  return 0;
}

function scoreCns(d) {
  if (d.gcs_total < 6) return 4;
  if (d.gcs_total < 10) return 3;
  if (d.gcs_total < 13) return 2;
  if (d.gcs_total < 15) return 1;
  return 0;
}

function createNotificationsForTick() {
  const ranked = getRankedPatients();
  const topPatient = ranked[0];
  if (!topPatient) return;

  if (appState.previousTopPatientId !== topPatient.id) {
    addNotification(topPatient, "priority-change", `${topPatient.name} is now top priority in the ward.`);
    appState.previousTopPatientId = topPatient.id;
  }

  ranked.forEach((patient) => {
    const previous = patient.history[patient.history.length - 2];
    const crossedThreshold = patient.risk >= 85 && (!previous || previous.risk < 85);
    if (crossedThreshold) {
      addNotification(patient, "risk-threshold", `${patient.name} crossed 85% risk with ${patient.event} expected in ${patient.timeline}.`);
    }
  });
}

function addNotification(patient, category, message) {
  const hasOnDutyDoctor = patient.doctorIds.some((doctorId) => isDoctorOnDuty(doctorId));
  appState.notifications.unshift({
    id: createId("notification"),
    patientId: patient.id,
    category,
    message,
    type: hasOnDutyDoctor ? "ringing" : "silent",
    createdAtTick: appState.currentTick,
    acknowledged: false,
  });
  appState.notifications = appState.notifications.slice(0, 20);
}

function renderAll() {
  renderSimulationHeader();
  renderDynamicFeatureChips();
  renderWardSummary();
  renderStaffDutyList();
  renderPatientList();
  renderSelectedPatient();
  renderNotifications();
  renderInstructions();
  renderAdministered();
  renderComplaints();
  renderParameterTable();
}

function renderSimulationHeader() {
  dom.simulationStatus.textContent = appState.running ? "Running" : "Paused";
  dom.simulationStatus.className = `status-pill ${appState.running ? "" : "neutral"}`;
  dom.simulationClock.textContent = formatClock(appState.currentTick);
  dom.simulationTick.textContent = `${appState.currentTick} / ${TOTAL_TICKS}`;
}

function renderDynamicFeatureChips() {
  dom.dynamicFeatureList.innerHTML = DYNAMIC_FEATURES.map((feature) => `<span class="chip">${FEATURE_META[feature].label}</span>`).join("");
}

function renderWardSummary() {
  const ranked = getRankedPatients();
  const topPatient = ranked[0];
  dom.topRiskBadge.textContent = topPatient ? `${topPatient.name}: ${topPatient.risk}%` : "Waiting";

  const averageRisk = ranked.length ? Math.round(ranked.reduce((sum, patient) => sum + patient.risk, 0) / ranked.length) : 0;
  const highRiskCount = ranked.filter((patient) => patient.risk >= 85).length;

  dom.wardSummary.innerHTML = [
    summaryCard("Patients", `${ranked.length}`),
    summaryCard("Average risk", `${averageRisk}%`),
    summaryCard("Ringing alerts", `${appState.notifications.filter((item) => item.type === "ringing" && !item.acknowledged).length}`),
    summaryCard("High-risk patients", `${highRiskCount}`),
  ].join("");
}

function summaryCard(label, value) {
  return `<div class="summary-card"><span class="label">${label}</span><div class="risk-value">${value}</div></div>`;
}

function renderStaffDutyList() {
  const doctorCards = appState.staff.doctors.map((doctor) => staffCard(doctor, "doctor"));
  const nurseCards = appState.staff.nurses.map((nurse) => staffCard(nurse, "nurse"));
  dom.staffDutyList.innerHTML = [...doctorCards, ...nurseCards].join("");

  dom.staffDutyList.querySelectorAll("[data-staff-id]").forEach((element) => {
    const staffId = element.dataset.staffId;
    const role = element.dataset.role;
    const startInput = element.querySelector(".duty-start");
    const endInput = element.querySelector(".duty-end");
    startInput.addEventListener("change", () => updateStaffDuty(role, staffId, "dutyStart", startInput.value));
    endInput.addEventListener("change", () => updateStaffDuty(role, staffId, "dutyEnd", endInput.value));
  });
}

function staffCard(staff, role) {
  const onDuty = role === "doctor" ? isDoctorOnDuty(staff.id) : isNurseOnDuty(staff.id);
  return `
    <div class="staff-card" data-staff-id="${staff.id}" data-role="${role}">
      <div class="card-row">
        <div>
          <strong>${staff.name}</strong>
          <div class="muted">${role}</div>
        </div>
        <span class="status-pill ${onDuty ? "" : "neutral"}">${onDuty ? "On duty" : "Off duty"}</span>
      </div>
      <div class="form-grid" style="margin-top: 0.75rem; margin-bottom: 0;">
        <label>
          Start
          <input class="duty-start" type="time" value="${staff.dutyStart}">
        </label>
        <label>
          End
          <input class="duty-end" type="time" value="${staff.dutyEnd}">
        </label>
      </div>
    </div>
  `;
}

function updateStaffDuty(role, staffId, field, value) {
  const collection = role === "doctor" ? appState.staff.doctors : appState.staff.nurses;
  const item = collection.find((entry) => entry.id === staffId);
  if (!item) return;
  item[field] = value;
  persistState();
  renderAll();
}

function renderPatientList() {
  const selectedPatient = getSelectedPatient();
  const ranked = getRankedPatients();
  dom.patientList.innerHTML = ranked.map((patient, index) => {
    const alertType = patient.risk >= 85 && patient.doctorIds.some((doctorId) => isDoctorOnDuty(doctorId)) ? "ring" : "silent";
    return `
      <div class="patient-card ${selectedPatient && selectedPatient.id === patient.id ? "active" : ""}" data-patient-id="${patient.id}">
        <div class="patient-card-head">
          <div>
            <strong>#${index + 1} ${patient.name}</strong>
            <div class="muted">${patient.unit} · ${patient.id}</div>
          </div>
          <div class="risk-value">${patient.risk}%</div>
        </div>
        <div class="card-row">
          <span>${patient.event}</span>
          <span>${patient.timeline}</span>
        </div>
        <div class="badge-row">
          <span class="badge ${alertType}">${alertType === "ring" ? "Ringing alert" : "Silent alert"}</span>
          <span class="badge">${patient.shapDrivers[0]?.label || "No driver"}</span>
        </div>
      </div>
    `;
  }).join("");

  dom.patientList.querySelectorAll("[data-patient-id]").forEach((element) => {
    element.addEventListener("click", () => {
      appState.selectedPatientId = element.dataset.patientId;
      persistState();
      renderAll();
    });
  });
}

function renderSelectedPatient() {
  const patient = getSelectedPatient();
  if (!patient) return;

  dom.selectedPatientName.textContent = patient.name;
  dom.selectedPatientMeta.textContent = `${patient.id} · age ${patient.age} · ${patient.admissionType} · ${patient.unit}`;
  dom.selectedPatientRisk.innerHTML = `<strong>${patient.risk}%</strong><span>Risk</span>`;
  dom.selectedEvent.textContent = patient.event;
  dom.selectedTimeline.textContent = patient.timeline;
  dom.selectedDoctors.textContent = patient.doctorIds.map(doctorNameById).join(", ");
  dom.selectedNurses.textContent = patient.nurseIds.map(nurseNameById).join(", ");

  dom.shapList.innerHTML = patient.shapDrivers.map((driver) => `
    <div class="list-card">
      <div class="split">
        <strong>${driver.label}</strong>
        <span class="status-pill warning">${driver.impact}</span>
      </div>
      <div class="muted">${driver.value}</div>
    </div>
  `).join("");

  dom.patientInfo.innerHTML = [
    infoRow("QR code", patient.qrCode),
    infoRow("Body weight", `${patient.constants.body_weight_kg} kg`),
    infoRow("Charlson", `${patient.constants.charlson_comorbidity_index}`),
    infoRow("OASIS", `${patient.constants.oasis} (${Math.round(patient.constants.oasis_prob * 100)}%)`),
    infoRow("SAPS-II", `${patient.constants.sapsii} (${Math.round(patient.constants.sapsii_prob * 100)}%)`),
  ].join("");
}

function infoRow(label, value) {
  return `<div class="split"><span class="muted">${label}</span><strong>${value}</strong></div>`;
}

function renderNotifications() {
  if (!appState.notifications.length) {
    dom.notificationList.innerHTML = emptyState("No notifications yet. Start the simulation to trigger risk and priority alerts.");
    return;
  }

  dom.notificationList.innerHTML = appState.notifications.map((notification) => {
    const patient = appState.patients.find((entry) => entry.id === notification.patientId);
    return `
      <div class="notification-card" data-notification-id="${notification.id}">
        <div class="notification-head">
          <strong>${patient ? patient.name : notification.patientId}</strong>
          <div class="badge-row">
            <span class="badge ${notification.type === "ringing" ? "ring" : "silent"}">${notification.type}</span>
            <span class="badge">${formatClock(notification.createdAtTick)}</span>
          </div>
        </div>
        <p class="subtext compact">${notification.message}</p>
        <div class="actions-inline">
          <button data-action="ack">${notification.acknowledged ? "Acknowledged" : "Acknowledge"}</button>
        </div>
      </div>
    `;
  }).join("");

  dom.notificationList.querySelectorAll("[data-notification-id]").forEach((element) => {
    const button = element.querySelector("[data-action='ack']");
    button.addEventListener("click", () => {
      const notification = appState.notifications.find((item) => item.id === element.dataset.notificationId);
      if (notification) {
        notification.acknowledged = true;
        persistState();
        renderAll();
      }
    });
  });
}

function renderInstructions() {
  const patient = getSelectedPatient();
  const instructions = appState.instructions.filter((item) => item.patientId === patient.id);
  dom.instructionList.innerHTML = instructions.length ? instructions.map((item) => `
    <div class="list-card">
      <div class="split">
        <strong>${doctorNameById(item.doctorId)}</strong>
        <span class="badge">${formatClock(item.createdAtTick)}</span>
      </div>
      <div>${item.text}</div>
    </div>
  `).join("") : emptyState("No doctor instructions for this patient yet.");
}

function renderAdministered() {
  const patient = getSelectedPatient();
  const administered = appState.administered.filter((item) => item.patientId === patient.id);
  dom.administerList.innerHTML = administered.length ? administered.map((item) => `
    <div class="list-card">
      <div class="split">
        <strong>${item.medicine}</strong>
        <span class="badge">${formatClock(item.createdAtTick)}</span>
      </div>
      <div class="muted">Nurse: ${nurseNameById(item.nurseId)} · Ordered by ${doctorNameById(item.doctorId)}</div>
    </div>
  `).join("") : emptyState("No nurse administered records yet.");
}

function renderComplaints() {
  const patient = getSelectedPatient();
  const complaints = appState.complaints.filter((item) => item.patientId === patient.id);
  if (!complaints.length) {
    dom.complaintList.innerHTML = emptyState("No complaints logged for this patient.");
    return;
  }

  dom.complaintList.innerHTML = complaints.map((item) => `
    <div class="list-card" data-complaint-id="${item.id}">
      <div class="split">
        <strong>${item.target}</strong>
        <span class="status-pill ${item.status === "resolved" ? "" : "warning"}">${item.status}</span>
      </div>
      <p class="subtext compact">${item.text}</p>
      <div class="badge-row">
        <span class="badge">Patient resolved: ${item.resolvedByPatient ? "yes" : "no"}</span>
        <span class="badge">Nurse resolved: ${item.resolvedByNurse ? "yes" : "no"}</span>
      </div>
      <div class="actions-inline">
        <button data-action="patient-resolve">Patient resolve</button>
        <button data-action="nurse-resolve">Nurse resolve</button>
      </div>
    </div>
  `).join("");

  dom.complaintList.querySelectorAll("[data-complaint-id]").forEach((element) => {
    const complaint = appState.complaints.find((item) => item.id === element.dataset.complaintId);
    if (!complaint) return;
    element.querySelector("[data-action='patient-resolve']").addEventListener("click", () => {
      complaint.resolvedByPatient = true;
      complaint.status = complaint.resolvedByNurse ? "resolved" : "pending-confirmation";
      persistState();
      renderAll();
    });
    element.querySelector("[data-action='nurse-resolve']").addEventListener("click", () => {
      complaint.resolvedByNurse = true;
      complaint.status = complaint.resolvedByPatient ? "resolved" : "pending-confirmation";
      persistState();
      renderAll();
    });
  });
}

function renderParameterTable() {
  const patient = getSelectedPatient();
  if (!patient) return;
  dom.parameterTable.innerHTML = DYNAMIC_FEATURES.map((feature) => {
    const meta = FEATURE_META[feature];
    return `
      <div class="parameter-row">
        <div>
          <strong>${meta.label}</strong>
          <div class="muted"><code>${feature}</code></div>
        </div>
        <div><span class="label">Current</span><strong>${formatValue(feature, patient.dynamics[feature])}</strong></div>
        <div><span class="label">Base</span><strong>${formatValue(feature, patient.baseDynamics[feature])}</strong></div>
      </div>
    `;
  }).join("");
}

function getRankedPatients() {
  return [...appState.patients].sort((a, b) => b.risk - a.risk);
}

function getSelectedPatient() {
  return appState.patients.find((patient) => patient.id === appState.selectedPatientId) || appState.patients[0];
}

function isDoctorOnDuty(doctorId) {
  const doctor = appState.staff.doctors.find((item) => item.id === doctorId);
  return isTimeWithinRange(formatClock(appState.currentTick), doctor?.dutyStart, doctor?.dutyEnd);
}

function isNurseOnDuty(nurseId) {
  const nurse = appState.staff.nurses.find((item) => item.id === nurseId);
  return isTimeWithinRange(formatClock(appState.currentTick), nurse?.dutyStart, nurse?.dutyEnd);
}

function isTimeWithinRange(current, start, end) {
  if (!start || !end) return false;
  const currentMinutes = toMinutes(current);
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function toMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatClock(tick) {
  const hour = (START_HOUR + tick) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function doctorNameById(id) {
  return appState.staff.doctors.find((doctor) => doctor.id === id)?.name || id;
}

function nurseNameById(id) {
  return appState.staff.nurses.find((nurse) => nurse.id === id)?.name || id;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function formatValue(featureName, value) {
  const meta = FEATURE_META[featureName];
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  const formatted = Number(value).toFixed(meta.decimals);
  return meta.unit ? `${formatted} ${meta.unit}` : formatted;
}

function clampAndRound(value, min, max, decimals) {
  const clamped = Math.max(min, Math.min(max, value));
  const factor = 10 ** decimals;
  return Math.round(clamped * factor) / factor;
}
