
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, inr, pct } from "../api";

const panel =
  "rounded-xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-5 shadow-sm";

const input =
  "w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-500/20";

const field =
  "flex flex-col gap-2 text-xs font-medium text-[var(--text-secondary)]";

const primaryButton =
  "inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50";

const types = ["G_SEC", "SDL", "T_BILL", "CORPORATE"];

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

export default function Bonds() {
  const qc = useQueryClient();

  const bonds = useQuery({
    queryKey: ["bonds"],
    queryFn: api.listBonds,
  });

  const [filter, setFilter] = useState("");

  const [form, setForm] = useState({
    issuer: "",
    bondType: "G_SEC",
    faceValue: "10000",
    couponPct: "7.00",
    maturityDate: "",
    couponFrequency: "2",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["bonds"] });

  const add = useMutation({
    mutationFn: () =>
      api.createBond({
        issuer: form.issuer.trim(),
        bondType: form.bondType,
        faceValue: Number(form.faceValue),
        couponRate: Number(form.couponPct) / 100,
        maturityDate: form.maturityDate,
        couponFrequency: Number(form.couponFrequency),
      }),
    onSuccess: () => {
      setForm((current) => ({ ...current, issuer: "" }));
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: api.deleteBond,
    onSuccess: () => {
      void refresh();
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate();
  };

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  const rows = (bonds.data ?? []).filter(
    (b) => !filter || b.bondType === filter
  );

  const retryConnection = () => {
    void bonds.refetch();
  };

  const formValid =
    form.issuer.trim() !== "" &&
    Number(form.faceValue) > 0 &&
    Number(form.couponPct) >= 0 &&
    form.maturityDate !== "";

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            FIXED INCOME / INSTRUMENTS
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Bond Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            Create, manage and inspect fixed-income instruments in your bond
            universe.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] px-4 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Instrument universe
          </div>

          <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {bonds.data ? `${bonds.data.length} bonds` : "Loading..."}
          </div>
        </div>
      </div>

      {/* BACKEND ERROR */}

      {bonds.error && (
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
            disabled={bonds.isFetching}
            className="rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {bonds.isFetching ? "Reconnecting..." : "Retry connection"}
          </button>
        </div>
      )}

      {/* ADD BOND FORM */}

      <section className={panel}>
        <SectionHeading
          eyebrow="01 / Instrument creation"
          title="Add a bond"
          description="Enter the instrument specifications to add a new bond to your universe."
        />

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className={`${field} xl:col-span-2`}>
              Issuer
              <input
                required
                className={input}
                placeholder="e.g. Government of India"
                value={form.issuer}
                onChange={set("issuer")}
              />
            </label>

            <label className={field}>
              Instrument type
              <select
                className={input}
                value={form.bondType}
                onChange={set("bondType")}
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className={field}>
              Face value
              <input
                required
                type="number"
                min="1"
                className={input}
                value={form.faceValue}
                onChange={set("faceValue")}
              />
            </label>

            <label className={field}>
              Coupon rate (%)
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className={input}
                value={form.couponPct}
                onChange={set("couponPct")}
              />
            </label>

            <label className={field}>
              Maturity date
              <input
                required
                type="date"
                className={input}
                value={form.maturityDate}
                onChange={set("maturityDate")}
              />
            </label>

            <label className={field}>
              Coupon frequency
              <select
                className={input}
                value={form.couponFrequency}
                onChange={set("couponFrequency")}
              >
                {[1, 2, 4, 12].map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency} / year
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-secondary)] pt-5">
            <p className="text-xs text-[var(--text-muted)]">
              Coupon rates are entered as percentages.
            </p>

            <button
              type="submit"
              className={primaryButton}
              disabled={
                !formValid ||
                add.isPending ||
                !!bonds.error
              }
            >
              {add.isPending ? "Adding bond..." : "Add bond"}
            </button>
          </div>

          {add.error && (
            <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
              Could not add bond. Please check the details and try again.
            </p>
          )}
        </form>
      </section>

      {/* BOND UNIVERSE */}

      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="02 / Instrument universe"
            title="Bond inventory"
            description="Browse and manage the bonds currently available in BondLab."
          />

          <label className={`${field} w-full sm:w-48`}>
            Filter by instrument
            <select
              className={input}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        {bonds.isLoading && (
          <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-elevated)] p-6 text-center text-sm text-[var(--text-muted)]">
            Loading bond inventory...
          </div>
        )}

        {remove.error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          >
            Could not delete bond. Please try again.
          </div>
        )}

        {!bonds.error && bonds.data && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-y border-[var(--border-secondary)] py-3">
              <span className="text-xs text-[var(--text-muted)]">
                Showing{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {rows.length}
                </span>{" "}
                of {bonds.data.length} instruments
              </span>

              <span className="text-xs text-[var(--text-muted)]">
                Currency: INR
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-primary)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-3 pr-4 font-medium">ID</th>
                    <th className="py-3 pr-4 font-medium">Issuer</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 text-right font-medium">
                      Face value
                    </th>
                    <th className="py-3 pr-4 text-right font-medium">
                      Coupon
                    </th>
                    <th className="py-3 pr-4 text-right font-medium">
                      Frequency
                    </th>
                    <th className="py-3 pr-4 text-right font-medium">
                      Maturity
                    </th>
                    <th className="py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((bond) => (
                    <tr
                      key={bond.id}
                      className="border-b border-[var(--border-secondary)] last:border-0 transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <td className="py-3 pr-4 tabular-nums text-[var(--text-muted)]">
                        {bond.id}
                      </td>

                      <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                        {bond.issuer}
                      </td>

                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-md border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                          {bond.bondType ?? "-"}
                        </span>
                      </td>

                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {inr(bond.faceValue)}
                      </td>

                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {pct(bond.couponRate)}
                      </td>

                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {bond.couponFrequency}
                      </td>

                      <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {bond.maturityDate}
                      </td>

                      <td className="py-3 text-right">
                        <button
                          type="button"
                          disabled={remove.isPending || !!bonds.error}
                          className="rounded-md px-2 py-1 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger-soft)] disabled:opacity-40"
                          onClick={() => {
                            if (confirm(`Delete bond ${bond.id}?`)) {
                              remove.mutate(bond.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-sm text-[var(--text-muted)]"
                      >
                        No bonds found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
