import React, { useEffect, useState, useMemo } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import "./App.css";

const PATIENT_ID = "patient_001";

// ── Helpers ──────────────────────────────────────────────────────────────

function classifyVital(value, baseline, tolerance) {
  if (baseline == null) return "normal";
  const deviation = Math.abs(value - baseline);
  if (deviation > tolerance * 2) return "alert";
  if (deviation > tolerance) return "watch";
  return "normal";
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTimestampFull(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ── Vital Card ───────────────────────────────────────────────────────────

function VitalCard({ label, value, unit, state, sublabel, bpmForPulse }) {
  return (
    <div className={`vital-card vital-card--${state}`}>
      <div className="vital-card__label">{label}</div>
      <div className="vital-card__reading">
        <span className="vital-card__value">{value}</span>
        <span className="vital-card__unit">{unit}</span>
      </div>
      <div className="vital-card__sublabel">{sublabel}</div>
      {bpmForPulse ? (
        <div
          className="rhythm-bar"
          style={{ animationDuration: `${60000 / bpmForPulse}ms` }}
        >
          <div className={`rhythm-bar__fill rhythm-bar__fill--${state}`} />
        </div>
      ) : (
        <div className={`status-bar status-bar--${state}`} />
      )}
    </div>
  );
}

// ── Alert Row ────────────────────────────────────────────────────────────

function AlertRow({ alert }) {
  return (
    <div className={`alert-row alert-row--${alert.severity || "alert"}`}>
      <div className="alert-row__dot" />
      <div className="alert-row__body">
        <div className="alert-row__headline">
          {alert.contributing_factors && alert.contributing_factors.length > 0
            ? alert.contributing_factors
                .map((f) => f.replace(/_/g, " ").replace("roll mean", "").replace("roll std", "").trim())
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .join(", ")
            : "Anomaly detected"}
        </div>
        <div className="alert-row__meta">
          Risk score {alert.risk_score} · {formatTimestampFull(alert.timestamp)}
        </div>
      </div>
      <div className="alert-row__score">{Math.round(alert.risk_score)}</div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────

export default function App() {
  const [profile, setProfile] = useState(null);
  const [readings, setReadings] = useState([]);
  const [riskScores, setRiskScores] = useState([]);
  const [connectionState, setConnectionState] = useState("connecting");

  useEffect(() => {
    const patientRef = doc(db, "patients", PATIENT_ID);
    const unsubProfile = onSnapshot(
      patientRef,
      (snap) => {
        setConnectionState("connected");
        if (snap.exists()) setProfile(snap.data().profile || null);
      },
      (err) => {
        console.error(err);
        setConnectionState("error");
      }
    );

    const readingsQuery = query(
      collection(db, "patients", PATIENT_ID, "readings"),
      orderBy("timestamp", "desc"),
      limit(60)
    );
    const unsubReadings = onSnapshot(readingsQuery, (snap) => {
      const data = snap.docs.map((d) => d.data());
      setReadings(data.reverse()); // chronological order for the chart
    });

    const riskQuery = query(
      collection(db, "patients", PATIENT_ID, "risk_scores"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsubRisk = onSnapshot(riskQuery, (snap) => {
      setRiskScores(snap.docs.map((d) => d.data()));
    });

    return () => {
      unsubProfile();
      unsubReadings();
      unsubRisk();
    };
  }, []);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  const hrState = useMemo(
    () =>
      latest && profile
        ? classifyVital(latest.heart_rate_bpm, profile.baseline_hr, 12)
        : "normal",
    [latest, profile]
  );
  const spo2State = useMemo(
    () =>
      latest && profile
        ? classifyVital(latest.spo2_percent, profile.baseline_spo2, 2.5)
        : "normal",
    [latest, profile]
  );
  const tempState = useMemo(
    () =>
      latest && profile
        ? classifyVital(latest.temperature_c, profile.baseline_temp, 0.6)
        : "normal",
    [latest, profile]
  );

  const overallState = [hrState, spo2State, tempState].includes("alert")
    ? "alert"
    : [hrState, spo2State, tempState].includes("watch")
    ? "watch"
    : "normal";

  const chartData = readings.map((r) => ({
    time: formatTime(r.timestamp),
    hr: r.heart_rate_bpm,
    spo2: r.spo2_percent,
    temp: r.temperature_c
  }));

  return (
    <div className="app">
      <header className="header">
        <div className="header__title-group">
          <span className="header__eyebrow">GA9 · Healthcare IoT Monitoring</span>
          <h1 className="header__title">
            {profile ? profile.name : "Loading patient…"}
          </h1>
          <span className="header__condition">
            {profile ? profile.condition : ""}
          </span>
        </div>
        <div className={`connection-pill connection-pill--${connectionState}`}>
          <span className="connection-pill__dot" />
          {connectionState === "connected" ? "Live" : connectionState === "connecting" ? "Connecting…" : "Connection error"}
        </div>
      </header>

      <div className={`overall-banner overall-banner--${overallState}`}>
        <span className="overall-banner__label">
          {overallState === "normal" && "All vitals within personal baseline"}
          {overallState === "watch" && "Vitals drifting from baseline — monitor closely"}
          {overallState === "alert" && "Vitals outside safe range — attention required"}
        </span>
        {latest && (
          <span className="overall-banner__timestamp">
            Last reading {formatTimestampFull(latest.timestamp)}
          </span>
        )}
      </div>

      <section className="vitals-grid">
        <VitalCard
          label="Heart rate"
          value={latest ? latest.heart_rate_bpm.toFixed(0) : "—"}
          unit="bpm"
          state={hrState}
          sublabel={profile ? `Baseline ${profile.baseline_hr} bpm` : ""}
          bpmForPulse={latest ? latest.heart_rate_bpm : null}
        />
        <VitalCard
          label="Blood oxygen"
          value={latest ? latest.spo2_percent.toFixed(1) : "—"}
          unit="% SpO₂"
          state={spo2State}
          sublabel={profile ? `Baseline ${profile.baseline_spo2}%` : ""}
        />
        <VitalCard
          label="Temperature"
          value={latest ? latest.temperature_c.toFixed(1) : "—"}
          unit="°C"
          state={tempState}
          sublabel={profile ? `Baseline ${profile.baseline_temp}°C` : ""}
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Vitals history</h2>
          <span className="panel__sub">Last {readings.length} readings</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#1B2740" vertical={false} />
            <XAxis dataKey="time" stroke="#5B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: "#1B2740" }} />
            <YAxis stroke="#5B6B85" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "#121C2E",
                border: "1px solid #1B2740",
                borderRadius: 8,
                fontSize: 12,
                color: "#E8EDF5"
              }}
              labelStyle={{ color: "#8694A8" }}
            />
            {profile && (
              <ReferenceLine
                y={profile.baseline_hr}
                stroke="#3DDC97"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
            )}
            <Line type="monotone" dataKey="hr" stroke="#E5484D" strokeWidth={2} dot={false} name="Heart rate (bpm)" />
            <Line type="monotone" dataKey="spo2" stroke="#3DDC97" strokeWidth={2} dot={false} name="SpO2 (%)" />
            <Line type="monotone" dataKey="temp" stroke="#F0A93C" strokeWidth={2} dot={false} name="Temp (°C)" />
          </LineChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span className="chart-legend__item"><i style={{ background: "#E5484D" }} /> Heart rate</span>
          <span className="chart-legend__item"><i style={{ background: "#3DDC97" }} /> SpO₂</span>
          <span className="chart-legend__item"><i style={{ background: "#F0A93C" }} /> Temperature</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Alert log</h2>
          <span className="panel__sub">{riskScores.length} flagged events</span>
        </div>
        {riskScores.length === 0 ? (
          <div className="empty-state">
            No anomalies flagged yet. This list updates the moment the AI pipeline detects a deviation from baseline.
          </div>
        ) : (
          <div className="alert-list">
            {riskScores.map((r, i) => (
              <AlertRow key={i} alert={r} />
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        Healthcare IoT Monitoring System · GA9 · Cape Peninsula University of Technology
      </footer>
    </div>
  );
}