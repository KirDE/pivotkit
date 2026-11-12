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

test("year scans are reused across derived fields and table/chart contexts", () => {
    const result = computePivot(data, {...view, derived: [...view.derived, {name:"Quarter", field:"Date", by:"quarter"}]});
    let reads = 0;
    const counted = {...result, encoded: {...result.encoded, column: (field) => { if (field === "Date") reads++; return result.encoded.column(field); }}};
    const first = yearsOf(counted, "Date");
    assert.strictEqual(yearsOf(counted, "Date"), first);
    assert.equal(reads, 1);
    dateContext(counted, LABELS.en);
    dateContext(counted, LABELS.en);
    // Footer spans have their own immutable-dataset cache; year scans remain shared.
    assert.strictEqual(yearsOf(counted, "Date"), first);
});

test("cyclic hints preserve gaps and cross-year month/quarter coverage", () => {
    const season = encode(["2024-11-01", "2024-12-01", "2025-01-01", "2025-02-01"].map(Date => ({Date})));
    const labels = {...LABELS.en, ...en};
    assert.equal(groupHint(season, "Date", "month", "en-US", labels), "Jan–Feb, Nov–Dec · 2 years together");
    assert.equal(groupHint(season, "Date", "quarter", "en-US", labels), "Q1, Q4 · 2 years together");
});

test("one-day/year Group labels use singular forms in English and German", async () => {
    const {plural, fill} = await import("../src/labels.js");
    const single = encode([{Date:"2024-01-01"}]);
    for (const [labels, locale, day, year] of [[{...LABELS.en,...en},"en-US","day","year together"],[{...LABELS.de,...de},"de-DE","Tag","Jahr zusammen"]]) {
        assert.match(groupHint(single,"Date","month",locale,labels), new RegExp(`1 ${year}$`));
        assert.match(fill(plural(labels.groupDataRange,1,{lang:labels.lang,locale}),{range:"R"}),new RegExp(`1 ${day}\\)`));
    }
});

test("view-derived __proto__ is an own display label, not a prototype setter", () => {
    const result = computePivot(data, {...view, rows:["__proto__"], derived:[{name:"__proto__",field:"Date",by:"month"}]});
    const context = dateContext(result,LABELS.en);
    assert.ok(Object.hasOwn(context.labels.core.fields,"__proto__"));
    assert.match(context.labels.core.fields.__proto__, /2024–2025 combined/);
    assert.equal(Object.getPrototypeOf(context.labels.core.fields),Object.prototype);
});

test("combined and single-year context follows the effective calendar and digits", () => {
    for (const locale of ["th-TH", "ar-EG"]) {
        const fmt = new Intl.DateTimeFormat(locale,{year:"numeric",timeZone:"UTC"});
        const result = computePivot(data, {...view,formatting:{locale}});
        const context = dateContext(result,LABELS.en);
        assert.ok(context.labels.core.fields.Month.includes(fmt.format(Date.UTC(2024,0,1))));
        const single = computePivot(data, {...view,formatting:{locale},filters:[{field:"Date",type:"compare",op:">=",value:"2025-01-01"}]});
        assert.ok(JSON.stringify(toGrid(dateContext(single,LABELS.en).result)).includes(fmt.format(Date.UTC(2025,0,1))));
    }
});

test("timeline Group endpoint years follow calendar and digits", () => {
    for (const locale of ["th-TH", "ar-EG", "ja-JP-u-ca-japanese"]) {
        const fmt = new Intl.DateTimeFormat(locale, {year: "numeric", timeZone: "UTC"});
        for (const unit of ["year", "yearQuarter"]) {
            const hint = groupHint(data,"Date",unit,locale,{...LABELS.en,...en});
            assert.ok(hint.includes(fmt.format(Date.UTC(2024,0,1))));
            assert.ok(hint.includes(fmt.format(Date.UTC(2025,11,31))));
        }
    }
});


test("Japanese calendar context uses observed eras within a Gregorian year", () => {
    const locale = "ja-JP-u-ca-japanese";
    const fmt = new Intl.DateTimeFormat(locale, {year: "numeric", timeZone: "UTC"});
    const sample = (dates) => computePivot(encode(dates.map(Date => ({Date, Amount: 1}))), {...view, formatting: {locale}});
    const june = dateContext(sample(["2019-06-01"]), LABELS.en);
    assert.ok(JSON.stringify(toGrid(june.result)).includes(fmt.format(Date.UTC(2019,5,1))));
    assert.ok(!JSON.stringify(toGrid(june.result)).includes(fmt.format(Date.UTC(2019,0,1))));
    const transition = dateContext(sample(["2019-04-01", "2019-06-01"]), LABELS.en);
    assert.ok(transition.labels.core.fields.Month.includes(fmt.format(Date.UTC(2019,3,1))));
    assert.ok(transition.labels.core.fields.Month.includes(fmt.format(Date.UTC(2019,5,1))));
    assert.match(transition.labels.core.fields.Month, /combined/);
});

test("date spans scan once per immutable dataset, including empty/non-date fields", async () => {
    const {dateSpan} = await import("../src/view-ops.js");
    let reads = 0;
    const counted = {...data, column: (field) => { reads++; return data.column(field); }};
    const span = dateSpan(counted, "Date");
    assert.strictEqual(dateSpan(counted, "date"), span);
    dateSpan(counted, "Amount"); dateSpan(counted, "Amount");
    assert.equal(reads, 2);
    const next = encode([{Date: "2030-01-01"}]);
    assert.equal(dateSpan(next, "Date").min, Date.UTC(2030,0,1));
});

test("100k nonconsecutive observed years have bounded retained spans and labels", () => {
    const rows = Array.from({length: 100000}, (_, i) => {
        const date = new Date(0);
        date.setUTCFullYear(1000 + 2 * i, 0, 1);
        return date.getTime();
    });
    const result = computePivot(encode({columns:["Date","Amount"], types:["date","number"], data:[rows, rows.map(() => 1)]}), view);
    assert.equal(yearsOf(result, "Date").length, 32);
    const label = dateContext(result, LABELS.en).labels.core.fields.Month;
    assert.match(label, /… combined$/);
    assert.ok(label.length < 400);
    assert.equal(groupStats(result.encoded, "Date").years, 100000);
    assert.ok(yearSetText(Array.from({length: 100000}, (_, i) => 1000 + 2 * i)).length < 400);
});

test("cyclic week labels do not claim a single Gregorian year is an ISO week-year", () => {
    const result = computePivot(encode([{Date:"2018-01-01", Amount:1}, {Date:"2018-12-31", Amount:2}]),
        {...view, rows:["Week"], derived:[{name:"Week", field:"Date", by:"week"}]});
    const grid = JSON.stringify(toGrid(dateContext(result, LABELS.en).result));
    assert.match(grid, /W01/);
    assert.doesNotMatch(grid, /W01 2018/);
});

test("nonrepresentable typed dates cannot crash field info, footer, years or Group hints", async () => {
    const {dateSpan} = await import("../src/view-ops.js");
    const invalid = {columns:["Date", "Amount"], types:["date", "number"], data:[[8.64e15 + 1, -8.64e15 - 1], [1, 2]]};
    const encoded = encode(invalid);
    assert.equal(dateSpan(encoded, "Date"), null);
    assert.equal(groupStats(encoded, "Date"), null);
    const result = computePivot(encoded, {values:[{field:"Amount", agg:"sum"}]});
    assert.deepEqual(yearsOf(result, "Date"), []);
    assert.doesNotThrow(() => dateContext(result, LABELS.en));
    assert.equal(dateRangeText({min:0, max:8.64e15 + 1}, "en-US"), "");
    const mixed = encode({...invalid, data:[[8.64e15 + 1, Date.UTC(2024,0,1)], [1,2]]});
    assert.deepEqual(dateSpan(mixed,"Date"), {min:Date.UTC(2024,0,1), max:Date.UTC(2024,0,1)});
    assert.equal(groupStats(mixed,"Date").years, 1);
});

test("historical cyclic year context distinguishes BCE and CE including year zero", () => {
    assert.equal(yearSetText([0, 1]), "1 BC–1");
    const values = ["0000-01-01", "0001-01-01"].map(day => Date.parse(`${day}T00:00Z`));
    const typed = dates => encode({columns:["Date", "Amount"], types:["date", "number"], data:[dates, dates.map(() => 1)]});
    const combined = dateContext(computePivot(typed(values), view), LABELS.en);
    assert.equal(combined.labels.core.fields.Month, "Month · 1 BC–1 combined");
    assert.match(combined.ranges[0].text, /BC/);
    const single = dateContext(computePivot(typed([values[0]]), view), LABELS.en);
    assert.match(JSON.stringify(toGrid(single.result)), /Jan 1 BC/);
    assert.match(groupHint(typed(values), "Date", "year", "en-US", {...LABELS.en,...en}), /BC/);
});

test("cyclic month hints use Gregorian grouping semantics in non-Gregorian locales", () => {
    const january = encode([{Date: "2024-01-15"}]);
    for (const locale of ["en-US-u-ca-islamic", "ar-SA", "he-IL-u-ca-hebrew"]) {
        const month = new Intl.DateTimeFormat(locale, {calendar:"gregory",month:"short",timeZone:"UTC"}).format(Date.UTC(2024,0,15));
        assert.ok(groupHint(january,"Date","month",locale,{...LABELS.en,...en}).startsWith(`${month} ·`));
    }
});
