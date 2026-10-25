export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type ReservationCustomer = {
  id: string;
  email: string;
};

export type ReservationPackage = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  price: string | number;
  totalCapacity: number;
  availableSlots: number;
};

export type ReservationItem = {
  id: string;
  customerId: string;
  createdById: string;
  packageId: string;
  travelerCount: number;
  unitPrice: string | number;
  totalAmount: string | number;
  paymentStatus: PaymentStatus;
  destination: string;
  customerEmail: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: ReservationCustomer;
  package?: ReservationPackage;
};

export type ReservationListResponse = {
  data: ReservationItem[];
  total: number;
  page: number;
  pageSize: number;
};
