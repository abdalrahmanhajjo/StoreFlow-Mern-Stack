import { Request, Response } from 'express';
import { billingService } from '../services/billing/billing.service';
import { getBillingProvider } from '../services/billing/provider';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({ success: false, message: 'Missing stripe-signature header' });
    return;
  }

  try {
    const provider = getBillingProvider();
    // express.raw() delivers the payload as a Buffer in req.body — pass it
    // through untouched. Stripe signature verification is byte-exact, so any
    // re-serialization (JSON.stringify) would invalidate the signature.
    const rawBody: string | Buffer = Buffer.isBuffer(req.body)
      ? req.body
      : (req as any).rawBody ?? JSON.stringify(req.body);

    const event = provider.verifyWebhook(rawBody, signature);

    await billingService.handleWebhookEvent(event);

    res.status(200).json({ received: true });
  } catch (error: any) {
    const message = error.type === 'StripeSignatureVerificationError'
      ? 'Webhook signature verification failed'
      : error.message;
    res.status(400).json({ success: false, message });
  }
};
