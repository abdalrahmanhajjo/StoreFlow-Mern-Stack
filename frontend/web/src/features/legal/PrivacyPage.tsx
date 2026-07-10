import { LegalLayout } from './LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 9, 2026">
      <h2>What we collect</h2>
      <p>
        To run your workspace we store the records you create: your account
        details (name, email, role), your store profile (business type, locale,
        currency, tax settings), and the operational data of the store itself —
        products, stock counts, sales, customers, loyalty points, suppliers and
        purchase orders.
      </p>

      <h2>What we never do</h2>
      <ul>
        <li>We do not sell your data or your customers&apos; data to anyone.</li>
        <li>We do not use your sales records for advertising.</li>
        <li>We do not read your data except to operate the service or when you ask us to help.</li>
      </ul>

      <h2>How sign-in works</h2>
      <p>
        Your access token is held in memory only — never in web storage — and
        sessions are refreshed through an HttpOnly cookie that scripts cannot
        read. This design limits what a compromised browser extension or
        injected script could steal.
      </p>

      <h2>Your customers&apos; data</h2>
      <p>
        Customer profiles and loyalty points you record belong to your store.
        You are the controller of that data; we process it on your instructions.
        If a customer asks you to delete their profile, removing it in the app
        removes it from active systems.
      </p>

      <h2>Retention and export</h2>
      <p>
        Operational records are kept while your workspace is active. You can
        export your catalog, sales and customer lists at any time. Thirty days
        after a workspace is closed, its data is deleted from active systems;
        encrypted backups roll off within ninety days.
      </p>

      <h2>Where data lives</h2>
      <p>
        Workspaces are hosted in data centres appropriate to your region, with
        encryption in transit and at rest. Locale settings (including RTL
        languages and local tax profiles) affect formatting only — not where or
        how your data is protected.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions or data requests, reach us through the contact
        form on the home page. We reply within one business day.
      </p>
    </LegalLayout>
  );
}
