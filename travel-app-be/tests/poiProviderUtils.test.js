const {
  mapPlaceToPoiCard,
  applySmartFilters,
} = require("../src/poi/providers/googlePlacesPoi");

describe("POI provider utilities", () => {
  test("maps place to POI card with photo proxy and distance", () => {
    const card = mapPlaceToPoiCard(
      {
        id: "p1",
        displayName: { text: "Louvre", languageCode: "fr" },
        location: { latitude: 48.86, longitude: 2.35 },
        photos: [{ name: "photo1", widthPx: 100, heightPx: 200 }],
        types: ["tourist_attraction"],
        currentOpeningHours: { openNow: true, weekdayDescriptions: ["Mon: Closed"] },
      },
      { lat: 48.86, lng: 2.35 },
      "fr"
    );
    expect(card.id).toBe("p1");
    expect(card.photos[0].url).toContain("/api/stays/photo");
    expect(card.location.distanceKm).toBe(0);
    expect(card.badges).toEqual(expect.arrayContaining(["Closed Mondays", "Best at sunset"]));
  });

  test("applies category and open filters", () => {
    const items = [
      { name: "Museum", categories: ["museum"], openNow: true, suggestedDuration: "half-day" },
      { name: "Park", categories: ["park"], openNow: false, suggestedDuration: "half-day" },
    ];
    const filtered = applySmartFilters(items, {
      categoriesWanted: "museum",
      openNow: true,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Museum");
  });

  test("filters for confirmed wheelchair entrances and excludes unknown status", () => {
    const card = mapPlaceToPoiCard({ id: "accessible", accessibilityOptions: { wheelchairAccessibleEntrance: true } });
    const items = [card, { id: "unknown" }, { id: "inaccessible", wheelchairAccessibleEntrance: false }];
    expect(applySmartFilters(items, { accessibility: true }).map((item) => item.id)).toEqual(["accessible"]);
  });
});
