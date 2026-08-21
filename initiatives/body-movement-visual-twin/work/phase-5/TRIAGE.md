# Human review triage

Review reports are evidence beside a movement record, never edits made by the
viewer. Keep the downloaded, copied, or emailed JSON report unchanged, then:

1. Confirm that `movement_id` names a current record and resolve `claim_path`
   against that exact JSON file. If either fails, record that the report refers
   to an older version instead of guessing at a replacement claim.
2. Check the report note and its cited claim against the relevant practitioner,
   anatomy source, attribution, or safety boundary.
3. Edit the source movement JSON by hand. A correction changes the claim and
   records the reviewer in `source.review`; unresolved doubt keeps the claim but
   sets `source.review.status` to `disputed` with a specific note. `disputed` is
   an honest publishable state, not a failed review.
4. If an attribution or anatomy asset cannot be supported, remove the source or
   asset and every reference to it. Do not replace it silently. Re-run the
   movement validator, collection completeness tests, rights check, and
   registration tests so a removal cannot leave a dangling claim.
5. Commit the corrected or disputed source record separately from the original
   report. The report remains unchanged as the record of what prompted triage.

The reviewer identifier is optional. The page holds it only in the open dialog
and does not write it or the report to local storage, session storage, IndexedDB,
or a network destination. Download and copy are deliberate local handoffs. An
email draft is offered only when a maintainer configures a review inbox; opening
that draft is the reviewer’s deliberate network handoff.
