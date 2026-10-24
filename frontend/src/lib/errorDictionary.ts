export const ErrorReason = {
  InvalidEmailOrPassword: 'InvalidEmailOrPassword',
  ValidBearerTokenRequired: 'ValidBearerTokenRequired',
  InvalidBearerTokenPayload: 'InvalidBearerTokenPayload',
  InvalidOrExpiredBearerToken: 'InvalidOrExpiredBearerToken',
  Forbidden: 'Forbidden',
  CustomerOnlyReserveSelf: 'CustomerOnlyReserveSelf',
  AdminAgentMustProvideCustomerId: 'AdminAgentMustProvideCustomerId',
  ReservationsOnlyForCustomers: 'ReservationsOnlyForCustomers',
  CustomerNotFound: 'CustomerNotFound',
  PackageNotFound: 'PackageNotFound',
  NotEnoughAvailableSlots: 'NotEnoughAvailableSlots',
  ReservationTotalExceedsLimit: 'ReservationTotalExceedsLimit',
  ReservationNotFound: 'ReservationNotFound',
  CustomersMayOnlyCancelReservations: 'CustomersMayOnlyCancelReservations',
  OnlyPendingReservationsCanBePaid: 'OnlyPendingReservationsCanBePaid',
  ReservationPaymentStatusCannotResetToPending: 'ReservationPaymentStatusCannotResetToPending',
  CancelledReservationsCannotBeReopened: 'CancelledReservationsCannotBeReopened',
  PackageAssociatedReservationNotFound: 'PackageAssociatedReservationNotFound',
  CancellationWouldExceedPackageCapacity: 'CancellationWouldExceedPackageCapacity',
  YouCannotAccessAnotherCustomerReservation: 'YouCannotAccessAnotherCustomerReservation',
  EndDateBeforeStartDate: 'EndDateBeforeStartDate',
  TotalCapacityCannotBeLowerThanReserved: 'TotalCapacityCannotBeLowerThanReserved',
  PackageWithReservationsCannotBeDeleted: 'PackageWithReservationsCannotBeDeleted',
  Unauthorized: 'Unauthorized',
  NotFound: 'NotFound',
  Conflict: 'Conflict',
  BadRequest: 'BadRequest',
} as const;

// In a real-world project, this would be defined in a "shared" package or folder.
// Since the frontend and backend typically do not share a common file in this type of testing,
// the code is duplicated to avoid spending time setting up a shared workspace.

export type ErrorReasonValue = (typeof ErrorReason)[keyof typeof ErrorReason];

export const errorReasonMessages: Record<ErrorReasonValue, string> = {
  [ErrorReason.InvalidEmailOrPassword]: 'Credenciales inválidas. Verifica tu email y contraseña.',
  [ErrorReason.ValidBearerTokenRequired]: 'Se requiere un token de acceso válido.',
  [ErrorReason.InvalidBearerTokenPayload]: 'El token de acceso no tiene un contenido válido.',
  [ErrorReason.InvalidOrExpiredBearerToken]: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  [ErrorReason.Forbidden]: 'No tienes permisos para realizar esta acción.',
  [ErrorReason.CustomerOnlyReserveSelf]: 'Los clientes solo pueden reservar para sí mismos.',
  [ErrorReason.AdminAgentMustProvideCustomerId]: 'Los administradores y agentes deben indicar el cliente asociado.',
  [ErrorReason.ReservationsOnlyForCustomers]: 'Las reservaciones solo pueden crearse para clientes.',
  [ErrorReason.CustomerNotFound]: 'No se encontró el cliente indicado.',
  [ErrorReason.PackageNotFound]: 'No se encontró el paquete solicitado.',
  [ErrorReason.NotEnoughAvailableSlots]: 'No hay cupo suficiente para la cantidad solicitada.',
  [ErrorReason.ReservationTotalExceedsLimit]: 'El total de la reservación supera el monto máximo permitido.',
  [ErrorReason.ReservationNotFound]: 'No se encontró la reservación solicitada.',
  [ErrorReason.CustomersMayOnlyCancelReservations]: 'Los clientes solo pueden cancelar sus propias reservaciones.',
  [ErrorReason.OnlyPendingReservationsCanBePaid]: 'Solo las reservaciones pendientes pueden marcarse como pagadas.',
  [ErrorReason.ReservationPaymentStatusCannotResetToPending]: 'El estado de pago no puede volver a pendiente.',
  [ErrorReason.CancelledReservationsCannotBeReopened]: 'Las reservaciones canceladas no pueden reabrirse.',
  [ErrorReason.PackageAssociatedReservationNotFound]: 'No se encontró el paquete asociado a la reserva.',
  [ErrorReason.CancellationWouldExceedPackageCapacity]: 'La cancelación excedería la capacidad del paquete.',
  [ErrorReason.YouCannotAccessAnotherCustomerReservation]: 'No puedes acceder a la reservación de otro cliente.',
  [ErrorReason.EndDateBeforeStartDate]: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
  [ErrorReason.TotalCapacityCannotBeLowerThanReserved]: 'La capacidad total no puede ser menor a los lugares ya reservados.',
  [ErrorReason.PackageWithReservationsCannotBeDeleted]: 'No se puede eliminar un paquete que ya tiene reservaciones.',
  [ErrorReason.Unauthorized]: 'No autorizado.',
  [ErrorReason.NotFound]: 'No se encontró el recurso solicitado.',
  [ErrorReason.Conflict]: 'La operación no pudo completarse porque hay un conflicto de datos.',
  [ErrorReason.BadRequest]: 'Los datos enviados no son válidos.',
};

const backendErrorDictionary: Record<string, ErrorReasonValue> = {
  'Invalid email or password': ErrorReason.InvalidEmailOrPassword,
  'A valid bearer token is required': ErrorReason.ValidBearerTokenRequired,
  'The bearer token payload is invalid': ErrorReason.InvalidBearerTokenPayload,
  'The bearer token is invalid or expired': ErrorReason.InvalidOrExpiredBearerToken,
  'You do not have permission to perform this action': ErrorReason.Forbidden,
  'Customers can only reserve for themselves': ErrorReason.CustomerOnlyReserveSelf,
  'Admin and agents must provide a customerId': ErrorReason.AdminAgentMustProvideCustomerId,
  'Reservations can only be created for customers': ErrorReason.ReservationsOnlyForCustomers,
  'Customer not found': ErrorReason.CustomerNotFound,
  'Package not found': ErrorReason.PackageNotFound,
  'Not enough available slots': ErrorReason.NotEnoughAvailableSlots,
  'Reservation total exceeds the supported amount': ErrorReason.ReservationTotalExceedsLimit,
  'Reservation not found': ErrorReason.ReservationNotFound,
  'Customers may only cancel their reservations': ErrorReason.CustomersMayOnlyCancelReservations,
  'Only pending reservations can be marked as paid': ErrorReason.OnlyPendingReservationsCanBePaid,
  'Reservation payment status cannot be reset to pending': ErrorReason.ReservationPaymentStatusCannotResetToPending,
  'Cancelled reservations cannot be reopened': ErrorReason.CancelledReservationsCannotBeReopened,
  'Package associated with reservation not found': ErrorReason.PackageAssociatedReservationNotFound,
  'Cancellation would exceed package capacity': ErrorReason.CancellationWouldExceedPackageCapacity,
  'You cannot access another customer reservation': ErrorReason.YouCannotAccessAnotherCustomerReservation,
  'End date cannot be before start date': ErrorReason.EndDateBeforeStartDate,
  'Total capacity cannot be lower than already reserved places': ErrorReason.TotalCapacityCannotBeLowerThanReserved,
  'A package with reservations cannot be deleted': ErrorReason.PackageWithReservationsCannotBeDeleted,
  Unauthorized: ErrorReason.Unauthorized,
  Forbidden: ErrorReason.Forbidden,
  NotFound: ErrorReason.NotFound,
  Conflict: ErrorReason.Conflict,
  'Bad Request': ErrorReason.BadRequest,
  InvalidEmailOrPassword: ErrorReason.InvalidEmailOrPassword,
  ValidBearerTokenRequired: ErrorReason.ValidBearerTokenRequired,
  InvalidBearerTokenPayload: ErrorReason.InvalidBearerTokenPayload,
  InvalidOrExpiredBearerToken: ErrorReason.InvalidOrExpiredBearerToken,
  CustomerOnlyReserveSelf: ErrorReason.CustomerOnlyReserveSelf,
  AdminAgentMustProvideCustomerId: ErrorReason.AdminAgentMustProvideCustomerId,
  ReservationsOnlyForCustomers: ErrorReason.ReservationsOnlyForCustomers,
  CustomerNotFound: ErrorReason.CustomerNotFound,
  PackageNotFound: ErrorReason.PackageNotFound,
  NotEnoughAvailableSlots: ErrorReason.NotEnoughAvailableSlots,
  ReservationTotalExceedsLimit: ErrorReason.ReservationTotalExceedsLimit,
  ReservationNotFound: ErrorReason.ReservationNotFound,
  CustomersMayOnlyCancelReservations: ErrorReason.CustomersMayOnlyCancelReservations,
  OnlyPendingReservationsCanBePaid: ErrorReason.OnlyPendingReservationsCanBePaid,
  ReservationPaymentStatusCannotResetToPending: ErrorReason.ReservationPaymentStatusCannotResetToPending,
  CancelledReservationsCannotBeReopened: ErrorReason.CancelledReservationsCannotBeReopened,
  PackageAssociatedReservationNotFound: ErrorReason.PackageAssociatedReservationNotFound,
  CancellationWouldExceedPackageCapacity: ErrorReason.CancellationWouldExceedPackageCapacity,
  YouCannotAccessAnotherCustomerReservation: ErrorReason.YouCannotAccessAnotherCustomerReservation,
  TotalCapacityCannotBeLowerThanReserved: ErrorReason.TotalCapacityCannotBeLowerThanReserved,
  PackageWithReservationsCannotBeDeleted: ErrorReason.PackageWithReservationsCannotBeDeleted,
};

export function translateBackendError(message?: unknown, status?: number): string {
  let normalizedMessage = '';

  if (Array.isArray(message)) {
    normalizedMessage = message.join(' ');
  } else if (typeof message === 'string') {
    normalizedMessage = message.trim();
  } else if (message && typeof message === 'object') {
    const candidate = Object.values(message as Record<string, unknown>).flatMap((value) =>
      Array.isArray(value) ? value : [value],
    );

    normalizedMessage = candidate
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .trim();
  }

  if (!normalizedMessage) {
    if (status === 401) return errorReasonMessages[ErrorReason.Unauthorized];
    if (status === 403) return errorReasonMessages[ErrorReason.Forbidden];
    if (status === 404) return errorReasonMessages[ErrorReason.NotFound];
    if (status === 409) return errorReasonMessages[ErrorReason.Conflict];
    if (status === 500) return 'Ocurrió un error en el servidor. Intenta nuevamente.';
    return 'Ha ocurrido un error inesperado.';
  }

  const reason = backendErrorDictionary[normalizedMessage];
  return reason ? errorReasonMessages[reason] : normalizedMessage;
}
