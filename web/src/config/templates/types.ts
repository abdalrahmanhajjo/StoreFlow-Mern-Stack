import type {
  BusinessType,
  ComplianceFlags,
  FeatureFlags,
  HardwareProfile,
  StoreRole,
  TaxProfile,
} from '@/lib/contracts/types';

// Template layer: describes how each business type *works and looks*, not just
// its colours. `posLayout`, `actionDensity`, `basketMode` and the nav sections
// differ per type so a pharmacy counter and a supermarket lane feel different.

/** How the point-of-sale surface is arranged for this business. */
export type PosLayout =
  | 'lane-grid' // supermarket: fast scan lane + weigh
  | 'dispense-counter' // pharmacy: one patient at a time, checks first
  | 'table-menu' // restaurant: tables + courses
  | 'style-catalog' // boutique: large imagery, clienteling
  | 'quick-list' // convenience: dense one-tap list
  | 'configure-catalog'; // electronics: specs, serials, warranties

/** Controls spacing/hit-area/information density of the shell. */
export type ActionDensity = 'compact' | 'comfortable' | 'spacious';

/** How the basket behaves for the workflow. */
export type BasketMode =
  | 'line-items' // one flat list of scanned items
  | 'patient-order' // dispensing: attached to a patient + safety checks
  | 'table-courses' // grouped by course/seat/table
  | 'styled-lines' // line items with size/variant + clienteling notes
  | 'serialised-lines'; // line items that may carry serial/IMEI + warranty

export interface NavEntry {
  id: string;
  label: string;
  path: string;
  roles: StoreRole[];
  /** Only shown when this feature flag resolves true. */
  requiresFeature?: keyof FeatureFlags;
  /** Only shown when this compliance flag resolves true. */
  requiresCompliance?: keyof ComplianceFlags;
}

export interface NavSection {
  id: string;
  label: string;
  entries: NavEntry[];
}

export interface TemplateDefinition {
  businessType: BusinessType;
  label: string;
  tagline: string;
  posLayout: PosLayout;
  actionDensity: ActionDensity;
  basketMode: BasketMode;
  /** Short workflow verb used in copy and analytics, e.g. "scan-and-bag". */
  primaryWorkflow: string;
  /** Capability switches that turn on specialised UI regions. */
  capabilities: {
    weighing: boolean;
    prescriptionGate: boolean;
    ageVerification: boolean;
    tableService: boolean;
    kitchenTicket: boolean;
    serialCapture: boolean;
    warrantyCapture: boolean;
    clienteling: boolean;
  };
  defaultFeatureFlags: FeatureFlags;
  defaultHardware: HardwareProfile;
  defaultTax: TaxProfile;
  navSections: NavSection[];
}
