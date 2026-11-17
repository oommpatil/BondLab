
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { api, inr, pct } from "../api";

const panel =
  "rounded-xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-5 shadow-sm";

const field =
  "flex flex-col gap-2 text-xs font-medium text-[var(--text-secondary)]";

const input =
  "w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-500/20";

const primaryButton =
  "inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--text-muted)]">{hint}</div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

export default function Analytics() {
  const portfolios = useQuery({
    queryKey: ["portfolios"],
    queryFn: api.listPortfolios,
  });

  const curves = useQuery({
    queryKey: ["curves"],
    queryFn: api.listCurves,
  });

  const [portfolioId, setPortfolioId] = useState<number | "">("");
  const [curveId, setCurveId] = useState<number | "">("");
  const [date, setDate] = useState("");
  const [activeScenarioIndex, setActiveScenarioIndex] = useState<number | null>(
    null
  );

  const run = useMutation({
    mutationFn: async () => {
      const [metrics, scenarios] = await Promise.all([
        api.metrics(Number(portfolioId), Number(curveId), date || undefined),
        api.scenarios(Number(portfolioId), Number(curveId), date || undefined),
      ]);

      return { metrics, scenarios };
    },
    onSuccess: () => setActiveScenarioIndex(null),
  });

  const m = run.data?.metrics;
  const s = run.data?.scenarios.scenarios;

  const loadError = portfolios.error ?? curves.error;
  const isLoading = portfolios.isLoading || curves.isLoading;
  const isFetching = portfolios.isFetching || curves.isFetching;

  const chartData =
    s?.map((r) => ({
      ...r,
      label: `${r.shockBasisPoints > 0 ? "+" : ""}${r.shockBasisPoints} bp`,
    })) ?? [];

  const selectedScenario =
    activeScenarioIndex !== null
      ? s?.[activeScenarioIndex]
      : undefined;

  const retryConnection = () => {
    void portfolios.refetch();
    void curves.refetch();
  };

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            FIXED INCOME / RISK MANAGEMENT
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Portfolio Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            Monitor portfolio valuation, yield characteristics and exposure to
            interest-rate movements.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] px-4 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Analytics engine
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
            Portfolio risk
          </div>
        </div>
      </div>

      {/* ANALYSIS CONFIGURATION */}

      <section className={panel}>
        <SectionHeading
          eyebrow="01 / Configuration"
          title="Analysis parameters"
          description="Select a portfolio and reference yield curve to generate portfolio analytics."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={field}>
            Portfolio
            <select
              className={input}
              value={portfolioId}
              onChange={(e) =>
                setPortfolioId(e.target.value ? Number(e.target.value) : "")
              }
              disabled={!!loadError || isLoading}
            >
              <option value="">Select portfolio</option>
              {portfolios.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (#{p.id})
                </option>
              ))}
            </select>
          </label>

          <label className={field}>
            Reference yield curve
            <select
              className={input}
              value={curveId}
              onChange={(e) =>
                setCurveId(e.target.value ? Number(e.target.value) : "")
              }
              disabled={!!loadError || isLoading}
            >
              <option value="">Select yield curve</option>
              {curves.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? "Curve"} (#{c.id})
                </option>
              ))}
            </select>
          </label>

          <label className={field}>
            Valuation date
            <input
              type="date"
              className={input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-secondary)] pt-5">
          <p className="text-xs text-[var(--text-muted)]">
            {date ? `Valuation date: ${date}` : "Using the default valuation date"}
          </p>

          <button
            type="button"
            className={primaryButton}
            disabled={
              portfolioId === "" ||
              curveId === "" ||
              run.isPending ||
              !!loadError ||
              isLoading
            }
            onClick={() => run.mutate()}
          >
            {run.isPending ? "Running analysis..." : "Run analysis"}
          </button>
        </div>
      </section>

      {/* CONNECTION ERROR */}

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4"
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
            disabled={isFetching}
            className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isFetching ? "Reconnecting..." : "Retry connection"}
          </button>
        </div>
      )}

      {!loadError && isLoading && (
        <div className={panel}>
          <p className="text-sm text-[var(--text-muted)]">
            Loading portfolio and yield-curve data...
          </p>
        </div>
      )}

      {/* ANALYSIS ERROR */}

      {run.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4"
        >
          <div>
            <p className="font-semibold text-[var(--danger)]">
              Analysis failed
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Unable to complete the analysis. Check your connection and try
              again.
            </p>
          </div>

          <button
            type="button"
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {run.isPending ? "Retrying..." : "Retry analysis"}
          </button>
        </div>
      )}

      {/* ANALYTICS RESULTS */}

      {m && s && (
        <>
          {/* KPI CARDS */}

          <section>
            <SectionHeading
              eyebrow="02 / Portfolio overview"
              title="Key portfolio metrics"
              description="A consolidated view of portfolio valuation and interest-rate risk."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Market value"
                value={inr(m.marketValue)}
                hint="Total portfolio valuation"
              />

              <Kpi
                label="Weighted yield"
                value={pct(m.weightedYield, 3)}
                hint="Portfolio weighted yield"
              />

              <Kpi
                label="Modified duration"
                value={`${m.weightedModifiedDuration.toFixed(3)} yrs`}
                hint="Interest-rate sensitivity"
              />

              <Kpi
                label="Weighted convexity"
                value={m.weightedConvexity.toFixed(2)}
                hint="Second-order price sensitivity"
              />
            </div>
          </section>

          {/* MATURED BONDS WARNING */}

          {m.excludedMaturedBondIds.length > 0 && (
            <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--bg-elevated)] p-4 text-sm text-[var(--warning)]">
              Matured bonds excluded (IDs):{" "}
              {m.excludedMaturedBondIds.join(", ")}
            </div>
          )}

          {/* RATE SHOCK ANALYSIS */}

          <section className={panel}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  03 / Risk analysis
                </div>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  Interest-rate shock scenarios
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Estimated percentage change in portfolio value under parallel
                  yield-curve shocks.
                </p>
              </div>

              {/* TOP-RIGHT HOVER READOUT */}

              {selectedScenario && (
                <div className="min-w-[110px] text-right">
                  <div className="text-xs font-medium text-[var(--text-muted)]">
                    {selectedScenario.shockBasisPoints > 0 ? "+" : ""}
                    {selectedScenario.shockBasisPoints} bp
                  </div>

                  <div
                    className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${
                      selectedScenario.valueChangePercent >= 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {selectedScenario.valueChangePercent > 0 ? "+" : ""}
                    {selectedScenario.valueChangePercent.toFixed(2)}%
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)]">
                    Value change
                  </div>
                </div>
              )}
            </div>

            <div className="h-72 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ left: 8, right: 16, top: 12, bottom: 4 }}
                  onMouseLeave={() => setActiveScenarioIndex(null)}
                >
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border-primary)" }}
                    tickLine={false}
                  />

                  <YAxis
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <ReferenceLine
                    y={0}
                    stroke="var(--chart-text)"
                    strokeDasharray="3 3"
                  />

                  <Bar
                    dataKey="valueChangePercent"
                    name="Value change"
                    radius={[4, 4, 0, 0]}
                    activeBar={{
                      stroke: "var(--text-primary)",
                      strokeWidth: 1,
                    }}
                    onMouseEnter={(_, index) =>
                      setActiveScenarioIndex(index)
                    }
                  >
                    {s.map((r) => (
                      <Cell
                        key={r.shockBasisPoints}
                        fill={
                          r.valueChangePercent >= 0
                            ? "var(--success)"
                            : "var(--danger)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SCENARIO TABLE */}

            <div className="mt-5 overflow-x-auto border-t border-[var(--border-secondary)] pt-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Scenario breakdown
              </h3>

              <table className="w-full min-w-[540px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-primary)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-3 font-medium">Rate shock</th>
                    <th className="py-3 text-right font-medium">Value</th>
                    <th className="py-3 text-right font-medium">Change</th>
                    <th className="py-3 text-right font-medium">Change %</th>
                  </tr>
                </thead>

                <tbody>
                  {s.map((r) => (
                    <tr
                      key={r.shockBasisPoints}
                      className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-hover)]"
                    >
                      <td className="py-3 font-medium text-[var(--text-primary)]">
                        {r.shockBasisPoints > 0 ? "+" : ""}
                        {r.shockBasisPoints} bp
                      </td>

                      <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {inr(r.shockedValue)}
                      </td>

                      <td
                        className={`py-3 text-right tabular-nums ${
                          r.valueChange >= 0
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {inr(r.valueChange)}
                      </td>

                      <td
                        className={`py-3 text-right tabular-nums font-medium ${
                          r.valueChangePercent >= 0
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {r.valueChangePercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* PORTFOLIO POSITIONS */}

          <section className={panel}>
            <SectionHeading
              eyebrow="04 / Holdings"
              title="Portfolio positions"
              description="Individual bond exposures, valuations and risk contributions."
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-primary)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-3 font-medium">Bond / Issuer</th>
                    <th className="py-3 text-right font-medium">Quantity</th>
                    <th className="py-3 text-right font-medium">Price</th>
                    <th className="py-3 text-right font-medium">Market value</th>
                    <th className="py-3 text-right font-medium">Weight</th>
                    <th className="py-3 text-right font-medium">YTM</th>
                    <th className="py-3 text-right font-medium">Mod. duration</th>
                  </tr>
                </thead>

                <tbody>
                  {m.positions.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-hover)]"
                    >
                      <td className="py-3 font-medium text-[var(--text-primary)]">
                        {p.issuer}
                      </td>

                      <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {inr(p.quantity)}
                      </td>

                      <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {inr(p.price, 2)}
                      </td>

                      <td className="py-3 text-right tabular-nums font-medium text-[var(--text-primary)]">
                        {inr(p.marketValue)}
                      </td>

                      <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {pct(p.weight, 1)}
                      </td>

                      <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {pct(p.yieldToMaturity, 3)}
                      </td>

                      <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {p.modifiedDuration.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
