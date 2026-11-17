export type Bond = {
  id: number;
  issuer: string;
  bondType: string | null;
  faceValue: number;
  couponRate: number; // fraction, 0.0679 = 6.79%
  maturityDate: string;
  couponFrequency: number;
};
export type NewBond = Omit<Bond, "id">;

export type CurvePoint = { tenor: number; interestRate: number };
export type Curve = { id: number; name: string | null; points: CurvePoint[] };
export type NewCurve = { name: string; points: CurvePoint[] };
export type Interpolation = { tenor: number; interpolatedRate: number };

export type Portfolio = { id: number; name: string; holdings: { bond: Bond; quantity: number }[] };
export type NewPortfolio = { name: string; holdings: { bondId: number; quantity: number }[] };

export type PositionResult = {
  bondId: number | null; issuer: string; quantity: number; remainingPeriods: number;
  couponFrequency: number; price: number; marketValue: number; weight: number;
  yieldToMaturity: number; modifiedDuration: number; convexity: number;
};
export type PortfolioMetrics = {
  valuationDate: string; marketValue: number; weightedYield: number;
  weightedModifiedDuration: number; weightedConvexity: number;
  positions: PositionResult[]; excludedMaturedBondIds: number[];
};
export type ScenarioResult = {
  shockBasisPoints: number; baseValue: number; shockedValue: number;
  valueChange: number; valueChangePercent: number;
};
export type ScenarioReport = { valuationDate: string; scenarios: ScenarioResult[]; excludedMaturedBondIds: number[] };

export type BondInput = { faceValue: number; couponRate: number; yearsToMaturity: number; frequency: number };
export type CalcKind = "price" | "duration" | "modified-duration" | "convexity";

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch("/api" + url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.message ?? data?.error ?? `Request failed (HTTP ${res.status})`);
  return data as T;
}

const q = (curveId: number, date?: string) => `?curveId=${curveId}` + (date ? `&valuationDate=${date}` : "");
const qs = (o: Record<string, number>) => "?" + Object.entries(o).map(([k, v]) => `${k}=${v}`).join("&");

// The calculator endpoints may return a plain number or an object holding one number.
function toNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (x && typeof x === "object") {
    const n = Object.values(x as Record<string, unknown>).find((v) => typeof v === "number");
    if (typeof n === "number") return n;
  }
  return Number(x);
}

export const api = {
  listBonds: () => request<Bond[]>("GET", "/bonds"),
  createBond: (b: NewBond) => request<Bond>("POST", "/bonds", b),
  deleteBond: (id: number) => request<void>("DELETE", `/bonds/${id}`),

  listCurves: () => request<Curve[]>("GET", "/yield-curves"),
  createCurve: (c: NewCurve) => request<Curve>("POST", "/yield-curves", c),
  updateCurve: (id: number, c: NewCurve) => request<Curve>("PUT", `/yield-curves/${id}`, c),
  deleteCurve: (id: number) => request<void>("DELETE", `/yield-curves/${id}`),
  shiftCurve: (c: NewCurve, bp: number) => request<Curve>("POST", `/yield-curves/shift?basisPoints=${bp}`, c),
  steepenCurve: (c: NewCurve, bp: number) => request<Curve>("POST", `/yield-curves/steepen?basisPoints=${bp}`, c),
  flattenCurve: (c: NewCurve, bp: number) => request<Curve>("POST", `/yield-curves/flatten?basisPoints=${bp}`, c),
  interpolate: (c: NewCurve, tenor: number) => request<Interpolation>("POST", `/yield-curves/interpolate?tenor=${tenor}`, c),

  listPortfolios: () => request<Portfolio[]>("GET", "/portfolios"),
  createPortfolio: (p: NewPortfolio) => request<Portfolio>("POST", "/portfolios", p),
  updatePortfolio: (id: number, p: NewPortfolio) => request<Portfolio>("PUT", `/portfolios/${id}`, p),
  deletePortfolio: (id: number) => request<void>("DELETE", `/portfolios/${id}`),
  metrics: (pid: number, cid: number, date?: string) =>
    request<PortfolioMetrics>("POST", `/portfolios/${pid}/metrics${q(cid, date)}`),
  scenarios: (pid: number, cid: number, date?: string) =>
    request<ScenarioReport>("POST", `/portfolios/${pid}/scenarios${q(cid, date)}`),

  calc: (kind: CalcKind, p: BondInput & { yieldRate: number }) =>
    request<unknown>("POST", `/bonds/${kind}${qs(p)}`).then(toNumber),
  ytm: (p: BondInput & { marketPrice: number }) =>
    request<unknown>("POST", `/bonds/ytm${qs(p)}`).then(toNumber),
};

export const inr = (n: number, d = 0) => n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (f: number, d = 2) => `${(f * 100).toFixed(d)}%`;