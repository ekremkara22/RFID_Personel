const EARTH_RADIUS_M = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) {
  const latitudeDelta = toRadians(endLatitude - startLatitude);
  const longitudeDelta = toRadians(endLongitude - startLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(startLatitude)) *
      Math.cos(toRadians(endLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(args: {
  targetLatitude: number | null;
  targetLongitude: number | null;
  allowedRadiusM: number | null;
  currentLatitude: number;
  currentLongitude: number;
}) {
  if (
    args.targetLatitude === null ||
    args.targetLongitude === null ||
    args.allowedRadiusM === null
  ) {
    return {
      distance: null,
      valid: false,
    };
  }

  const distance = calculateDistanceMeters(
    args.targetLatitude,
    args.targetLongitude,
    args.currentLatitude,
    args.currentLongitude,
  );

  return {
    distance,
    valid: distance <= args.allowedRadiusM,
  };
}
