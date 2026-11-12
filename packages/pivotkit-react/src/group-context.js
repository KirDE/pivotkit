// Group-level hints load only with the menus.
import { CATALOG } from "pivotkit-core";
import { fill } from "./labels.js";
import { dateRangeText } from "./date-context.js";

/** Scan the dictionary once for all Group choices, not once per choice.
 * @param {import("pivotkit-core").Encoded | undefined} encoded @param {string} field */
export function groupStats(encoded, field) {
    const column = encoded?.column(field);
    if (!column || column.type !== "date") return null;
    let min = Infinity, max = -Infinity, minMonth = 11, maxMonth = 0;
    const years = new Set();
    for (const value of column.dict) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        min = Math.min(min, value); max = Math.max(max, value);
        const date = new Date(value), month = date.getUTCMonth();
        years.add(date.getUTCFullYear());
        minMonth = Math.min(minMonth, month); maxMonth = Math.max(maxMonth, month);
    }
    return min <= max ? {span: {min, max}, first: new Date(min), last: new Date(max), years: years.size, minMonth, maxMonth} : null;
}

/** Inclusive calendar days, independent of the endpoint times. @param {{min: number, max: number}} span */
export const calendarDays = (span) => Math.floor(span.max / 86400000) - Math.floor(span.min / 86400000) + 1;

/** Data-derived hints in the Group level; wall-clock dates are formatted in UTC.
 * @param {import("pivotkit-core").Encoded} encoded @param {string} field @param {string} unit @param {string} locale @param {any} labels @param {ReturnType<typeof groupStats>} [stats] */
export function groupHint(encoded, field, unit, locale, labels, stats = groupStats(encoded, field)) {
    const span = stats?.span;
    if (!span || !stats) return labels.unitHints[unit] || undefined;
    const {first, last, minMonth, maxMonth, years} = stats;
    const y1 = first.getUTCFullYear(), y2 = last.getUTCFullYear();
    if (CATALOG.cyclicUnits.includes(unit)) {
        let example = labels.unitHints[unit];
        if (unit === "month" || unit === "quarter") {
            const name = (m) => unit === "quarter" ? `Q${Math.floor(m / 3) + 1}` : new Intl.DateTimeFormat(locale, {month: "short", timeZone: "UTC"}).format(new Date(Date.UTC(2000, m, 1)));
            example = `${name(minMonth)}–${name(maxMonth)}`;
        }
        return `${example} · ${fill(labels.groupYearsTogether, { years })}`;
    }
    if (unit === "yearQuarter") {
        const q1 = Math.floor(first.getUTCMonth() / 3) + 1, q2 = Math.floor(last.getUTCMonth() / 3) + 1;
        return `Q${q1} ${y1} … Q${q2} ${y2} (${(y2 - y1) * 4 + q2 - q1 + 1})`;
    }
    if (unit === "year") return `${y1} … ${y2} (${y2 - y1 + 1})`;
    if (unit === "yearMonth") {
        const fmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" });
        return `${fmt.format(span.min)} … ${fmt.format(span.max)} (${(y2 - y1) * 12 + last.getUTCMonth() - first.getUTCMonth() + 1})`;
    }
    return dateRangeText(span, locale);
}
