// ============================================
// Affichage du module abonnements.
// Reçoit des données, les met à l'écran. Ne décide rien.
// ============================================

import {
    coutMensuel,
    libellePeriodicite,
    trierParCout
} from "./calculs.js";


// ---------- Formatage français ----------

function nb(valeur, decimales = 2) {
    return valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

function ent(valeur) {
    return Math.round(valeur).toLocaleString("fr-FR");
}


// ---------- Les éléments de la page ----------

const zoneAccueil = document.getElementById("abo-accueil");
const zoneResultats = document.getElementById("abo-resultats");
const elemMensuel = document.getElementById("abo-mensuel");
const elemAnnuel = document.getElementById("abo-annuel");
const elemProjection = document.getElementById("abo-projection-5ans");
const elemPhrase = document.getElementById("abo-phrase");
const liste = document.getElementById("abo-liste");
const listeVide = document.getElementById("abo-vide");


// ---------- Tableau de bord ----------

export function afficherResultats(donnees) {
    if (donnees === null) {
        zoneAccueil.hidden = false;
        zoneResultats.hidden = true;
        return;
    }

    zoneAccueil.hidden = true;
    zoneResultats.hidden = false;

    elemMensuel.textContent = nb(donnees.mensuel, 2) + " €";
    elemAnnuel.textContent = ent(donnees.mensuel * 12) + " € par an";
    elemProjection.textContent = ent(donnees.projection) + " €";

    let texte = "C'est ce que tes " + donnees.nombre + " abonnements te coûteront sur cinq ans";
    if (donnees.nombre === 1) {
        texte = "C'est ce que cet abonnement te coûtera sur cinq ans";
    }

    if (donnees.inflation > 0) {
        texte = texte + ", avec une hausse de " + nb(donnees.inflation, 1) + " % par an.";
    } else {
        texte = texte + ", au tarif actuel.";
    }

    elemPhrase.textContent = texte;
}


// ---------- Liste des abonnements ----------

export function afficherListe(abonnements, projeter) {
    liste.innerHTML = "";
    listeVide.hidden = abonnements.length > 0;

    const tries = trierParCout(abonnements);

    for (let i = 0; i < tries.length; i++) {
        const a = tries[i];
        const ligne = document.createElement("li");
        const mensuel = coutMensuel(a);
        const surCinqAns = projeter(mensuel);

        let detail = nb(a.montant, 2) + " € " + libellePeriodicite(a.periodicite);
        if (a.periodicite !== "mensuel") {
            detail = detail + ", soit " + nb(mensuel, 2) + " € par mois";
        }
        detail = detail + ". " + ent(surCinqAns) + " € sur cinq ans.";

        ligne.innerHTML =
            "<span class='abo-nom'>" + a.nom + "</span>" +
            "<span class='abo-cout'>" + nb(mensuel, 2) + " €/mois</span>" +
            "<span class='abo-detail'>" + detail + "</span>" +
            "<span class='abo-actions'>" +
            "<button class='btn-icone abo-btn-modif' data-id='" + a.id + "' title='Modifier' aria-label='Modifier cet abonnement'>✎</button>" +
            "<button class='btn-icone abo-btn-suppr' data-id='" + a.id + "' title='Supprimer' aria-label='Supprimer cet abonnement'>🗑</button>" +
            "</span>";

        liste.appendChild(ligne);
    }
}