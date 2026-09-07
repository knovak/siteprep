// Use the same visible control as a visitor, including clearing previous filters.
export async function selectMovement(page, id) {
  await page.locator('#movement-trigger').click();
  await page.locator('#movement-tradition').selectOption('all');
  await page.locator('#movement-region').selectOption('all');
  await page.locator('#movement-search').fill('');
  await page.locator(`.movement-option[data-movement-id="${id}"]`).click();
}
