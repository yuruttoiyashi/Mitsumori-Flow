export type Client = {
  id: string;
  userId: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  memo: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ClientFormValues = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  memo: string;
};