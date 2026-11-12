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

/** Cached by immutable pivot result; shared by derived fields and table/chart decoration.
 * @type {WeakMap<import("pivotkit-core").PivotResult, Map<string, number[]>>} */
const yearCache = new WeakMap();

/** Distinct years actually left after all filters, not the interval between their endpoints.
 * @param {import("pivotkit-core").PivotResult} result @param {string} field */
export function yearsOf(result, field) {
    let cached = yearCache.get(result);
    if (!cached) yearCache.set(result, cached = new Map());
    const previous = cached.get(field);
    if (previous) return previous;
    const column = result.encoded.column(field);
    const years = new Set();
    if (column?.type === "date") {
        const date = new Date(0);
        for (const row of result.rows) {
            const code = column.codes[row];
            const value = column.dict[code];
            if (typeof value === "number" && Number.isFinite(value)) {
                date.setTime(value);
                years.add(date.getUTCFullYear());
            }
        }
    }
    const sorted = [...years].sort((a, b) => a - b);
    cached.set(field, sorted);
    return sorted;
}

/** @param {number} year @param {string} locale */
export function contextYear(year, locale) {
    const date = new Date(0);
    date.setUTCFullYear(year, 0, 1);
    return new Intl.DateTimeFormat(locale, {year: "numeric", timeZone: "UTC"}).format(date);
}

/** List only years actually included, coalescing consecutive runs.
 * @param {number[]} years @param {string} [locale] */
export function yearSetText(years, locale = "en-US") {
    const runs = [];
    for (let i = 0; i < years.length; i++) {
        const first = years[i];
        while (i + 1 < years.length && years[i + 1] === years[i] + 1) i++;
        runs.push(first === years[i] ? contextYear(first, locale) : `${contextYear(first, locale)}–${contextYear(years[i], locale)}`);
    }
    return runs.join(", ");
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
            const span = yearSetText(years, locale);
            Object.defineProperty(fields, d.name, {value: `${fieldLabel(d.name, labels.core)} · ${fill(labels.dateYearsCombined, { years: span })}`, enumerable: true, configurable: true, writable: true});
        } else if (years.length === 1) single.set(d.name, contextYear(years[0], locale));
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
