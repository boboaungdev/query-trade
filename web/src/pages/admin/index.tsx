import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronsUpDown,
  Gauge,
  ListFilter,
  Loader2,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  TicketPercent,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/axios";
import {
  createIndicator,
  deleteIndicator,
  fetchIndicators,
  updateIndicator,
  type Indicator,
  type IndicatorCategory,
  type IndicatorPayload,
  type IndicatorSource,
} from "@/api/indicator";
import {
  createAdminSubscriptionPlan,
  deactivateAdminSubscriptionPlan,
  getAdminSubscriptionPlans,
  updateAdminSubscriptionPlan,
  type AdminPlanSortBy,
  type SortOrder,
  type SubscriptionPlan,
  type SubscriptionPlanPayload,
} from "@/api/subscription";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

type AdminSection = "plans" | "indicators";
type IndicatorSortBy = "name" | "createdAt";

type PlanDraft = {
  key: string;
  name: string;
  amountUsd: string;
  durationDays: string;
  sortOrder: string;
  features: string;
  isActive: boolean;
  discountIsActive: boolean;
  discountType: "percentage" | "fixed";
  discountValue: string;
  discountLabel: string;
};

type IndicatorDraft = {
  name: string;
  description: string;
  category: IndicatorCategory;
  source: IndicatorSource;
  params: ParamRow[];
};

type ParamType = "number" | "boolean";

type ParamRow = {
  id: string;
  key: string;
  type: ParamType;
  value: string;
};

type DeleteTarget =
  | { type: "plan"; item: SubscriptionPlan }
  | { type: "indicator"; item: Indicator };

type PlanFieldErrors = {
  name?: string;
  sortOrder?: string;
  features?: string;
  discountLabel?: string;
};

type IndicatorFieldErrors = {
  name?: string;
};

type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

const indicatorCategories: IndicatorCategory[] = [
  "trend",
  "momentum",
  "volatility",
  "volume",
  "support_resistance",
];

const indicatorSources: IndicatorSource[] = [
  "open",
  "high",
  "low",
  "close",
  "volume",
];

const paramTypeOptions: DropdownOption<ParamType>[] = [
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
];

const booleanOptions: DropdownOption<"true" | "false">[] = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

const discountTypeOptions: DropdownOption<PlanDraft["discountType"]>[] = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed" },
];

const categoryOptions: DropdownOption<IndicatorCategory>[] =
  indicatorCategories.map((category) => ({
    value: category,
    label: category,
  }));

const sourceOptions: DropdownOption<IndicatorSource>[] = indicatorSources.map(
  (source) => ({
    value: source,
    label: source,
  }),
);

const planSortOptions: DropdownOption<AdminPlanSortBy>[] = [
  { value: "sortOrder", label: "Sort order" },
  { value: "createdAt", label: "Created" },
  { value: "name", label: "Name" },
  { value: "amountUsd", label: "Amount" },
  { value: "durationDays", label: "Duration" },
];

const indicatorSortOptions: DropdownOption<IndicatorSortBy>[] = [
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Created" },
];

const orderOptions: DropdownOption<SortOrder>[] = [
  { value: "asc", label: "Asc" },
  { value: "desc", label: "Desc" },
];

const emptyPlanDraft: PlanDraft = {
  key: "",
  name: "",
  amountUsd: "10",
  durationDays: "30",
  sortOrder: "1",
  features: "",
  isActive: true,
  discountIsActive: false,
  discountType: "percentage",
  discountValue: "0",
  discountLabel: "",
};

const emptyIndicatorDraft: IndicatorDraft = {
  name: "",
  description: "",
  category: "trend",
  source: "close",
  params: [],
};

const adminPlansRequestCache = new Map<
  string,
  ReturnType<typeof getAdminSubscriptionPlans>
>();

const adminIndicatorsRequestCache = new Map<
  string,
  ReturnType<typeof fetchIndicators>
>();

function getCachedAdminPlans(
  params: Parameters<typeof getAdminSubscriptionPlans>[0],
) {
  const cacheKey = JSON.stringify(params);
  const cached = adminPlansRequestCache.get(cacheKey);

  if (cached) return cached;

  const request = getAdminSubscriptionPlans(params).finally(() => {
    adminPlansRequestCache.delete(cacheKey);
  });
  adminPlansRequestCache.set(cacheKey, request);
  return request;
}

function getCachedAdminIndicators(
  params: Parameters<typeof fetchIndicators>[0],
) {
  const cacheKey = JSON.stringify(params);
  const cached = adminIndicatorsRequestCache.get(cacheKey);

  if (cached) return cached;

  const request = fetchIndicators(params).finally(() => {
    adminIndicatorsRequestCache.delete(cacheKey);
  });
  adminIndicatorsRequestCache.set(cacheKey, request);
  return request;
}

function mergeById<T extends { _id: string }>(prev: T[], next: T[]) {
  return Array.from(
    new Map([...prev, ...next].map((item) => [item._id, item])).values(),
  );
}

const createEmptyParamRow = (): ParamRow => ({
  id: crypto.randomUUID(),
  key: "",
  type: "number",
  value: "",
});

function getEmptyIndicatorDraft(): IndicatorDraft {
  return {
    ...emptyIndicatorDraft,
    params: [createEmptyParamRow()],
  };
}

function toDraft(plan: SubscriptionPlan): PlanDraft {
  return {
    key: plan.key,
    name: plan.name,
    amountUsd: String(plan.originalAmountUsd ?? plan.amountUsd),
    durationDays: String(plan.durationDays),
    sortOrder: String(plan.sortOrder),
    features: plan.features.join("\n"),
    isActive: plan.isActive,
    discountIsActive: Boolean(plan.discount?.isActive),
    discountType: plan.discount?.type ?? "percentage",
    discountValue: String(plan.discount?.value ?? 0),
    discountLabel: plan.discount?.label ?? "",
  };
}

function toIndicatorDraft(indicator: Indicator): IndicatorDraft {
  return {
    name: indicator.name,
    description: indicator.description,
    category: indicator.category,
    source: indicator.source,
    params: objectToParamRows(indicator.params || {}),
  };
}

function getParamType(value: number | boolean): ParamType {
  if (typeof value === "number") return "number";
  return "boolean";
}

function objectToParamRows(params: Record<string, number | boolean>) {
  const rows = Object.entries(params).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    type: getParamType(value),
    value: String(value),
  }));

  return rows.length ? rows : [createEmptyParamRow()];
}

function parseParamRows(rows: ParamRow[]) {
  return rows.reduce<Record<string, number | boolean>>((result, row) => {
    const key = row.key.trim();

    if (!key) return result;

    if (row.type === "number") {
      result[key] = Number(row.value || 0);
      return result;
    }

    if (row.type === "boolean") {
      result[key] = row.value === "true";
      return result;
    }
    return result;
  }, {});
}

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = cleaned.split(".");

  if (decimalParts.length === 0) {
    return cleaned;
  }

  return `${integerPart}.${decimalParts.join("")}`;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function isNonNegativeNumber(value: string) {
  return value.trim().length > 0 && Number.isFinite(Number(value));
}

function isNonNegativeInteger(value: string) {
  return /^\d+$/.test(value.trim());
}

function isPlanDraftValid(draft: PlanDraft) {
  const hasValidDiscountValue = draft.discountIsActive
    ? draft.discountValue.trim().length > 0 &&
      Number.isFinite(Number(draft.discountValue))
    : true;

  return (
    draft.name.trim().length >= 2 &&
    draft.name.trim().length <= 20 &&
    isNonNegativeNumber(draft.amountUsd) &&
    isNonNegativeInteger(draft.durationDays) &&
    isNonNegativeInteger(draft.sortOrder) &&
    hasValidDiscountValue &&
    getInvalidFeatureLines(draft.features).length === 0 &&
    draft.discountLabel.trim().length <= 40
  );
}

function getInvalidFeatureLines(features: string) {
  return features
    .split("\n")
    .map((feature, index) => ({
      line: index + 1,
      value: feature.trim(),
    }))
    .filter((feature) => feature.value.length > 100);
}

function getPlanFieldErrors(draft: PlanDraft): PlanFieldErrors {
  const errors: PlanFieldErrors = {};
  const invalidFeatureLines = getInvalidFeatureLines(draft.features);

  if (draft.name.trim().length > 20) {
    errors.name = "Plan name must be 20 characters or fewer.";
  }

  if (invalidFeatureLines.length > 0) {
    const lineNumbers = invalidFeatureLines.map((feature) => feature.line);
    errors.features = `Feature line ${lineNumbers.join(", ")} must be 100 characters or fewer.`;
  }

  if (draft.discountLabel.trim().length > 40) {
    errors.discountLabel = "Discount label must be 40 characters or fewer.";
  }

  return errors;
}

function isIndicatorDraftValid(draft: IndicatorDraft) {
  const name = draft.name.trim();
  const description = draft.description.trim();
  const hasValidName = /^[a-z0-9]{2,20}$/.test(name);
  const hasValidDescription =
    description.length >= 2 && description.length <= 50;
  const hasValidParams = draft.params.every((row) => {
    if (!row.key.trim()) return true;
    if (row.type === "number") {
      return row.value.trim().length > 0 && Number.isFinite(Number(row.value));
    }
    return row.value === "true" || row.value === "false";
  });

  return hasValidName && hasValidDescription && hasValidParams;
}

function buildPlanPayload(draft: PlanDraft): SubscriptionPlanPayload {
  const hasDiscountPayload =
    draft.discountIsActive ||
    draft.discountLabel.trim().length > 0 ||
    Number(draft.discountValue || 0) > 0;

  return {
    name: draft.name.trim(),
    amountUsd: Number(draft.amountUsd),
    durationDays: Number(draft.durationDays),
    sortOrder: Number(draft.sortOrder),
    features: draft.features
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean),
    isActive: draft.isActive,
    ...(hasDiscountPayload
      ? {
          discount: {
            isActive: draft.discountIsActive,
            type: draft.discountType,
            value: Number(draft.discountValue || 0),
            label: draft.discountLabel.trim(),
          },
        }
      : {}),
  };
}

function buildIndicatorPayload(
  draft: IndicatorDraft,
): Required<IndicatorPayload> {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    source: draft.source,
    params: parseParamRows(draft.params),
  };
}

function hasIndicatorDraftChanges(indicator: Indicator, draft: IndicatorDraft) {
  const payload = buildIndicatorPayload(draft);

  if (payload.name !== indicator.name) return true;
  if (payload.description !== indicator.description) return true;
  if (payload.category !== indicator.category) return true;
  if (payload.source !== indicator.source) return true;

  const currentParams = indicator.params || {};
  const nextEntries = Object.entries(payload.params);

  if (nextEntries.length !== Object.keys(currentParams).length) return true;

  return nextEntries.some(([key, value]) => currentParams[key] !== value);
}

function formatAmount(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function getDefaultPlanOrder(sortBy: AdminPlanSortBy): SortOrder {
  if (sortBy === "name") return "asc";
  return "asc";
}

function getDefaultIndicatorOrder(sortBy: IndicatorSortBy): SortOrder {
  return sortBy === "createdAt" ? "desc" : "asc";
}

function DropdownSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selected?.label ?? value}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => onChange(nextValue as T)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SheetFormHeader({
  isMobile,
  title,
  description,
  onPointerDown,
}: {
  isMobile: boolean;
  title: string;
  description: string;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}) {
  return (
    <SheetHeader
      className={
        isMobile ? "border-b px-4 py-4 touch-none" : "border-b px-6 py-5"
      }
      onPointerDown={onPointerDown}
    >
      {isMobile ? (
        <div className="-mt-1 mb-3 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
        </div>
      ) : null}
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
  );
}

function ParamEditor({
  rows,
  onChange,
}: {
  rows: ParamRow[];
  onChange: (rows: ParamRow[]) => void;
}) {
  const updateRow = (rowId: string, patch: Partial<ParamRow>) => {
    onChange(
      rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (rowId: string) => {
    const nextRows = rows.filter((row) => row.id !== rowId);
    onChange(nextRows.length ? nextRows : [createEmptyParamRow()]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-muted-foreground">Params</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, createEmptyParamRow()])}
        >
          Add param
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_auto]"
          >
            <Input
              placeholder="period"
              value={row.key}
              onChange={(event) =>
                updateRow(row.id, { key: event.target.value })
              }
            />
            <DropdownSelect
              value={row.type}
              options={paramTypeOptions}
              onChange={(value) =>
                updateRow(row.id, {
                  type: value,
                  value: value === "boolean" ? "true" : "",
                })
              }
            />
            {row.type === "boolean" ? (
              <DropdownSelect
                value={(row.value || "true") as "true" | "false"}
                options={booleanOptions}
                onChange={(value) => updateRow(row.id, { value })}
              />
            ) : (
              <Input
                type="text"
                inputMode={row.type === "number" ? "decimal" : undefined}
                placeholder="14"
                value={row.value}
                onChange={(event) =>
                  updateRow(row.id, {
                    value:
                      row.type === "number"
                        ? sanitizeDecimalInput(event.target.value)
                        : event.target.value,
                  })
                }
              />
            )}
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeRow(row.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const isMobile = useIsMobile();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const planRequestIdRef = useRef(0);
  const indicatorRequestIdRef = useRef(0);
  const previousPlanSearchRef = useRef("");
  const previousIndicatorSearchRef = useRef("");

  const [activeSection, setActiveSection] = useState<AdminSection>("plans");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planSearch, setPlanSearch] = useState("");
  const [debouncedPlanSearch, setDebouncedPlanSearch] = useState("");
  const [planSortBy, setPlanSortBy] = useState<AdminPlanSortBy>("sortOrder");
  const [planOrder, setPlanOrder] = useState<SortOrder>("asc");
  const [planPage, setPlanPage] = useState(1);
  const [planTotalCount, setPlanTotalCount] = useState(0);
  const [planHasNextPage, setPlanHasNextPage] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [isPlansAppending, setIsPlansAppending] = useState(false);
  const [isPlansSearching, setIsPlansSearching] = useState(false);
  const [planReloadKey, setPlanReloadKey] = useState(0);

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [debouncedIndicatorSearch, setDebouncedIndicatorSearch] = useState("");
  const [indicatorSortBy, setIndicatorSortBy] =
    useState<IndicatorSortBy>("name");
  const [indicatorOrder, setIndicatorOrder] = useState<SortOrder>("asc");
  const [indicatorCategory, setIndicatorCategory] = useState<string>("all");
  const [indicatorPage, setIndicatorPage] = useState(1);
  const [indicatorTotalCount, setIndicatorTotalCount] = useState(0);
  const [indicatorHasNextPage, setIndicatorHasNextPage] = useState(false);
  const [isIndicatorsLoading, setIsIndicatorsLoading] = useState(true);
  const [isIndicatorsAppending, setIsIndicatorsAppending] = useState(false);
  const [isIndicatorsSearching, setIsIndicatorsSearching] = useState(false);
  const [indicatorReloadKey, setIndicatorReloadKey] = useState(0);

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanDraft, setNewPlanDraft] = useState<PlanDraft>(emptyPlanDraft);
  const [newPlanErrors, setNewPlanErrors] = useState<PlanFieldErrors>({});

  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(
    null,
  );
  const [indicatorDraft, setIndicatorDraft] = useState<IndicatorDraft | null>(
    null,
  );
  const [indicatorErrors, setIndicatorErrors] = useState<IndicatorFieldErrors>(
    {},
  );
  const [planErrors, setPlanErrors] = useState<PlanFieldErrors>({});
  const [isCreateIndicatorOpen, setIsCreateIndicatorOpen] = useState(false);
  const [newIndicatorDraft, setNewIndicatorDraft] = useState<IndicatorDraft>(
    getEmptyIndicatorDraft,
  );
  const [newIndicatorErrors, setNewIndicatorErrors] =
    useState<IndicatorFieldErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [isMobileSheetDragging, setIsMobileSheetDragging] = useState(false);
  const mobileSheetDragPointerIdRef = useRef<number | null>(null);
  const mobileSheetDragStartYRef = useRef(0);
  const mobileSheetDragLastYRef = useRef(0);
  const mobileSheetDragOffsetRef = useRef(0);
  const mobileSheetDragFrameRef = useRef<number | null>(null);

  const syncMobileSheetOffset = (nextOffset: number) => {
    mobileSheetDragOffsetRef.current = nextOffset;

    if (mobileSheetDragFrameRef.current !== null) {
      return;
    }

    mobileSheetDragFrameRef.current = requestAnimationFrame(() => {
      mobileSheetDragFrameRef.current = null;
      setMobileSheetDragOffset(mobileSheetDragOffsetRef.current);
    });
  };

  const resetMobileSheetDrag = () => {
    mobileSheetDragPointerIdRef.current = null;
    setIsMobileSheetDragging(false);
    syncMobileSheetOffset(0);
  };

  const closeActiveMobileSheet = () => {
    if (editingIndicator) {
      closeIndicatorDialog(false);
      return;
    }

    if (editingPlan) {
      closePlanDialog(false);
      return;
    }

    if (isCreateIndicatorOpen) {
      setIsCreateIndicatorOpen(false);
      setNewIndicatorDraft(getEmptyIndicatorDraft());
      setNewIndicatorErrors({});
      return;
    }

    if (isCreatePlanOpen) {
      setIsCreatePlanOpen(false);
      setNewPlanDraft(emptyPlanDraft);
      setNewPlanErrors({});
    }
  };

  const beginMobileSheetDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || event.pointerType === "mouse") return;

    mobileSheetDragPointerIdRef.current = event.pointerId;
    mobileSheetDragStartYRef.current = event.clientY;
    mobileSheetDragLastYRef.current = event.clientY;
    setIsMobileSheetDragging(false);
    syncMobileSheetOffset(0);
  };

  const onMobileSheetPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isMobile || mobileSheetDragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - mobileSheetDragStartYRef.current;

    if (deltaY <= 0) {
      if (isMobileSheetDragging || mobileSheetDragOffsetRef.current > 0) {
        setIsMobileSheetDragging(false);
        syncMobileSheetOffset(0);
      }
      return;
    }

    mobileSheetDragLastYRef.current = event.clientY;
    setIsMobileSheetDragging(true);
    syncMobileSheetOffset(deltaY);
    event.preventDefault();
  };

  const endMobileSheetDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (
      event &&
      mobileSheetDragPointerIdRef.current !== null &&
      mobileSheetDragPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const totalDrag = Math.max(
      0,
      mobileSheetDragLastYRef.current - mobileSheetDragStartYRef.current,
    );

    resetMobileSheetDrag();

    if (totalDrag > 120) {
      closeActiveMobileSheet();
    }
  };

  useEffect(() => {
    return () => {
      if (mobileSheetDragFrameRef.current !== null) {
        cancelAnimationFrame(mobileSheetDragFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlanSearch(planSearch.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [planSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIndicatorSearch(indicatorSearch.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [indicatorSearch]);

  useEffect(() => {
    const loadPlans = async () => {
      const requestId = planRequestIdRef.current + 1;
      planRequestIdRef.current = requestId;
      const isSearchTriggeredFetch =
        debouncedPlanSearch !== previousPlanSearchRef.current;

      if (planPage === 1 && isSearchTriggeredFetch) {
        setIsPlansSearching(true);
      } else if (planPage === 1) {
        setIsPlansLoading(true);
      } else {
        setIsPlansAppending(true);
      }

      try {
        const result = await getCachedAdminPlans({
          page: planPage,
          search: debouncedPlanSearch,
          sortBy: planSortBy,
          order: planOrder,
        });

        if (planRequestIdRef.current !== requestId) return;

        const pageItems = result.plans ?? [];

        setPlans((prev) => {
          if (planPage === 1) return pageItems;
          return mergeById(prev, pageItems);
        });
        setPlanTotalCount(result.total ?? 0);
        setPlanHasNextPage(Boolean(result.hasNextPage));
        previousPlanSearchRef.current = debouncedPlanSearch;
      } catch (error) {
        if (planRequestIdRef.current !== requestId) return;
        toast.error(getApiErrorMessage(error, "Failed to load plans."));
      } finally {
        if (planRequestIdRef.current === requestId) {
          setIsPlansLoading(false);
          setIsPlansAppending(false);
          setIsPlansSearching(false);
        }
      }
    };

    void loadPlans();
  }, [planPage, debouncedPlanSearch, planSortBy, planOrder, planReloadKey]);

  useEffect(() => {
    const loadIndicators = async () => {
      const requestId = indicatorRequestIdRef.current + 1;
      indicatorRequestIdRef.current = requestId;
      const isSearchTriggeredFetch =
        debouncedIndicatorSearch !== previousIndicatorSearchRef.current;

      if (indicatorPage === 1 && isSearchTriggeredFetch) {
        setIsIndicatorsSearching(true);
      } else if (indicatorPage === 1) {
        setIsIndicatorsLoading(true);
      } else {
        setIsIndicatorsAppending(true);
      }

      try {
        const response = await getCachedAdminIndicators({
          page: indicatorPage,
          search: debouncedIndicatorSearch,
          sortBy: indicatorSortBy,
          order: indicatorOrder,
          category: indicatorCategory === "all" ? undefined : indicatorCategory,
        });

        if (indicatorRequestIdRef.current !== requestId) return;

        const result = response?.result;
        const pageItems = (result?.indicators ?? []) as Indicator[];

        setIndicators((prev) => {
          if (indicatorPage === 1) return pageItems;
          return mergeById(prev, pageItems);
        });
        setIndicatorTotalCount(result?.total ?? 0);
        setIndicatorHasNextPage(Boolean(result?.hasNextPage));
        previousIndicatorSearchRef.current = debouncedIndicatorSearch;
      } catch (error) {
        if (indicatorRequestIdRef.current !== requestId) return;
        toast.error(getApiErrorMessage(error, "Failed to load indicators."));
      } finally {
        if (indicatorRequestIdRef.current === requestId) {
          setIsIndicatorsLoading(false);
          setIsIndicatorsAppending(false);
          setIsIndicatorsSearching(false);
        }
      }
    };

    void loadIndicators();
  }, [
    indicatorPage,
    debouncedIndicatorSearch,
    indicatorSortBy,
    indicatorOrder,
    indicatorCategory,
    indicatorReloadKey,
  ]);

  useEffect(() => {
    const node = loadMoreRef.current;
    const hasNextPage =
      activeSection === "plans" ? planHasNextPage : indicatorHasNextPage;
    const isLoading =
      activeSection === "plans"
        ? isPlansLoading || isPlansAppending || isPlansSearching
        : isIndicatorsLoading || isIndicatorsAppending || isIndicatorsSearching;
    const searchValue =
      activeSection === "plans" ? planSearch : indicatorSearch;
    const debouncedSearch =
      activeSection === "plans"
        ? debouncedPlanSearch
        : debouncedIndicatorSearch;

    if (!node || !hasNextPage || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (
          !firstEntry?.isIntersecting ||
          searchValue.trim() !== debouncedSearch
        ) {
          return;
        }

        if (activeSection === "plans") {
          setPlanPage((prev) => prev + 1);
          return;
        }

        setIndicatorPage((prev) => prev + 1);
      },
      {
        root: null,
        rootMargin: "220px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    activeSection,
    planHasNextPage,
    indicatorHasNextPage,
    isPlansLoading,
    isPlansAppending,
    isPlansSearching,
    isIndicatorsLoading,
    isIndicatorsAppending,
    isIndicatorsSearching,
    planSearch,
    indicatorSearch,
    debouncedPlanSearch,
    debouncedIndicatorSearch,
  ]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const openPlanDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanDraft(toDraft(plan));
    setPlanErrors({});
  };

  const closePlanDialog = (open: boolean) => {
    if (open || isSaving) return;
    setEditingPlan(null);
    setPlanDraft(null);
    setPlanErrors({});
  };

  const openIndicatorDialog = (indicator: Indicator) => {
    setEditingIndicator(indicator);
    setIndicatorDraft(toIndicatorDraft(indicator));
    setIndicatorErrors({});
  };

  const closeIndicatorDialog = (open: boolean) => {
    if (open || isSaving) return;
    setEditingIndicator(null);
    setIndicatorDraft(null);
    setIndicatorErrors({});
  };

  const savePlan = async () => {
    if (!editingPlan || !planDraft) {
      return;
    }

    const fieldErrors = getPlanFieldErrors(planDraft);
    if (Object.keys(fieldErrors).length > 0) {
      setPlanErrors(fieldErrors);
      return;
    }

    if (!isPlanDraftValid(planDraft)) {
      return;
    }

    setIsSaving(true);
    setPlanErrors({});

    try {
      const data = await updateAdminSubscriptionPlan({
        planId: editingPlan._id,
        payload: buildPlanPayload(planDraft),
      });

      setPlans((current) =>
        current.map((plan) => (plan._id === data.plan._id ? data.plan : plan)),
      );
      setEditingPlan(null);
      setPlanDraft(null);
      toast.success("Plan updated.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (typeof message === "string") {
          if (
            message.includes("Plan name already exists") ||
            message.includes("Generated plan key already exists")
          ) {
            setPlanErrors({ name: message });
          } else if (message.includes("Sort order already exists")) {
            setPlanErrors({ sortOrder: message });
          } else if (message.toLowerCase().includes("discount.label")) {
            setPlanErrors({ discountLabel: message });
          }
        }
      }
      toast.error(getApiErrorMessage(error, "Failed to update plan."));
    } finally {
      setIsSaving(false);
    }
  };

  const createNewPlan = async () => {
    const fieldErrors = getPlanFieldErrors(newPlanDraft);
    if (Object.keys(fieldErrors).length > 0) {
      setNewPlanErrors(fieldErrors);
      return;
    }

    if (!isPlanDraftValid(newPlanDraft)) {
      return;
    }

    setIsSaving(true);
    setNewPlanErrors({});

    try {
      await createAdminSubscriptionPlan(buildPlanPayload(newPlanDraft));

      setIsCreatePlanOpen(false);
      setNewPlanDraft(emptyPlanDraft);
      setPlanPage(1);
      setPlanReloadKey((value) => value + 1);
      setActiveSection("plans");
      toast.success("Plan created.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (typeof message === "string") {
          if (
            message.includes("Plan name already exists") ||
            message.includes("Generated plan key already exists")
          ) {
            setNewPlanErrors({ name: message });
          } else if (message.includes("Sort order already exists")) {
            setNewPlanErrors({ sortOrder: message });
          } else if (message.toLowerCase().includes("discount.label")) {
            setNewPlanErrors({ discountLabel: message });
          }
        }
      }
      toast.error(getApiErrorMessage(error, "Failed to create plan."));
    } finally {
      setIsSaving(false);
    }
  };

  const saveIndicator = async () => {
    if (
      !editingIndicator ||
      !indicatorDraft ||
      !isIndicatorDraftValid(indicatorDraft) ||
      Boolean(indicatorErrors.name)
    ) {
      return;
    }

    setIsSaving(true);
    setIndicatorErrors({});

    try {
      const data = await updateIndicator({
        indicatorId: editingIndicator._id,
        payload: buildIndicatorPayload(indicatorDraft),
      });

      setIndicators((current) =>
        current.map((item) =>
          item._id === data.indicator._id ? data.indicator : item,
        ),
      );
      setEditingIndicator(null);
      setIndicatorDraft(null);
      setIndicatorErrors({});
      toast.success("Indicator updated.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (
          typeof message === "string" &&
          message.includes("Indicator already exists")
        ) {
          setIndicatorErrors({ name: message });
        }
      }
      toast.error(getApiErrorMessage(error, "Failed to update indicator."));
    } finally {
      setIsSaving(false);
    }
  };

  const createNewIndicator = async () => {
    if (
      !isIndicatorDraftValid(newIndicatorDraft) ||
      Boolean(newIndicatorErrors.name)
    ) {
      return;
    }

    setIsSaving(true);
    setNewIndicatorErrors({});

    try {
      await createIndicator(buildIndicatorPayload(newIndicatorDraft));

      setIsCreateIndicatorOpen(false);
      setNewIndicatorDraft(getEmptyIndicatorDraft());
      setNewIndicatorErrors({});
      setIndicatorPage(1);
      setIndicatorReloadKey((value) => value + 1);
      setActiveSection("indicators");
      toast.success("Indicator created.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (
          typeof message === "string" &&
          message.includes("Indicator already exists")
        ) {
          setNewIndicatorErrors({ name: message });
        }
      }
      toast.error(getApiErrorMessage(error, "Failed to create indicator."));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      if (deleteTarget.type === "plan") {
        await deactivateAdminSubscriptionPlan(deleteTarget.item._id);
        setPlanReloadKey((value) => value + 1);
        toast.success("Plan deactivated.");
      } else {
        await deleteIndicator(deleteTarget.item._id);
        setIndicatorReloadKey((value) => value + 1);
        toast.success("Indicator deleted.");
      }

      setDeleteTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete item."));
    } finally {
      setIsDeleting(false);
    }
  };

  const isPlanSearchPending = planSearch.trim() !== debouncedPlanSearch;
  const isIndicatorSearchPending =
    indicatorSearch.trim() !== debouncedIndicatorSearch;
  const planListStatus =
    isPlanSearchPending || isPlansSearching
      ? "searching"
      : isPlansLoading
        ? "loading"
        : null;
  const indicatorListStatus =
    isIndicatorSearchPending || isIndicatorsSearching
      ? "searching"
      : isIndicatorsLoading
        ? "loading"
        : null;
  const activeTotalCount =
    activeSection === "plans" ? planTotalCount : indicatorTotalCount;
  const activeIsAppending =
    activeSection === "plans" ? isPlansAppending : isIndicatorsAppending;
  const activeHasNextPage =
    activeSection === "plans" ? planHasNextPage : indicatorHasNextPage;
  const editorSheetSide = isMobile ? "bottom" : "right";
  const canCreatePlan = isPlanDraftValid(newPlanDraft);
  const canSavePlan = planDraft ? isPlanDraftValid(planDraft) : false;
  const canCreateIndicator =
    isIndicatorDraftValid(newIndicatorDraft) && !newIndicatorErrors.name;
  const canSaveIndicator = indicatorDraft
    ? isIndicatorDraftValid(indicatorDraft) &&
      !indicatorErrors.name &&
      Boolean(
        editingIndicator &&
        hasIndicatorDraftChanges(editingIndicator, indicatorDraft),
      )
    : false;

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <Card className="min-w-0 border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
                Admin
              </span>
              <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
                <ShieldCheck className="size-5 text-primary" />
                Dashboard
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 text-sm leading-6">
                Manage subscription plans and indicator definitions.
                <span className="hidden items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground md:inline-flex">
                  {activeTotalCount} results
                </span>
              </CardDescription>
              <div className="pt-1 md:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {activeTotalCount} results
                </span>
              </div>
            </div>
          </div>

          <Tabs
            value={activeSection}
            onValueChange={(value) => setActiveSection(value as AdminSection)}
          >
            <div className="flex flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between">
              <TabsList
                variant="line"
                className="w-full justify-start md:w-auto"
              >
                <TabsTrigger
                  value="plans"
                  aria-label="Plans"
                  className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                >
                  <TicketPercent className="size-4" />
                  <span className="hidden group-data-[state=active]:inline md:inline">
                    Plans
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="indicators"
                  aria-label="Indicators"
                  className="group gap-2 data-[state=active]:text-primary data-[state=active]:after:bg-primary dark:data-[state=active]:text-primary dark:data-[state=active]:after:bg-primary"
                >
                  <Gauge className="size-4" />
                  <span className="hidden group-data-[state=active]:inline md:inline">
                    Indicators
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="flex w-full min-w-0 flex-col gap-2 md:max-w-[420px] md:flex-1 md:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={
                      activeSection === "plans" ? planSearch : indicatorSearch
                    }
                    onChange={(event) => {
                      if (activeSection === "plans") {
                        setPlanSearch(event.target.value);
                        setPlanPage(1);
                        return;
                      }

                      setIndicatorSearch(event.target.value);
                      setIndicatorPage(1);
                    }}
                    placeholder={
                      activeSection === "plans"
                        ? "Search plans"
                        : "Search indicators"
                    }
                    className="rounded-md border-0 border-b-2 border-foreground/15 bg-muted/60 pr-10 pl-9 focus-visible:border-primary focus-visible:ring-0 dark:bg-input/30"
                  />
                  <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7"
                        >
                          <ListFilter className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {activeSection === "plans" ? (
                          <>
                            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={planSortBy}
                              onValueChange={(value) => {
                                const nextSortBy = value as AdminPlanSortBy;
                                setPlanSortBy(nextSortBy);
                                setPlanOrder(getDefaultPlanOrder(nextSortBy));
                                setPlanPage(1);
                              }}
                            >
                              {planSortOptions.map((option) => (
                                <DropdownMenuRadioItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Order</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={planOrder}
                              onValueChange={(value) => {
                                setPlanOrder(value as SortOrder);
                                setPlanPage(1);
                              }}
                            >
                              {orderOptions.map((option) => (
                                <DropdownMenuRadioItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </>
                        ) : (
                          <>
                            <DropdownMenuLabel>Category</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={indicatorCategory}
                              onValueChange={(value) => {
                                setIndicatorCategory(value);
                                setIndicatorPage(1);
                              }}
                            >
                              <DropdownMenuRadioItem value="all">
                                All
                              </DropdownMenuRadioItem>
                              {categoryOptions.map((option) => (
                                <DropdownMenuRadioItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={indicatorSortBy}
                              onValueChange={(value) => {
                                const nextSortBy = value as IndicatorSortBy;
                                setIndicatorSortBy(nextSortBy);
                                setIndicatorOrder(
                                  getDefaultIndicatorOrder(nextSortBy),
                                );
                                setIndicatorPage(1);
                              }}
                            >
                              {indicatorSortOptions.map((option) => (
                                <DropdownMenuRadioItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Order</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={indicatorOrder}
                              onValueChange={(value) => {
                                setIndicatorOrder(value as SortOrder);
                                setIndicatorPage(1);
                              }}
                            >
                              {orderOptions.map((option) => (
                                <DropdownMenuRadioItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <Button
                  className="md:w-auto"
                  onClick={() => {
                    if (activeSection === "plans") {
                      setIsCreatePlanOpen(true);
                      return;
                    }

                    setIsCreateIndicatorOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  {activeSection === "plans" ? "New plan" : "New indicator"}
                </Button>
              </div>
            </div>
          </Tabs>
        </CardHeader>
      </Card>

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as AdminSection)}
      >
        <TabsContent value="plans" className="space-y-3">
          {planListStatus ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              {planListStatus === "searching" ? (
                <>
                  <Search className="size-4 animate-pulse" />
                  <span>Searching plans....</span>
                </>
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading plans....</span>
                </>
              )}
            </div>
          ) : plans.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {planSearch.trim()
                ? "No plans matched your search."
                : "No plans found."}
            </div>
          ) : (
            <>
              {plans.map((plan) => (
                <Card key={plan._id} className="border-border/70">
                  <CardContent>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">
                            {plan.name}
                          </CardTitle>
                          <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">
                            {plan.key}
                          </span>
                          <span className="rounded-md border px-2 py-1 text-[11px] font-medium">
                            {plan.isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            Sort {plan.sortOrder}
                          </span>
                        </div>
                        <CardDescription>
                          {formatAmount(plan.amountUsd)} USDT /{" "}
                          {plan.durationDays} days
                          {plan.hasDiscount
                            ? ` - ${formatAmount(plan.discountAmountUsd)} off`
                            : ""}
                        </CardDescription>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {plan.features.join(", ") || "No features set."}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Edit plan"
                          title="Edit plan"
                          onClick={() => openPlanDialog(plan)}
                        >
                          <Settings2 className="size-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Deactivate plan"
                          title="Deactivate plan"
                          disabled={plan.key === "free" || !plan.isActive}
                          onClick={() =>
                            setDeleteTarget({ type: "plan", item: plan })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="indicators" className="space-y-3">
          {indicatorListStatus ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              {indicatorListStatus === "searching" ? (
                <>
                  <Search className="size-4 animate-pulse" />
                  <span>Searching indicators....</span>
                </>
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading indicators....</span>
                </>
              )}
            </div>
          ) : indicators.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {indicatorSearch.trim()
                ? "No indicators matched your search."
                : "No indicators found."}
            </div>
          ) : (
            <>
              {indicators.map((indicator) => (
                <Card key={indicator._id} className="border-border/70">
                  <CardContent>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">
                            {indicator.name}
                          </CardTitle>
                          <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {indicator.category}
                          </span>
                          <span className="rounded-md border px-2 py-1 text-[11px] font-medium">
                            {indicator.source}
                          </span>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {indicator.description || "No description."}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground">
                          {Object.keys(indicator.params || {}).length} params
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Edit indicator"
                          title="Edit indicator"
                          onClick={() => openIndicatorDialog(indicator)}
                        >
                          <Settings2 className="size-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Delete indicator"
                          title="Delete indicator"
                          onClick={() =>
                            setDeleteTarget({
                              type: "indicator",
                              item: indicator,
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {activeHasNextPage ? (
        <div ref={loadMoreRef} className="h-1 w-full" />
      ) : null}

      <div className="flex h-10 items-center justify-center">
        {activeIsAppending ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {activeSection === "plans"
              ? "Loading more plans..."
              : "Loading more indicators..."}
          </span>
        ) : null}
      </div>

      <Sheet
        open={isCreatePlanOpen}
        onOpenChange={(open) => {
          if (isSaving) return;
          setIsCreatePlanOpen(open);
          if (!open) {
            setNewPlanDraft(emptyPlanDraft);
            setNewPlanErrors({});
          }
        }}
      >
        <SheetContent
          side={editorSheetSide}
          showCloseButton={!isMobile}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerMove={onMobileSheetPointerMove}
          onPointerUp={endMobileSheetDrag}
          onPointerCancel={endMobileSheetDrag}
          className={
            isMobile
              ? "gap-0 h-auto max-h-[82vh] w-full rounded-t-2xl p-0"
              : "gap-0 p-0 data-[side=right]:w-full md:data-[side=right]:max-w-2xl"
          }
          style={
            isMobile
              ? {
                  transform: `translate3d(0, ${mobileSheetDragOffset}px, 0)`,
                  willChange: "transform",
                  transition: isMobileSheetDragging
                    ? "none"
                    : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }
              : undefined
          }
        >
          <SheetFormHeader
            isMobile={isMobile}
            title="New plan"
            description="Add a subscription plan for Pricing."
            onPointerDown={isMobile ? beginMobileSheetDrag : undefined}
          />

          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-4">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Show this plan on Pricing.
                  </p>
                </div>
                <Switch
                  checked={newPlanDraft.isActive}
                  onCheckedChange={(checked) =>
                    setNewPlanDraft({ ...newPlanDraft, isActive: checked })
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <Input
                    value={newPlanDraft.name}
                    placeholder="Starter Pro"
                    aria-invalid={Boolean(newPlanErrors.name)}
                    onChange={(event) => {
                      const name = event.target.value;
                      setNewPlanErrors((current) => ({
                        ...current,
                        name:
                          name.trim().length > 20
                            ? "Plan name must be 20 characters or fewer."
                            : undefined,
                      }));
                      setNewPlanDraft({
                        ...newPlanDraft,
                        name,
                      });
                    }}
                  />
                  {newPlanErrors.name ? (
                    <p className="text-xs text-destructive">
                      {newPlanErrors.name}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Amount USDT</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={newPlanDraft.amountUsd}
                    placeholder="29.99"
                    onChange={(event) =>
                      setNewPlanDraft({
                        ...newPlanDraft,
                        amountUsd: sanitizeDecimalInput(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Days</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newPlanDraft.durationDays}
                    placeholder="30"
                    onChange={(event) =>
                      setNewPlanDraft({
                        ...newPlanDraft,
                        durationDays: sanitizeIntegerInput(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Sort</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newPlanDraft.sortOrder}
                    placeholder="3"
                    aria-invalid={Boolean(newPlanErrors.sortOrder)}
                    onChange={(event) => {
                      if (newPlanErrors.sortOrder) {
                        setNewPlanErrors((current) => ({
                          ...current,
                          sortOrder: undefined,
                        }));
                      }
                      setNewPlanDraft({
                        ...newPlanDraft,
                        sortOrder: sanitizeIntegerInput(event.target.value),
                      });
                    }}
                  />
                  {newPlanErrors.sortOrder ? (
                    <p className="text-xs text-destructive">
                      {newPlanErrors.sortOrder}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-muted-foreground">Features</Label>
                  <span className="text-xs text-muted-foreground">
                    One feature per line
                  </span>
                </div>
                <div
                  className={cn(
                    "overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-input/30",
                    newPlanErrors.features &&
                      "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
                  )}
                >
                  <ScrollArea className="h-24">
                    <Textarea
                      className="min-h-24 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                      value={newPlanDraft.features}
                      placeholder={
                        "Advanced analytics\nPriority support\nUnlimited exports"
                      }
                      aria-invalid={Boolean(newPlanErrors.features)}
                      onChange={(event) => {
                        const features = event.target.value;
                        const invalidFeatureLines =
                          getInvalidFeatureLines(features);
                        setNewPlanErrors((current) => ({
                          ...current,
                          features:
                            invalidFeatureLines.length > 0
                              ? `Feature line ${invalidFeatureLines
                                  .map((feature) => feature.line)
                                  .join(", ")} must be 100 characters or fewer.`
                              : undefined,
                        }));
                        setNewPlanDraft({
                          ...newPlanDraft,
                          features,
                        });
                      }}
                      rows={4}
                    />
                  </ScrollArea>
                </div>
                {newPlanErrors.features ? (
                  <p className="text-xs text-destructive">
                    {newPlanErrors.features}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Discount</p>
                    <p className="text-xs text-muted-foreground">
                      Shown as a discount badge.
                    </p>
                  </div>
                  <Switch
                    checked={newPlanDraft.discountIsActive}
                    onCheckedChange={(checked) =>
                      setNewPlanDraft({
                        ...newPlanDraft,
                        discountIsActive: checked,
                      })
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Type</Label>
                    <DropdownSelect
                      value={newPlanDraft.discountType}
                      options={discountTypeOptions}
                      onChange={(value) =>
                        setNewPlanDraft({
                          ...newPlanDraft,
                          discountType: value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Value</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={newPlanDraft.discountValue}
                      placeholder="10"
                      onChange={(event) =>
                        setNewPlanDraft({
                          ...newPlanDraft,
                          discountValue: sanitizeDecimalInput(
                            event.target.value,
                          ),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Label</Label>
                  <Input
                    value={newPlanDraft.discountLabel}
                    placeholder="Launch discount"
                    aria-invalid={Boolean(newPlanErrors.discountLabel)}
                    onChange={(event) => {
                      const discountLabel = event.target.value;
                      setNewPlanErrors((current) => ({
                        ...current,
                        discountLabel:
                          discountLabel.trim().length > 40
                            ? "Discount label must be 40 characters or fewer."
                            : undefined,
                      }));
                      setNewPlanDraft({
                        ...newPlanDraft,
                        discountLabel,
                      });
                    }}
                  />
                  {newPlanErrors.discountLabel ? (
                    <p className="text-xs text-destructive">
                      {newPlanErrors.discountLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t px-4 pt-4 pb-6 md:px-6">
            <Button
              onClick={() => void createNewPlan()}
              disabled={isSaving || !canCreatePlan}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => setIsCreatePlanOpen(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(editingPlan)} onOpenChange={closePlanDialog}>
        <SheetContent
          side={editorSheetSide}
          showCloseButton={!isMobile}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerMove={onMobileSheetPointerMove}
          onPointerUp={endMobileSheetDrag}
          onPointerCancel={endMobileSheetDrag}
          className={
            isMobile
              ? "gap-0 h-auto max-h-[82vh] w-full rounded-t-2xl p-0"
              : "gap-0 p-0 data-[side=right]:w-full md:data-[side=right]:max-w-2xl"
          }
          style={
            isMobile
              ? {
                  transform: `translate3d(0, ${mobileSheetDragOffset}px, 0)`,
                  willChange: "transform",
                  transition: isMobileSheetDragging
                    ? "none"
                    : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }
              : undefined
          }
        >
          <SheetFormHeader
            isMobile={isMobile}
            title="Edit plan"
            description="Changes affect future checkouts only."
            onPointerDown={isMobile ? beginMobileSheetDrag : undefined}
          />

          {planDraft ? (
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-4">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">
                      Show this plan on Pricing.
                    </p>
                  </div>
                  <Switch
                    checked={planDraft.isActive}
                    onCheckedChange={(checked) =>
                      setPlanDraft({ ...planDraft, isActive: checked })
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Name</Label>
                    <Input
                      value={planDraft.name}
                      placeholder="Starter Pro"
                      aria-invalid={Boolean(planErrors.name)}
                      onChange={(event) => {
                        const name = event.target.value;
                        setPlanErrors((current) => ({
                          ...current,
                          name:
                            name.trim().length > 20
                              ? "Plan name must be 20 characters or fewer."
                              : undefined,
                        }));
                        setPlanDraft({
                          ...planDraft,
                          name,
                        });
                      }}
                    />
                    {planErrors.name ? (
                      <p className="text-xs text-destructive">
                        {planErrors.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Sort</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={planDraft.sortOrder}
                      placeholder="3"
                      aria-invalid={Boolean(planErrors.sortOrder)}
                      onChange={(event) => {
                        if (planErrors.sortOrder) {
                          setPlanErrors((current) => ({
                            ...current,
                            sortOrder: undefined,
                          }));
                        }
                        setPlanDraft({
                          ...planDraft,
                          sortOrder: sanitizeIntegerInput(event.target.value),
                        });
                      }}
                    />
                    {planErrors.sortOrder ? (
                      <p className="text-xs text-destructive">
                        {planErrors.sortOrder}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Amount USDT</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={planDraft.amountUsd}
                      placeholder="29.99"
                      onChange={(event) =>
                        setPlanDraft({
                          ...planDraft,
                          amountUsd: sanitizeDecimalInput(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Days</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={planDraft.durationDays}
                      placeholder="30"
                      onChange={(event) =>
                        setPlanDraft({
                          ...planDraft,
                          durationDays: sanitizeIntegerInput(
                            event.target.value,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Sort</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={planDraft.sortOrder}
                      placeholder="3"
                      onChange={(event) =>
                        setPlanDraft({
                          ...planDraft,
                          sortOrder: sanitizeIntegerInput(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="pb-4 text-sm text-muted-foreground">
                  Generated key:{" "}
                  <span className="font-medium text-foreground">
                    {planDraft.key}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-muted-foreground">Features</Label>
                    <span className="text-xs text-muted-foreground">
                      One feature per line
                    </span>
                  </div>
                  <div
                    className={cn(
                      "overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-input/30",
                      planErrors.features &&
                        "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
                    )}
                  >
                    <ScrollArea className="h-24">
                      <Textarea
                        className="min-h-24 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                        value={planDraft.features}
                        placeholder={
                          "Advanced analytics\nPriority support\nUnlimited exports"
                        }
                        aria-invalid={Boolean(planErrors.features)}
                        onChange={(event) => {
                          const features = event.target.value;
                          const invalidFeatureLines =
                            getInvalidFeatureLines(features);
                          setPlanErrors((current) => ({
                            ...current,
                            features:
                              invalidFeatureLines.length > 0
                                ? `Feature line ${invalidFeatureLines
                                    .map((feature) => feature.line)
                                    .join(
                                      ", ",
                                    )} must be 100 characters or fewer.`
                                : undefined,
                          }));
                          setPlanDraft({
                            ...planDraft,
                            features,
                          });
                        }}
                        rows={4}
                      />
                    </ScrollArea>
                  </div>
                  {planErrors.features ? (
                    <p className="text-xs text-destructive">
                      {planErrors.features}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Discount</p>
                      <p className="text-xs text-muted-foreground">
                        Shown as a discount badge.
                      </p>
                    </div>
                    <Switch
                      checked={planDraft.discountIsActive}
                      onCheckedChange={(checked) =>
                        setPlanDraft({
                          ...planDraft,
                          discountIsActive: checked,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Type</Label>
                      <DropdownSelect
                        value={planDraft.discountType}
                        options={discountTypeOptions}
                        onChange={(value) =>
                          setPlanDraft({
                            ...planDraft,
                            discountType: value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Value</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={planDraft.discountValue}
                        placeholder="10"
                        onChange={(event) =>
                          setPlanDraft({
                            ...planDraft,
                            discountValue: sanitizeDecimalInput(
                              event.target.value,
                            ),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Label</Label>
                    <Input
                      value={planDraft.discountLabel}
                      placeholder="Launch discount"
                      aria-invalid={Boolean(planErrors.discountLabel)}
                      onChange={(event) => {
                        const discountLabel = event.target.value;
                        setPlanErrors((current) => ({
                          ...current,
                          discountLabel:
                            discountLabel.trim().length > 40
                              ? "Discount label must be 40 characters or fewer."
                              : undefined,
                        }));
                        setPlanDraft({
                          ...planDraft,
                          discountLabel,
                        });
                      }}
                    />
                    {planErrors.discountLabel ? (
                      <p className="text-xs text-destructive">
                        {planErrors.discountLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <SheetFooter className="border-t px-4 pt-4 pb-6 md:px-6">
            <Button
              onClick={() => void savePlan()}
              disabled={isSaving || !canSavePlan}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => closePlanDialog(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editingIndicator)}
        onOpenChange={closeIndicatorDialog}
      >
        <SheetContent
          side={editorSheetSide}
          showCloseButton={!isMobile}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerMove={onMobileSheetPointerMove}
          onPointerUp={endMobileSheetDrag}
          onPointerCancel={endMobileSheetDrag}
          className={
            isMobile
              ? "gap-0 h-auto max-h-[82vh] w-full rounded-t-2xl p-0"
              : "gap-0 p-0 data-[side=right]:w-full md:data-[side=right]:max-w-2xl"
          }
          style={
            isMobile
              ? {
                  transform: `translate3d(0, ${mobileSheetDragOffset}px, 0)`,
                  willChange: "transform",
                  transition: isMobileSheetDragging
                    ? "none"
                    : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }
              : undefined
          }
        >
          <SheetFormHeader
            isMobile={isMobile}
            title="Edit indicator"
            description="Update the indicator definition and params."
            onPointerDown={isMobile ? beginMobileSheetDrag : undefined}
          />

          {indicatorDraft ? (
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Name</Label>
                    <Input
                      value={indicatorDraft.name}
                      placeholder="ema"
                      aria-invalid={Boolean(indicatorErrors.name)}
                      onChange={(event) => {
                        if (indicatorErrors.name) {
                          setIndicatorErrors((current) => ({
                            ...current,
                            name: undefined,
                          }));
                        }
                        setIndicatorDraft({
                          ...indicatorDraft,
                          name: event.target.value,
                        });
                      }}
                    />
                    {indicatorErrors.name ? (
                      <p className="text-xs text-destructive">
                        {indicatorErrors.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <Input
                      value={indicatorDraft.description}
                      placeholder="Exponential Moving Average"
                      onChange={(event) =>
                        setIndicatorDraft({
                          ...indicatorDraft,
                          description: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Category</Label>
                    <DropdownSelect
                      value={indicatorDraft.category}
                      options={categoryOptions}
                      onChange={(value) =>
                        setIndicatorDraft({
                          ...indicatorDraft,
                          category: value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Source</Label>
                    <DropdownSelect
                      value={indicatorDraft.source}
                      options={sourceOptions}
                      onChange={(value) =>
                        setIndicatorDraft({
                          ...indicatorDraft,
                          source: value,
                        })
                      }
                    />
                  </div>
                </div>

                <ParamEditor
                  rows={indicatorDraft.params}
                  onChange={(params) =>
                    setIndicatorDraft({ ...indicatorDraft, params })
                  }
                />
              </div>
            </div>
          ) : null}

          <SheetFooter className="border-t px-4 pt-4 pb-6 md:px-6">
            <Button
              onClick={() => void saveIndicator()}
              disabled={isSaving || !canSaveIndicator}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => closeIndicatorDialog(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isCreateIndicatorOpen}
        onOpenChange={(open) => {
          if (isSaving) return;
          setIsCreateIndicatorOpen(open);
          if (!open) {
            setNewIndicatorDraft(getEmptyIndicatorDraft());
            setNewIndicatorErrors({});
          }
        }}
      >
        <SheetContent
          side={editorSheetSide}
          showCloseButton={!isMobile}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerMove={onMobileSheetPointerMove}
          onPointerUp={endMobileSheetDrag}
          onPointerCancel={endMobileSheetDrag}
          className={
            isMobile
              ? "gap-0 h-auto max-h-[82vh] w-full rounded-t-2xl p-0"
              : "gap-0 p-0 data-[side=right]:w-full md:data-[side=right]:max-w-2xl"
          }
          style={
            isMobile
              ? {
                  transform: `translate3d(0, ${mobileSheetDragOffset}px, 0)`,
                  willChange: "transform",
                  transition: isMobileSheetDragging
                    ? "none"
                    : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                }
              : undefined
          }
        >
          <SheetFormHeader
            isMobile={isMobile}
            title="New indicator"
            description="Add a reusable indicator definition."
            onPointerDown={isMobile ? beginMobileSheetDrag : undefined}
          />

          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <Input
                    value={newIndicatorDraft.name}
                    placeholder="ema"
                    aria-invalid={Boolean(newIndicatorErrors.name)}
                    onChange={(event) => {
                      if (newIndicatorErrors.name) {
                        setNewIndicatorErrors((current) => ({
                          ...current,
                          name: undefined,
                        }));
                      }
                      setNewIndicatorDraft({
                        ...newIndicatorDraft,
                        name: event.target.value,
                      });
                    }}
                  />
                  {newIndicatorErrors.name ? (
                    <p className="text-xs text-destructive">
                      {newIndicatorErrors.name}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <Input
                    value={newIndicatorDraft.description}
                    placeholder="Exponential Moving Average"
                    onChange={(event) =>
                      setNewIndicatorDraft({
                        ...newIndicatorDraft,
                        description: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Category</Label>
                  <DropdownSelect
                    value={newIndicatorDraft.category}
                    options={categoryOptions}
                    onChange={(value) =>
                      setNewIndicatorDraft({
                        ...newIndicatorDraft,
                        category: value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Source</Label>
                  <DropdownSelect
                    value={newIndicatorDraft.source}
                    options={sourceOptions}
                    onChange={(value) =>
                      setNewIndicatorDraft({
                        ...newIndicatorDraft,
                        source: value,
                      })
                    }
                  />
                </div>
              </div>

              <ParamEditor
                rows={newIndicatorDraft.params}
                onChange={(params) =>
                  setNewIndicatorDraft({ ...newIndicatorDraft, params })
                }
              />
            </div>
          </div>

          <SheetFooter className="border-t px-4 pt-4 pb-6 md:px-6">
            <Button
              onClick={() => void createNewIndicator()}
              disabled={isSaving || !canCreateIndicator}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => setIsCreateIndicatorOpen(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "plan"
                ? "Deactivate plan?"
                : "Delete indicator?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "plan"
                ? "This plan will be hidden from future checkouts while existing subscription history stays intact."
                : "This item will be removed from the admin list immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="relative min-w-20 justify-center !bg-destructive !text-white hover:!bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : deleteTarget?.type === "plan" ? (
                "Deactivate"
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
