// Group-level hints load only with the menus.
import { CATALOG } from "pivotkit-core";
import { dateSpan } from "./view-ops.js";
import { fill } from "./labels.js";
import { dateRangeText } from "./date-context.js";

/** Data-derived hints in the Group level; wall-clock dates are formatted in UTC.
 * @param {import("pivotkit-core").Encoded} encoded @param {string} field @param {string} unit @param {string} locale @param {any} labels */
export function groupHint(encoded, field, unit, locale, labels) {
    const span = encoded ? dateSpan(encoded, field) : null;
    if (!span) return labels.unitHints[unit] || undefined;
    const first = new Date(span.min), last = new Date(span.max);
    const years = new Set((encoded.column(field)?.dict ?? []).filter((v) => typeof v === "number").map((v) => new Date(Number(v)).getUTCFullYear()));
    const y1 = first.getUTCFullYear(), y2 = last.getUTCFullYear();
    if (CATALOG.cyclicUnits.includes(unit)) {
        let example = labels.unitHints[unit];
        const dates = (encoded.column(field)?.dict ?? []).filter((v) => typeof v === "number").map((v) => new Date(Number(v)));
        if (unit === "month" || unit === "quarter") {
            const months = dates.map((d) => d.getUTCMonth()).sort((a, b) => a - b);
            const name = (m) => unit === "quarter" ? `Q${Math.floor(m / 3) + 1}` : new Intl.DateTimeFormat(locale, {month: "short", timeZone: "UTC"}).format(new Date(Date.UTC(2000, m, 1)));
            example = `${name(months[0])}–${name(months[months.length - 1])}`;
        }
        return `${example} · ${fill(labels.groupYearsTogether, { years: years.size })}`;
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
