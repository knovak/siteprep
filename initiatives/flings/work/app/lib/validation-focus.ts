import type { InvalidEvent } from 'react';

/** Keep the first native validation error and its label together on screen. */
export function revealInvalidField(event: InvalidEvent<HTMLElement>) {
  const field = event.target;
  if (
    !(
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    )
  )
    return;
  if (
    field.form?.querySelector(
      'input:invalid, select:invalid, textarea:invalid',
    ) !== field
  )
    return;

  // Keep native validation and its focus/message. Scroll only after the browser
  // has focused its first invalid control; later invalid fields must not win.
  requestAnimationFrame(() => {
    if (field.isConnected && document.activeElement === field) {
      (field.closest('.field') || field).scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'instant',
      });
    }
  });
}
