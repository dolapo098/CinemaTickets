import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import TicketService from "../src/pairtest/TicketService.js";
import TicketTypeRequest from "../src/pairtest/lib/TicketTypeRequest.js";
import InvalidPurchaseException from "../src/pairtest/lib/InvalidPurchaseException.js";

const makePayment = jest.fn();
const reserveSeat = jest.fn();

const paymentService = { makePayment };
const reservationService = { reserveSeat };

function createTicketService() {
  return new TicketService(paymentService, reservationService);
}

const TicketType = Object.freeze({
  ADULT: "ADULT",
  CHILD: "CHILD",
  INFANT: "INFANT",
});

const TicketPrice = Object.freeze({
  ADULT: 25,
  CHILD: 15,
  INFANT: 0,
});

const MaxTicketsPerPurchase = 25;

const AccountId = Object.freeze({
  DEFAULT_VALID: 1,
  FOR_SHARED_ACCOUNT_CHECK: 42,
  INVALID_ZERO: 0,
  INVALID_NEGATIVE: -1,
  INVALID_NON_INTEGER: 1.5,
});

function ticket(type, quantity) {
  return new TicketTypeRequest(type, quantity);
}

function adultTickets(quantity) {
  return ticket(TicketType.ADULT, quantity);
}

function childTickets(quantity) {
  return ticket(TicketType.CHILD, quantity);
}

function infantTickets(quantity) {
  return ticket(TicketType.INFANT, quantity);
}

describe("TicketService", () => {
  beforeEach(() => {
    makePayment.mockClear();
    reserveSeat.mockClear();
  });

  describe("Account ID validation", () => {
    test.each([
      ["zero", AccountId.INVALID_ZERO],
      ["negative", AccountId.INVALID_NEGATIVE],
      ["non-integer", AccountId.INVALID_NON_INTEGER],
    ])("rejects %s accountId", (_label, accountId) => {
      // Arrange
      const requests = [adultTickets(1)];

      // Act
      const act = () =>
        createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
      expect(makePayment).not.toHaveBeenCalled();
      expect(reserveSeat).not.toHaveBeenCalled();
    });

    test("accepts valid accountId and charges for one adult", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [adultTickets(1)];

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(makePayment).toHaveBeenCalledWith(accountId, TicketPrice.ADULT);
      expect(reserveSeat).toHaveBeenCalledWith(accountId, 1);
    });
  });

  describe("Ticket request validation", () => {
    test("rejects when no ticket requests provided", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;

      // Act
      const act = () => createTicketService().purchaseTickets(accountId);

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
      expect(makePayment).not.toHaveBeenCalled();
    });

    test("rejects non-TicketTypeRequest entries", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const notATicketTypeRequest = {
        getTicketType: () => TicketType.ADULT,
      };

      // Act
      const act = () =>
        createTicketService().purchaseTickets(
          accountId,
          notATicketTypeRequest,
        );

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
      expect(makePayment).not.toHaveBeenCalled();
    });
  });

  describe("Adult required for child and infant", () => {
    test("rejects child-only purchase", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [childTickets(1)];

      // Act
      const act = () =>
        createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
      expect(makePayment).not.toHaveBeenCalled();
    });

    test("rejects infant-only purchase", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [infantTickets(1)];

      // Act
      const act = () =>
        createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
    });
  });

  describe("Infant count vs adult count", () => {
    test("rejects when infants exceed adults", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [adultTickets(1), infantTickets(2)];

      // Act
      const act = () =>
        createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
      expect(makePayment).not.toHaveBeenCalled();
    });

    test("accepts when infants equal adults", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const adultCount = 2;
      const infantCount = 2;
      const requests = [adultTickets(adultCount), infantTickets(infantCount)];
      const expectedTotalAmount =
        adultCount * TicketPrice.ADULT + infantCount * TicketPrice.INFANT;
      const expectedSeats = adultCount;

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(makePayment).toHaveBeenCalledWith(accountId, expectedTotalAmount);
      expect(reserveSeat).toHaveBeenCalledWith(accountId, expectedSeats);
    });
  });

  describe("Maximum 25 tickets", () => {
    test("rejects more than 25 tickets in one purchase", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [
        adultTickets(10),
        childTickets(10),
        infantTickets(6),
      ];

      // Act
      const act = () =>
        createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(act).toThrow(InvalidPurchaseException);
      expect(makePayment).not.toHaveBeenCalled();
    });

    test("accepts exactly 25 tickets", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [adultTickets(MaxTicketsPerPurchase)];
      const expectedTotalAmount = MaxTicketsPerPurchase * TicketPrice.ADULT;

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(makePayment).toHaveBeenCalledWith(accountId, expectedTotalAmount);
      expect(reserveSeat).toHaveBeenCalledWith(accountId, MaxTicketsPerPurchase);
    });
  });

  describe("Pricing", () => {
    test("2 adults + 1 child costs £65", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [adultTickets(2), childTickets(1)];
      const expectedTotalAmount = 2 * TicketPrice.ADULT + TicketPrice.CHILD;

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(makePayment).toHaveBeenCalledWith(accountId, expectedTotalAmount);
    });

    test("2 adults + 2 children + 1 infant costs £80", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [
        adultTickets(2),
        childTickets(2),
        infantTickets(1),
      ];
      const expectedTotalAmount =
        2 * TicketPrice.ADULT + 2 * TicketPrice.CHILD + TicketPrice.INFANT;

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(makePayment).toHaveBeenCalledWith(accountId, expectedTotalAmount);
    });
  });

  describe("Seat allocation", () => {
    test("1 adult + 1 infant reserves 1 seat", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [adultTickets(1), infantTickets(1)];
      const expectedSeats = 1;

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(reserveSeat).toHaveBeenCalledWith(accountId, expectedSeats);
    });

    test("2 adults + 2 children + 1 infant reserves 4 seats", () => {
      // Arrange
      const accountId = AccountId.DEFAULT_VALID;
      const requests = [
        adultTickets(2),
        childTickets(2),
        infantTickets(1),
      ];
      const expectedSeats = 2 + 2;

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(reserveSeat).toHaveBeenCalledWith(accountId, expectedSeats);
    });
  });

  describe("Successful purchase side effects", () => {
    test("passes same accountId to payment and seat services", () => {
      // Arrange
      const accountId = AccountId.FOR_SHARED_ACCOUNT_CHECK;
      const requests = [adultTickets(1)];

      // Act
      createTicketService().purchaseTickets(accountId, ...requests);

      // Assert
      expect(makePayment).toHaveBeenCalledWith(accountId, expect.any(Number));
      expect(reserveSeat).toHaveBeenCalledWith(accountId, expect.any(Number));
    });
  });
});
