import TicketTypeRequest from "./lib/TicketTypeRequest.js";
import InvalidPurchaseException from "./lib/InvalidPurchaseException.js";
import TicketPaymentService from "../thirdparty/paymentgateway/TicketPaymentService.js";
import SeatReservationService from "../thirdparty/seatbooking/SeatReservationService.js";

const TICKET_PRICES = {
  INFANT: 0,
  CHILD: 15,
  ADULT: 25,
};

const MAX_TICKETS = 25;

export default class TicketService {
  #paymentService;
  #reservationService;

  constructor(
    paymentService = new TicketPaymentService(),
    reservationService = new SeatReservationService(),
  ) {
    this.#paymentService = paymentService;
    this.#reservationService = reservationService;
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    this.#validateAccountId(accountId);
    this.#validateRequests(ticketTypeRequests);

    const counts = this.#countByType(ticketTypeRequests);

    this.#validateBusinessRules(counts);

    this.#paymentService.makePayment(
      accountId,
      this.#calculateTotalAmount(counts),
    );
    this.#reservationService.reserveSeat(
      accountId,
      this.#calculateTotalSeats(counts),
    );
  }

  #validateAccountId(accountId) {
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new InvalidPurchaseException(
        "Account ID must be a positive integer greater than zero.",
      );
    }
  }

  #validateRequests(ticketTypeRequests) {
    if (!ticketTypeRequests || ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException(
        "At least one ticket request must be provided.",
      );
    }

    for (const request of ticketTypeRequests) {
      if (!(request instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException(
          "All ticket requests must be instances of TicketTypeRequest.",
        );
      }
    }
  }

  #countByType(ticketTypeRequests) {
    const counts = { ADULT: 0, CHILD: 0, INFANT: 0 };

    for (const request of ticketTypeRequests) {
      counts[request.getTicketType()] += request.getNoOfTickets();
    }

    return counts;
  }

  #validateBusinessRules(counts) {
    const totalTickets = counts.ADULT + counts.CHILD + counts.INFANT;

    if (totalTickets > MAX_TICKETS) {
      throw new InvalidPurchaseException(
        "Cannot purchase more than 25 tickets at once.",
      );
    }

    if (counts.ADULT === 0) {
      throw new InvalidPurchaseException(
        "Child and Infant tickets cannot be purchased without at least one Adult ticket.",
      );
    }

    if (counts.INFANT > counts.ADULT) {
      throw new InvalidPurchaseException(
        "Number of Infants cannot exceed the number of Adults.",
      );
    }
  }

  #calculateTotalAmount(counts) {
    return (
      counts.ADULT * TICKET_PRICES.ADULT +
      counts.CHILD * TICKET_PRICES.CHILD +
      counts.INFANT * TICKET_PRICES.INFANT
    );
  }

  #calculateTotalSeats(counts) {
    // Infants do not require a seat — they sit on an Adult's lap
    return counts.ADULT + counts.CHILD;
  }
}
