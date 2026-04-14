import TicketTypeRequest from "./lib/TicketTypeRequest.js";
import InvalidPurchaseException from "./lib/InvalidPurchaseException.js";
import TicketPaymentService from "../thirdparty/paymentgateway/TicketPaymentService.js";
import SeatReservationService from "../thirdparty/seatbooking/SeatReservationService.js";
import {
  TICKET_PRICES,
  MAX_TICKETS_PER_PURCHASE,
  INVALID_PURCHASE_MESSAGE,
} from "./lib/ticketPurchaseConstants.js";

/**
 * Orchestrates ticket purchases: validates the request, charges the account,
 * and reserves seats via the injected payment and reservation services.
 */
export default class TicketService {
  #paymentService;
  #reservationService;

  /**
   * By default uses real `TicketPaymentService` and `SeatReservationService`. Pass substitutes when testing;
   * payment must implement `makePayment(accountId, totalAmountToPay)`, seats must implement `reserveSeat(accountId, totalSeatsToAllocate)`.
   *
   * @remarks Dependency injection
   */
  constructor(
    paymentService = new TicketPaymentService(),
    reservationService = new SeatReservationService(),
  ) {
    this.#paymentService = paymentService;
    this.#reservationService = reservationService;
  }

  /**
   * Validates the purchase, then requests payment and seat allocation.
   * Infants are free and do not receive a seat.
   *
   * @param {number} accountId - Positive integer account identifier.
   * @param {...TicketTypeRequest} ticketTypeRequests - One or more ticket line items (type and quantity each).
   * @throws {InvalidPurchaseException} When the request fails business or input validation.
   */
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

  /**
   * Validates that the account ID is a positive integer.
   */
  #validateAccountId(accountId) {
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new InvalidPurchaseException(INVALID_PURCHASE_MESSAGE.ACCOUNT_ID);
    }
  }

  /**
   * Validates that ticket requests are present and well formed.
   */
  #validateRequests(ticketTypeRequests) {
    if (!ticketTypeRequests || ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException(
        INVALID_PURCHASE_MESSAGE.NO_TICKET_REQUESTS,
      );
    }

    for (const request of ticketTypeRequests) {
      if (!(request instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException(
          INVALID_PURCHASE_MESSAGE.REQUEST_NOT_TICKET_TYPE_REQUEST,
        );
      }

      if (request.getNoOfTickets() <= 0) {
        throw new InvalidPurchaseException(
          INVALID_PURCHASE_MESSAGE.TICKET_QUANTITY_NOT_POSITIVE,
        );
      }
    }
  }

  /**
   * Aggregates ticket requests into adult, child, and infant totals.
   */
  #countByType(ticketTypeRequests) {
    const counts = { ADULT: 0, CHILD: 0, INFANT: 0 };

    for (const request of ticketTypeRequests) {
      counts[request.getTicketType()] += request.getNoOfTickets();
    }

    return counts;
  }

  /**
   * Enforces purchase business rules against the aggregated ticket counts.
   */
  #validateBusinessRules(counts) {
    const totalTickets = counts.ADULT + counts.CHILD + counts.INFANT;

    if (totalTickets > MAX_TICKETS_PER_PURCHASE) {
      throw new InvalidPurchaseException(
        INVALID_PURCHASE_MESSAGE.MAX_TICKETS_EXCEEDED,
      );
    }

    if (counts.ADULT === 0) {
      throw new InvalidPurchaseException(
        INVALID_PURCHASE_MESSAGE.ADULT_TICKET_REQUIRED,
      );
    }

    if (counts.INFANT > counts.ADULT) {
      throw new InvalidPurchaseException(
        INVALID_PURCHASE_MESSAGE.TOO_MANY_INFANTS,
      );
    }
  }

  /**
   * Calculates the total amount to charge for the requested tickets.
   */
  #calculateTotalAmount(counts) {
    return (
      counts.ADULT * TICKET_PRICES.ADULT +
      counts.CHILD * TICKET_PRICES.CHILD +
      counts.INFANT * TICKET_PRICES.INFANT
    );
  }

  /**
   * Calculates the number of seats to reserve for the purchase.
   */
  #calculateTotalSeats(counts) {
    // Infants sit on an adult's lap and are not allocated a seat.
    return counts.ADULT + counts.CHILD;
  }
}
