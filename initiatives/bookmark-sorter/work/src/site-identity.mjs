const USER_ID_HEADER = 'oai-authenticated-user-id';
const USER_EMAIL_HEADER = 'oai-authenticated-user-email';
const USER_NAME_HEADER = 'oai-authenticated-user-full-name';
const USER_NAME_ENCODING_HEADER = 'oai-authenticated-user-full-name-encoding';

function headerValue(headers, name) {
  const value = headers.get(name)?.trim();
  return value || null;
}

function decodedFullName(headers) {
  const value = headerValue(headers, USER_NAME_HEADER);
  if (!value) return null;
  if (headerValue(headers, USER_NAME_ENCODING_HEADER) !== 'percent-encoded-utf-8') return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function readSiteIdentity(request) {
  const id = headerValue(request.headers, USER_ID_HEADER);
  if (!id) return null;
  return {
    id,
    email: headerValue(request.headers, USER_EMAIL_HEADER),
    fullName: decodedFullName(request.headers),
  };
}

export const siteIdentityHeaders = Object.freeze({
  id: USER_ID_HEADER,
  email: USER_EMAIL_HEADER,
  fullName: USER_NAME_HEADER,
  fullNameEncoding: USER_NAME_ENCODING_HEADER,
});
