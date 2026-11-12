import { test } from "node:test";
import assert from "node:assert/strict";
import { computePivot, encode, toGrid } from "pivotkit-core";
import { dateContext, dateRangeText, yearSetText, yearsOf } from "../src/date-context.js";
import { calendarDays, groupHint, groupStats } from "../src/group-context.js";
import { LABELS } from "../src/labels.js";
import { en } from "../src/menu-labels.js";
import { de } from "../src/menu-labels-de.js";

const data = encode([{Date: "2024-01-01", Amount: 1}, {Date: "2025-12-31", Amount: 2}, {Date: null, Amount: 3}]);
const view = { rows: ["Month"], derived: [{name: "Month", field: "Date", by: "month"}], values: [{field: "Amount", agg: "sum"}] };
test("date context describes all data, combines distinct filtered years and never changes saved names", () => {
    const result = computePivot(data, view);
    const context = dateContext(result, LABELS.en);
    assert.deepEqual(yearsOf(result, "Date"), [2024, 2025]);
    assert.equal(context.labels.core.fields.Month, "Month · 2024–2025 combined");
    assert.equal(context.ranges[0].text, "Jan 1, 2024 – Dec 31, 2025");
    assert.deepEqual(result.view.rows, ["Month"]);
    assert.equal(result.rowColumns[0].labeler(1, "en-US"), "Jan");
});
test("one filtered year is written on cyclic items and no combined suffix remains", () => {
    const result = computePivot(data, {...view, filters: [{field: "Date", type: "compare", op: ">=", value: "2025-01-01"}]});
    const context = dateContext(result, LABELS.en);
    assert.deepEqual(yearsOf(result, "Date"), [2025]);
    assert.equal(context.labels.core.fields.Month, undefined);
    assert.match(JSON.stringify(toGrid(context.result)), /Dec 2025/);
});
test("empty/non-date fields have no fabricated range; German range and Group hints use real dates", () => {
    assert.equal(dateRangeText(null, "en-US"), "");
    assert.equal(groupHint(data, "Date", "yearQuarter", "en-US", {...LABELS.en, ...en}), "Q1 2024 … Q4 2025 (8)");
    assert.match(groupHint(data, "Date", "month", "de-DE", {...LABELS.de, ...de}), /2 Jahre zusammen/);
    assert.match(dateContext(computePivot(data, view), LABELS.de).labels.core.fields.Month, /zusammengefasst/);
    assert.deepEqual(dateContext(computePivot(data, {values: [{field: "Amount", agg: "sum"}]}), LABELS.en).ranges, []);
});

test("year sets preserve gaps and day counts normalize both endpoints", () => {
    assert.equal(yearSetText([2023, 2025]), "2023, 2025");
    assert.equal(yearSetText([2022, 2023, 2025, 2026]), "2022–2023, 2025–2026");
    assert.equal(calendarDays({min: Date.UTC(2025, 0, 1, 23), max: Date.UTC(2025, 0, 2, 1)}), 2);
});
test("one Group dictionary scan supplies every unit's hints", () => {
    let reads = 0;
    const counted = {...data, column: (field) => { reads++; return data.column(field); }};
    const stats = groupStats(counted, "Date");
    for (const unit of ["year", "yearQuarter", "yearMonth", "yearWeek", "day", "quarter", "month", "week", "weekday", "hour"]) groupHint(counted, "Date", unit, "en-US", {...LABELS.en, ...en}, stats);
    assert.equal(reads, 1);
});
