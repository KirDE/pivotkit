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
