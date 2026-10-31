// Saari dates UTC midnight pe rakhte hain taaki timezone ki wajah se period skip na ho.
export const todayUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// Jan 31 + 1 month = Feb 28 (month-end clamp)
export const addMonths = (date, n) => {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
};

export const addPeriod = (date, period) => {
  switch (period) {
    case "DAILY": return addDays(date, 1);
    case "WEEKLY": return addDays(date, 7);
    case "MONTHLY": return addMonths(date, 1);
    case "YEARLY": return addMonths(date, 12);
    default: throw new Error(`Unknown billing period: ${period}`);
  }
};

export const daysBetween = (from, to) =>
  Math.floor((to.getTime() - from.getTime()) / 86400000);
