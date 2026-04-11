# Acceptance Criteria — Cinema Ticket Service

## Feature: Ticket Purchasing

As a customer
I want to purchase tickets
So that I can attend an event

## Background:

Given the ticket service is available
And the ticket prices are:

| Ticket Type | Price |
| ----------- | ----- |
| ADULT       | £25   |
| CHILD       | £15   |
| INFANT      | £0    |

## 1. Account ID Validation

Scenario Outline: Account ID must be a positive integer greater than zero
When I purchase tickets with account ID `<accountId>`
Then the purchase should be `<outcome>`

| accountId | outcome  |
| --------- | -------- |
| 0         | rejected |
| -1        | rejected |
| 1         | accepted |
| 999       | accepted |

## 2. Adult Required for Child and Infant Tickets

Scenario Outline: Child and Infant tickets require at least one Adult ticket
When I purchase `<adult>` adult tickets, `<child>` child tickets and `<infant>` infant tickets
Then the purchase should be rejected
And the error should indicate that Child and Infant tickets require at least one Adult ticket

| adult | child | infant |
| ----- | ----- | ------ |
| 0     | 1     | 0      |
| 0     | 0     | 1      |
| 0     | 2     | 1      |

## 3. Infants Cannot Outnumber Adults

Scenario Outline: Number of Infants cannot exceed number of Adults (Infants sit on an Adult's lap)
When I purchase `<adult>` adult tickets, `<child>` child tickets and `<infant>` infant tickets
Then the purchase should be `<outcome>`

| adult | child | infant | outcome  |
| ----- | ----- | ------ | -------- |
| 1     | 0     | 2      | rejected |
| 2     | 1     | 3      | rejected |
| 1     | 0     | 1      | accepted |
| 2     | 0     | 2      | accepted |

## 4. Maximum Ticket Limit (25 per purchase)

Scenario Outline: Cannot purchase more than 25 tickets at once
When I purchase `<adult>` adult tickets, `<child>` child tickets and `<infant>` infant tickets
Then the purchase should be `<outcome>`

| adult | child | infant | outcome  |
| ----- | ----- | ------ | -------- |
| 26    | 0     | 0      | rejected |
| 10    | 10    | 6      | rejected |
| 25    | 0     | 0      | accepted |
| 10    | 10    | 5      | accepted |

## 5. Successful Purchases

Scenario Outline: Successfully purchase valid combinations of tickets
When I purchase `<adult>` adult tickets, `<child>` child tickets and `<infant>` infant tickets
Then the purchase should be accepted

| adult | child | infant |
| ----- | ----- | ------ |
| 1     | 0     | 0      |
| 2     | 1     | 1      |
| 5     | 5     | 5      |
| 25    | 0     | 0      |

## 6. Pricing Calculation

Scenario Outline: Calculate total ticket price correctly
When I purchase `<adult>` adult tickets, `<child>` child tickets and `<infant>` infant tickets
Then the total cost should be £`<total>`

| adult | child | infant | total |
| ----- | ----- | ------ | ----- |
| 1     | 0     | 0      | 25    |
| 2     | 1     | 0      | 65    |
| 2     | 2     | 1      | 80    |
| 25    | 0     | 0      | 625   |

## 7. Seat Allocation

Infants do **not** receive a seat — they sit on an Adult's lap.
Only Adults and Children are allocated seats.

Scenario Outline: Allocate correct number of seats based on ticket types
When I purchase `<adult>` adult tickets, `<child>` child tickets and `<infant>` infant tickets
Then the number of seats allocated should be `<seats>`

| adult | child | infant | seats |
| ----- | ----- | ------ | ----- |
| 1     | 0     | 0      | 1     |
| 1     | 0     | 1      | 1     |
| 2     | 2     | 1      | 4     |
| 3     | 1     | 2      | 4     |
| 25    | 0     | 0      | 25    |
