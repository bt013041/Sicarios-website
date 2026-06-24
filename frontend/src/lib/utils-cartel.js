export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function currentWeek() {
  return isoWeek(new Date());
}

export function shiftWeek(weekStr, delta) {
  const [year, w] = weekStr.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayNum + (w - 1) * 7 + delta * 7);
  return isoWeek(monday);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en-US");
}

export const ROLE_LABEL = {
  boss: "BOSS / CONDUCERE",
  sicarios: "SICARIOS MEMBRU",
  asociat: "ASOCIAT SICARIOS",
  loterie: "MEMBRU LOTERIE",
};

export const ROLE_OPTIONS = [
  { value: "boss", label: "Boss / Conducere" },
  { value: "sicarios", label: "Sicarios Membru" },
  { value: "asociat", label: "Asociat Sicarios" },
  { value: "loterie", label: "Membru Loterie" },
];
