import { LegalLayout } from './LegalLayout';

export default function SecurityPage() {
  return (
    <LegalLayout title="Security" updated="July 9, 2026">
      <h2>Session security</h2>
      <p>
        Access tokens live in memory only and are never written to local
        storage or cookies readable by scripts. Sessions refresh through an
        HttpOnly, SameSite cookie, so a cross-site script cannot lift your
        credentials even if one slips through.
      </p>

      <h2>Hardened by default</h2>
      <ul>
        <li>A strict Content-Security-Policy and companion security headers are enforced at the edge on every response.</li>
        <li>All traffic is encrypted in transit; stored data is encrypted at rest.</li>
        <li>Inputs are validated with shared schemas on every form, and URLs are scheme-checked before they are ever followed.</li>
      </ul>

      <h2>Roles at the counter</h2>
      <p>
        Every action is gated by role. Cashiers can sell but not rewrite the
        catalog; managers can adjust stock within their caps; only owners touch
        store settings. Discount limits are enforced per role at the till.
      </p>

      <h2>Watching the doors</h2>
      <p>
        The platform records login attempts, blocks abusive IPs, and keeps an
        audit trail of sensitive actions — stock adjustments, refunds, role
        changes — with who did what, and when. Platform administrators review
        flagged stores and suspicious activity daily.
      </p>

      <h2>Reporting a vulnerability</h2>
      <p>
        Found something? Tell us before anyone else. Report it through the
        contact form with the word “security” in your message and we will
        respond within one business day. We ask that you give us reasonable time
        to fix an issue before disclosing it, and we do not pursue good-faith
        researchers.
      </p>
    </LegalLayout>
  );
}
