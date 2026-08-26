import {expect, test} from '@playwright/test';

import {renderSignInPage, renderUnauthorizedPage} from '../src/access-page.mjs';

test('public entry presents the Sites sign-in action clearly', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.setContent(renderSignInPage({
    signInPath: '/signin-with-chatgpt?return_to=%2F',
  }));

  await expect(page.getByRole('heading', {name: 'Sign in to continue'})).toBeVisible();
  const signIn = page.getByRole('link', {name: 'Sign in with ChatGPT'});
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute('href', '/signin-with-chatgpt?return_to=%2F');
  await expect(page.getByText('Your bookmarks remain private')).toBeVisible();
});

test('unauthorized entry names the account and offers another-account recovery', async ({page}) => {
  await page.setContent(renderUnauthorizedPage({
    email: 'waiting@example.com',
    signOutPath: '/signout-with-chatgpt?return_to=%2F',
  }));

  await expect(page.getByRole('heading', {name: 'You’re not authorized yet'})).toBeVisible();
  await expect(page.getByText('waiting@example.com')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Check again'})).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', {name: 'Sign out and use another account'}))
    .toHaveAttribute('href', '/signout-with-chatgpt?return_to=%2F');
});
