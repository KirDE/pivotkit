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
