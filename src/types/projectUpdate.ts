export type ProjectUpdateType =
  | "estimate_sent"
  | "first_draft"
  | "revision"
  | "delivered"
  | "note";

export type ProjectUpdate = {
  id: string;
  userId: string;
  type: ProjectUpdateType;
  body: string;
  createdAt?: unknown;
};

export const PROJECT_UPDATE_TYPE_OPTIONS: {
  value: ProjectUpdateType;
  label: string;
}[] = [
  { value: "estimate_sent", label: "見積送付" },
  { value: "first_draft", label: "初稿提出" },
  { value: "revision", label: "修正対応" },
  { value: "delivered", label: "納品" },
  { value: "note", label: "メモ" },
];