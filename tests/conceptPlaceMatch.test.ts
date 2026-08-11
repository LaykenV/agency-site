import { describe, expect, test } from "bun:test";
import {
  findHighConfidencePlaceMatch,
  isCurrentPlaceCandidate,
  PLACE_MATCH_FIELD_MASK,
} from "../lib/concepts/placeMatch";

const baseCandidate = {
  placeId: "place-1",
  businessName: "Shay's Cleaning Services LLC",
  formattedAddress: "101 Main Street, Youngsville, LA 70592",
  phone: "+1 337-555-0100",
  websiteUrl: "https://www.shayscleaning.com/",
  businessStatus: "OPERATIONAL",
};

describe("high-confidence Google Places matching", () => {
  test("requests no rating, review, photo, or hours fields", () => {
    const mask = PLACE_MATCH_FIELD_MASK.join(",");
    for (const forbidden of ["rating", "review", "photo", "openingHours"]) {
      expect(mask).not.toContain(forbidden);
    }
  });

  test("manual confirmation must belong to the current live results", () => {
    expect(isCurrentPlaceCandidate("place-1", [baseCandidate])).toBe(true);
    expect(isCurrentPlaceCandidate("another-place", [baseCandidate])).toBe(
      false,
    );
  });
  test("auto-matches an equivalent name with an exact location", () => {
    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shays Cleaning Services",
        serviceArea: "Youngsville, LA",
        candidates: [baseCandidate],
      }),
    ).toEqual({ placeId: "place-1", reasons: ["name", "location"] });
  });

  test("auto-matches a name plus normalized phone or website", () => {
    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shay's Cleaning Services",
        phone: "3375550100",
        candidates: [baseCandidate],
      })?.placeId,
    ).toBe("place-1");

    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shay's Cleaning Services",
        submittedWebsiteUrl: "shayscleaning.com/contact",
        candidates: [baseCandidate],
      })?.placeId,
    ).toBe("place-1");
  });

  test("accepts a name variant only when both contact identifiers agree", () => {
    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shay's Residential Cleaning",
        phone: "(337) 555-0100",
        submittedWebsiteUrl: "https://shayscleaning.com",
        candidates: [baseCandidate],
      })?.placeId,
    ).toBe("place-1");
  });

  test("does not auto-match a name alone", () => {
    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shay's Cleaning Services",
        candidates: [baseCandidate],
      }),
    ).toBeNull();
  });

  test("does not choose between multiple strong candidates", () => {
    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shay's Cleaning Services",
        serviceArea: "Youngsville, LA",
        candidates: [
          baseCandidate,
          { ...baseCandidate, placeId: "place-2", phone: "337-555-0199" },
        ],
      }),
    ).toBeNull();
  });

  test("does not auto-match a closed listing", () => {
    expect(
      findHighConfidencePlaceMatch({
        businessName: "Shay's Cleaning Services",
        phone: "337-555-0100",
        candidates: [
          { ...baseCandidate, businessStatus: "CLOSED_PERMANENTLY" },
        ],
      }),
    ).toBeNull();
  });
});
