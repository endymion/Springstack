Feature: File type previews
  Background:
    Given I open "/"

  Scenario Outline: File type previews render in detail view
    When I click the corpus card for "<corpus>"
    And I click the item card for "<itemId>"
    And I click the detail card
    Then the detail panel shows the "<preview>" preview

    Examples:
      | corpus     | itemId        | preview     |
      | Documents  | md-report     | markdown    |
      | Documents  | pdf-dossier   | pdf         |
      | Documents  | notes         | generic     |
      | Media      | blur-photo    | image       |
      | Media      | footsteps     | audio       |
      | Media      | hallway-loop  | video       |
      | Media      | glyph         | svg         |
      | Media      | composition   | vml         |
      | Data & Code| crowd-log     | spreadsheet |
      | Data & Code| roster-matrix | spreadsheet |
      | Data & Code| roster-json   | json        |
      | Data & Code| beacon-driver | code        |
      | Data & Code| asset-bundle  | archive     |
      | Data & Code| stack-db      | sqlite      |
      | Data & Code| sensor-parquet| parquet     |
      | Diagrams   | service-map   | graphviz    |
      | Diagrams   | handoff-flow  | plantuml    |
      | Diagrams   | scene-sketch  | excalidraw  |
      | Diagrams   | ops-flow      | mermaid     |
