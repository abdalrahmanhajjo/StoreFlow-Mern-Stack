import { Link } from 'react-router-dom';
import { LegalLayout } from './LegalLayout';

export default function LegalNoticePage() {
  return (
    <LegalLayout title="Legal Notice" updated="July 9, 2026">
      <h2>The service</h2>
      <p>
        StoreFlow is a multi-tenant retail platform: point of sale, catalog,
        inventory, suppliers, customer loyalty, reporting and platform
        administration, offered as a subscription service. This demo
        environment runs on seeded example data; the stores, owners and sales
        figures shown across the site are illustrative.
      </p>

      <h2>Documents that govern your use</h2>
      <ul>
        <li><Link to="/terms">Terms of Service</Link> — the agreement for using StoreFlow.</li>
        <li><Link to="/privacy">Privacy Policy</Link> — what we store and how we treat it.</li>
        <li><Link to="/security">Security</Link> — how the platform is protected.</li>
      </ul>

      <h2>Trademarks and content</h2>
      <p>
        The StoreFlow name, logo and interface design are the property of the
        StoreFlow project. Product photography on the marketing pages is used
        for illustration. Third-party brand names appearing in seeded demo data
        remain the property of their respective owners.
      </p>

      <h2>Compliance workflows</h2>
      <p>
        Features such as prescription handling, age verification, serial
        tracking and tax profiles are tools that help stores meet their local
        obligations. Each store remains responsible for compliance with the
        laws of its own jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>
        For legal correspondence, use the contact form on the home page and
        mark your message “legal”. We reply within one business day.
      </p>
    </LegalLayout>
  );
}
