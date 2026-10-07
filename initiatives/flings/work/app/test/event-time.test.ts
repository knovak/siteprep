import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  timeChoices,
  resolveTime,
  localTime,
  utcOffset,
} from '../lib/event-time.ts';
void test('displayed offsets distinguish repeated hours and retain fractional and zero offsets', () => {
  assert.equal(
    utcOffset('2026-11-01T08:30:00.000Z', 'America/Los_Angeles'),
    'UTC−07:00',
  );
  assert.equal(
    utcOffset('2026-11-01T09:15:00.000Z', 'America/Los_Angeles'),
    'UTC−08:00',
  );
  assert.equal(
    utcOffset('2027-03-14T10:30:00.000Z', 'America/Los_Angeles'),
    'UTC−07:00',
  );
  assert.equal(
    utcOffset('2026-04-04T14:45:00.000Z', 'Australia/Lord_Howe'),
    'UTC+11:00',
  );
  assert.equal(
    utcOffset('2026-04-04T15:15:00.000Z', 'Australia/Lord_Howe'),
    'UTC+10:30',
  );
  assert.equal(
    utcOffset('2026-10-03T12:15:00.000Z', 'Asia/Kathmandu'),
    'UTC+05:45',
  );
  assert.equal(utcOffset('2026-10-03T12:15:00.000Z', 'UTC'), 'UTC+00:00');
});
void test('time resolution covers non-hour offsets, half-hour transitions and skipped calendar dates', () => {
  assert.equal(
    resolveTime('2026-10-03T18:00', 'Asia/Kathmandu', undefined),
    '2026-10-03T12:15:00.000Z',
  );
  assert.deepEqual(
    timeChoices('2026-04-05T01:45', 'Australia/Lord_Howe').map((c) => c.starts),
    ['2026-04-04T14:45:00.000Z', '2026-04-04T15:15:00.000Z'],
  );
  assert.equal(
    timeChoices('2026-10-04T02:15', 'Australia/Lord_Howe').length,
    0,
  );
  assert.equal(timeChoices('2011-12-30T12:00', 'Pacific/Apia').length, 0);
  assert.equal(
    localTime('2026-11-01T09:30:00.000Z', 'America/Los_Angeles'),
    '2026-11-01T01:30',
  );
  assert.throws(() =>
    resolveTime('2026-11-01T01:30', 'America/Los_Angeles', undefined),
  );
});
