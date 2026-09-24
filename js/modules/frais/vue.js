// ============================================
// Affichage des frais de la voiture.
// Réutilise le calcul des abonnements (montant + périodicité),
// mais pas leur sens : un frais ne se résilie pas.
// ============================================

import {
    coutMensuel,
    libellePeriodicite,
    trierParCout
} from "../abonnements/calculs.js";


function nb(valeur, decimales = 2) {
    return valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

// Crée un span avec une classe et un texte, sans jamais interpréter de HTML
function span(classe, texte) {
    const element = document.createElement("span");
    element.className = classe;
    element.textContent = texte;
    return element;
}

function bouton(classe, id, symbole, libelle) {
    const element = document.createElement("button");
    element.className = "btn-icone " + classe;
    element.dataset.id = id;
    element.title = libelle;
    element.setAttribute("aria-label", libelle);
    element.textContent = symbole;
    return element;
}


const liste = document.getElementById("frais-liste");
const listeVide = document.getElementById("frais-vide");


export function afficherFrais(frais) {
    liste.innerHTML = "";
    listeVide.hidden = frais.length > 0;

    const tries = trierParCout(frais);

    for (let i = 0; i < tries.length; i++) {
        const f = tries[i];
        const mensuel = coutMensuel(f);

        let detail = nb(f.montant, 2) + " € " + libellePeriodicite(f.periodicite);
        if (f.periodicite !== "mensuel") {
            detail = detail + ", soit " + nb(mensuel, 2) + " € par mois";
        }

        const actions = document.createElement("span");
        actions.className = "abo-actions";
        actions.appendChild(bouton("frais-btn-modif", f.id, "✎", "Modifier ce frais"));
        actions.appendChild(bouton("frais-btn-suppr", f.id, "🗑", "Supprimer ce frais"));

        const ligne = document.createElement("li");
        ligne.appendChild(span("abo-nom", f.nom));
        ligne.appendChild(span("abo-cout", nb(mensuel, 2) + " €/mois"));
        ligne.appendChild(span("abo-detail", detail));
        ligne.appendChild(actions);

        liste.appendChild(ligne);
    }
}