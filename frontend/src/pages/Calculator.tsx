
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, inr, type BondInput } from "../api";

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
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-5 transition-colors">
      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>

      <div
        className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums ${
          accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </div>

      {hint && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">{hint}</div>
      )}
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

export default function Calculator() {
  const [face, setFace] = useState("10000");
  const [coupon, setCoupon] = useState("7.10");
  const [yld, setYld] = useState("7.00");
  const [years, setYears] = useState("5");
  const [freq, setFreq] = useState("2");
  const [marketPrice, setMarketPrice] = useState("");

  const base = (): BondInput => ({
    faceValue: Number(face),
    couponRate: Number(coupon) / 100,
    yearsToMaturity: Number(years),
    frequency: Number(freq),
  });

  const fieldsOk =
    [face, coupon, yld, years].every(
      (v) => v !== "" && !Number.isNaN(Number(v))
    ) &&
    Number(face) > 0 &&
    Number(years) > 0 &&
    Number(coupon) >= 0 &&
    Number(yld) >= 0;

  const calc = useMutation({
    mutationFn: async () => {
      const b = base();
      const y = Number(yld) / 100;

      const [price, duration, modifiedDuration, convexity] =
        await Promise.all([
          api.calc("price", { ...b, yieldRate: y }),
          api.calc("duration", { ...b, yieldRate: y }),
          api.calc("modified-duration", { ...b, yieldRate: y }),
          api.calc("convexity", { ...b, yieldRate: y }),
        ]);

      const steps = Array.from({ length: 13 }, (_, i) =>
        y + (i - 6) * 0.005
      ).filter((v) => v >= 0);

      const prices = await Promise.all(
        steps.map((s) => api.calc("price", { ...b, yieldRate: s }))
      );

      const curve = steps.map((s, i) => ({
        yield: Number((s * 100).toFixed(2)),
        price: prices[i],
      }));

      return {
        price,
        duration,
        modifiedDuration,
        convexity,
        curve,
        y: Number((y * 100).toFixed(2)),
      };
    },
    onSuccess: (r) => setMarketPrice(r.price.toFixed(2)),
  });

  const ytm = useMutation({
    mutationFn: () =>
      api.ytm({
        ...base(),
        marketPrice: Number(marketPrice),
      }),
  });

  const r = calc.data;

  const priceOk =
    marketPrice !== "" &&
    !Number.isNaN(Number(marketPrice)) &&
    Number(marketPrice) > 0;

  const retryCalculation = () => {
    ytm.reset();
    calc.mutate();
  };

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            FIXED INCOME / ANALYTICS
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Bond Pricing Calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            Calculate bond valuation, interest-rate sensitivity and yield to
            maturity.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] px-4 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Pricing model
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
            Fixed-rate bond
          </div>
        </div>
      </div>

      {/* BOND INPUTS */}

      <section className={panel}>
        <SectionHeading
          eyebrow="01 / Input parameters"
          title="Bond specifications"
          description="Configure the bond characteristics and market yield to calculate its theoretical value."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className={field}>
            Face value
            <input
              type="number"
              min="1"
              className={input}
              value={face}
              onChange={(e) => setFace(e.target.value)}
            />
          </label>

          <label className={field}>
            Coupon rate (%)
            <input
              type="number"
              step="0.01"
              min="0"
              className={input}
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
          </label>

          <label className={field}>
            Yield to maturity (%)
            <input
              type="number"
              step="0.01"
              min="0"
              className={input}
              value={yld}
              onChange={(e) => setYld(e.target.value)}
            />
          </label>

          <label className={field}>
            Years to maturity
            <input
              type="number"
              step="0.25"
              min="0.25"
              className={input}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </label>

          <label className={field}>
            Coupon frequency
            <select
              className={input}
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
            >
              {[1, 2, 4, 12].map((f) => (
                <option key={f} value={f}>
                  {f} / year
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-secondary)] pt-5">
          <p className="text-xs text-[var(--text-muted)]">
            All rates are entered as percentages.
          </p>

          <button
            type="button"
            className={primaryButton}
            disabled={!fieldsOk || calc.isPending}
            onClick={() => calc.mutate()}
          >
            {calc.isPending ? "Calculating..." : "Calculate bond value"}
          </button>
        </div>
      </section>

      {/* CALCULATION ERROR */}

      {calc.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4"
        >
          <div>
            <p className="font-semibold text-[var(--danger)]">
              Calculation unavailable
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              BondLab couldn't complete the calculation. Check that the
              backend is running and try again.
            </p>
          </div>

          <button
            type="button"
            onClick={retryCalculation}
            disabled={calc.isPending}
            className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {calc.isPending ? "Retrying..." : "Retry calculation"}
          </button>
        </div>
      )}

      {/* CALCULATION RESULTS */}

      {r && (
        <>
          <section>
            <SectionHeading
              eyebrow="02 / Valuation results"
              title="Bond analytics"
              description="Calculated valuation and interest-rate risk metrics based on the selected inputs."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Bond price"
                value={inr(r.price, 2)}
                hint={`${((r.price / Number(face)) * 100).toFixed(2)}% of face value`}
                accent
              />

              <Kpi
                label="Macaulay duration"
                value={`${r.duration.toFixed(4)} yrs`}
                hint="Weighted average cash-flow time"
              />

              <Kpi
                label="Modified duration"
                value={`${r.modifiedDuration.toFixed(4)} yrs`}
                hint="Approximate price sensitivity"
              />

              <Kpi
                label="Convexity"
                value={r.convexity.toFixed(4)}
                hint="Second-order price sensitivity"
              />
            </div>
          </section>

          {/* PRICE VS YIELD CHART */}

          <section className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading
                eyebrow="03 / Market sensitivity"
                title="Price vs. yield"
                description="Visualise how the theoretical bond price changes as market yield moves."
              />

              <div className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Selected yield
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--accent)]">
                  {r.y.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="h-72 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={r.curve}
                  margin={{ left: 8, right: 20, top: 12, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="yield"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border-primary)" }}
                    tickLine={false}
                  />

                  <YAxis
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => inr(Number(v))}
                    tick={{ fill: "var(--chart-text)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "var(--accent)" }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                    formatter={(v) => inr(Number(v), 2)}
                    labelFormatter={(l) => `Yield ${l}%`}
                  />

                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: "var(--accent)",
                      strokeWidth: 0,
                    }}
                    activeDot={{ r: 6 }}
                  />

                  <ReferenceDot
                    x={r.y}
                    y={r.price}
                    r={6}
                    fill="var(--danger)"
                    stroke="var(--bg-surface)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-5 border-t border-[var(--border-secondary)] pt-4 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Theoretical price curve
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                Selected yield
              </div>
            </div>

            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Bond prices generally move inversely to market yields. Convexity
              describes the curvature of this relationship.
            </p>
          </section>
        </>
      )}

      {/* YTM SOLVER */}

      <section className={panel}>
        <SectionHeading
          eyebrow="04 / Yield analysis"
          title="Solve for yield to maturity"
          description="Calculate the implied yield from a bond's market price and cash-flow characteristics."
        />

        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,280px)_auto]">
          <label className={field}>
            Market price
            <input
              type="number"
              step="0.01"
              min="0"
              className={input}
              placeholder="Enter market price"
              value={marketPrice}
              onChange={(e) => setMarketPrice(e.target.value)}
            />
          </label>

          <button
            type="button"
            className={primaryButton}
            disabled={!fieldsOk || !priceOk || ytm.isPending}
            onClick={() => ytm.mutate()}
          >
            {ytm.isPending ? "Solving..." : "Solve YTM"}
          </button>
        </div>

        {ytm.data !== undefined && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] p-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Implied yield to maturity
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--success)]">
                {(ytm.data * 100).toFixed(3)}%
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Based on the entered market price
            </div>
          </div>
        )}

        {ytm.error && (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4"
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Could not solve YTM. Check the backend connection and inputs.
            </p>

            <button
              type="button"
              onClick={() => ytm.mutate()}
              disabled={ytm.isPending}
              className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {ytm.isPending ? "Retrying..." : "Retry YTM"}
            </button>
          </div>
        )}

        <p className="mt-5 border-t border-[var(--border-secondary)] pt-4 text-xs leading-relaxed text-[var(--text-muted)]">
          Uses the face value, coupon rate, years to maturity and coupon
          frequency above. After calculating the bond price, the market price
          field is automatically populated with that result.
        </p>
      </section>
    </div>
  );
}
