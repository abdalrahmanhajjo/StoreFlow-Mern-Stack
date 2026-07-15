# The Registration Feature — The Complete Guide (with the code)

Store registration, end to end, shown through the **actual code**: the wizard,
validation, the backend that creates accounts/stores/subscriptions, the paid
checkout, email verification, and admin approval. Companion to
`FRONTEND-GUIDE.md`.

**Entry route**: `/register` → `src/features/auth/RegisterPage.tsx`. Also
reachable as `/register?plan=<publicId-or-code>&interval=monthly|yearly` from
the pricing/landing pages, which pre-select a plan.

---

## 1. The 30-second mental model

```text
Step 0          Step 1            Step 2       Step 3            Step 4
Business   →    Owner identity →  Account  →   Plan         →    Verify (OTP)
                                               │
                                               ▼  "Create store" = POST /auth/register
                                ┌──────────────┴──────────────────┐
                                │ FREE plan                       │ PAID plan
                                │ owner + store + membership +    │ owner + 'incomplete' sub +
                                │ free subscription created NOW   │ CheckoutAttempt; response
                                ▼                                 │ carries checkout.url
                          Step 4 (Verify)                         ▼
                                │                        window.location = checkout.url
                                │                                 │ pay → webhook provisions
                                │                                 ▼ store + membership
                                ▼                        /billing/checkout/complete
                    POST /auth/verify-email-code                  │ → back to /register
                                ▼                                 ▼
                       /pending-approval  ←───────────────────────┘
                                ▼
              admin approves (store: pending → active) → owner logs in
```

Nothing hits the server before step 3's "Create store". Abandoning a paid
checkout leaves a user + `incomplete` subscription but **no store** — the
webhook provisions it after payment.

**Files involved** (each appears with its code below): frontend —
`RegisterPage.tsx`, `schemas.ts`, `hooks.ts`, `authService.ts`,
`PendingApprovalPage.tsx`, `LoginPage.tsx`, `router.tsx`, `HomePage.tsx`,
`PricingPage.tsx`, `DemoCheckoutPage.tsx`, `CheckoutCompletePage.tsx`,
`lib/axios.ts`, `components/ui`. Backend — `auth.routes.ts`, `app.ts`
(limiters), `auth.validator.ts`, `auth.controller.ts`, `billing.service.ts`,
`billing.controller.ts`, `mockProvider.ts`/`stripeProvider.ts`,
`auth.utils.ts` → `mail.utils.ts` + the `email-verification` template. Models
written: User, Store, StoreMembership, BillingAccount, Subscription,
CheckoutAttempt, BillingCustomer, Invoice, ProcessedWebhookEvent, AuditLog.

---

## 2. The route (`src/app/router.tsx`)

```tsx
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
// …
<Route path="/register" element={<RegisterPage />} />
<Route path="/pending-approval" element={<PendingApprovalPage />} />
<Route path="/billing/checkout/complete" element={<CheckoutCompletePage />} />
{/* Simulated hosted checkout — served by the backend mock billing provider */}
<Route path="/billing/checkout/demo" element={<DemoCheckoutPage />} />
```

Entry links: LoginPage → `<Link to="/register">Sign up</Link>`; PricingPage →

```tsx
const registerUrl = `/register?plan=${plan.publicId}&interval=${interval}`;
```

---

## 3. Validation schema (`src/features/auth/schemas.ts`)

The single source of truth for every field rule on the frontend:

```ts
const PHONE_RE = /^[\d\s\-()+]{4,20}$/;
const PHONE_ERR = 'Enter a valid phone number (e.g. 555 123 4567)';

export const registerSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(60, 'Store name is too long'),
  businessType: z.string().min(1, 'Select a business type'),
  currency: z.string().min(1, 'Select a currency'),
  businessPhoneCode: z.string().min(1, 'Select a country code'),
  businessPhone: z.string().min(4, PHONE_ERR).regex(PHONE_RE, PHONE_ERR),
  businessAddress: z.string().min(5, 'Enter your full street address (at least 5 characters)').max(200),
  businessTaxId: z.string().max(30).optional().or(z.literal('')),   // optional, empty passes
  ownerName: z.string().min(2).max(100),
  ownerPhoneCode: z.string().min(1, 'Select a country code'),
  ownerPhone: z.string().min(4, PHONE_ERR).regex(PHONE_RE, PHONE_ERR),
  ownerIdType: z.enum(['national_id', 'passport', 'drivers_license'], 'Select a valid ID type'),
  ownerIdNumber: z.string().min(3).max(40),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address (e.g. you@store.com)'),
  password: z.string()
    .min(8, 'At least 8 characters required')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/\d/, 'Must include a number')
    .regex(/[^a-zA-Z0-9]/, 'Must include a special character (!@#$ etc.)'),
  otp: z.string().length(6).regex(/^\d{6}$/).optional().or(z.literal('')),
  // Plan selection (optional — carried from pricing page)
  planPublicId: z.string().optional(),
  billingInterval: z.enum(['monthly', 'yearly']).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
```

The password checklist in the UI mirrors those five regexes one-for-one.

---

## 4. The wizard (`src/features/auth/RegisterPage.tsx`)

### Steps and their fields

```ts
const STEPS = ['Business', 'Owner identity', 'Account', 'Plan', 'Verify'] as const;

const stepFields: [string[], string[], string[], string[], string[]] = [
  ['storeName', 'businessType', 'currency', 'businessPhoneCode', 'businessPhone', 'businessAddress', 'businessTaxId'],
  ['ownerName', 'ownerPhoneCode', 'ownerPhone', 'ownerIdType', 'ownerIdNumber'],
  ['email', 'password'],
  [],   // Plan — selection state lives outside react-hook-form
  [],   // Verify — OTP has its own state
];
```

### One form, per-step validation

```ts
const { register: regField, trigger, watch, setFocus, control, formState: { errors } } =
  useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { /* … */ } });

async function next() {
  const fields = stepFields[step];
  if (fields.length > 0) {
    const valid = await trigger(fields as (keyof RegisterInput)[]);  // ONLY this step
    if (!valid) return;                                              // errors render inline
  }
  // Leaving the Plan step submits the registration — the server creates
  // the store + owner and emails the 6-digit code the Verify step asks for.
  if (step === 3) {
    const payload = { ...vals, planPublicId: selectedPlanId ?? undefined, billingInterval };
    reg.mutate(payload);
    return;
  }
  advance();
}

function advance() {
  setAnimKey((k) => k + 1);                       // replays the slide-up animation
  setStep((s) => Math.min(s + 1, STEPS.length - 1));
  if (step + 1 === 4) startResendTimer();
  setTimeout(() => {
    const name = stepFields[Math.min(step + 1, STEPS.length - 1)]?.[0];
    if (name) setFocus(name as keyof RegisterInput); // focus first field of next step
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}
```

### Plan loading + pre-selection (step 3's data)

```ts
const preselectedPlan = searchParams.get('plan');
const preselectedInterval = searchParams.get('interval') as 'monthly' | 'yearly' | null;

useEffect(() => {
  (async () => {
    try {
      const res = await api.get('/v1/billing/plans');    // same catalog as pricing/billing/admin
      const body = res.data as { data?: PricingPlan[] } | PricingPlan[] | undefined;
      const list = Array.isArray(body) ? body : body?.data ?? [];
      setPlans(list);
      if (preselectedPlan) {
        const match = list.find((p) => p.publicId === preselectedPlan || p.code === preselectedPlan);
        if (match) setSelectedPlanId(match.publicId);
      }
    } catch { /* ignore */ }                             // step still works; server defaults to free
    setPlansLoading(false);
  })();
}, [preselectedPlan]);
```

Price rendering per interval:

```ts
const price = billingInterval === 'yearly' ? plan.billing.yearlyPriceMinor : plan.billing.monthlyPriceMinor;
// formatMinor: '$' + (amount / 100).toFixed(2)
```

### Free-plan success advances to Verify

```ts
// Free plan registration succeeds → advance to Verify step
useEffect(() => {
  if (reg.isSuccess && !reg.data?.checkout?.url) {
    setAnimKey((k) => k + 1);
    setStep(4);
    startResendTimer();
  }
}, [reg.isSuccess, reg.data, startResendTimer]);
```

### Password strength meter (step 2)

```ts
function strength(pw: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const map = [ { label: 'Weak', pct: 18, … }, /* Fair, Good, Strong, Very strong */ ];
  return map[Math.min(score, 4)];
}
```

### OTP inputs (step 4)

```ts
function handleOtpChange(index: number, value: string) {
  if (!/^\d*$/.test(value)) return;                  // digits only
  setOtp((prev) => { const next = [...prev]; next[index] = value.slice(-1); return next; });
  setOtpError('');
  if (value && index < 5) otpRefs.current[index + 1]?.focus();   // auto-advance
}

function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
  if (e.key === 'Backspace' && !otp[index] && index > 0) {
    otpRefs.current[index - 1]?.focus();             // walk left on empty backspace
  }
}

function handlePaste(e: React.ClipboardEvent) {
  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
  if (text.length === 6) { setOtp(text.split('')); setOtpError(''); otpRefs.current[5]?.focus(); }
}

function handleVerifyOtp() {
  const code = otp.join('');
  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    setOtpError('Enter the complete 6-digit code');
    return;
  }
  verify.mutate({ email: vals.email, code },
    { onError: (err) => setOtpError(err.message || 'Verification failed — check the code and try again') });
}
```

Resend with a 30 s cooldown (UX only — the server has its own rate limit):

```ts
const startResendTimer = useCallback(() => {
  setResendTimer(30);
  resendInterval.current = setInterval(() => {
    setResendTimer((t) => { if (t <= 1) { clearInterval(resendInterval.current); return 0; } return t - 1; });
  }, 1000);
}, []);

function handleResendCode() {
  startResendTimer();
  authService.resendVerificationCode(vals.email)
    .then(() => toast.success('New code sent', vals.email))
    .catch(() => toast.error('Could not resend the code. Please try again.'));
}
```

---

## 5. The mutations (`src/features/auth/hooks.ts`)

```ts
/** Creates the store + owner and triggers the verification email.
 *  For paid plans, redirects to checkout after registration. */
export function useRegister() {
  return useMutation<Awaited<ReturnType<typeof authService.register>>, ApiErr, RegisterInput>({
    mutationFn: (input) => authService.register(input),
    onSuccess: (result) => {
      if (result?.checkout?.url) {
        window.location.href = result.checkout.url;     // PAID → hosted checkout (full page nav)
      } else {
        toast.success('Verification code sent', 'Check your email');  // FREE → effect advances to step 4
      }
    },
    onError: (err) => toast.error(err.message || 'Registration failed. Please try again.'),
  });
}

/** Confirms the 6-digit email code, then hands off to the approval screen. */
export function useVerifyEmail() {
  const navigate = useNavigate();
  return useMutation<void, ApiErr, { email: string; code: string }>({
    mutationFn: ({ email, code }) => authService.verifyEmailCode(email, code),
    onSuccess: (_data, { email }) => {
      toast.success('Email verified', 'Application received');
      navigate(`/pending-approval?email=${encodeURIComponent(email)}`, { replace: true });
    },
  });
}
```

---

## 6. The service (`src/features/auth/authService.ts`)

UI labels → API enums, and the wire shape the backend validates:

```ts
const BUSINESS_TYPE_TO_API: Record<string, string> = {
  'Grocery / Supermarket': 'grocery',
  Restaurant: 'restaurant',
  Pharmacy: 'pharmacy',
  'Retail shop': 'retail',
};

async register(input: RegisterInput) {
  if (USE_MOCK) {
    const isPaid = input.planPublicId && input.planPublicId !== 'plan_free';
    pendingApprovals.set(input.email.toLowerCase(), { name: input.ownerName, businessType: input.businessType, step: 0 });
    if (isPaid) {
      const fakeSessionId = `fake_${Math.random().toString(36).slice(2, 10)}`;
      return delay({ checkout: { url: `/billing/checkout/complete?session_id=${fakeSessionId}&mock=true`, sessionId: fakeSessionId },
                     plan: { code: 'pro', name: 'Pro', billingInterval: input.billingInterval ?? 'monthly', isFree: false } });
    }
    return delay({ checkout: null, plan: { code: 'free', name: 'Free', billingInterval: 'monthly', isFree: true } });
  }

  const { data } = await api.post('/auth/register', {
    storeName: input.storeName,
    address: input.businessAddress,
    businessType: BUSINESS_TYPE_TO_API[input.businessType] ?? 'retail',
    currency: input.currency,
    taxRegistrationId: input.businessTaxId || undefined,
    ownerName: input.ownerName,
    email: input.email,
    password: input.password,
    phone: { countryCode: input.ownerPhoneCode, number: input.ownerPhone.replace(/\D/g, '') },
    idVerification: { type: input.ownerIdType, number: input.ownerIdNumber },
    planPublicId: input.planPublicId || undefined,
    billingInterval: input.billingInterval || undefined,
  });
  return data?.data ?? {};
}

async resendVerificationCode(email: string): Promise<void> {
  if (USE_MOCK) return delay(undefined, 300);
  await api.post('/auth/resend-verification-code', { email });
}
```

---

## 7. Backend routes + rate limits

`backend/src/routes/auth.routes.ts`:

```ts
router.post('/register', authController.register);
router.post('/verify-email-code', authController.verifyEmailCode);
router.post('/resend-verification-code', authController.resendVerificationCode);
router.get('/approval-status', authController.approvalStatus);
```

`backend/src/app.ts` — the OTP endpoint gets the strict limiter on top of the
general auth limiter:

```ts
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, /* … */ });
app.use("/api/auth/verify-email-code", otpLimiter);
app.use("/api/auth", authLimiter, authRoutes);       // 300 / 15 min
```

Server-side schema (`backend/src/validators/auth.validator.ts`) — note the
**enum** shapes the frontend maps into:

```ts
export const registerSchema = z.object({
  storeName: z.string().min(2).max(120),
  address: z.string().min(5).max(200),
  businessType: z.enum(['grocery', 'restaurant', 'pharmacy', 'retail']),
  currency: z.string().length(3).default('USD'),
  taxRegistrationId: z.string().optional(),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.object({ countryCode: z.string().min(1).max(5), number: z.string().min(7).max(15) }),
  idVerification: z.object({ type: z.enum(['national_id', 'passport', 'drivers_license']), number: z.string().min(5).max(50) }),
  planPublicId: z.string().optional(),          // defaults to the free plan
  billingInterval: z.enum(['monthly', 'yearly']).optional(),
});
```

---

## 8. The register controller (`backend/src/controllers/auth.controller.ts`)

```ts
const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 10;
const generateEmailVerificationCode = () => randomInt(100000, 1000000).toString();

export const register = async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);

  // Duplicate email — one exception: a stale invited-but-never-accepted
  // staff record is deleted so the registration can proceed.
  const existing = await User.findOne({ email: input.email }).select('+passwordResetExpires +passwordResetTokenHash');
  if (existing) {
    if (!existing.isActive && existing.passwordResetExpires) {
      await User.deleteOne({ _id: existing._id });
    } else {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
  }

  // Resolve the plan — default to free if not provided
  const plan = await Plan.findOne({ publicId: input.planPublicId || 'plan_free', isActive: true, isPublic: true });
  if (!plan) return res.status(400).json({ message: 'Selected plan is not available' });
  const isFree = plan.billing.monthlyPriceMinor === 0 && plan.billing.yearlyPriceMinor === 0;

  // Create the owner (bcrypt cost 12 inside hashPassword)
  const owner = await User.create({
    name: input.ownerName, email: input.email, passwordHash: await hashPassword(input.password),
    role: 'owner', storeId: null, isEmailVerified: false,
    phone: input.phone, idVerification: input.idVerification,
  });

  try {
    const account = await billingService.getOrCreateAccount(owner._id);

    if (isFree) {
      // Free plan: activate subscription + create store immediately
      await billingService.activateFreePlan(account._id, owner._id, plan, billingInterval);
      const store = await Store.create({ publicId: …, name: input.storeName, slug: …,
        address: input.address, businessType: input.businessType, currency,
        status: 'pending', owner: owner._id, isVerified: false });
      owner.storeId = store._id;

      // The owner is a member of their own store — membership drives all
      // store-level authorization checks.
      await StoreMembership.create({ publicId: …, store: store._id, user: owner._id,
        role: 'owner', status: 'active' });
    } else {
      // Paid plan: store pending data, create checkout session (no store yet)
      pendingStoreData = { name: input.storeName, address: input.address,
        businessType: input.businessType, currency: input.currency, taxRegistrationId: … };
      const result = await billingService.createCheckoutSession(
        owner._id, plan.code, billingInterval, successUrl, cancelUrl, pendingStoreData);
      checkoutData = result.checkout;
    }

    // 6-digit code: only the SHA-256 hash is stored, 10-minute expiry
    const verificationCode = generateEmailVerificationCode();
    owner.emailVerificationCodeHash = hashToken(verificationCode);
    owner.emailVerificationCodeExpires = new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);
    await owner.save();

    // Email failure must NOT roll back the account — the user can hit
    // "Resend code" from the verify screen.
    const emailSent = await sendEmailVerificationCode(owner.email, verificationCode);

    res.status(201).json({
      message: checkoutData ? 'Account created. Please complete payment to activate your store.'
        : emailSent ? 'Store registered. Verification code sent to your email. …'
        : "Store registered, but we couldn't send the verification email. Use \"Resend code\" …",
      data: { userId: owner._id, storeId: owner.storeId, email: owner.email,
              plan: { code: plan.code, name: plan.name, billingInterval, isFree },
              checkout: checkoutData },
    });
  } catch (storeErr) {
    await User.deleteOne({ _id: owner._id });   // rollback: no half-registered accounts
    throw storeErr;
  }
};
```

---

## 9. The billing side (`backend/src/services/billing/billing.service.ts`)

**Free branch** — an immediately-active $0 subscription:

```ts
async activateFreePlan(accountId, userId, plan, billingInterval) {
  const subscription = await Subscription.create({
    publicId: pubId('sub'), account: accountId, user: userId,
    plan: plan._id, planVersion: plan.version ?? 1,
    status: 'active', billingInterval, currency: plan.billing.currency,
    amountMinor: 0, provider: 'none',
    currentPeriodStart: now, currentPeriodEnd: /* ~10 years out */,
  });
  return { subscription: { publicId: subscription.publicId, status: 'active' }, checkout: null };
}
```

**Paid branch** — checkout session + `incomplete` subscription + the attempt
carrying the store data:

```ts
async createCheckoutSession(userId, planCode, billingInterval, successUrl, cancelUrl, pendingStoreData?) {
  // The mock provider needs no real Stripe price — synthesize one so plans
  // created without Stripe configuration still get a full checkout flow.
  if (!priceId && getBillingProvider().name === 'mock') {
    priceId = `price_mock_${plan.code}_${billingInterval}`;
  }

  const checkoutResult = await provider.createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, … });

  const subscription = await Subscription.create({ …, status: 'incomplete', provider: 'stripe', … });

  const checkoutData = { …, subscription: subscription._id, providerSessionId: checkoutResult.sessionId,
                         providerSessionUrl: checkoutResult.url, status: 'pending', … };
  if (pendingStoreData) {
    checkoutData.metadata = { pendingStore: JSON.stringify(pendingStoreData) };  // ← the future store
  }
  await CheckoutAttempt.create(checkoutData);

  return { subscription: …, checkout: { url: checkoutResult.url, sessionId: … } };
}
```

The mock provider points the URL at the in-app demo page
(`backend/src/services/billing/mockProvider.ts`):

```ts
async createCheckoutSession(input) {
  const sessionId = `cs_mock_${Date.now()}`;
  // Point at the local simulated checkout page so the full
  // checkout → webhook → activation loop is drivable without Stripe keys.
  const url = `${new URL(input.successUrl).origin}/billing/checkout/demo?session=${sessionId}`;
  return { sessionId, url, clientSecret: … };
}
```

---

## 10. Paying (demo) and the webhook that builds the store

The demo pay endpoint (`backend/src/controllers/billing.controller.ts`)
validates the fake card, stores it as the payment method, then drives the
**real** webhook pipeline with deterministic event IDs (idempotent — tracked
in `ProcessedWebhookEvent`):

```ts
export const payDemoCheckoutSession = async (req, res) => {
  const card = parseDemoCard(req.body ?? {});          // number format + future expiry
  if ('error' in card) return res.status(400).json({ success: false, message: card.error });
  await BillingCustomer.updateOne({ account: attempt.account },
    { $set: { 'providerCustomerData.paymentMethod': card } });   // brand/last4/expiry only

  await billingService.handleWebhookEvent({
    id: `evt_demo_pay_${sessionId}`,                   // deterministic → double-click safe
    type: 'checkout.session.completed',
    data: { id: sessionId, subscription: `sub_demo_${sessionId}`, customer: …, current_period_start: now, … },
  });
  // A paid checkout produces an invoice, same as Stripe's invoice.paid.
  await billingService.handleWebhookEvent({ id: `evt_demo_invoice_${sessionId}`, type: 'invoice.paid',
    data: { id: `in_demo_${sessionId}`, number: `DEMO-…`, total: attempt.amountMinor, … } });
};
```

`handleCheckoutCompleted` — where the paid branch's store finally comes from:

```ts
private async handleCheckoutCompleted(data: any) {
  const checkoutAttempt = await CheckoutAttempt.findOne({ providerSessionId: data.id });
  const subscription = await Subscription.findById(checkoutAttempt.subscription);

  subscription.status = 'active';
  subscription.currentPeriodStart = new Date((data.current_period_start ?? …) * 1000);
  await subscription.save();

  // A completed plan-change checkout supersedes any previous subscription —
  // exactly one subscription may be live per account.
  await Subscription.updateMany(
    { account: checkoutAttempt.account, _id: { $ne: subscription._id },
      status: { $in: ['active', 'trialing', 'past_due', 'grace_period'] } },
    { $set: { status: 'expired', cancelledAt: new Date() } });

  // If the checkout was a registration (pending store data → create store now)
  const pendingStore = JSON.parse(checkoutAttempt.metadata?.pendingStore);
  const user = await User.findById(account.owner);
  if (user && !user.storeId) {
    const store = await Store.create({ …, name: pendingStore.name, status: 'pending', owner: user._id });
    user.storeId = store._id;
    await user.save();
    await StoreMembership.create({ …, store: store._id, user: user._id, role: 'owner', status: 'active' });
  }
}
```

Then **CheckoutCompletePage** polls the public, session-scoped status endpoint
(the user has no login yet):

```ts
pollRef.current = setInterval(async () => {
  const res = await api.get(`/v1/billing/checkout-sessions/${sessionId}/status`);
  const subStatus = res.data?.data?.status;
  if (subStatus === 'active' || subStatus === 'trialing') { setStatus('active'); clearInterval(pollRef.current); }
  // 'incomplete' | 'pending' → keep polling; 'none'/'expired' → expired screen
}, 2000);
// success CTA: signed-in users → /settings/billing; fresh registrations → /register
```

---

## 11. Email verification (backend)

`verifyEmailCode` — hash-compare, expiry, single-use:

```ts
export const verifyEmailCode = async (req, res) => {
  const { email, code } = verifyEmailCodeSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationCodeExpires');

  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified' });
  if (!user.emailVerificationCodeHash || user.emailVerificationCodeExpires.getTime() < Date.now()) {
    return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
  }
  if (hashToken(code) !== user.emailVerificationCodeHash) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = null;      // single-use
  user.emailVerificationCodeExpires = null;
  await user.save();
  res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
};
```

`resendVerificationCode` regenerates the code, re-hashes, resets the 10-minute
expiry, and re-sends via `sendEmailVerificationCode` — which renders the
admin-editable `email-verification` template through the Gmail-API transport
in `mail.utils.ts` (codes print to the server log when mail isn't configured).

---

## 12. Approval & the login gates (`auth.controller.ts → login`)

The store is `pending` until a platform admin approves it. Login refuses entry
with coded errors the LoginPage switches on:

```ts
if (user.isActive === false) {
  return res.status(403).json({ code: 'INVITE_PENDING', message: 'Finish setting up your account from your invite email first.' });
}
if (!user.isEmailVerified) {
  return res.status(403).json({ code: 'EMAIL_UNVERIFIED', message: 'Please verify your email before logging in.' });
}
const store = user.storeId ? await Store.findById(user.storeId) : null;
if (store && store.status !== 'active') {
  await LoginAttempt.create({ email: input.email, ip, success: false });
  if (store.status === 'pending') {
    return res.status(403).json({ code: 'PENDING_APPROVAL', message: "Your account is still under review. We'll notify you once approved." });
  }
  return res.status(403).json({ code: 'STORE_SUSPENDED', message: 'This store is suspended. Contact support for help.' });
}
```

(Above these gates: bad-credential handling with per-account lockout after
repeated failures, every attempt logged to `LoginAttempt`.)

The PendingApprovalPage polls `GET /auth/approval-status?email=…` — which
deliberately reports **unknown emails as approved** so the endpoint can't be
used to enumerate which addresses have accounts:

```ts
// Unknown emails read as approved so the endpoint can't be used to
// enumerate which addresses have an account.
if (!user || !store) { /* → approved:true */ }
```

Approval itself is the admin Store-approvals page calling
`POST /stores/:id/status { status: 'active' }`.

---

## 13. Mock mode, errors, security — quick reference

**Mock mode** (`USE_MOCK`: no `VITE_API_BASE_URL`, or tests): `register()`
short-circuits (§6 code) — the whole wizard, paid branch included, walks with
zero backend; `verifyEmailCode` accepts any 6 digits; `mock=true` makes
CheckoutCompletePage fake success after 2 s.

**Errors**: field errors inline via `trigger()`; registration errors toast the
server's normalised `{ code, message }` (axios interceptor in `lib/axios.ts`);
OTP errors turn the boxes red (`otpError`); plan-list failure is non-fatal.
Server-side, any error after user creation deletes the user, so retrying the
same email works.

**Security**: bcrypt cost 12; OTP stored as SHA-256 hash, 10-min TTL,
single-use, `otpLimiter` 10/15 min/IP; `authLimiter` over all of `/api/auth`;
login lockout + `LoginAttempt` ledger (visible in `/admin/security`);
enumeration-safe approval-status; demo card endpoints exist only under the
mock provider and store brand/last4/expiry only.

---

## 14. Things to know before you change it

1. **The submit happens on step 3, not step 4** — step 4 only verifies email.
   Adding a step after Plan means moving the `if (step === 3)` branch.
2. **`stepFields` must match the rendered inputs** — it drives per-step
   validation and the auto-focus targets.
3. **Plan identity is `publicId`** (`plan_free`, …); the catalog is
   admin-editable — never hardcode plans in the wizard.
4. **The store is provisioned in two places** — register controller (free) and
   `handleCheckoutCompleted` (paid). Store-creation changes must hit **both**
   (or be factored into a shared helper).
5. **Label ↔ enum maps are load-bearing** (`BUSINESS_TYPE_TO_API`, currency) —
   change the `<select>`, the map, the server schema, and the Store model
   together.
6. **The paid redirect is a full page navigation** on purpose — checkout may
   be another origin (real Stripe).
7. **Duplicate-email 409 has one exception** (stale unaccepted invites) —
   don't "fix" it without understanding the invite flow.
8. **Webhook idempotency** relies on deterministic event IDs per session.
9. **`watch()` disables React Compiler memoization** for RegisterPage
   (documented suppression); migrate to `useWatch` if the page grows.
10. **Resend cooldown is client UX only** — `otpLimiter` is the control.

---

## 15. Manual test script

Free plan: `/register` → Business → Owner (National ID `AB12345`) → Account
(password passing all 5 checklist rows) → keep **Free** → **Create store** →
code arrives (or backend log) → OTP → `/pending-approval` → approve in
`/admin/approvals` → owner logs in.

Paid plan: pick **Pro** at step 3 → demo checkout → `4242 4242 4242 4242`,
any future expiry → activation screen → "Set up your store" → OTP → approval.
Then check `/settings/billing/invoices` (the `DEMO-…` invoice) and the stored
card under **Payment method**.

Failure paths: wrong OTP (red boxes), expired OTP (10 min → resend), duplicate
email (409 toast at step 3→4), login before verify (`EMAIL_UNVERIFIED`) and
before approval (`PENDING_APPROVAL`).
