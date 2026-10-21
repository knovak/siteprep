export function filenameFor(settings, id = "0001") {
  let stem = settings.title.normalize("NFKC").trim().toLowerCase()
    .replace(/[\u0000-\u001f\u007f-\u009f/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-").replace(/^[. -]+|[. -]+$/g, "").slice(0, 80)
    .replace(/[. -]+$/g, "") || "marker";
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(stem)) stem = `marker-${stem}`.slice(0, 80);
  const [date, time] = settings.timestamp.local.split(" ");
  return `${stem}-${date.replaceAll(":", "")}-${time.replaceAll(":", "")}-${id}.jpg`;
}
