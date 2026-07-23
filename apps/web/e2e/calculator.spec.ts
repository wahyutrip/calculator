import { expect, test, type Locator } from '@playwright/test';

/**
 * Replace a numeric field's contents with real key events.
 *
 * Playwright's fill() sets the value through the native setter, which our
 * controlled, live-formatting input does not observe — and typing is what a user
 * actually does, so this exercises the real path including caret restoration.
 */
async function retype(field: Locator, text: string) {
  await field.click();
  await field.press('ControlOrMeta+a');
  await field.press('Backspace');
  // A small delay mimics human typing and keeps the assertion from racing the
  // 300ms debounce on a loaded CI box.
  await field.pressSequentially(text, { delay: 20 });
}

/**
 * The five critical flows from specs/testing/testing-strategy.md.
 * These are the product working, asserted end to end.
 */

test.describe('calculator', () => {
  test('the golden case produces the exact expected table', async ({ page }) => {
    await page.goto('/');

    // Defaults already are the golden case: 1000/900/800/700, SL 600, 1%, 0.4%, 10jt.
    await expect(page.getByLabel('Buy 1', { exact: true })).toHaveValue('1.000');
    await expect(page.getByLabel('Buy 4', { exact: true })).toHaveValue('700');
    await expect(page.getByLabel('SL Price')).toHaveValue('600');
    await expect(page.getByLabel('Balance')).toHaveValue('10.000.000');

    // Lots 0 / 0 / 1 / 2, total 3.
    const summary = page.getByText('3 lot · 300 lembar');
    await expect(summary).toBeVisible({ timeout: 10_000 });

    // Actual exposure is the headline: 40.000, not the 100.000 budget.
    await expect(page.getByText('−Rp 40.000').first()).toBeVisible();

    // And the gap is called out rather than hidden.
    await expect(page.getByText(/Risiko riil jauh di bawah target/)).toBeVisible();
  });

  test('the ladder is unlimited — rows add, renumber on removal, and cap at 20', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByLabel('Buy 5', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: '+ Tambah entry' }).click();
    await expect(page.getByLabel('Buy 5', { exact: true })).toBeVisible();

    // Removing Buy 2 renumbers the rows below it immediately.
    await page.getByRole('button', { name: 'Hapus Buy 2' }).click();
    await expect(page.getByLabel('Buy 5', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Buy 4', { exact: true })).toBeVisible();

    // Fill to the cap.
    const add = page.getByRole('button', { name: '+ Tambah entry' });
    for (let i = 4; i < 20; i++) await add.click();
    await expect(page.getByLabel('Buy 20', { exact: true })).toBeVisible();
    await expect(add).toBeDisabled();
    await expect(page.getByText(/Maksimal 20 entry/)).toBeVisible();
  });

  test('balance is a plain rupiah amount with live grouping', async ({ page }) => {
    await page.goto('/');
    const balance = page.getByLabel('Balance');
    await retype(balance, '250000000');
    await expect(balance).toHaveValue('250.000.000');

    // Quick chips add to the current value rather than replacing it.
    await page.getByRole('button', { name: '+10jt' }).click();
    await expect(balance).toHaveValue('260.000.000');
  });

  test('validation reports a stop above the entries and keeps the last result on screen', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('3 lot · 300 lembar')).toBeVisible({ timeout: 10_000 });

    const sl = page.getByLabel('SL Price');
    await retype(sl, '900');
    await sl.blur();

    await expect(page.getByText(/SL harus di bawah semua harga entry/)).toBeVisible();
    // The result dims, it does not vanish — the user is not left staring at nothing.
    await expect(page.locator('.mm-dim')).toBeVisible();
  });

  test('prices snap to the IDX tick on blur, never while typing', async ({ page }) => {
    await page.goto('/');
    const buy1 = page.getByLabel('Buy 1', { exact: true });
    await retype(buy1, '1003');
    await expect(buy1).toHaveValue('1.003'); // untouched while typing
    await buy1.blur();
    await expect(buy1).toHaveValue('1.005'); // snapped to the Rp 5 tick
  });

  test('a plan saves, survives a hard reload, and reopens identically', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('3 lot · 300 lembar')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Simpan ke Portofolio' }).click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.getByText('1 rencana')).toBeVisible();

    await page.reload();
    await expect(page.getByText('1 rencana')).toBeVisible();

    await page.getByRole('link', { name: 'Buka' }).click();
    await expect(page.getByLabel('Buy 1', { exact: true })).toHaveValue('1.000');
    await expect(page.getByText('3 lot · 300 lembar')).toBeVisible({ timeout: 10_000 });
  });

  test('averaging down sizes off headroom and blocks an over-budget position', async ({ page }) => {
    await page.goto('/');
    // A ladder entirely below the held average.
    await retype(page.getByLabel('Buy 1', { exact: true }), '700');
    await retype(page.getByLabel('Buy 2', { exact: true }), '650');
    await page.getByRole('button', { name: 'Hapus Buy 4' }).click();
    await page.getByRole('button', { name: 'Hapus Buy 3' }).click();

    await page.getByLabel('Saya sudah punya posisi').check();
    await retype(page.getByLabel('Lot dimiliki'), '3');
    await retype(page.getByLabel('Harga rata-rata'), '800');

    // Scoped to the card head: the section heading also contains "Average down".
    // The comparison table is the real signal, and it appears after the 300ms debounce.
    const compare = page.locator('.mm-compare');
    await expect(compare).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.mm-col-head', { hasText: 'Average down' })).toBeVisible();
    // Averaging down improves the average AND raises the loss at stop; both shown.
    await expect(compare.getByRole('rowheader', { name: 'Kerugian di SL' })).toBeVisible();
    await expect(compare.getByRole('rowheader', { name: 'Harga rata-rata' })).toBeVisible();

    // An over-budget position is blocked with an explanation, never silently zeroed.
    await retype(page.getByLabel('Lot dimiliki'), '50');
    await expect(page.getByText(/sudah melebihi anggaran risiko/)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('the result table becomes cards on a phone and never scrolls the page sideways', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only');
    await page.goto('/');
    await expect(page.getByText('3 lot · 300 lembar')).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('.mm-cards')).toBeVisible();
    await expect(page.locator('.mm-table-scroll')).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, 'page must never scroll horizontally').toBe(false);
  });
});

test.describe('pwa', () => {
  test('the manifest is served and valid', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toContain('LOTSIZE');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  test('sw.js is never cached — a stale worker is unrecoverable', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toContain('must-revalidate');
  });

  test('the bundled ticker list is served', async ({ request }) => {
    const res = await request.get('/data/idx-tickers.json');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.tickers.length).toBeGreaterThan(100);
  });
});
