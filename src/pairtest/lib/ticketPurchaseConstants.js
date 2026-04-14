export const MAX_TICKETS_PER_PURCHASE = 25;

export const TICKET_PRICES = Object.freeze({
  INFANT: 0,
  CHILD: 15,
  ADULT: 25,
});

export const INVALID_PURCHASE_MESSAGE = Object.freeze({
  ACCOUNT_ID:
    "Account ID must be a positive integer greater than zero.",
  NO_TICKET_REQUESTS:
    "At least one ticket request must be provided.",
  REQUEST_NOT_TICKET_TYPE_REQUEST:
    "All ticket requests must be instances of TicketTypeRequest.",
  TICKET_QUANTITY_NOT_POSITIVE:
    "Each ticket request must be for at least one ticket.",
  MAX_TICKETS_EXCEEDED: `Cannot purchase more than ${MAX_TICKETS_PER_PURCHASE} tickets at once.`,
  ADULT_TICKET_REQUIRED:
    "Child and Infant tickets cannot be purchased without at least one Adult ticket.",
  TOO_MANY_INFANTS:
    "Number of Infants cannot exceed the number of Adults.",
});
