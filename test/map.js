// map.js

// Firebase konfigurace (nahraď ji svou vlastní)
const firebaseConfig = {
    apiKey: "AIzaSyBqVqsxLa5Kt_5QVGJuaXGkNDZ8eW4mX3o",
    authDomain: "mapa-addict.firebaseapp.com",
    databaseURL: "https://mapa-addict-default-rtdb.firebaseio.com",
    projectId: "mapa-addict",
    storageBucket: "mapa-addict.appspot.com",
    messagingSenderId: "308245419786",
    appId: "1:308245419786:web:d96951b2dd602009328cf3"
  };
  
  // Inicializace Firebase
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  
  // Rozsah obrázku mapy (změň souřadnice podle rozměrů mapy)
  const bounds = [[0, 0], [2000, 2000]]; // Příklad: (0, 0) je levý horní roh, (2000, 2000) je pravý dolní roh
  
  // Inicializace mapy s rozsahem mapy
  const map = L.map('map', {
      crs: L.CRS.Simple, // Jednoduchý CRS pro obrázky
      minZoom: -2,
      maxZoom: 2, // Umožnění zoomovat ven i dovnitř
      zoomSnap: 0.25 // Plynulé přiblížení
  }).fitBounds(bounds);
  
  const imageUrl = 'images/mapa.png';
  L.imageOverlay(imageUrl, bounds).addTo(map);
  
  // Proměnné pro správu stavu
  let markers = [];
  let pendingMarker = null;
  
  // Elementy DOM pro pravý panel
  const confirmButton = document.getElementById('confirm-button');
  const pointNameInput = document.getElementById('point-name');
  const pointDescriptionInput = document.getElementById('point-description');
  const imageUrlInput = document.getElementById('image-url');
  const addImageButton = document.getElementById('add-image');
  const imageGallery = document.getElementById('image-gallery');
  const pointDetails = document.getElementById('point-details');
  
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
          
          if (name === '') {
              alert('Prosím, zadejte název bodu.');
              return;
          }
  
          const marker = L.marker(pendingMarker.getLatLng()).addTo(map);
          markers.push({
              marker,
              name,
              description,
              images // Pole pro obrázky
          });
  
          marker.bindPopup(createPopupContent(name, description, images)).openPopup();
  
          // Přidání event listeneru pro zobrazení detailů bodu
          marker.on('click', () => {
              displayPointDetails(name, description, images);
          });
  
          // Uložení dat do Firebase
          saveToFirebase(name, description, pendingMarker.getLatLng(), images);
  
          // Vymazání vstupů
          resetForm();
          confirmButton.disabled = true;
          pendingMarker = null;
      }
  });
  
  // Funkce pro vytváření obsahu popupu
  function createPopupContent(name, description, images) {
      let content = `<strong>${name}</strong><br>${description}<br>`;
      images.forEach(img => {
          content += `<img src="${img}" alt="Obrázek" width="100"><br>`;
      });
      return content;
  }
  
  // Přidání obrázku do galerie
  addImageButton.addEventListener('click', function() {
      const imageUrl = imageUrlInput.value.trim();
      if (imageUrl !== '') {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.addEventListener('click', function() {
              img.remove(); // Odstranění obrázku při kliknutí
          });
          imageGallery.appendChild(img);
          imageUrlInput.value = '';
      }
  });
  
  // Funkce pro zobrazení detailů bodu v pravém panelu
  function displayPointDetails(name, description, images) {
      pointDetails.innerHTML = `<h3>${name}</h3><p>${description}</p>`;
      images.forEach(img => {
          const imgElem = document.createElement('img');
          imgElem.src = img;
          pointDetails.appendChild(imgElem);
      });
  }
  
  // Funkce pro resetování formuláře
  function resetForm() {
      pointNameInput.value = '';
      pointDescriptionInput.value = '';
      imageGallery.innerHTML = '';
  }
  
  // Funkce pro uložení dat do Firebase
  function saveToFirebase(name, description, latLng, images) {
      const newPointKey = database.ref().child('points').push().key;
      const pointData = {
          name,
          description,
          latLng: { lat: latLng.lat, lng: latLng.lng },
          images
      };
  
      const updates = {};
      updates['/points/' + newPointKey] = pointData;
  
      return database.ref().update(updates);
  }
  
  // Funkce pro načtení dat z Firebase
  function loadFromFirebase() {
      database.ref('/points/').once('value').then(snapshot => {
          const points = snapshot.val();
          for (const key in points) {
              if (points.hasOwnProperty(key)) {
                  const point = points[key];
                  const marker = L.marker([point.latLng.lat, point.latLng.lng]).addTo(map);
                  marker.bindPopup(createPopupContent(point.name, point.description, point.images)).openPopup();
  
                  markers.push({
                      marker,
                      name: point.name,
                      description: point.description,
                      images: point.images
                  });
  
                  marker.on('click', () => {
                      displayPointDetails(point.name, point.description, point.images);
                  });
              }
          }
      });
  }
  
  // Načtení dat z Firebase při načtení stránky
  loadFromFirebase();
  
  // Funkce pro odeslání dat na Discord webhook
function sendToDiscord(name, description, latLng, images) {
    const discordWebhookUrl = 'https://discord.com/api/webhooks/1280611219644092507/5UntnltFbMqZvcVfiNEy9FaT5voSMagP1HtDAayAm9xmnxoCOYo_O8SqZCh7OQgW2lPG'; // Nahraď skutečným webhook URL

    const data = {
        content: `**Nový bod přidán!**\n\n**Název:** ${name}\n**Popis:** ${description}\n**Pozice:** ${latLng.lat}, ${latLng.lng}\n**Obrázky:**\n${images.join('\n')}`
    };

    axios.post(discordWebhookUrl, data)
        .then(response => {
            console.log('Data odeslána na Discord:', response);
        })
        .catch(error => {
            console.error('Chyba při odesílání na Discord:', error);
        });
}
