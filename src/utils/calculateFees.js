/**
 * calculateFees
 *
 * @param {number} distanceKm - distance en kilomètres
 * @param {number} ratePerKm - tarif par km (défaut 0.5€)
 * @param {number} commissionPercent - commission de l'application (défaut 20%)
 * @returns {number} montant total arrondi à 2 décimales
 */
export function calculateFees(distanceKm, ratePerKm = 0.5, commissionPercent = 20) {
  if (!distanceKm || distanceKm <= 0) return 0;
  const baseFee = distanceKm * ratePerKm;
  const totalFee = baseFee + (baseFee * commissionPercent / 100);
  return Math.round(totalFee * 100) / 100; // arrondi à 2 décimales
}
