import { ExportPipeline, captureRun, resolveSettings } from "./client.mjs";
import { defaults, friendlyColors, color } from "./settings.mjs";
import { filenameFor } from "./filenames.mjs";
const $ = (id) => document.getElementById(id);
const form = $("editor");
let ready = false, busy = false, revision = 0, generation = 0, result = null, frozen = null;
let draftBusy = false, draftTimer, fontSequence = 0;
const pipeline = new ExportPipeline({ onProgress: ({ stage, runId }) => {
  if (busy && runId === frozen?.run.id) $("progress").textContent = `${stage[0].toUpperCase() + stage.slice(1)}…`;
} });
const colors = [["background_color", "Background"], ["shape_color", "Ring / star"], ["center_color", "Center"], ["text_color", "Title color"], ["outline_color", "Outline color"]];
for (const [key, label] of colors) {
  const wrap = document.createElement("div"); wrap.id = `${key}-group`;
  const name = document.createElement("label"); name.htmlFor = key; name.textContent = label;
  const pair = document.createElement("div"); pair.className = "color-pair";
  const swatch = document.createElement("input"); swatch.type = "color"; swatch.value = defaults[key]; swatch.setAttribute("aria-label", `${label} picker`);
  const input = document.createElement("input"); input.type = "text"; input.id = input.name = key; input.value = defaults[key]; input.setAttribute("list", "friendly-colors");
  swatch.addEventListener("input", (event) => { event.stopPropagation(); input.value = swatch.value; changed(); });
  input.addEventListener("input", () => { try { swatch.value = color(input.value, key); } catch {} });
  pair.append(swatch, input); wrap.append(name, pair); $("colors").append(wrap);
}
for (const value of Object.keys(friendlyColors)) $("friendly-colors").append(new Option(value, value));
const detected = captureRun(); $("timezone").value = detected.timezone;
$("zone-help").textContent = detected.fallback ? "Timezone detection failed. Using UTC; you can choose another zone." : `Detected ${detected.timezone}. You can choose another zone.`;
let zones = []; try { zones = Intl.supportedValuesOf("timeZone"); } catch {}
for (const value of new Set(["UTC", detected.timezone, ...zones])) $("zones").append(new Option(value.replaceAll("_", " "), value));
function input() { return Object.fromEntries(new FormData(form)); }
function timestamp(s) { const t = s.timestamp; return `${t.local} ${t.offset} · ${t.timezone} · ${t.instant}${t.occurrence ? ` · ${t.occurrence} occurrence` : ""}`; }
function currentLabel() { if (result) $("result-state").textContent = result.revision === revision ? "Verified · current settings" : "Previous settings · still available"; }
function showError(error, focus = false) {
  $("error").textContent = `${error.stage ? error.stage + ": " : ""}${error.message}`; $("error").hidden = false;
  const message = error.message.toLowerCase();
  const field = error.details?.choices ? "occurrence" : /font|glyph/.test(message) ? "font"
    : /outline/.test(message) ? "outline_width" : /title/.test(message) ? "title"
    : /size/.test(message) ? "size" : /timezone|offset/.test(message) ? "timezone"
    : /enter a date or clear/.test(message) ? "time" : /date|calendar|years/.test(message) ? "date"
    : /time/.test(message) ? "time" : colors.find(([key]) => message.includes(key))?.[0];
  if (field) {
    const action = document.createElement("button"); action.id = "error-action"; action.type = "button";
    action.className = "secondary"; action.textContent = "Review this setting";
    action.addEventListener("click", () => {
      if (field.endsWith("_color")) {
        // Invalid hidden colors still need a direct correction path.
        $(`${field}-group`).hidden = false;
      }
      if (["font", "size", "outline_width"].includes(field)) $("advanced").open = true;
      $(field).focus();
    });
    $("error").append(document.createElement("br"), action);
    if (focus) action.focus();
  } else if (focus) $("error").focus();
}
function clearError() { $("error").hidden = true; $("error").textContent = ""; }
function describeTime() {
  const data = input();
  // Resolve ambiguity without the previous choice so both offsets stay visible.
  try {
    const s = resolveSettings({ ...data, occurrence: "" });
    $("repeated").hidden = true; $("occurrence").value = "";
    $("effective").textContent = `${s.timestamp.source === "now" ? "Provisional now — captured again when you Generate. " : "Effective time: "}${timestamp(s)} · ${filenameFor(s)}`;
    return s;
  } catch (e) {
    if (e.details?.choices) {
      const choice = $("occurrence").value;
      $("occurrence").replaceChildren(new Option("Choose Earlier or Later", ""));
      for (const t of e.details.choices) $("occurrence").append(new Option(`${t.occurrence === "earlier" ? "Earlier" : "Later"} · ${t.offset} · ${t.instant}`, t.occurrence));
      $("occurrence").value = choice; $("repeated").hidden = false;
      if (choice) {
        const s = resolveSettings(input()); $("effective").textContent = `Effective time: ${timestamp(s)} · ${filenameFor(s)}`; return s;
      }
    } else { $("repeated").hidden = true; }
    $("effective").textContent = e.message;
    return null;
  }
}
function changed(event) {
  if (event?.target.id === "local-font") return;
  if (["date", "time", "timezone"].includes(event?.target.id)) $("occurrence").value = "";
  revision++; clearError(); currentLabel();
  $("shape_color-group").hidden = $("shape").value === "solid";
  $("center_color-group").hidden = $("shape").value !== "donut";
  $("draft").hidden = true; $("draft-status").textContent = "Updating draft…";
  describeTime(); scheduleDraft();
}
function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(drawDraft, 100); }
async function drawDraft() {
  if (!ready || busy || draftBusy) return;
  const version = revision, settings = describeTime();
  if (!settings) { $("draft-status").textContent = "Correct the settings to see a draft."; return; }
  draftBusy = true;
  try {
    const { image } = await pipeline.preview(settings);
    if (version !== revision || busy) return;
    $("draft").getContext("2d").putImageData(image, 0, 0); $("draft").hidden = false;
    $("draft").setAttribute("aria-label", `Draft ${settings.shape} marker${settings.title ? ": " + settings.title : " without a title"}`);
    $("draft-status").textContent = "Draft · current design, not a verified export";
  } catch (e) { if (version === revision && !busy) { $("draft").hidden = true; $("draft-status").textContent = e.message; } }
  finally { draftBusy = false; if (version !== revision && !busy) scheduleDraft(); }
}
function controls() {
  $("generate").disabled = !ready || busy; $("cancel").hidden = !busy;
  $("retry").hidden = busy || !frozen || !frozen.failed;
  $("local-font").disabled = busy || !ready;
}
async function prepare() {
  $("prepare").hidden = true; $("runtime").textContent = "Preparing the local image tools…"; clearError();
  try { await pipeline.ready(); ready = true; $("runtime").textContent = "Ready · local image tools and font loaded"; scheduleDraft(); }
  catch (e) { ready = false; $("runtime").textContent = e.message; $("prepare").hidden = false; $("prepare").focus(); }
  controls();
}
function discard() {
  if (!result) return;
  URL.revokeObjectURL(result.url); result = null;
  $("result-image").width = $("result-image").height = 1;
  $("download").removeAttribute("href"); $("result").hidden = true;
}
async function generate(retry = false) {
  if (busy || !ready) return;
  clearError();
  if (!retry) {
    try {
      const run = pipeline.createRun([input()]);
      frozen = { run, revision, filename: filenameFor(run.jobs[0].settings), failed: false };
    } catch (e) { describeTime(); showError(e, true); return; }
  }
  const attempt = ++generation, snapshot = frozen;
  snapshot.failed = false; busy = true; controls();
  $("frozen").textContent = `Frozen generation: ${snapshot.filename} · ${timestamp(snapshot.run.jobs[0].settings)}`;
  $("progress").textContent = retry ? "Retrying the same frozen settings…" : "Generating the frozen settings…";
  try {
    const exported = await pipeline.export(snapshot.run.jobs[0]);
    if (attempt !== generation) return;
    if (!exported.verified) throw Error("The file did not pass verification.");
    // Budget both retained bytes and the Blob allocation before replacing anything.
    if (exported.bytes.byteLength * 2 + (result?.size || 0) > 50 * 1024 * 1024) throw Error("This result exceeds the retained-output budget. Reduce the size or discard the previous result and retry.");
    const blob = new Blob([exported.bytes], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const replacement = { url, size: blob.size, revision: snapshot.revision };
    discard(); result = replacement;
    $("result").hidden = false;
    $("result-image").width = exported.preview.width; $("result-image").height = exported.preview.height;
    $("result-image").getContext("2d").putImageData(exported.preview, 0, 0);
    $("result-image").setAttribute("aria-label", `Verified ${exported.settings.shape} marker${exported.settings.title ? ": " + exported.settings.title : " without a title"}`);
    $("result-summary").textContent = `${exported.settings.size} × ${exported.settings.size} · ${exported.font.name} · ${timestamp(exported.settings)}`;
    $("result-name").textContent = snapshot.filename;
    $("result-details").textContent = `All six EXIF time/offset fields checked. SHA-256 ${exported.sha256}. ${(blob.size / 1024).toFixed(1)} KiB.`;
    $("download").href = url; $("download").download = snapshot.filename;
    currentLabel(); $("progress").textContent = snapshot.revision === revision ? "Verified. Your JPEG is ready to download." : "Verified previous settings. Current edits are shown in the draft.";
  } catch (e) {
    if (attempt === generation) { snapshot.failed = true; showError(e, true); $("progress").textContent = "Generation did not finish. Previous results remain available."; }
  } finally {
    if (attempt === generation) { busy = false; controls(); scheduleDraft(); }
  }
}
form.addEventListener("input", changed);
form.addEventListener("submit", (event) => { event.preventDefault(); generate(); });
$("cancel").addEventListener("click", () => {
  generation++; pipeline.cancel(); busy = false; if (frozen) frozen.failed = true;
  $("progress").textContent = "Cancelled. Retry keeps the frozen settings and timestamp."; controls(); $("retry").focus(); scheduleDraft();
});
$("retry").addEventListener("click", () => generate(true));
$("prepare").addEventListener("click", prepare);
$("discard").addEventListener("click", () => { discard(); $("generate").focus(); });
$("local-font").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file) return;
  clearError(); ready = false; controls(); $("runtime").textContent = "Checking local font…";
  try {
    if (file.size > 16 * 1024 * 1024) throw Error("Font must be no larger than 16 MiB.");
    const key = `local-${++fontSequence}`; const loaded = await pipeline.loadFont(key, await file.arrayBuffer());
    $("font").append(new Option(`${loaded.name} · local`, key)); $("font").value = key;
    $("runtime").textContent = "Ready · local font loaded in this tab";
    changed();
  } catch (e) { showError(e, true); $("runtime").textContent = "Local font was not loaded. Previous font is still selected."; }
  finally { event.target.value = ""; ready = true; controls(); scheduleDraft(); }
});
window.addEventListener("pagehide", (event) => { if (!event.persisted) { discard(); pipeline.close(); } });
changed(); prepare();
