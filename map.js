// Firebase konfigurace
const firebaseConfig = {
    apiKey: "AIzaSyBqVqsxLa5Kt_5QVGJuaXGkNDZ8eW4mX3o",
    authDomain: "mapa-addict.firebaseapp.com",
    databaseURL: "https://mapa-addict-default-rtdb.firebaseio.com",
    projectId: "mapa-addict",
    storageBucket: "mapa-addict.appspot.com",
    messagingSenderId: "308245419786",
    appId: "1:308245419786:web:d96951b2dd602009328cf3",
    measurementId: "G-CFPD6GZNDF"
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
  let currentPointKey = null;
  
  // Elementy DOM pro pravý panel
  const confirmButton = document.getElementById('confirm-button');
  const pointNameInput = document.getElementById('point-name');
  const pointDescriptionInput = document.getElementById('point-description');
  const imageUrlInput = document.getElementById('image-url');
  const addImageButton = document.getElementById('add-image');
  const imageGallery = document.getElementById('image-gallery');
  const pointDetails = document.getElementById('point-details');
  const deletePointButton = document.getElementById('delete-point');
  const uploadImageInput = document.getElementById('upload-image');
  
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
  
          const marker = L.marker(pendingMarker.getLatLng()).addTo(map);
          const pointData = {
              marker,
              name,
              description,
              images,
              pointType
          };
          const newPointKey = saveToFirebase(name, description, pendingMarker.getLatLng(), images, pointType);
          marker.bindPopup(createPopupContent(name, description, images, pointType)).openPopup();
  
          marker.on('click', () => {
              currentPointKey = newPointKey;
              displayPointDetails(name, description, images, pointType);
          });
  
          markers.push(pointData);
          resetForm();
          confirmButton.disabled = true;
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
  
  // Přidání obrázku do galerie
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
              img.remove(); // Odstranění obrázku při kliknutí
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
  function saveToFirebase(name, description, latLng, images, pointType) {
      const newPointKey = database.ref().child('points').push().key;
      const pointData = {
          name,
          description,
          latLng: { lat: latLng.lat, lng: latLng.lng },
          images,
          pointType
      };
  
      const updates = {};
      updates['/points/' + newPointKey] = pointData;
  
      database.ref().update(updates);
      return newPointKey;
  }
  
  // Funkce pro načtení dat z Firebase
  function loadFromFirebase() {
      database.ref('/points/').once('value').then(snapshot => {
          const points = snapshot.val();
          for (const key in points) {
              if (points.hasOwnProperty(key)) {
                  const point = points[key];
                  const marker = L.marker([point.latLng.lat, point.latLng.lng]).addTo(map);
                  marker.bindPopup(createPopupContent(point.name, point.description, point.images, point.pointType)).openPopup();
  
                  marker.on('click', () => {
                      currentPointKey = key;
                      displayPointDetails(point.name, point.description, point.images, point.pointType);
                  });
  
                  markers.push({
                      marker,
                      name: point.name,
                      description: point.description,
                      images: point.images,
                      pointType: point.pointType
                  });
              }
          }
      });
  }
  
  // Funkce pro odeslání dat na Discord webhook
  function sendToDiscord(name, description, latLng, images) {
      const discordWebhookUrl = 'https://discord.com/api/webhooks/1280611219644092507/5UntnltFbMqZvcVfiNEy9FaT5voSMagP1HtDAayAm9xmnxoCOYo_O8SqZCh7OQgW2lPG';
  
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
  
  // Funkce pro odstranění bodu
  deletePointButton.addEventListener('click', function() {
      if (currentPointKey && confirm('Opravdu chcete tento bod smazat?')) {
          database.ref('/points/' + currentPointKey).remove();
          location.reload(); // Aktualizace stránky pro obnovení stavu mapy
      }
  });
  
  // Funkce pro zpracování obrázků vložením (Ctrl+V) nebo přetažením
  function handleImageUpload(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
          const imageUrl = e.target.result;
          axios.post(discordWebhookUrl, {
              file: imageUrl
          }).then(response => {
              const uploadedImageUrl = response.data.attachments[0].url;
              addImageToGallery(uploadedImageUrl);
          }).catch(error => {
              console.error('Chyba při odesílání obrázku na Discord:', error);
          });
      };
      reader.readAsDataURL(file);
  }
  
  // Zpracování vložení obrázku (Ctrl+V)
  document.addEventListener('paste', function(e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
          if (item.kind === 'file') {
              handleImageUpload(item.getAsFile());
          }
      }
  });
  
  // Zpracování přetažení obrázku
  imageGallery.addEventListener('dragover', function(e) {
      e.preventDefault();
      imageGallery.classList.add('drag-over');
  });
  
  imageGallery.addEventListener('dragleave', function() {
      imageGallery.classList.remove('drag-over');
  });
  
  imageGallery.addEventListener('drop', function(e) {
      e.preventDefault();
      imageGallery.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      for (const file of files) {
          handleImageUpload(file);
      }
  });
  
  // Zpracování nahrání obrázku pomocí inputu
  uploadImageInput.addEventListener('change', function() {
      const files = uploadImageInput.files;
      for (const file of files) {
          handleImageUpload(file);
      }
  });
  
  // Načtení dat z Firebase při načtení stránky
  loadFromFirebase();
  