// Group-level hints load only with the menus.
import { CATALOG } from "pivotkit-core";
import { plural } from "./labels.js";
import { dateRangeText } from "./date-context.js";

/** Scan the dictionary once for all Group choices, not once per choice.
 * @param {import("pivotkit-core").Encoded | undefined} encoded @param {string} field */
export function groupStats(encoded, field) {
    const column = encoded?.column(field);
    if (!column || column.type !== "date") return null;
    let min = Infinity, max = -Infinity;
    const months = new Set();
    const years = new Set();
    const date = new Date(0);
    for (const value of column.dict) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        min = Math.min(min, value); max = Math.max(max, value);
        date.setTime(value);
        const month = date.getUTCMonth();
        years.add(date.getUTCFullYear());
        months.add(month);
    }
    return min <= max ? {span: {min, max}, first: new Date(min), last: new Date(max), years: years.size, months: [...months].sort((a, b) => a - b)} : null;
}

/** Inclusive calendar days, independent of the endpoint times. @param {{min: number, max: number}} span */
export const calendarDays = (span) => Math.floor(span.max / 86400000) - Math.floor(span.min / 86400000) + 1;

/** Data-derived hints in the Group level; wall-clock dates are formatted in UTC.
 * @param {import("pivotkit-core").Encoded} encoded @param {string} field @param {string} unit @param {string} locale @param {any} labels @param {ReturnType<typeof groupStats>} [stats] */
export function groupHint(encoded, field, unit, locale, labels, stats = groupStats(encoded, field)) {
    const span = stats?.span;
    if (!span || !stats) return labels.unitHints[unit] || undefined;
    const {first, last, months, years} = stats;
    const y1 = first.getUTCFullYear(), y2 = last.getUTCFullYear();
    const yearFormat = new Intl.DateTimeFormat(locale, {year: "numeric", timeZone: "UTC"});
    const firstYear = yearFormat.format(first), lastYear = yearFormat.format(last);
    if (CATALOG.cyclicUnits.includes(unit)) {
        let example = labels.unitHints[unit];
        if (unit === "month" || unit === "quarter") {
            const name = (m) => unit === "quarter" ? `Q${Math.floor(m / 3) + 1}` : new Intl.DateTimeFormat(locale, {month: "short", timeZone: "UTC"}).format(new Date(Date.UTC(2000, m, 1)));
            const periods = [...new Set(months.map((m) => unit === "quarter" ? Math.floor(m / 3) : m))];
            const runs = [];
            const text = (p) => name(unit === "quarter" ? p * 3 : p);
            for (let i = 0; i < periods.length; i++) {
                const first = periods[i];
                while (i + 1 < periods.length && periods[i + 1] === periods[i] + 1) i++;
                runs.push(first === periods[i] ? text(first) : `${text(first)}–${text(periods[i])}`);
            }
            example = runs.join(", ");
        }
        return `${example} · ${plural(labels.groupYearsTogether, years, {lang: labels.lang, locale})}`;
    }
    if (unit === "yearQuarter") {
        const q1 = Math.floor(first.getUTCMonth() / 3) + 1, q2 = Math.floor(last.getUTCMonth() / 3) + 1;
        return `Q${q1} ${firstYear} … Q${q2} ${lastYear} (${(y2 - y1) * 4 + q2 - q1 + 1})`;
    }
    if (unit === "year") return `${firstYear} … ${lastYear} (${y2 - y1 + 1})`;
    if (unit === "yearMonth") {
        const fmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" });
        return `${fmt.format(span.min)} … ${fmt.format(span.max)} (${(y2 - y1) * 12 + last.getUTCMonth() - first.getUTCMonth() + 1})`;
    }
    return dateRangeText(span, locale);
}
