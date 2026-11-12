import {test} from "node:test";
import assert from "node:assert/strict";
import {compareText} from "../src/names.js";
import {yearRules, quickChoice} from "../src/menu-ops.js";
import {resolveLabels} from "../src/labels.js";
import {menuLabels} from "../src/menu-labels.js";

test("expanded bounds are chronological, including whole years and BCE (#97)", () => {
    const labels = menuLabels(resolveLabels("en-US"));
    for (const op of ["between", "notBetween"]) {
        for (const [a,b] of [["9999-01-01", "+010000-12-31"], ["-000002-01-01", "-000001-12-31"], ["9999-02-01", "+010000-11-30"]]) {
            const forward = compareText({op,value:a,value2:b},labels,"en-US",{date:true});
            const reverse = compareText({op,value:b,value2:a},labels,"en-US",{date:true});
            assert.equal(forward,reverse);
            assert.ok(forward.indexOf(a.slice(0,-6)) < forward.indexOf(b.slice(0,-6)) || !a.endsWith("01-01"));
        }
    }
});

test("Years combined emits canonical signed dates and reads the selection back (#97)", () => {
    const all = [-2,-1,0,9999,10000];
    const filters = yearRules("Date", [-1,10000], all);
    assert.equal(filters[0].value,"-000001-01-01");
    assert.equal(filters[0].value2,"+010000-12-31");
    assert.deepEqual(quickChoice({filters},"Date",{cyclic:true},all).years,[-1,10000]);
});
