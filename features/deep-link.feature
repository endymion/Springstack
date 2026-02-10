Feature: Deep-link auto-advance
  Scenario: Deep link auto-advance matches manual push
    Given I open "/corpus/alfa--Alfa"
    Then I see the root panel first
    And the corpus card for "Alfa" animates to the breadcrumb
    And the items panel slides in from the right

  Scenario: Manual click baseline matches deep link
    Given I open "/"
    When I click the corpus card for "Alfa"
    Then the corpus breadcrumb for "Alfa" appears
    And the items panel slides in from the right
