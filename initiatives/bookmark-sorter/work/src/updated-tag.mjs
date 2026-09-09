// Match tag_run: UTC ISO datetime, to seconds, without the fraction or zone.
export function updatedTag(at) {
  return 'updated_at:' + new Date(at).toISOString().slice(0, 19);
}

export function isUpdatedTag(tag) {
  return String(tag).startsWith('updated_at');
}
