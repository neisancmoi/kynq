// ============================================
// Vue cumulée de tous les domaines.
// Reçoit une liste de { nom, mensuel } et affiche le total.
// Elle ne sait pas d'où viennent les chiffres.
// ============================================

import { projeter } from "./projection.js";


function nb(valeur, decimales = 2) {
    return valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

function ent(valeur) {
    return Math.round(valeur).toLocaleString("fr-FR");
}


const zoneAccueil = document.getElementById("total-accueil");
const zoneResultats = document.getElementById("total-resultats");
const elemMensuel = document.getElementById("total-mensuel");
const elemAnnuel = document.getElementById("total-annuel");
const elem5ans = document.getElementById("total-5ans");
const elemPhrase = document.getElementById("total-phrase");
const liste = document.getElementById("total-liste");


// domaines : [{ nom, mensuel }, ...]
export function afficherTotal(domaines, inflation) {
    // On ne garde que les domaines qui ont des données
    const actifs = domaines.filter(function (d) {
        return d.mensuel > 0;
    });

    if (actifs.length === 0) {
        zoneAccueil.hidden = false;
        zoneResultats.hidden = true;
        liste.innerHTML = "";
        return;
    }

    zoneAccueil.hidden = true;
    zoneResultats.hidden = false;

    let mensuel = 0;
    for (let i = 0; i < actifs.length; i++) {
        mensuel = mensuel + actifs[i].mensuel;
    }

    const surCinqAns = projeter(mensuel, 12, 5, inflation);

    elemMensuel.textContent = nb(mensuel, 2) + " €";
    elemAnnuel.textContent = ent(mensuel * 12) + " € par an";
    elem5ans.textContent = ent(surCinqAns) + " €";

    if (inflation > 0) {
        elemPhrase.textContent = "C'est ce que tes dépenses récurrentes représentent sur cinq ans, avec une hausse de " +
            nb(inflation, 1) + " % par an.";
    } else {
        elemPhrase.textContent = "C'est ce que tes dépenses récurrentes représentent sur cinq ans, aux tarifs actuels.";
    }

    afficherDetail(actifs, mensuel, inflation);
}


function afficherDetail(domaines, total, inflation) {
    liste.innerHTML = "";

    // Du plus gros poste au plus petit
    const tries = domaines.slice();
    tries.sort(function (a, b) {
        return b.mensuel - a.mensuel;
    });

    for (let i = 0; i < tries.length; i++) {
        const d = tries[i];
        const part = (d.mensuel / total) * 100;
        const surCinqAns = projeter(d.mensuel, 12, 5, inflation);

        const ligne = document.createElement("li");
        ligne.innerHTML =
            "<span class='total-domaine'>" + d.nom + "</span>" +
            "<span class='total-montant'>" + nb(d.mensuel, 2) + " €/mois</span>" +
            "<span class='total-part'>" + ent(part) + " % de tes dépenses récurrentes, " +
            ent(surCinqAns) + " € sur cinq ans</span>" +
            "<span class='total-barre'><span style='width:" + part + "%'></span></span>";

        liste.appendChild(ligne);
    }
}