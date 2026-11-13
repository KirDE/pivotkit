import { test, expect } from "./fixtures.js";

for (const [hostLocale, viewLocale, expectedLocale] of [["ar-EG", undefined, "ar-EG"], ["de-DE", "fa-IR", "fa-IR"], ["invalid_locale", undefined, "en-US"]]) {
    test(`unused warning counts retain locale ${expectedLocale} after work limit`, async ({page}) => {
        await page.goto("pages/element-views.html");
        const host = page.locator("#views");
        await expect(host.locator(".pk-root")).toBeVisible();
        await host.evaluate((el, {hostLocale, viewLocale}) => {
            el.locale = hostLocale;
            el.limits = {work:1};
            el.data = [{Date:"2024-01-01",Amount:1},{Date:"2025-01-01",Amount:2}];
            el.defaultView = {rows:["Date", "Missing"], values:[{field:"Amount",agg:"sum"}], ...(viewLocale ? {formatting:{locale:viewLocale}} : {})};
        }, {hostLocale, viewLocale});
        await expect(host.getByRole("alert")).toBeVisible();
        await expect(host.getByTestId("unused-title")).toContainText(new Intl.NumberFormat(expectedLocale).format(1));
    });
}
