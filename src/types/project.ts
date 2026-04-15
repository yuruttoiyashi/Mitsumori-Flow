export type ProjectStatus =
  | "inquiry"
  | "quoted"
  | "ordered"
  | "in_progress"
  | "delivered"
  | "closed"
  | "cancelled";

export type Project = {
  id: string;
  userId: string;
  clientId: string;
  title: string;
  description: string;
  status: ProjectStatus;
  estimateAmount: number;
  finalAmount: number;
  inquiryDate: unknown | null;
  dueDate: unknown | null;
  deliveryDate: unknown | null;
  quoteNote: string;
  internalNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ProjectFormValues = {
  clientId: string;
  title: string;
  description: string;
  status: ProjectStatus;
  estimateAmount: string;
  finalAmount: string;
  inquiryDate: string;
  dueDate: string;
  deliveryDate: string;
  quoteNote: string;
  internalNote: string;
};

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "inquiry", label: "問い合わせ" },
  { value: "quoted", label: "見積提出済み" },
  { value: "ordered", label: "受注" },
  { value: "in_progress", label: "対応中" },
  { value: "delivered", label: "納品済み" },
  { value: "closed", label: "完了" },
  { value: "cancelled", label: "キャンセル" },
];