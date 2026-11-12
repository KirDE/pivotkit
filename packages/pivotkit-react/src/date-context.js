// Date context is display-only: never rename a saved derived field or change its grouping keys.
import { CATALOG, fieldLabel } from "pivotkit-core";
import { dateSpan, filterZoneFields, sourceOf } from "./view-ops.js";
import { fill } from "./labels.js";

/** @param {{min: number, max: number} | null} span @param {string} locale */
export function dateRangeText(span, locale) {
    if (!span) return "";
    const fmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    return `${fmt.format(span.min)} – ${fmt.format(span.max)}`;
}

/** Distinct years actually left after all filters, not the interval between their endpoints.
 * @param {import("pivotkit-core").PivotResult} result @param {string} field */
export function yearsOf(result, field) {
    const column = result.encoded.column(field);
    const years = new Set();
    if (column?.type === "date") {
        for (const row of result.rows) {
            const value = column.dict[column.codes[row]];
            if (typeof value === "number" && Number.isFinite(value)) years.add(new Date(value).getUTCFullYear());
        }
    }
    return [...years].sort((a, b) => a - b);
}

/** @param {import("pivotkit-core").PivotResult | null} result @param {import("./labels.js").UiLabels} labels
 * @returns {{result: import("pivotkit-core").PivotResult | null, labels: import("./labels.js").UiLabels, ranges: {field: string, text: string}[]}} */
export function dateContext(result, labels) {
    if (!result) return { result, labels, ranges: [] };
    const { view, encoded, locale } = result;
    const fields = { ...labels.core.fields };
    const single = new Map();
    for (const d of view.derived) {
        if (!CATALOG.cyclicUnits.includes(d.by)) continue;
        const years = yearsOf(result, d.field);
        if (years.length > 1) {
            const span = `${years[0]}–${years[years.length - 1]}`;
            fields[d.name] = `${fieldLabel(d.name, labels.core)} · ${fill(labels.dateYearsCombined, { years: span })}`;
        } else if (years.length === 1) single.set(d.name, years[0]);
    }
    /** @type {import("pivotkit-core").PivotResult} */
    const decorated = { ...result, label: (axis, node, core) => {
        const text = result.label(axis, node, core);
        const field = (axis === "rows" ? result.rowFields : result.colFields)[node.depth - 1];
        return node.parent && node.key !== null && single.has(field) ? `${text} ${single.get(field)}` : text;
    } };
    const active = [...new Set([...view.rows, ...view.cols, ...filterZoneFields(view)].map((f) => sourceOf(view, f)))];
    const ranges = active.flatMap((field) => {
        const text = dateRangeText(dateSpan(encoded, field), locale);
        return text ? [{ field, text }] : [];
    });
    return { result: decorated, labels: { ...labels, core: { ...labels.core, fields } }, ranges };
}

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
