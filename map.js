// Supabase konfigurace
const supabaseUrl = 'https://pmmnqgdyqzkajtgllnmy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbW5xZ2R5cXprYWp0Z2xsbm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1MTE3ODcsImV4cCI6MjA0MTA4Nzc4N30.nOECCOE8IsPO2E7jJV-saASfHvj1IduONZb81wsmtqU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Rozsah obrázku mapy (změň souřadnice podle rozměrů mapy)
const bounds = [[0, 0], [8192, 8192]];

// Inicializace mapy s rozsahem mapy
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomSnap: 0.25
}).fitBounds(bounds);

const imageUrl = 'images/mapa.png';
L.imageOverlay(imageUrl, bounds).addTo(map);

// Proměnné pro správu stavu
let markers = [];
let pendingMarker = null;
let currentPointKey = null;

// Elementy DOM
const confirmButton = document.getElementById('confirm-button');
const pointNameInput = document.getElementById('point-name');
const pointDescriptionInput = document.getElementById('point-description');
const imageUrlInput = document.getElementById('image-url');
const addImageButton = document.getElementById('add-image');
const imageGallery = document.getElementById('image-gallery');
const pointDetails = document.getElementById('point-details');
const deletePointButton = document.getElementById('delete-point');
const filterSelect = document.getElementById('filter-select');
const adminPanel = document.getElementById('admin-panel');
const adminPasswordInput = document.getElementById('admin-password');
const deleteAllPointsButton = document.getElementById('delete-all-points');

// Povolit nebo zakázat potvrzovací tlačítko
confirmButton.disabled = true;

// Při kliknutí na mapu se vytvoří nový marker (který čeká na potvrzení)
map.on('click', function(e) {
    if (pendingMarker) {
        map.removeLayer(pendingMarker);
    }
    
    pendingMarker = L.marker(e.latlng).addTo(map);
    confirmButton.disabled = false;
});

// Potvrzení markeru
confirmButton.addEventListener('click', function() {
    if (pendingMarker) {
        const name = pointNameInput.value.trim();
        const description = pointDescriptionInput.value.trim();
        const images = Array.from(imageGallery.getElementsByTagName('img')).map(img => img.src);
        const pointType = document.querySelector('input[name="pointType"]:checked').value;
        
        if (name === '') {
            alert('Prosím, zadejte název bodu.');
            return;
        }

        const latLng = pendingMarker.getLatLng();
        saveToSupabase(name, description, latLng, images, pointType);

        resetForm();
        confirmButton.disabled = true;
        map.removeLayer(pendingMarker);
        pendingMarker = null;
    }
});

// Funkce pro vytváření obsahu popupu
function createPopupContent(name, description, images, pointType) {
    const typeIcon = `<img src="icons/${pointType}.svg" alt="${pointType}" width="20" height="20">`;
    let content = `${typeIcon} <strong>${name}</strong><br>${description}<br>`;
    images.forEach(img => {
        content += `<img src="${img}" alt="Obrázek" width="100"><br>`;
    });
    return content;
}

// Přidání obrázku do galerie přes Discord URL
addImageButton.addEventListener('click', function() {
    const imageUrl = imageUrlInput.value.trim();
    if (imageUrl !== '') {
        addImageToGallery(imageUrl);
        imageUrlInput.value = '';
    }
});

// Funkce pro přidání obrázku do galerie
function addImageToGallery(imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.addEventListener('click', function() {
        if (confirm('Opravdu chcete tento obrázek smazat?')) {
            img.remove();
        }
    });
    imageGallery.appendChild(img);
}

// Funkce pro zobrazení detailů bodu v pravém panelu
function displayPointDetails(name, description, images, pointType) {
    const typeIcon = `<img src="icons/${pointType}.svg" alt="${pointType}" width="20" height="20">`;
    pointDetails.innerHTML = `${typeIcon} <h3>${name}</h3><p>${description}</p>`;
    images.forEach(img => {
        const imgElem = document.createElement('img');
        imgElem.src = img;
        imgElem.addEventListener('click', function() {
            if (confirm('Opravdu chcete tento obrázek smazat?')) {
                imgElem.remove();
            }
        });
        pointDetails.appendChild(imgElem);
    });
}

// Funkce pro resetování formuláře
function resetForm() {
    pointNameInput.value = '';
    pointDescriptionInput.value = '';
    imageGallery.innerHTML = '';
}

// Uložení nového bodu do Supabase
async function saveToSupabase(name, description, latLng, images, pointType) {
    const { data, error } = await supabase.from('points').insert([
        {
            name: name,
            description: description,
            lat: latLng.lat,
            lng: latLng.lng,
            images: images,
            pointType: pointType
        }
    ]);
    if (error) console.error('Chyba při ukládání bodu:', error);
}

// Funkce pro načtení dat z Supabase
async function loadFromSupabase() {
    const { data, error } = await supabase.from('points').select('*');
    if (error) console.error('Chyba při načítání dat:', error);
    else {
        data.forEach(point => addPointToMap(point));
    }
}

// Funkce pro přidání bodu na mapu
function addPointToMap(point) {
    const marker = L.marker([point.lat, point.lng]).addTo(map);
    marker.bindPopup(createPopupContent(point.name, point.description, point.images, point.pointType)).openPopup();
    
    marker.on('click', () => {
        currentPointKey = point.id;
        displayPointDetails(point.name, point.description, point.images, point.pointType);
    });

    markers.push({
        id: point.id,
        marker,
        name: point.name,
        description: point.description,
        images: point.images,
        pointType: point.pointType
    });
}

// Načtení dat z databáze při načtení stránky
loadFromSupabase();


// Posluchač změn v reálném čase
supabase
  .from('points')
  .on('INSERT', payload => addPointToMap(payload.new))
  .on('DELETE', payload => removePointFromMap(payload.old.id))
  .subscribe();

// Funkce pro odstranění bodu z mapy
function removePointFromMap(id) {
    const markerIndex = markers.findIndex(m => m.id === id);
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex].marker);
        markers.splice(markerIndex, 1);
    }
}
