// ============================================
// Navigation entre les écrans.
// Les écrans sont côte à côte dans une piste horizontale
// qu'on déplace avec transform.
// ============================================

const piste = document.getElementById("piste");
const ecrans = document.querySelectorAll(".ecran");
const onglets = document.querySelectorAll(".onglet");

const ordre = [];
for (let i = 0; i < onglets.length; i++) {
    ordre.push(onglets[i].dataset.ecran);
}

let indexActuel = 0;


function positionner(index, anime) {
    if (!anime) {
        piste.classList.add("sans-transition");
    } else {
        piste.classList.remove("sans-transition");
    }

    const decalage = -(index * (100 / ordre.length));
    piste.style.transform = "translateX(" + decalage + "%)";
}


export function allerVers(nom) {
    const index = ordre.indexOf(nom);
    if (index === -1) { return; }

    indexActuel = index;
    positionner(index, true);

    for (let i = 0; i < onglets.length; i++) {
        if (i === index) {
            onglets[i].classList.add("actif");
        } else {
            onglets[i].classList.remove("actif");
        }
    }

    ecrans[index].scrollTop = 0;
}


export function initNavigation() {
    for (let i = 0; i < onglets.length; i++) {
        onglets[i].addEventListener("click", function () {
            allerVers(this.dataset.ecran);
        });
    }

    positionner(0, false);
    initSwipe();
}


function initSwipe() {
    let departX = 0;
    let departY = 0;
    let dernierX = 0;
    let actif = false;
    let horizontal = null;   // null tant qu'on ne sait pas la direction
    let largeur = window.innerWidth;

    window.addEventListener("resize", function () {
        largeur = window.innerWidth;
        positionner(indexActuel, false);
    });

    piste.addEventListener("touchstart", function (event) {
        if (event.touches.length !== 1) { return; }
        departX = event.touches[0].clientX;
        departY = event.touches[0].clientY;
        dernierX = departX;
        actif = true;
        horizontal = null;
        largeur = window.innerWidth;
    }, { passive: true });

    piste.addEventListener("touchmove", function (event) {
        if (!actif) { return; }

        const x = event.touches[0].clientX;
        const y = event.touches[0].clientY;
        const deltaX = x - departX;
        const deltaY = y - departY;

        // On décide une seule fois si le geste est horizontal ou vertical
        if (horizontal === null) {
            if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) { return; }
            horizontal = Math.abs(deltaX) > Math.abs(deltaY);
            if (!horizontal) { actif = false; return; }
        }

        dernierX = x;

        // Résistance aux extrémités : le geste avance moins vite
        let glissement = deltaX;
        const auBord = (indexActuel === 0 && deltaX > 0) ||
            (indexActuel === ordre.length - 1 && deltaX < 0);
        if (auBord) {
            glissement = deltaX * 0.3;
        }

        const base = -(indexActuel * largeur);
        const position = base + glissement;
        const pourcent = (position / (largeur * ordre.length)) * 100;

        piste.classList.add("sans-transition");
        piste.style.transform = "translateX(" + pourcent + "%)";
    }, { passive: true });

    piste.addEventListener("touchend", function () {
        if (!actif || horizontal !== true) {
            actif = false;
            return;
        }
        actif = false;

        const deltaX = dernierX - departX;
        const seuil = largeur * 0.25;

        let cible = indexActuel;
        if (deltaX < -seuil && indexActuel < ordre.length - 1) {
            cible = indexActuel + 1;
        } else if (deltaX > seuil && indexActuel > 0) {
            cible = indexActuel - 1;
        }

        allerVers(ordre[cible]);
    }, { passive: true });
}