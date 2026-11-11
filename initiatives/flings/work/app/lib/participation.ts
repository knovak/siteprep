// All changes run inside the caller's current-authority D1 transaction.
export function participationSteps(db: D1Database, fling: string, now: number) {
  const q = (sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args);
  return [
    q(
      `UPDATE invitations SET state='declined',timed_out=1,generation=generation+1
      WHERE fling=? AND state='invited' AND invited_at IS NOT NULL
      AND EXISTS(SELECT 1 FROM activities a JOIN flings f ON f.id=a.fling
        WHERE a.id=invitations.activity AND a.capacity IS NOT NULL
        AND a.state='published' AND f.state='open' AND a.timeout_minutes IS NOT NULL
        AND invitations.invited_at+a.timeout_minutes*60000<=?)`,
      fling,
      now,
    ),
    q(
      'UPDATE flings SET revision=revision+1 WHERE id=? AND changes()>0',
      fling,
    ),
    q(
      `WITH candidates AS (
      SELECT a.id activity,a.fling,j.value member,
        ROW_NUMBER() OVER(PARTITION BY a.id ORDER BY CAST(j.key AS INTEGER)) rank,
        CASE WHEN a.cascading=0 THEN 500 ELSE a.capacity-(SELECT COUNT(*) FROM invitations i JOIN members m ON m.id=i.member
          WHERE i.activity=a.id AND m.state='active' AND i.state IN ('accepted','invited')) END vacancies
      FROM activities a JOIN flings f ON f.id=a.fling JOIN json_each(a.invitation_order) j
      JOIN members m ON m.id=j.value AND m.fling=a.fling AND m.state='active'
      LEFT JOIN invitations i ON i.activity=a.id AND i.member=m.id
      WHERE a.fling=? AND f.state='open' AND a.state='published' AND (a.cascading=0 OR a.capacity IS NOT NULL) AND (i.member IS NULL OR i.state='withdrawn')
    ) INSERT INTO invitations(member,activity,fling,state,invited_at,timed_out)
      SELECT member,activity,fling,'invited',?,0 FROM candidates WHERE rank<=vacancies
      ON CONFLICT(member,activity) DO UPDATE SET state='invited',invited_at=excluded.invited_at,
        timed_out=0,generation=invitations.generation+1`,
      fling,
      now,
    ),
    q(
      'UPDATE flings SET revision=revision+1 WHERE id=? AND changes()>0',
      fling,
    ),
  ];
}
