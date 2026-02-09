@skip
Feature: Springstack navigation
  Scenario: Push adds a new node to the stack
    Given a Springstack instance with a root node
    When I push a child node
    Then the stack length increases
