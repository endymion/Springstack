Feature: Deep-link auto-advance
  Scenario: Deep link auto-advance matches manual push
    Given I open "/corpus/media--c-media"
    Then I see the root panel first
    And the corpus card for "Media" animates to the breadcrumb

  Scenario: Manual click baseline matches deep link
    Given I open "/"
    When I click the corpus card for "Media"
    Then the corpus breadcrumb for "Media" appears
    And the items panel slides in from the right

  Scenario: Deep link can land on a detail preview
    Given I open "/corpus/documents--c-docs/item/text%2Fplain/notes/detail"
    Then the detail panel shows the "generic" preview

  Scenario: Deep link can land on a diagram detail
    Given I open "/corpus/diagrams--c-diagrams/item/text%2Fx-mermaid/ops-flow/detail"
    Then the detail panel shows the "mermaid" preview
