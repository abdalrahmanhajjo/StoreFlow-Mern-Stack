import { usePlanLimits } from '@/features/subscriptions/usePlanLimits';

interface Props {
  limitKey: 'productsPerStore' | 'membersPerStore' | 'customersPerStore' | 'stores';
  currentCount: number;
  label?: string;
}

export function PlanLimitBanner({ limitKey, currentCount, label }: Props) {
  const { data, loading } = usePlanLimits();

  if (loading) return null;

  const limit = data?.limits?.[limitKey];
  if (limit === null || limit === undefined) return null;

  const usage = currentCount / limit;
  const nearLimit = usage >= 0.8 && usage < 1;
  const atLimit = usage >= 1;

  if (!nearLimit && !atLimit) return null;

  const resourceLabel = label ?? limitKey.replace(/([A-Z])/g, ' $1').toLowerCase();
  const planName = data?.plan?.name ?? 'Free';

  return (
    <div
      className={`px-4 py-2 text-sm rounded-md ${
        atLimit
          ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200'
      }`}
    >
      {atLimit ? (
        <span>
          You've reached the {resourceLabel} limit for your {planName} plan ({currentCount}/{limit}).
          <a href="/settings/billing" className="ml-2 underline font-medium">
            Upgrade your plan
          </a>
        </span>
      ) : (
        <span>
          You've used {currentCount} of {limit} {resourceLabel} on your {planName} plan ({Math.round(usage * 100)}%).
          <a href="/settings/billing" className="ml-2 underline font-medium">
            Upgrade
          </a>
        </span>
      )}
    </div>
  );
}
