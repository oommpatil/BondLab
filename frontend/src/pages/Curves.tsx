
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, pct, type Curve, type NewCurve } from "../api";

type Row = { tenor: string; rate: string };
type Kind = "shift" | "steepen" | "flatten";

const blankRows = (): Row[] => [
  { tenor: "", rate: "" },
  { tenor: "", rate: "" },
];

const toRows = (curve: Curve): Row[] =>
  curve.points.map((point) => ({
    tenor: String(point.tenor),
    rate: String(Number((point.interestRate * 100).toFixed(4))),
  }));

const card =
  "rounded-xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-5";

const input =
  "w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

const label =
  "mb-1.5 block text-xs font-medium text-[var(--text-secondary)]";

const button =
  "inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";

const primaryButton =
  `${button} bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]`;

const secondaryButton =
  `${button} border border-[var(--border-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`;

const mutedButton =
  `${button} text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`;

const sectionTitle =
  "text-sm font-semibold text-[var(--text-primary)]";

export default function Curves() {
  const queryClient = useQueryClient();

  const curves = useQuery({
    queryKey: ["curves"],
    queryFn: api.listCurves,
  });

  const [selectedId, setSelectedId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>(blankRows());
  const [bp, setBp] = useState("50");
  const [tenorQ, setTenorQ] = useState("");

  const [result, setResult] = useState<{
    kind: Kind;
    bp: number;
    curve: Curve;
  } | null>(null);

  const payload = (): NewCurve => ({
    name: name.trim() || "Untitled curve",
    points: rows
      .filter((row) => row.tenor !== "" && row.rate !== "")
      .map((row) => ({
        tenor: Number(row.tenor),
        interestRate: Number(row.rate) / 100,
      }))
      .sort((a, b) => a.tenor - b.tenor),
  });

  const current = payload();

  const validPoints =
    current.points.length >= 2 &&
    current.points.every(
      (point) =>
        Number.isFinite(point.tenor) &&
        point.tenor > 0 &&
        Number.isFinite(point.interestRate) &&
        point.interestRate >= 0,
    ) &&
    new Set(current.points.map((point) => point.tenor)).size ===
      current.points.length;

  const bpValid = bp !== "" && Number.isFinite(Number(bp));
  const tenorValid =
    tenorQ !== "" &&
    Number.isFinite(Number(tenorQ)) &&
    Number(tenorQ) > 0;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["curves"] });

  const transform = useMutation({
    mutationFn: async (kind: Kind) => {
      const amount = Number(bp);
      const body = payload();

      const curve =
        kind === "shift"
          ? await api.shiftCurve(body, amount)
          : kind === "steepen"
            ? await api.steepenCurve(body, amount)
            : await api.flattenCurve(body, amount);

      return { kind, bp: amount, curve };
    },
    onSuccess: (response) => setResult(response),
  });

  const interp = useMutation({
    mutationFn: () => api.interpolate(payload(), Number(tenorQ)),
  });

  const create = useMutation({
    mutationFn: () => api.createCurve(payload()),
    onSuccess: (curve) => {
      refresh();
      setSelectedId(curve.id);
    },
  });

  const update = useMutation({
    mutationFn: () => api.updateCurve(Number(selectedId), payload()),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () => api.deleteCurve(Number(selectedId)),
    onSuccess: () => {
      refresh();
      newCurve();
    },
  });

  function newCurve() {
    setSelectedId("");
    setName("");
    setRows(blankRows());
    setResult(null);
    interp.reset();
    transform.reset();
    create.reset();
    update.reset();
    remove.reset();
  }

  function pick(value: string) {
    if (!value) {
      newCurve();
      return;
    }

    const curve = curves.data?.find((item) => item.id === Number(value));
    if (!curve) return;

    setSelectedId(curve.id);
    setName(curve.name ?? "");
    setRows(toRows(curve));
    setResult(null);
    interp.reset();
    transform.reset();
  }

  function setRow(index: number, key: keyof Row, value: string) {
    setRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  }

  const resultPoints = result?.curve.points ?? [];

  const tenors = Array.from(
    new Set([
      ...current.points.map((point) => point.tenor),
      ...resultPoints.map((point) => point.tenor),
    ]),
  )
    .filter((tenor) => Number.isFinite(tenor))
    .sort((a, b) => a - b);

  const chartData = tenors.map((tenor) => {
    const before = current.points.find((point) => point.tenor === tenor);
    const after = resultPoints.find((point) => point.tenor === tenor);

    return {
      tenor,
      current: before ? before.interestRate * 100 : null,
      transformed: after ? after.interestRate * 100 : null,
    };
  });

  const operationErrors = [
    transform.error,
    interp.error,
    create.error,
    update.error,
    remove.error,
  ].filter(Boolean);

  const busy = create.isPending || update.isPending || remove.isPending;

  const retryConnection = () => {
    void curves.refetch();
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Market Data
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Yield Curves
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Build, analyze and transform interest rate curves.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Curve management
          </span>
        </div>
      </div>

      {/* BACKEND CONNECTION ERROR */}

      {curves.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4"
        >
          <div>
            <p className="font-semibold text-[var(--danger)]">
              Backend unavailable
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              BondLab couldn't connect to the server. Start the backend and
              try again.
            </p>
          </div>

          <button
            type="button"
            onClick={retryConnection}
            disabled={curves.isFetching}
            className={primaryButton}
          >
            {curves.isFetching ? "Reconnecting…" : "Retry connection"}
          </button>
        </div>
      )}

      {curves.isLoading && !curves.error && (
        <p className="text-sm text-[var(--text-muted)]">
          Loading yield curves…
        </p>
      )}

      {/* OPERATION ERRORS */}

      {operationErrors.map((_, index) => (
        <div
          key={index}
          role="alert"
          className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
        >
          {index === 0
            ? "Could not transform the curve. Please try again."
            : index === 1
              ? "Interpolation failed. Please check the tenor and try again."
              : index === 2
                ? "Could not save the new curve. Please try again."
                : index === 3
                  ? "Could not update the curve. Please try again."
                  : "Could not delete the curve. Please try again."}
        </div>
      ))}

      {update.isSuccess && (
        <p className="text-sm text-[var(--success)]">Curve updated.</p>
      )}

      {/* CURVE MANAGEMENT */}

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>Curve management</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Load an existing curve or start a new one.
            </p>
          </div>

          <button type="button" onClick={newCurve} className={mutedButton}>
            + New curve
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <label htmlFor="saved-curve" className={label}>
              Saved curve
            </label>
            <select
              id="saved-curve"
              className={input}
              value={selectedId}
              onChange={(event) => pick(event.target.value)}
              disabled={!!curves.error}
            >
              <option value="">New curve…</option>
              {curves.data?.map((curve) => (
                <option key={curve.id} value={curve.id}>
                  {curve.name ?? "Curve"} (#{curve.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="curve-name" className={label}>
              Curve name
            </label>
            <input
              id="curve-name"
              className={input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. G-Sec Nov 2026"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-secondary)] pt-4">
          <button
            type="button"
            onClick={newCurve}
            className={secondaryButton}
          >
            Clear
          </button>

          <button
            type="button"
            className={primaryButton}
            disabled={!validPoints || busy || !!curves.error}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save as new"}
          </button>

          <button
            type="button"
            className={secondaryButton}
            disabled={
              selectedId === "" || !validPoints || busy || !!curves.error
            }
            onClick={() => update.mutate()}
          >
            {update.isPending ? "Updating…" : "Update selected"}
          </button>

          <button
            type="button"
            className={`${button} text-[var(--danger)] hover:bg-[var(--danger-soft)]`}
            disabled={selectedId === "" || busy || !!curves.error}
            onClick={() =>
              window.confirm(`Delete curve #${selectedId}?`) &&
              remove.mutate()
            }
          >
            {remove.isPending ? "Deleting…" : "Delete curve"}
          </button>
        </div>
      </section>

      {/* CURVE POINTS + CHART */}

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.65fr]">
        <section className={card}>
          <div className="mb-4">
            <h2 className={sectionTitle}>Curve points</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Define tenor in years and interest rate in percent.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
                  <th className="pb-3 pr-2 font-medium">Tenor (yrs)</th>
                  <th className="pb-3 pr-2 font-medium">Rate (%)</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-[var(--border-secondary)] last:border-0"
                  >
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        className={input}
                        value={row.tenor}
                        onChange={(event) =>
                          setRow(index, "tenor", event.target.value)
                        }
                        aria-label={`Tenor for point ${index + 1}`}
                      />
                    </td>

                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={input}
                        value={row.rate}
                        onChange={(event) =>
                          setRow(index, "rate", event.target.value)
                        }
                        aria-label={`Rate for point ${index + 1}`}
                      />
                    </td>

                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--danger)] hover:underline disabled:opacity-30"
                        disabled={rows.length <= 2}
                        onClick={() =>
                          setRows((previous) =>
                            previous.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className={`${secondaryButton} mt-4 w-full`}
            onClick={() =>
              setRows((previous) => [
                ...previous,
                { tenor: "", rate: "" },
              ])
            }
          >
            + Add point
          </button>

          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {validPoints
              ? `${current.points.length} valid curve points`
              : "Enter at least two points with unique, positive tenors and valid rates."}
          </p>
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className={sectionTitle}>Yield curve visualization</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Compare the current curve with a transformed curve.
              </p>
            </div>

            <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
              {current.points.length} points
            </span>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ left: 4, right: 16, top: 10, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="tenor"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => `${value}y`}
                  tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--chart-grid)" }}
                  tickLine={false}
                />

                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                  tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => `${Number(value).toFixed(3)}%`}
                  labelFormatter={(label) => `Tenor ${label} yrs`}
                />

                <Legend
                  wrapperStyle={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="current"
                  name="Current curve"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  connectNulls
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5 }}
                />

                {result && (
                  <Line
                    type="monotone"
                    dataKey="transformed"
                    name={`${result.kind} ${result.bp} bp`}
                    stroke="#e05252"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    connectNulls
                    dot={{ r: 3, fill: "#e05252" }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {current.points.length < 2 && (
            <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
              Add at least two valid points to build the curve chart.
            </p>
          )}
        </section>
      </div>

      {/* CURVE TRANSFORMATIONS */}

      <section className={card}>
        <div className="mb-4">
          <h2 className={sectionTitle}>Curve transformations</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Apply parallel shifts or change the slope of your yield curve.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-36">
            <label htmlFor="basis-points" className={label}>
              Basis points
            </label>
            <input
              id="basis-points"
              type="number"
              step="1"
              className={input}
              value={bp}
              onChange={(event) => setBp(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["shift", "steepen", "flatten"] as Kind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className={`${primaryButton} capitalize`}
                disabled={
                  !validPoints ||
                  !bpValid ||
                  transform.isPending ||
                  !!curves.error
                }
                onClick={() => transform.mutate(kind)}
              >
                {transform.isPending
                  ? "Working…"
                  : kind === "shift"
                    ? "Parallel shift"
                    : kind}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Transformations generate a new curve. Your saved curve remains
          unchanged until you choose to update or save it.
        </p>

        {result && (
          <div className="mt-5 border-t border-[var(--border-secondary)] pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className={sectionTitle}>
                  Transformation result
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {result.kind} · {result.bp} basis points
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => {
                    setRows(toRows(result.curve));
                    setResult(null);
                  }}
                >
                  Use result in editor
                </button>

                <button
                  type="button"
                  className={mutedButton}
                  onClick={() => setResult(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
                    <th className="py-3 font-medium">Tenor</th>
                    <th className="py-3 text-right font-medium">Before</th>
                    <th className="py-3 text-right font-medium">After</th>
                    <th className="py-3 text-right font-medium">
                      Change (bp)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {result.curve.points.map((point) => {
                    const before = current.points.find(
                      (item) => item.tenor === point.tenor,
                    );

                    const difference = before
                      ? (point.interestRate - before.interestRate) * 10000
                      : null;

                    return (
                      <tr
                        key={point.tenor}
                        className="border-b border-[var(--border-secondary)] last:border-0"
                      >
                        <td className="py-3 text-[var(--text-primary)]">
                          {point.tenor} yrs
                        </td>

                        <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {before ? pct(before.interestRate, 3) : "—"}
                        </td>

                        <td className="py-3 text-right tabular-nums font-medium text-[var(--text-primary)]">
                          {pct(point.interestRate, 3)}
                        </td>

                        <td
                          className={`py-3 text-right tabular-nums ${
                            difference === null
                              ? "text-[var(--text-muted)]"
                              : difference > 0
                                ? "text-[var(--success)]"
                                : difference < 0
                                  ? "text-[var(--danger)]"
                                  : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {difference === null
                            ? "—"
                            : `${difference > 0 ? "+" : ""}${difference.toFixed(1)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* INTERPOLATION */}

      <section className={card}>
        <div className="mb-4">
          <h2 className={sectionTitle}>Yield interpolation</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Estimate the interest rate at a tenor between your curve points.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-40">
            <label htmlFor="interpolation-tenor" className={label}>
              Target tenor (years)
            </label>
            <input
              id="interpolation-tenor"
              type="number"
              step="0.25"
              min="0"
              className={input}
              value={tenorQ}
              onChange={(event) => setTenorQ(event.target.value)}
              placeholder="e.g. 7"
            />
          </div>

          <button
            type="button"
            className={primaryButton}
            disabled={
              !validPoints ||
              !tenorValid ||
              interp.isPending ||
              !!curves.error
            }
            onClick={() => interp.mutate()}
          >
            {interp.isPending ? "Calculating…" : "Interpolate"}
          </button>
        </div>

        {interp.data !== undefined && (
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-lg border border-[var(--success)]/25 bg-[var(--success-soft)] p-4">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Interpolated rate at {interp.data.tenor} years
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--success)]">
                {pct(interp.data.interpolatedRate, 3)}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
