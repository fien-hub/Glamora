// Shared travel fee table for frontend (in dollars)
export const STANDARD_TRAVEL_FEES = {
  '0-3 mi': 5,       // $5 for very close (6 mi round trip)
  '3-5 mi': 8,       // $8 for nearby (10 mi round trip)
  '5-8 mi': 12,      // $12 for medium distance (16 mi round trip)
  '8-12 mi': 18,     // $18 for farther (24 mi round trip)
  '12-15 mi': 22,    // $22 for far (30 mi round trip)
  '15+ mi': 30,      // $30 for special requests (40+ mi round trip)
};
