// Date context is display-only: never rename a saved derived field or change its grouping keys.
import { CATALOG, fieldLabel } from "pivotkit-core";
import { dateSpan, filterZoneFields, sourceOf } from "./view-ops.js";
import { fill } from "./labels.js";

/** @param {{min: number, max: number} | null} span @param {string} locale */
export function dateRangeText(span, locale) {
    if (!span || !Number.isFinite(span.min) || !Number.isFinite(span.max) || Math.abs(span.min) > 8.64e15 || Math.abs(span.max) > 8.64e15) return "";
    const fmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    return `${fmt.format(span.min)} – ${fmt.format(span.max)}`;
}

// Bound retained year objects and displayed labels, independently of row count.
const YEAR_CONTEXT_LIMIT = 32;

/** Cached by immutable pivot result; shared by derived fields and table/chart decoration.
 * @type {WeakMap<import("pivotkit-core").PivotResult, Map<string, {years: number[], spans: Map<number, {min: number, max: number}>, truncated: boolean}>>} */
const yearCache = new WeakMap();

/** Up to 32 distinct observed years after filters, never the interval between endpoints.
 * @param {import("pivotkit-core").PivotResult} result @param {string} field */
export function yearsOf(result, field) {
    let cached = yearCache.get(result);
    if (!cached) yearCache.set(result, cached = new Map());
    const previous = cached.get(field);
    if (previous) return previous.years;
    const column = result.encoded.column(field);
    let truncated = false;
    const spans = new Map();
    if (column?.type === "date") {
        const date = new Date(0);
        for (const row of result.rows) {
            const code = column.codes[row];
            const value = column.dict[code];
            if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 8.64e15) {
                date.setTime(value);
                const year = date.getUTCFullYear();
                const span = spans.get(year);
                if (span) { span.min = Math.min(span.min, value); span.max = Math.max(span.max, value); }
                else if (spans.size < YEAR_CONTEXT_LIMIT) spans.set(year, {min: value, max: value});
                else truncated = true;
            }
        }
    }
    const sorted = [...spans.keys()].sort((a, b) => a - b);
    cached.set(field, {years: sorted, spans, truncated});
    return sorted;
}

/** @param {number} year @param {string} locale */
export function contextYear(year, locale) {
    const date = new Date(0);
    date.setUTCFullYear(year, 0, 1);
    if (!Number.isFinite(date.getTime())) date.setTime(year < 0 ? -8.64e15 : 8.64e15);
    return new Intl.DateTimeFormat(locale, {year: "numeric", timeZone: "UTC"}).format(date);
}

/** List only years actually included, coalescing consecutive runs.
 * @param {number[]} years @param {string} [locale] */
export function yearSetText(years, locale = "en-US") {
    const truncated = years.length > YEAR_CONTEXT_LIMIT;
    years = years.slice(0, YEAR_CONTEXT_LIMIT);
    const runs = [];
    for (let i = 0; i < years.length; i++) {
        const first = years[i];
        while (i + 1 < years.length && years[i + 1] === years[i] + 1) i++;
        runs.push(first === years[i] ? contextYear(first, locale) : `${contextYear(first, locale)}–${contextYear(years[i], locale)}`);
    }
    return runs.join(", ") + (truncated ? ", …" : "");
}

/** Year context uses observed dates, never a fabricated January 1 in another era/calendar.
 * @param {import("pivotkit-core").PivotResult} result @param {string} field */
function observedYears(result, field) {
    const years = yearsOf(result, field);
    const truncated = yearCache.get(result)?.get(field)?.truncated ?? false;
    const suffix = truncated ? ", …" : "";
    const fmt = new Intl.DateTimeFormat(result.locale, {year: "numeric", timeZone: "UTC"});
    if (["gregory", "iso8601"].includes(fmt.resolvedOptions().calendar)) return {text: yearSetText(years, result.locale) + suffix, combined: truncated || years.length > 1};
    const spans = yearCache.get(result)?.get(field)?.spans;
    const parts = [];
    let combined = truncated || years.length > 1;
    for (const year of years) {
        const span = spans?.get(year);
        if (!span) continue;
        const first = fmt.format(span.min), last = fmt.format(span.max);
        combined ||= first !== last;
        parts.push(first === last ? first : `${first}–${last}`);
    }
    return {text: parts.join(", ") + suffix, combined};
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
        const observed = observedYears(result, d.field);
        if (observed.combined) {
            const span = observed.text;
            Object.defineProperty(fields, d.name, {value: `${fieldLabel(d.name, labels.core)} · ${fill(labels.dateYearsCombined, { years: span })}`, enumerable: true, configurable: true, writable: true});
            // ISO week numbers can span two week-years within one calendar year.
        } else if (years.length === 1 && d.by !== "week") single.set(d.name, observed.text);
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
