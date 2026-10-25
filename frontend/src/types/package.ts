export type PackageItem = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  price: string | number;
  totalCapacity: number;
  availableSlots: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PackageListResponse = {
  data: PackageItem[];
  total: number;
  page: number;
  pageSize: number;
};
