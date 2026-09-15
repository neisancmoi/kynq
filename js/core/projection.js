// ============================================
// Moteur de projection générique.
// Ne sait rien du carburant : il manipule des nombres abstraits.
// Réutilisable par n'importe quel futur module.
// ============================================

// coutUnitaire : combien coûte une unité (1 km, 1 jour, 1 mois...)
// unitesParAn  : combien d'unités consommées par an
// annees       : durée de la projection
// inflation    : hausse annuelle du prix en %
export function projeter(coutUnitaire, unitesParAn, annees = 5, inflation = 0) {
  if (inflation === 0) {
    return coutUnitaire * unitesParAn * annees;
  }

  let total = 0;
  let coutAnnee = coutUnitaire;

  for (let i = 0; i < annees; i++) {
    total = total + coutAnnee * unitesParAn;
    coutAnnee = coutAnnee * (1 + inflation / 100);
  }

  return total;
}

export function comparer(coutActuel, coutObjectif, unitesParAn, annees = 5, inflation = 0) {
  const projectionActuelle = projeter(coutActuel, unitesParAn, annees, inflation);
  const projectionObjectif = projeter(coutObjectif, unitesParAn, annees, inflation);

  return {
    actuelle: projectionActuelle,
    objectif: projectionObjectif,
    ecart: projectionActuelle - projectionObjectif
  };
}