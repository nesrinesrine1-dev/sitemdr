// --- 1. CONFIGURATION FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// 👇 C'EST ICI QUE TU DOIS COLLER TES INFOS (Voir étape 3 du tuto) 👇
const firebaseConfig = {
    apiKey: "REMPLACE_MOI",
    authDomain: "REMPLACE_MOI",
    projectId: "REMPLACE_MOI",
    storageBucket: "REMPLACE_MOI",
    messagingSenderId: "REMPLACE_MOI",
    appId: "REMPLACE_MOI"
};
// 👆 ---------------------------------------------------------------- 👆

// Initialisation (ne touche pas ça)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. GESTION DE LA CARTE ---
let currentCountryCode = null;
let visitedData = {};

async function initMap() {
    const container = document.getElementById('map-container');
    const resp = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
    const data = await resp.json();

    let svgHtml = `<svg viewBox="0 0 1000 500" style="width:100%;">`;
    data.features.forEach(feature => {
        const id = feature.properties.ISO_A3;
        const name = feature.properties.ADMIN;
        const d = generatePath(feature.geometry);
        svgHtml += `<path id="${id}" d="${d}" onclick="window.selectCountry('${id}', '${name}')"></path>`;
    });
    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;

    // ÉCOUTEUR CARTE & VILLES
    onSnapshot(doc(db, "world", "visits"), (docSnap) => {
        if (docSnap.exists()) {
            visitedData = docSnap.data();
            updateMapColors();
            updateProgress();
        }
    });

    // ÉCOUTEUR JAUGE D'AMOUR (Nouveau !)
    onSnapshot(doc(db, "world", "love"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // On met à jour l'interface quand la base de données change
            updateInterface('nesrine', data.nesrine || 50);
            updateInterface('amed', data.amed || 50);
        }
    });
}

function generatePath(geom) {
    const c = (coords) => coords.map(p => `${(p[0] + 180) * 2.5},${(90 - p[1]) * 2.5}`).join(" L ");
    if (geom.type === "Polygon") return "M " + c(geom.coordinates[0]) + " Z";
    return geom.coordinates.map(p => "M " + c(p[0]) + " Z").join(" ");
}

// --- 3. FONCTIONS JAUGE D'AMOUR ---

// Met à jour visuellement seulement (quand on glisse)
window.localUpdate = (who, val) => {
    document.getElementById(`text-${who}`).innerText = val;
    document.getElementById(`bar-${who}`).style.width = val + "%";
};

// Sauvegarde dans la base de données (quand on lâche la souris)
window.saveLoveLevel = async (who, val) => {
    const ref = doc(db, "world", "love");
    let updateData = {};
    updateData[who] = parseInt(val); // On enregistre le chiffre
    await setDoc(ref, updateData, { merge: true });
};

// Fonction interne pour mettre à jour les curseurs depuis la BDD
function updateInterface(who, val) {
    const slider = document.getElementById(`slider-${who}`);
    const text = document.getElementById(`text-${who}`);
    const bar = document.getElementById(`bar-${who}`);

    // On ne met à jour que si l'utilisateur n'est pas en train de toucher le slider
    // (pour éviter que ça saute pendant qu'on règle)
    if (document.activeElement !== slider) {
        slider.value = val;
        text.innerText = val;
        bar.style.width = val + "%";
    }
}

// --- 4. FONCTIONS CARTE (Suite) ---
window.selectCountry = (id, name) => {
    currentCountryCode = id;
    document.getElementById('country-editor').classList.remove('hidden');
    document.getElementById('editor-title').innerText = name;
    renderCities();
};

function renderCities() {
    const list = document.getElementById('city-list');
    list.innerHTML = "";
    const countryData = visitedData[currentCountryCode];
    
    if (countryData && countryData.cities) {
        countryData.cities.forEach(city => {
            list.innerHTML += `<span class="city-tag">${city} <span class="delete-city" onclick="window.removeCity('${city}')">x</span></span>`;
        });
    } else {
        list.innerHTML = "<p style='font-size:0.8rem; color:#888'>Aucune ville visitée.</p>";
    }
}

window.addCity = async () => {
    const cityInput = document.getElementById('new-city');
    const city = cityInput.value.trim();
    if (!city) return;
    const ref = doc(db, "world", "visits");
    let updateData = {};
    updateData[`${currentCountryCode}.cities`] = arrayUnion(city);
    await setDoc(ref, updateData, { merge: true });
    cityInput.value = "";
};

window.removeCity = async (city) => {
    const ref = doc(db, "world", "visits");
    let updateData = {};
    updateData[`${currentCountryCode}.cities`] = arrayRemove(city);
    await updateDoc(ref, updateData);
};

function updateMapColors() {
    document.querySelectorAll('path').forEach(p => p.classList.remove('visited'));
    Object.keys(visitedData).forEach(code => {
        const el = document.getElementById(code);
        if (el && visitedData[code].cities && visitedData[code].cities.length > 0) el.classList.add('visited');
    });
}

function updateProgress() {
    const total = 195;
    const visitedCount = Object.keys(visitedData).filter(k => visitedData[k].cities.length > 0).length;
    const percent = ((visitedCount / total) * 100).toFixed(1);
    document.getElementById('travel-percent').innerText = percent;
    document.getElementById('travel-fill').style.width = percent + "%";
}

window.closeEditor = () => document.getElementById('country-editor').classList.add('hidden');

// --- 5. QUIZ (Simplifié) ---
// (Tu peux garder ton code de quiz précédent ici, ou je te le remets si besoin)

initMap();