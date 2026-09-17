// ============================================
// Navigation entre les écrans.
// Générique : ne sait rien des modules qu'elle affiche.
// ============================================

const ecrans = document.querySelectorAll(".ecran");
const onglets = document.querySelectorAll(".onglet");

// Ordre des écrans, tel qu'il apparaît dans la barre du bas
const ordre = [];
for (let i = 0; i < onglets.length; i++) {
    ordre.push(onglets[i].dataset.ecran);
}

let ecranActuel = ordre[0];


export function allerVers(nom) {
    ecranActuel = nom;

    for (let i = 0; i < ecrans.length; i++) {
        ecrans[i].hidden = ecrans[i].id !== "ecran-" + nom;
    }

    for (let i = 0; i < onglets.length; i++) {
        if (onglets[i].dataset.ecran === nom) {
            onglets[i].classList.add("actif");
        } else {
            onglets[i].classList.remove("actif");
        }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
}


function ecranVoisin(direction) {
    const index = ordre.indexOf(ecranActuel);
    const cible = index + direction;

    if (cible < 0 || cible >= ordre.length) {
        return null;
    }
    return ordre[cible];
}


export function initNavigation() {
    for (let i = 0; i < onglets.length; i++) {
        onglets[i].addEventListener("click", function () {
            allerVers(this.dataset.ecran);
        });
    }

    initSwipe();
}


function initSwipe() {
    let departX = 0;
    let departY = 0;
    let suit = false;

    document.addEventListener("touchstart", function (event) {
        if (event.touches.length !== 1) { return; }
        departX = event.touches[0].clientX;
        departY = event.touches[0].clientY;
        suit = true;
    }, { passive: true });

    document.addEventListener("touchend", function (event) {
        if (!suit) { return; }
        suit = false;

        const finX = event.changedTouches[0].clientX;
        const finY = event.changedTouches[0].clientY;
        const deltaX = finX - departX;
        const deltaY = finY - departY;

        // Un geste vertical est un scroll, pas un changement d'écran
        if (Math.abs(deltaX) < 60) { return; }
        if (Math.abs(deltaY) > Math.abs(deltaX) * 0.7) { return; }

        const direction = deltaX < 0 ? 1 : -1;
        const cible = ecranVoisin(direction);

        if (cible !== null) {
            allerVers(cible);
        }
    }, { passive: true });
}