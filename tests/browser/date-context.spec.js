import { readFile } from "node:fs/promises";
import { toViewFile } from "pivotkit-core";
import { encodeViewLink } from "pivotkit-core/link";
import { test, expect, openZones } from "./fixtures.js";
for (const lang of ["en", "de"]) {
    test(`weather date context and Group level (${lang}) #109`, async ({page}) => {
        await page.goto(`?data=weather&preset=0&lang=${lang}`);
        await openZones(page);
        await expect(page.getByTestId("date-range")).toContainText("2023");
        await expect(page.getByTestId("date-range")).toContainText("2025");
        await expect(page.locator('[data-zone="cols"]')).toContainText(lang === "en" ? "2023–2025 combined" : "2023–2025 zusammengefasst");
        await page.locator('[data-zone="cols"] [data-testid^="chip-menu-"]').click();
        await page.getByTestId("topic-group").click();
        const menu = page.locator(".pk-chip-menu");
        await expect(menu).toContainText(lang === "en" ? "Data:" : "Daten:");
        await expect(menu).toContainText(lang === "en" ? "One item per period" : "Ein Eintrag pro Zeitraum");
        await expect(menu).toContainText(lang === "en" ? "3 years together" : "3 Jahre zusammen");
    });
}

test("a single weather year labels cyclic items, not combined years #109", async ({page}) => {
    const view = {rows: ["Month"], derived: [{name: "Month", field: "Date", by: "month"}], values: [{field: "Mean °C", agg: "average"}], filters: [{field: "Date", type: "compare", op: ">=", value: "2025-01-01"}]};
    const hash = encodeViewLink(toViewFile(view, {}, {link: true}));
    await page.goto(`?data=weather&empty#pivot-playground=${hash}`);
    await expect(page.getByTestId("pivot-table")).toContainText("Jan 2025");
    await expect(page.getByTestId("pivot-table")).not.toContainText("combined");
    await expect(page.getByTestId("date-range")).toContainText("2023");
});

test("cyclic chip IDs stay stable and downloaded headers keep year context #109", async ({page}) => {
    await page.goto("?data=weather&preset=0");
    await openZones(page);
    await page.getByTestId("chip-menu-Date by month of year").click();
    await expect(page.locator(".pk-chip-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("export").click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
    const text = await readFile(await download.path(), "utf8");
    expect(text).toContain("2023–2025 combined");
});

test("field information and footer use the loaded view locale #109", async ({page}) => {
    const view = {rows:["Date"], values:[{agg:"count"}], formatting:{locale:"de-DE"}};
    const hash = encodeViewLink(toViewFile(view, {}, {link:true}));
    await page.goto(`?data=weather&empty#pivot-playground=${hash}`);
    const expected = new Intl.DateTimeFormat("de-DE", {year:"numeric", month:"short", day:"numeric", timeZone:"UTC"}).format(Date.UTC(2023,0,1));
    await expect(page.getByTestId("date-range")).toContainText(expected);
    await page.locator('.pk-field[data-field="Date"]').getByTestId("field-info").click();
    await expect(page.locator(".pk-popover")).toContainText(expected);
});
