function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shell({eyebrow, title, body, actionHref, actionLabel, secondary = ''}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} · Bookmark Sorter</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; color: #12213f; background: radial-gradient(circle at 20% 10%, #eaf1ff 0, transparent 35%), #f7f9fc; }
    main { width: min(100%, 560px); padding: clamp(30px, 7vw, 56px); border: 1px solid #cbd7ec; border-radius: 24px; background: rgba(255, 255, 255, .96); box-shadow: 0 24px 70px rgba(29, 54, 101, .13); }
    .mark { width: 52px; height: 52px; display: grid; place-items: center; margin-bottom: 28px; border-radius: 16px; color: white; background: #2859d8; font-size: 27px; font-weight: 800; letter-spacing: -.08em; }
    .eyebrow { margin: 0 0 10px; color: #2859d8; font-size: 13px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h1 { margin: 0; color: #101b34; font-size: clamp(31px, 7vw, 46px); line-height: 1.04; letter-spacing: -.035em; }
    .body { margin: 22px 0 0; color: #50617e; font-size: 17px; line-height: 1.65; }
    .account { display: block; margin: 20px 0 0; padding: 13px 15px; border: 1px solid #d5deed; border-radius: 12px; color: #273b61; background: #f5f8fd; font-size: 15px; overflow-wrap: anywhere; }
    .action { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; margin-top: 30px; padding: 12px 20px; border-radius: 12px; color: white; background: #2859d8; font-weight: 750; text-decoration: none; box-shadow: 0 8px 20px rgba(40, 89, 216, .22); }
    .action:hover { background: #1948c5; }
    .action:focus-visible, .secondary:focus-visible { outline: 3px solid #96b3ff; outline-offset: 3px; }
    .secondary { display: inline-block; margin: 22px 0 0; color: #2859d8; font-weight: 650; text-underline-offset: 3px; }
    .note { margin: 28px 0 0; padding-top: 22px; border-top: 1px solid #e2e8f2; color: #71809a; font-size: 13px; line-height: 1.55; }
  </style>
</head>
<body>
  <main>
    <div class="mark" aria-hidden="true">B</div>
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${escapeHtml(title)}</h1>
    <div class="body">${body}</div>
    <a class="action" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a>
    ${secondary}
    <p class="note">Your bookmarks remain private to your authorized Bookmark Sorter account.</p>
  </main>
</body>
</html>`;
}

export function renderSignInPage({signInPath}) {
  return shell({
    eyebrow: 'Bookmark Sorter',
    title: 'Sign in to continue',
    body: '<p>Use ChatGPT to sign in. After that, Bookmark Sorter will check whether your account is authorized.</p>',
    actionHref: signInPath,
    actionLabel: 'Sign in with ChatGPT',
  });
}

export function renderUnauthorizedPage({email, signOutPath}) {
  return shell({
    eyebrow: 'Signed in',
    title: 'You’re not authorized yet',
    body: `<p>Thanks for signing in. Ask the Bookmark Sorter administrator to add this email address:</p><strong class="account">${escapeHtml(email)}</strong>`,
    actionHref: '/',
    actionLabel: 'Check again',
    secondary: `<br><a class="secondary" href="${escapeHtml(signOutPath)}">Sign out and use another account</a>`,
  });
}
