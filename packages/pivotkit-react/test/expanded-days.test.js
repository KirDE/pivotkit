import {test} from "node:test";
import assert from "node:assert/strict";
import {isoDay,dayText,periodText,rangeShare,wholeYears} from "../src/names.js";
test("date summaries preserve the complete ISO day and year",()=>{
    assert.equal(isoDay(Date.parse("+010000-02-29")),"+010000-02-29");
    assert.match(dayText("+010000-02-29","en-US"),/29/);
    assert.equal(periodText({from:"+010000-01-01",to:"+010001-12-31"},"year","en-US"),"+010000–+010001");
    assert.deepEqual(wholeYears("-000001-01-01","0002-12-31"),["-000001","0002"]);
    assert.equal(rangeShare({from:"9999-01-01",to:"+010000-12-31"},"year",{min:Date.parse("9999-01-01"),max:Date.parse("+010000-12-31")},"en-US"),null);
});

test("maximum partial year/month share does not overflow Date (#97)", () => {
    const range = {from: "+275760-09-01", to: "+275760-09-13"};
    for (const unit of ["year", "month"]) assert.equal(rangeShare(range, unit, {min: Date.parse(range.from), max: 8.64e15}, "en-US"), null);
});

test("minimum-date partial year/month is clamped before range intersection", () => {
    const span = {min: -8.64e15, max: -8.64e15};
    for (const unit of ["year", "month"]) {
        assert.equal(rangeShare({from: "-271821-04-20", to: "-271821-04-20"}, unit, span, "en-US"), null);
        assert.deepEqual(rangeShare({from: "2026-01-01", to: "2026-12-31"}, unit, span, "en-US"), {none: true});
    }
});
