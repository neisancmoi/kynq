// ============================================
// Logique métier des abonnements.
// Normalise tout en coût mensuel pour pouvoir additionner.
// ============================================

// Combien de fois par an on paie, selon la périodicité
const PAIEMENTS_PAR_AN = {
    mensuel: 12,
    annuel: 1,
    hebdomadaire: 52,
    trimestriel: 4,
    biennal: 0.5
};

// Ramène n'importe quel abonnement à son coût mensuel
export function coutMensuel(abonnement) {
    const parAn = PAIEMENTS_PAR_AN[abonnement.periodicite] || 12;
    return (abonnement.montant * parAn) / 12;
}

// Total mensuel de tous les abonnements actifs
export function totalMensuel(abonnements) {
    let total = 0;
    for (let i = 0; i < abonnements.length; i++) {
        total = total + coutMensuel(abonnements[i]);
    }
    return total;
}

// Libellé lisible de la périodicité
export function libellePeriodicite(periodicite) {
    if (periodicite === "annuel") { return "par an"; }
    if (periodicite === "hebdomadaire") { return "par semaine"; }
    if (periodicite === "trimestriel") { return "par trimestre"; }
    if (periodicite === "biennal") { return "tous les 2 ans"; }
    return "par mois";
}

// Trie les abonnements du plus cher au moins cher (en coût mensuel)
export function trierParCout(abonnements) {
    const copie = abonnements.slice();
    copie.sort(function (a, b) {
        return coutMensuel(b) - coutMensuel(a);
    });
    return copie;
}