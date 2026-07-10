import { LegalLayout } from './LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="July 9, 2026">
      <h2>1. The agreement</h2>
      <p>
        These terms govern your use of StoreFlow — the point-of-sale, inventory,
        supplier and loyalty workspace — whether you run a single register on the
        Free plan or multiple branches on Enterprise. By creating a workspace or
        signing in, you accept them on behalf of your store.
      </p>

      <h2>2. Your workspace and your staff</h2>
      <p>
        The account owner controls the workspace: inviting owners, managers and
        cashiers, assigning roles, and removing access. You are responsible for
        the actions taken under your staff accounts and for keeping credentials
        confidential. Role-based limits (for example discount caps at the till)
        exist to protect you and must not be circumvented.
      </p>

      <h2>3. Your data</h2>
      <p>
        Your catalog, sales, customers, suppliers and reports belong to you. We
        process them only to run the service. You can export your records at any
        time, and closing your workspace removes it from active systems within
        thirty days.
      </p>

      <h2>4. Plans and billing</h2>
      <ul>
        <li>The Free plan covers one staff member, one register and up to 50 products, forever.</li>
        <li>Pro and Enterprise are billed monthly per store and can be cancelled at any time; paid features stop at the end of the billing period.</li>
        <li>Plan limits (staff seats, product counts, branches) are enforced by the service and described on the pricing page.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>
        Don&apos;t use StoreFlow to sell goods illegal in your jurisdiction, to
        evade tax obligations, or to store data you have no right to hold.
        Regulated workflows — prescriptions, age-restricted sales — are tools to
        help you comply with your local rules, not a substitute for them.
      </p>

      <h2>6. Availability and changes</h2>
      <p>
        We aim to keep every counter online, and the offline sales queue exists
        for the moments in between. We may improve or change features with
        notice; if a change materially reduces what your plan includes, you may
        cancel with a pro-rated refund of prepaid fees.
      </p>

      <h2>7. Liability</h2>
      <p>
        StoreFlow is provided as described, without warranty of uninterrupted
        operation. To the extent permitted by law, our liability for any claim
        is limited to the fees you paid in the twelve months before the event
        giving rise to it.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these terms? Write to us through the contact form on the
        home page and we&apos;ll reply within one business day.
      </p>
    </LegalLayout>
  );
}
