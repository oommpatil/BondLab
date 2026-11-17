
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, inr, pct, type NewPortfolio } from "../api";

type Row = { bondId: string; quantity: string };

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

export default function Portfolios() {
  const queryClient = useQueryClient();

  const portfolios = useQuery({
    queryKey: ["portfolios"],
    queryFn: api.listPortfolios,
  });

  const bonds = useQuery({
    queryKey: ["bonds"],
    queryFn: api.listBonds,
  });

  const [selectedId, setSelectedId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { bondId: "", quantity: "" },
  ]);

  const payload = (): NewPortfolio => ({
    name: name.trim(),
    holdings: rows
      .filter((row) => row.bondId !== "" && row.quantity !== "")
      .map((row) => ({
        bondId: Number(row.bondId),
        quantity: Number(row.quantity),
      })),
  });

  const body = payload();

  const valid =
    body.name !== "" &&
    body.holdings.length > 0 &&
    body.holdings.every(
      (holding) =>
        Number.isInteger(holding.quantity) &&
        holding.quantity > 0 &&
        Number.isInteger(holding.bondId) &&
        holding.bondId > 0,
    );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["portfolios"] });

  function clear() {
    setSelectedId("");
    setName("");
    setRows([{ bondId: "", quantity: "" }]);
    create.reset();
    update.reset();
    remove.reset();
  }

  function pick(value: string) {
    if (!value) {
      clear();
      return;
    }

    const portfolio = portfolios.data?.find(
      (item) => item.id === Number(value),
    );

    if (!portfolio) return;

    setSelectedId(portfolio.id);
    setName(portfolio.name);
    setRows(
      portfolio.holdings.map((holding) => ({
        bondId: String(holding.bond.id),
        quantity: String(holding.quantity),
      })),
    );

    create.reset();
    update.reset();
    remove.reset();
  }

  const create = useMutation({
    mutationFn: () => api.createPortfolio(payload()),
    onSuccess: (portfolio) => {
      refresh();
      setSelectedId(portfolio.id);
    },
  });

  const update = useMutation({
    mutationFn: () =>
      api.updatePortfolio(Number(selectedId), payload()),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () =>
      api.deletePortfolio(Number(selectedId)),
    onSuccess: () => {
      refresh();
      clear();
    },
  });

  function setRow(index: number, key: keyof Row, value: string) {
    setRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  }

  const bondById = (id: string) =>
    bonds.data?.find((bond) => bond.id === Number(id));

  const faceTotal = rows.reduce((sum, row) => {
    const bond = bondById(row.bondId);

    return bond && row.quantity !== "" &&
      Number.isFinite(Number(row.quantity))
      ? sum + bond.faceValue * Number(row.quantity)
      : sum;
  }, 0);

  const holdingCount = body.holdings.length;

  const busy =
    create.isPending || update.isPending || remove.isPending;

  const loadError = portfolios.error ?? bonds.error;

  const retryConnection = () => {
    void portfolios.refetch();
    void bonds.refetch();
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Portfolio Management
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Portfolios
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Build and manage fixed-income investment portfolios.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Portfolio management
          </span>
        </div>
      </div>

      {/* BACKEND CONNECTION */}

      {loadError && (
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
            disabled={portfolios.isFetching || bonds.isFetching}
            className={primaryButton}
          >
            {portfolios.isFetching || bonds.isFetching
              ? "Reconnecting…"
              : "Retry connection"}
          </button>
        </div>
      )}

      {!loadError && (portfolios.isLoading || bonds.isLoading) && (
        <p className="text-sm text-[var(--text-muted)]">
          Loading portfolios and bonds…
        </p>
      )}

      {/* PORTFOLIO SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Total portfolios
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {portfolios.data?.length ?? "—"}
          </p>
        </div>

        <div className={card}>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Current holdings
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {holdingCount}
          </p>
        </div>

        <div className={card}>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Current portfolio face value
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {inr(faceTotal)}
          </p>
        </div>
      </div>

      {/* PORTFOLIO EDITOR */}

      <section className={card}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>Portfolio editor</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Create a new portfolio or load an existing one.
            </p>
          </div>

          <button type="button" onClick={clear} className={mutedButton}>
            + New portfolio
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="saved-portfolio" className={label}>
              Saved portfolio
            </label>

            <select
              id="saved-portfolio"
              className={input}
              value={selectedId}
              onChange={(event) => pick(event.target.value)}
              disabled={!!loadError}
            >
              <option value="">New portfolio…</option>

              {portfolios.data?.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} (#{portfolio.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="portfolio-name" className={label}>
              Portfolio name
            </label>

            <input
              id="portfolio-name"
              className={input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Core G-Sec book"
            />
          </div>
        </div>

        {/* ACTIONS */}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-secondary)] pt-4">
          <button
            type="button"
            onClick={clear}
            className={secondaryButton}
          >
            Clear
          </button>

          <button
            type="button"
            className={primaryButton}
            disabled={!valid || busy || !!loadError}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save as new"}
          </button>

          <button
            type="button"
            className={secondaryButton}
            disabled={
              selectedId === "" || !valid || busy || !!loadError
            }
            onClick={() => update.mutate()}
          >
            {update.isPending ? "Updating…" : "Update selected"}
          </button>

          <button
            type="button"
            className={`${button} text-[var(--danger)] hover:bg-[var(--danger-soft)]`}
            disabled={selectedId === "" || busy || !!loadError}
            onClick={() =>
              window.confirm(`Delete portfolio #${selectedId}?`) &&
              remove.mutate()
            }
          >
            {remove.isPending ? "Deleting…" : "Delete portfolio"}
          </button>
        </div>
      </section>

      {/* OPERATION FEEDBACK */}

      {create.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          Could not save portfolio. Please check the details and try again.
        </p>
      )}

      {update.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          Could not update portfolio. Please try again.
        </p>
      )}

      {remove.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          Could not delete portfolio. Please try again.
        </p>
      )}

      {update.isSuccess && (
        <p className="text-sm text-[var(--success)]">
          Portfolio updated.
        </p>
      )}

      {/* HOLDINGS */}

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>Portfolio holdings</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Select bonds and specify the quantity held.
            </p>
          </div>

          <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
            {holdingCount} holdings
          </span>
        </div>

        {bonds.isLoading && (
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Loading bonds…
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
                <th className="pb-3 pr-3 font-medium">Bond</th>
                <th className="w-28 pb-3 pr-3 font-medium">Quantity</th>
                <th className="w-36 pb-3 px-3 text-right font-medium">
                  Face value
                </th>
                <th className="w-40 pb-3 text-right font-medium">
                  Total face
                </th>
                <th className="w-20 pb-3 pl-4" />
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const bond = bondById(row.bondId);

                return (
                  <tr
                    key={index}
                    className="border-b border-[var(--border-secondary)] last:border-0"
                  >
                    <td className="py-3 pr-3">
                      <select
                        className={input}
                        value={row.bondId}
                        onChange={(event) =>
                          setRow(index, "bondId", event.target.value)
                        }
                        disabled={!!loadError}
                        aria-label={`Bond for holding ${index + 1}`}
                      >
                        <option value="">Select bond…</option>

                        {bonds.data?.map((item) => (
                          <option key={item.id} value={item.id}>
                            #{item.id} {item.issuer} ({pct(item.couponRate)})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 pr-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className={input}
                        value={row.quantity}
                        onChange={(event) =>
                          setRow(index, "quantity", event.target.value)
                        }
                        aria-label={`Quantity for holding ${index + 1}`}
                      />
                    </td>

                    <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                      {bond ? inr(bond.faceValue) : "—"}
                    </td>

                    <td className="py-3 text-right tabular-nums font-medium text-[var(--text-primary)]">
                      {bond &&
                      row.quantity !== "" &&
                      Number.isFinite(Number(row.quantity))
                        ? inr(bond.faceValue * Number(row.quantity))
                        : "—"}
                    </td>

                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--danger)] hover:underline disabled:opacity-30"
                        disabled={rows.length <= 1}
                        onClick={() =>
                          setRows((previous) =>
                            previous.filter(
                              (_, rowIndex) => rowIndex !== index,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="border-t border-[var(--border-primary)]">
                <td className="py-4 font-semibold text-[var(--text-primary)]">
                  Total face value
                </td>
                <td />
                <td />
                <td className="py-4 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                  {inr(faceTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-secondary)] pt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Face value is calculated from bond face value × quantity.
          </p>

          <button
            type="button"
            className={secondaryButton}
            onClick={() =>
              setRows((previous) => [
                ...previous,
                { bondId: "", quantity: "" },
              ])
            }
          >
            + Add holding
          </button>
        </div>

        {!valid && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Enter a portfolio name and at least one bond with a positive
            whole-number quantity.
          </p>
        )}
      </section>

      {/* ALL PORTFOLIOS */}

      <section className={`${card} overflow-hidden`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>All portfolios</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Select a portfolio to load it into the editor.
            </p>
          </div>

          <span className="text-sm tabular-nums text-[var(--text-muted)]">
            {portfolios.data?.length ?? 0} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
                <th className="pb-3 pr-3 font-medium">ID</th>
                <th className="pb-3 pr-3 font-medium">Portfolio name</th>
                <th className="pb-3 text-right font-medium">Holdings</th>
                <th className="pb-3 pl-3 text-right font-medium">
                  Total face value
                </th>
              </tr>
            </thead>

            <tbody>
              {portfolios.data?.map((portfolio) => {
                const total = portfolio.holdings.reduce(
                  (sum, holding) =>
                    sum + holding.bond.faceValue * holding.quantity,
                  0,
                );

                const isSelected = selectedId === portfolio.id;

                return (
                  <tr
                    key={portfolio.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Load portfolio ${portfolio.name}`}
                    onClick={() => pick(String(portfolio.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        pick(String(portfolio.id));
                      }
                    }}
                    className={`cursor-pointer border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                      isSelected ? "bg-[var(--accent-soft)]" : ""
                    }`}
                  >
                    <td className="py-3 pr-3 tabular-nums text-[var(--text-muted)]">
                      #{portfolio.id}
                    </td>

                    <td className="py-3 pr-3 font-medium text-[var(--text-primary)]">
                      {portfolio.name}
                      {isSelected && (
                        <span className="ml-2 text-xs font-normal text-[var(--accent)]">
                          Selected
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-right tabular-nums text-[var(--text-secondary)]">
                      {portfolio.holdings.length}
                    </td>

                    <td className="py-3 pl-3 text-right tabular-nums text-[var(--text-primary)]">
                      {inr(total)}
                    </td>
                  </tr>
                );
              })}

              {portfolios.data?.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    No portfolios yet. Create your first portfolio above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
