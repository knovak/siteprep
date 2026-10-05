import { expect } from '@playwright/test';

// Submit the real blank form so the browser, rather than the test, chooses
// which invalid field to focus and how far to scroll it.
export async function expectVisibleValidation(page, submitName, fieldName) {
  const field = page.getByLabel(fieldName, { exact: true });
  await expect(field).toHaveValue('');
  await page
    .getByRole('button', { name: submitName, exact: true })
    .press('Enter');
  await expect(field).toBeFocused();
  await expect
    .poll(
      () =>
        field.evaluate((element) => {
          const label = element.labels?.[0];
          const box = element.getBoundingClientRect();
          const labelBox = label?.getBoundingClientRect();
          return Boolean(
            element.validity.valueMissing &&
            element.validationMessage &&
            labelBox &&
            labelBox.top >= 8 &&
            box.top >= 8 &&
            box.bottom + 8 <= innerHeight &&
            box.left >= 0 &&
            box.right <= innerWidth,
          );
        }),
      {
        message: `${fieldName}: invalid field, label and focus outline fit the viewport`,
      },
    )
    .toBe(true)
    .catch(async (error) => {
      const geometry = await field.evaluate((element) => ({
        field: element.getBoundingClientRect().toJSON(),
        label: element.labels?.[0]?.getBoundingClientRect().toJSON(),
        viewport: { width: innerWidth, height: innerHeight },
        valueMissing: element.validity.valueMissing,
        hasMessage: Boolean(element.validationMessage),
      }));
      throw new Error(`${fieldName}: ${JSON.stringify(geometry)}`, {
        cause: error,
      });
    });
}
