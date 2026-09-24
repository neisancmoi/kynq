// ============================================
// Simulateur "et si" et but concret.
// Ne bouge que les chiffres réels de l'utilisateur :
// conso, km par an, prix au litre, abonnements gardés.
// Aucun gain moyen inventé.
// ============================================

import { projeter } from "./projection.js";
import { sauvegarder, lire } from "./storage.js";


function nb(valeur, decimales = 2) {
    return valeur.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

function ent(valeur) {
    return Math.round(valeur).toLocaleString("fr-FR");
}

// Affiche l'écart à la situation réelle, ou rien s'il est négligeable
function ecart(delta, decimales, unite) {
    if (Math.abs(delta) < Math.pow(10, -decimales) / 2) {
        return "";
    }
    const signe = delta > 0 ? "+" : "";
    return " (" + signe + nb(delta, decimales) + unite + ")";
}


// ---------- Éléments ----------

const zone = document.getElementById("simu");
const zoneVide = document.getElementById("simu-vide");
const blocCarburant = document.getElementById("simu-carburant");
const blocAbos = document.getElementById("simu-abonnements");
const curseurConso = document.getElementById("simu-conso");
const curseurKm = document.getElementById("simu-km");
const curseurPrix = document.getElementById("simu-prix");
const valConso = document.getElementById("simu-conso-val");
const valKm = document.getElementById("simu-km-val");
const valPrix = document.getElementById("simu-prix-val");
const listeAbos = document.getElementById("simu-abos");
const elemResultat = document.getElementById("simu-resultat");
const elemDetail = document.getElementById("simu-detail");
const boutonReset = document.getElementById("simu-reset");

const butNom = document.getElementById("but-nom");
const butPrix = document.getElementById("but-prix");
const butResultat = document.getElementById("but-resultat");


// ---------- État ----------

let reference = null;     // les chiffres réels, reçus d'app.js
let aboGardes = {};       // id de l'abonnement -> gardé ou non
let dernierGainMois = 0;


// ---------- Mise à jour depuis app.js ----------

export function majSimulateur(donnees) {
    reference = donnees;

    const aCarburant = donnees.carburant !== null;
    const aAbos = donnees.abonnements.length > 0;
    const aFrais = donnees.fraisMensuel > 0;

    if (!aCarburant && !aAbos && !aFrais) {
        zone.hidden = true;
        zoneVide.hidden = false;
        calculerBut(0);
        return;
    }

    zone.hidden = false;
    zoneVide.hidden = true;
    blocCarburant.hidden = !aCarburant;
    blocAbos.hidden = !aAbos;

    remettreCurseurs();
    construireListeAbos();
    calculer();
}


function remettreCurseurs() {
    if (reference.carburant === null) { return; }
    const c = reference.carburant;

    // Les curseurs démarrent pile sur ta situation réelle
    curseurConso.min = Math.max(1, c.conso - 2);
    curseurConso.max = c.conso + 1;
    curseurConso.value = c.conso;

    // Large vers le haut : quelqu'un peut changer de boulot et tripler ses trajets
    curseurKm.min = c.kmAn * 0.25;
    curseurKm.max = Math.max(c.kmAn * 3, 40000);
    curseurKm.value = c.kmAn;

    // Large aussi : le carburant peut monter bien au-delà du prix actuel
    curseurPrix.min = Math.max(0.8, c.prix - 0.8);
    curseurPrix.max = Math.max(c.prix + 1.5, 3.5);
    curseurPrix.value = c.prix;
}


function construireListeAbos() {
    listeAbos.innerHTML = "";

    for (let i = 0; i < reference.abonnements.length; i++) {
        const a = reference.abonnements[i];

        // Un nouvel abonnement est gardé par défaut
        if (aboGardes[a.id] === undefined) {
            aboGardes[a.id] = true;
        }

        const ligne = document.createElement("li");
        const label = document.createElement("label");
        label.className = "case-a-cocher";

        const caseACocher = document.createElement("input");
        caseACocher.type = "checkbox";
        caseACocher.checked = aboGardes[a.id];
        caseACocher.dataset.id = a.id;

        const texte = document.createElement("span");
        texte.textContent = a.nom + ", " + nb(a.mensuel, 2) + " € par mois";

        label.appendChild(caseACocher);
        label.appendChild(texte);
        ligne.appendChild(label);
        listeAbos.appendChild(ligne);
    }
}


// ---------- Calcul ----------

function calculer() {
    if (reference === null) { return; }

    let actuel5 = 0;
    let simule5 = 0;
    let actuelMois = 0;
    let simuleMois = 0;
    // Les frais de la voiture comptent dans le total mais ne se résilient pas :
    // ils sont identiques des deux côtés de la simulation.
    const fraisMois = reference.fraisMensuel || 0;
    if (fraisMois > 0) {
        const fraisSur5 = projeter(fraisMois, 12, 5, 0);
        actuelMois = actuelMois + fraisMois;
        simuleMois = simuleMois + fraisMois;
        actuel5 = actuel5 + fraisSur5;
        simule5 = simule5 + fraisSur5;
    }

    if (reference.carburant !== null) {
        const c = reference.carburant;
        const conso = Number(curseurConso.value);
        const km = Number(curseurKm.value);
        const prix = Number(curseurPrix.value);

        valConso.textContent = nb(conso, 2) + " L/100" + ecart(conso - c.conso, 2, " L");
        valKm.textContent = ent(km) + " km" + ecart(Math.round(km - c.kmAn), 0, " km");
        valPrix.textContent = nb(prix, 2) + " €" + ecart(prix - c.prix, 2, " €");

        // Même formule que la vue totale : conso x prix x km, ramené au mois
        const mensuelReel = ((c.conso / 100) * c.prix * c.kmAn) / 12;
        const mensuelSimule = ((conso / 100) * prix * km) / 12;

        actuelMois = actuelMois + mensuelReel;
        simuleMois = simuleMois + mensuelSimule;
        actuel5 = actuel5 + projeter(mensuelReel, 12, 5, c.inflation);
        simule5 = simule5 + projeter(mensuelSimule, 12, 5, c.inflation);
    }

    for (let i = 0; i < reference.abonnements.length; i++) {
        const a = reference.abonnements[i];
        const sur5 = projeter(a.mensuel, 12, 5, reference.inflationAbonnements);

        actuelMois = actuelMois + a.mensuel;
        actuel5 = actuel5 + sur5;

        if (aboGardes[a.id]) {
            simuleMois = simuleMois + a.mensuel;
            simule5 = simule5 + sur5;
        }
    }

    const gain5 = actuel5 - simule5;
    const gainMois = actuelMois - simuleMois;
    dernierGainMois = gainMois;

    elemResultat.classList.remove("positif", "negatif");

    if (Math.abs(gain5) < 1) {
        elemResultat.textContent = ent(actuel5) + " € sur 5 ans";
        elemDetail.textContent = "C'est ta situation réelle. Bouge un curseur ou décoche un abonnement pour voir ce que ça change.";
    } else if (gain5 > 0) {
        elemResultat.classList.add("positif");
        elemResultat.textContent = ent(gain5) + " € récupérés";
        elemDetail.textContent = "Sur 5 ans, tu passerais de " + ent(actuel5) + " € à " + ent(simule5) +
            " €. Soit " + ent(gainMois) + " € de plus chaque mois.";
    } else {
        elemResultat.classList.add("negatif");
        elemResultat.textContent = ent(-gain5) + " € de plus";
        elemDetail.textContent = "Sur 5 ans, tu passerais de " + ent(actuel5) + " € à " + ent(simule5) +
            " €. Soit " + ent(-gainMois) + " € de moins chaque mois.";
    }

    calculerBut(gainMois);
}


// ---------- But concret ----------

function calculerBut(gainMois) {
    const nom = butNom.value.trim();
    const prix = parseFloat(butPrix.value.replace(",", "."));

    if (nom === "" || isNaN(prix) || prix <= 0) {
        butResultat.textContent = "Donne un nom et un prix à ce que tu veux financer.";
        return;
    }

    if (gainMois < 1) {
        butResultat.textContent = "Bouge les curseurs au-dessus pour voir en combien de temps tu finances " + nom + ".";
        return;
    }

    const mois = Math.ceil(prix / gainMois);
    let duree = mois + " mois";
    if (mois === 1) { duree = "1 mois"; }
    if (mois >= 24) { duree = nb(mois / 12, 1) + " ans"; }

    butResultat.textContent = "Tu finances " + nom + " en " + duree + ", si tu tiens ces changements.";
}


// ---------- Initialisation ----------

export function initSimulateur() {
    const but = lire("but", { nom: "", prix: "" });
    butNom.value = but.nom;
    butPrix.value = but.prix;

    curseurConso.addEventListener("input", calculer);
    curseurKm.addEventListener("input", calculer);
    curseurPrix.addEventListener("input", calculer);

    listeAbos.addEventListener("change", function (event) {
        const id = Number(event.target.dataset.id);
        aboGardes[id] = event.target.checked;
        calculer();
    });

    boutonReset.addEventListener("click", function () {
        aboGardes = {};
        remettreCurseurs();
        construireListeAbos();
        calculer();
    });

    function enregistrerBut() {
        sauvegarder("but", { nom: butNom.value, prix: butPrix.value });
        calculerBut(dernierGainMois);
    }

    butNom.addEventListener("input", enregistrerBut);
    butPrix.addEventListener("input", enregistrerBut);
}