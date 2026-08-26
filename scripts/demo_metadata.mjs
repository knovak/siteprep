#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function stop(message) {
  throw new Error(message);
}

function singleLine(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    stop(`${label} must be a non-empty string`);
  }
  if (/[\r\n\0]/u.test(value)) {
    stop(`${label} must be a single line`);
  }
  return value.trim();
}

function relativeFile(value, label) {
  const normalized = singleLine(value, label);
  if (
    normalized.includes("\\") ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    stop(`${label} must be a safe relative path`);
  }
  return normalized;
}

function webUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    stop(`${label} must use http or https`);
  }
  return url;
}

function loadManifest(demoDir, demoName) {
  const manifestPath = path.join(demoDir, "demo.json");
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    stop(`${demoName}/demo.json is not valid JSON: ${error.message}`);
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    stop(`${demoName}/demo.json must contain an object`);
  }

  const title = singleLine(manifest.title, `${demoName} title`);
  const description = singleLine(manifest.description, `${demoName} description`);
  const rootValue = singleLine(manifest.root, `${demoName} root`);
  const rootUrl = webUrl(rootValue, `${demoName} root`);
  const root = rootUrl ? rootValue : relativeFile(rootValue, `${demoName} root`);
  if (!rootUrl) {
    if (/[?#]/u.test(root)) {
      stop(`${demoName} root must be a file path without a query or fragment`);
    }
    if (!/\.html?$/iu.test(root)) {
      stop(`${demoName} root must identify an .html or .htm file`);
    }
    if (!fs.statSync(path.join(demoDir, root), { throwIfNoEntry: false })?.isFile()) {
      stop(`${demoName} root file does not exist: ${root}`);
    }
  }

  let initiative = null;
  if (manifest.initiative !== undefined) {
    initiative = singleLine(manifest.initiative, `${demoName} initiative`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(initiative)) {
      stop(`${demoName} initiative must be a lowercase slug`);
    }
    const repoRoot = path.resolve(demoDir, "..", "..");
    if (!fs.statSync(path.join(repoRoot, "initiatives", initiative, "initiative.json"), { throwIfNoEntry: false })?.isFile()) {
      stop(`${demoName} initiative does not exist: ${initiative}`);
    }
  }

  const featured = manifest.featured ?? false;
  if (typeof featured !== "boolean") {
    stop(`${demoName} featured must be true or false`);
  }

  const rawLinks = manifest.links ?? [];
  if (!Array.isArray(rawLinks)) {
    stop(`${demoName} links must be an array`);
  }
  const labels = new Set();
  const links = rawLinks.map((link, index) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      stop(`${demoName} link ${index + 1} must be an object`);
    }
    const label = singleLine(link.label, `${demoName} link ${index + 1} label`);
    const href = singleLine(link.href, `${demoName} link ${index + 1} href`);
    if (labels.has(label)) {
      stop(`${demoName} has duplicate link label: ${label}`);
    }
    labels.add(label);

    let localPath = null;
    const url = webUrl(href, `${demoName} link ${label}`);
    if (!url) {
      localPath = relativeFile(href.split(/[?#]/u, 1)[0], `${demoName} link ${label}`);
      if (!fs.statSync(path.join(demoDir, localPath), { throwIfNoEntry: false })?.isFile()) {
        stop(`${demoName} local link file does not exist: ${localPath}`);
      }
    }
    return { label, href, localPath };
  });

  return { title, description, root, rootUrl, links, initiative, featured };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodePath(value) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function localHref(demoName, target) {
  const match = target.match(/^([^?#]+)(.*)$/u);
  const filePath = match ? match[1] : target;
  const suffix = match ? match[2] : "";
  return `./${encodePath(demoName)}/${encodePath(filePath)}${suffix}`;
}

function renderLink(link, demoName) {
  const outputHref = link.localPath ? localHref(demoName, link.href) : link.href;
  return `<a href="${escapeHtml(outputHref)}">${escapeHtml(link.label)}</a>`;
}

function renderDescription(manifest, demoName) {
  const candidates = [];
  manifest.links.forEach((link, index) => {
    let offset = 0;
    while (offset < manifest.description.length) {
      const start = manifest.description.indexOf(link.label, offset);
      if (start === -1) break;
      candidates.push({ start, end: start + link.label.length, index, link });
      offset = start + link.label.length;
    }
  });
  candidates.sort((left, right) => left.start - right.start || right.end - left.end);

  const matches = [];
  let occupiedUntil = 0;
  for (const candidate of candidates) {
    if (candidate.start < occupiedUntil) continue;
    matches.push(candidate);
    occupiedUntil = candidate.end;
  }

  const embedded = new Set();
  let cursor = 0;
  let html = "";
  for (const match of matches) {
    html += escapeHtml(manifest.description.slice(cursor, match.start));
    html += renderLink(match.link, demoName);
    embedded.add(match.index);
    cursor = match.end;
  }
  html += escapeHtml(manifest.description.slice(cursor));
  return { html, embedded };
}

function lastActivity(repoRoot, relativePath) {
  try {
    const value = execFileSync(
      "git",
      ["log", "-1", "--format=%ct", "--", relativePath],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return Number.parseInt(value, 10) || 0;
  } catch {
    return 0;
  }
}

function orderedDemoNames(demosDir, repoRoot) {
  const demosRelative = path.relative(repoRoot, demosDir);
  return fs.readdirSync(demosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const demoDir = path.join(demosDir, entry.name);
      const manifest = fs.statSync(path.join(demoDir, "demo.json"), { throwIfNoEntry: false })?.isFile()
        ? loadManifest(demoDir, entry.name)
        : null;
      const activityPath = manifest?.initiative
        ? path.join("initiatives", manifest.initiative)
        : path.join(demosRelative, entry.name);
      return {
        name: entry.name,
        featured: manifest?.featured ?? false,
        activity: lastActivity(repoRoot, activityPath),
      };
    })
    .sort((left, right) =>
      Number(right.featured) - Number(left.featured)
      || right.activity - left.activity
      || left.name.localeCompare(right.name),
    )
    .map((entry) => entry.name);
}

function main() {
  const [command, demoDir, demoName, field] = process.argv.slice(2);
  if (command === "order") {
    if (!demoDir || !demoName) {
      stop("usage: demo_metadata.mjs order DEMOS_DIR REPO_ROOT");
    }
    console.log(orderedDemoNames(path.resolve(demoDir), path.resolve(demoName)).join("\n"));
    return;
  }
  if (!command || !demoDir || !demoName) {
    stop("usage: demo_metadata.mjs <validate|html-field|description|href|links> DEMO_DIR DEMO_NAME [FIELD]");
  }
  const manifest = loadManifest(demoDir, demoName);

  if (command === "validate") {
    console.log(`Valid demo metadata: ${demoName}`);
    return;
  }
  if (command === "html-field") {
    if (!["title", "description"].includes(field)) {
      stop("html-field requires title or description");
    }
    console.log(escapeHtml(manifest[field]));
    return;
  }
  if (command === "href") {
    if (manifest.rootUrl) {
      console.log(manifest.root);
    } else if (manifest.root === "index.html") {
      console.log(`./${encodePath(demoName)}/`);
    } else {
      console.log(localHref(demoName, manifest.root));
    }
    return;
  }
  if (command === "description") {
    console.log(renderDescription(manifest, demoName).html);
    return;
  }
  if (command === "links") {
    const { embedded } = renderDescription(manifest, demoName);
    const rendered = manifest.links
      .filter((link, index) => !embedded.has(index))
      .map((link) => renderLink(link, demoName));
    if (rendered.length === 0) return;
    console.log(`          <p class="meta">${rendered.join(" · ")}</p>`);
    return;
  }
  stop(`unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(`demo metadata: ${error.message}`);
  process.exitCode = 1;
}
