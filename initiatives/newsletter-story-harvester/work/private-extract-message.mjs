#!/usr/bin/env node

// Interactive, two-line handoff for a real Gmail message.
//
// Line one carries the connector's in-memory MIME result and its searched
// envelope. The process emits the model request, then waits for line two: the
// model's findings. Only records and count-only diagnostics leave the process;
// the body is never written to a file.

import {createInterface} from 'node:readline';

import {contractFor} from './src/contracts.mjs';
import {extractIssue} from './src/extract.mjs';
import {readableBody} from './src/gmail-source.mjs';
import {readDocument} from './src/html.mjs';
import {buildRequest} from './src/model.mjs';
import {actualFromMatchesEntry} from './src/source-contract.mjs';

const input = createInterface({input: process.stdin, crlfDelay: Infinity});
const lines = [];

try {
  for await (const line of input) {
    if (!line.trim()) continue;
    lines.push(JSON.parse(line));
    if (lines.length === 1) {
      const {entry, message, email} = lines[0];
      validateEnvelope(entry, message, email);
      const html = readableBody(email.payload);
      const shape = message.shape_override || entry.shape;
      const document = readDocument(html, {docId: message.id});
      process.stdout.write(`${JSON.stringify({
        ready: true,
        issue_id: message.id,
        source: entry.key,
        issue_date: message.issue_date,
        shape,
        request: buildRequest(contractFor(shape), document),
        issue_text: document.plain_text,
      })}\n`);
      continue;
    }
    if (lines.length === 2) {
      const {entry, message, email} = lines[0];
      const html = readableBody(email.payload);
      const issue = {
        id: message.id,
        html,
        source: entry.key,
        issue_date: message.issue_date,
        shape: entry.shape,
        unwrap: entry.unwrap || undefined,
      };
      const extracted = await extractIssue(issue, {
        overrideShape: message.shape_override || undefined,
        model: async () => lines[1],
        harvester: 'harvest-newsletters',
        now: lines[0].harvested_at,
      });
      process.stdout.write(`${JSON.stringify({records: extracted.records, report: extracted.report})}\n`);
      process.exitCode = 0;
      input.close();
      break;
    }
  }
  if (lines.length < 2) throw new Error('private extraction ended before model findings arrived');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

function validateEnvelope(entry, message, email) {
  if (!entry?.key || !entry.shape || !message?.id || !message.issue_date || !email?.payload) {
    throw new Error('private extraction needs an inventory entry, searched envelope, and full MIME payload');
  }
  if (email.id && email.id !== message.id) throw new Error(`private extraction read returned ${email.id} for ${message.id}`);
  if (!actualFromMatchesEntry(message, entry)) throw new Error(`private extraction refused an unattributed ${entry.key} message`);
}
