const weatherKey = 'eccf22da55066e5d6f4d1b4f4bcc8dde';
const collectionID = "events";
const s3bucket = "https://s3712755-cw2-s3.s3.amazonaws.com/";
const icon = {
  bikeShare: s3bucket + "bikeshare.png",
  bike: s3bucket + "bike.png",
  drink: s3bucket + "drink.png"
};
const melbLoc = {
  lat:-37.8136,
  lng:144.9631
}

//Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAQqXzE9r5h9VYoKuQ17pFQ5eIX1U4DxNM",
  authDomain: "cc-cw2.firebaseapp.com",
  databaseURL: "https://cc-cw2.firebaseio.com",
  projectId: "cc-cw2",
  storageBucket: "cc-cw2.appspot.com",
  messagingSenderId: "173260217704",
  appId: "1:173260217704:web:d6fb06c77869d416444add",
  measurementId: "G-0SB74NH314"
};

//Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

//var selectedOption = document.getElementById("menu");
//selectedOption.value="BikeShop";

////////////////---weatherNow Function---////////////////

function weatherNow() {
  $.getJSON('https://ipapi.co/json/').done(function (location) {
    $.getJSON('https://api.openweathermap.org/data/2.5/weather?lat=' + location.latitude + '&lon=' + location.longitude + '&appid=' + weatherKey + "&units=metric").done(function (data) {
      if (data.wind.speed * 3.6 > 30) {
        var windyAnswer = "It's too windy to cycle!";
      } else {
        var windyAnswer = "It's not that windy to cycle!";
      }
      document.getElementById('weather').innerHTML = data.weather[0].description + " " + Math.round(data.main.temp) + '&deg; ' + Math.round(data.wind.speed * 3.6) + "km/h wind speed";
      document.getElementById('windy').innerHTML = windyAnswer;
    })
  })
}//END weatherNow

////////////////---initMap Function---////////////////

////Adapted from
//https://developers.google.com/maps/documentation/javascript/adding-a-google-map
//https://developers.google.com/maps/documentation/javascript/importing_data
function initMap() {
  var options = {
    zoom: 12,
    center: new google.maps.LatLng(melbLoc.lat, melbLoc.lng)//Melbourne geolocation
  };

  var map = new google.maps.Map(document.getElementById('map'), options);
  var infoWindow = new google.maps.InfoWindow();

  ////////////////---addMarker Function---////////////////

  function addMarker(place) {
    var marker = new google.maps.Marker({
      position: place.location,
      map: map,
      icon: place.icon,
      title: place.title
    });

    marker.addListener('click', function () {
      infoWindow.setContent(place.title);
      infoWindow.open(map, marker)
    });
  }//END addMarker

  var selectedOption = document.getElementById("menu").value;
  console.log(selectedOption + " selected");
  //https://data.melbourne.vic.gov.au/Assets-Infrastructure/Drinking-fountains/h4ih-tzqs
  var xmlFile = s3bucket + "Drinking_fountains.xml";

  //https://www.w3schools.com/xml/ajax_xmlhttprequest_response.asp
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      activateSelectedOption(this);
    }
  };
  xhttp.open("GET", xmlFile, true);
  xhttp.send();

  ////////////////---activateSelectedOption Function---////////////////
  function activateSelectedOption(xml) {
    xmlDoc = xml.responseXML;
    if (selectedOption == "BikeShop") {
      bikeShopReq();
    }

    if (selectedOption == "DrinkingFountain") {
      var x = xmlDoc.getElementsByTagName("row");
      for (i = 0; i < x.length; i++) {
        var lat = x[i].getElementsByTagName('lat')[0].childNodes[0].nodeValue;
        var lng = x[i].getElementsByTagName('lon')[0].childNodes[0].nodeValue;
        var latLng = { location: new google.maps.LatLng(lat, lng), title: 'Drinking Fountain', icon: icon.drink };
        addMarker(latLng);
      }
    }//DrinkingFountain

    //First loop has the location while the 2nd has the bike share station status info. Both dataset share stationID
    if (selectedOption == "BikeShare") {
      $.getJSON('https://data.melbourne.vic.gov.au/resource/vrwc-rwgm.json?$$app_token=UPwcXKkm4fIbcEmoRCjfxGAC0').done(function (loc1) {
        $.getJSON('https://data.melbourne.vic.gov.au/resource/tdvh-n9dv.json?$$app_token=UPwcXKkm4fIbcEmoRCjfxGAC0').done(function (loc2) {
          for (var i = 0; i < loc1.length; i++) {
            for (var j = 0; j < loc2.length; j++) {
              if (loc1[i].station_id == loc2[j].station_id) {
                var lat = loc1[i].lat;
                var lng = loc1[i].lon;
                var desc = loc1[i].name + "\n Capacity: " + loc2[j].capacity + "\n Available bikes: " + loc2[j].available_bikes + "\n Empty docks: " + loc2[j].empty_docks;
                var latLng = { location: new google.maps.LatLng(lat, lng), title: desc, icon: icon.bikeShare };
                addMarker(latLng);
              }//END if
            }//END inner for loop
          }//END outer for loop
        })//2nd dataset type JSON
      })//1st dataset type JSON
    }//BikeShare
  }
}//END initMap

////////////////---bikeShopReq Function---////////////////

function bikeShopReq() {
  var map, infoWindow;
  var pos;

  map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(melbLoc.lat, melbLoc.lng),
    zoom: 12
  });

  //Get user location to display local bike shops
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      map.setCenter(pos);
      var currentLoc = new google.maps.LatLng(pos.lat, pos.lng);

      //request to Places API of bike shops within 5km
      var request = {
        location: currentLoc,
        radius: '5000',
        keyword: ['bike shop']
      };

      service = new google.maps.places.PlacesService(map);
      service.nearbySearch(request, callback);
    });
  }
  ////////////////---callback Function---////////////////

  function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      for (var i = 0; i < results.length; i++) {
        var place = results[i];
        addMarker(results[i]);
      }
    }
  }//END callback

  var infoWindow = new google.maps.InfoWindow();

  //Another addMarker function to handle marker of Places API output
  function addMarker(place) {
    var marker = new google.maps.Marker({
      position: place.geometry.location,
      map: map,
      icon: icon.bike,
      title: place.name
    });

    marker.addListener('click', function () {
      infoWindow.setContent(place.name);
      infoWindow.open(map, marker)
    });
  }
}//END bikeShopReq



////////////////---firebaseAuth Function---////////////////
function firebaseAuth() {

  const loginResp = document.getElementById("loginResp");//to show status of login
  const logout = document.getElementById("logout");
  const loginForm = document.getElementById("login-form");
  const login_email = document.getElementById("login-email");
  const login_password = document.getElementById("login-password");
  const addContentBtn = document.getElementById("addContentBtn");

  //listener to login status
  auth.onAuthStateChanged(user => {
    if (user) {
      loginResp.innerHTML = "user logged in with email: " + user.email;
      //Display buttons when user is logged in
      logout.style.display = 'block';
      addContentBtn.style.display = 'block';
      //call this function to display
      firebaseAddContent();
    } else {
      loginResp.innerHTML = "No user logged in!";
    }
  })


  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();//preventing from moving forward to another page i.e close modal page

    const email = login_email.value;
    const password = login_password.value;

    loginForm.reset();//empty user inputs

    auth.signInWithEmailAndPassword(email, password).then((cred) => {
    }).catch(error => {
      alert("Login credential is not right!");
      logout.style.display = 'none';
      addContentBtn.style.display = 'none';
      firebaseAddContent();
      auth.signOut();//if user is logged in and tried to login with wrong details, it will sign out
    });


  });

  logout.addEventListener('click', (e) => {
    e.preventDefault();
    if (auth.currentUser) {
      alert("User Log out");
      auth.signOut();
      logout.style.display = 'none';
      addContentBtn.style.display = 'none';
      firebaseAddContent();
    }
    loginForm.reset();
  });
}//END firebaseAuth


////////////////---firebaseAddContent Function---////////////////

function firebaseAddContent() {

  var fileupload = document.getElementById('fileupload');
  var progress = document.getElementById('progress');
  var addContent = document.querySelector('#addContent-form');
  var imgName;
  var downloadURL;

  //by default add content form is hided
  if (addContent.style.display == 'none') {
    addContent.style.display = 'block';
  } else {
    addContent.style.display = 'none';
  }

  //upload starts once the user choose a file
  //adapted from https://stackoverflow.com/questions/41304405/firebase-storage-web-how-to-upload-a-file
  fileupload.addEventListener('change', function (e) {
    var file = e.target.files[0];
    imgName = file.name;
    var storageRef = firebase.storage().ref('images/' + imgName);
    var uploadTask = storageRef.put(file);

    uploadTask.on('state_changed', function (x) {
      var percentage = (x.bytesTransferred / x.totalBytes) * 100;
      progress.value = percentage;
    }, function (error) {
      console.log('Something went wrong');
    }, function () {
      alert("File Uploaded");
      progress.value = 0;
      console.log('File Uploaded');
    });
  });//END fileupload listener

  addContent.addEventListener('submit', (e) => {
    e.preventDefault();

    var title = addContent['title'].value;
    var description = addContent['description'].value;
    var locationLat = parseFloat(addContent['locationLat'].value);
    var locationLng = parseFloat(addContent['locationLng'].value);

    if (imgName != null) {//if there is image uploaded then their url will be added to DB
      //getDownloadURL() is asynchronous so it's available within .then {}
      firebase.storage().ref("images/" + imgName).getDownloadURL().then(url => {

        db.collection(collectionID).add({
          timeCreated: firebase.firestore.FieldValue.serverTimestamp(),
          title: title,
          description: description,
          location: new firebase.firestore.GeoPoint(locationLat, locationLng),
          imageNAME: imgName,
          image: url
        }).then(() => {
          console.log("added to DB");
          imgName = null; //in case user doesn't upload an image in the second round
          alert("Details have been added");
        }).catch(error => {
          console.log(error.message);
        })//END DB add

      });//END getDownloadURL

    } else {
      db.collection(collectionID).add({
        timeCreated: firebase.firestore.FieldValue.serverTimestamp(),
        title: title,
        description: description,
        location: new firebase.firestore.GeoPoint(locationLat, locationLng),
      }).then(() => {
        console.log("added to DB");
        alert("Details have been added");
      }).catch(error => {
        console.log(error.message);
      })//END DB add without img url
    }


    addContent.reset();

  })//END addContent

}

////////////////---displayEvents Function---////////////////

function displayEvents() {

  var eventsToShow = document.querySelector('.eventsToShow');

  const mapid = document.querySelector('#mapid');

  //adapted from https://leafletjs.com/examples/quick-start/
  //leafletjs is an open-source JS library for mobile-friendly interactive maps
  //layer of map from https://mapbox.com/
  var mymap = L.map(mapid).setView([melbLoc.lat, melbLoc.lng], 10);;
  const mapboxKEY = 'pk.eyJ1IjoibW9hZmFxIiwiYSI6ImNrMXUyZGcycjBlYWkzbW8wbmI0c3lrbGUifQ.5LaqXBC2IoMotWH1Kpttqg';
  L.tileLayer('https://api.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=' + mapboxKEY).addTo(mymap);

  function addMarkOnMap(lat, lng, title) {
    var inTitle = "<a href=#" + title.split(' ').join('') + ">" + title + "</a>";//adding links to markers to direct to event post
    L.marker([lat, lng]).addTo(mymap).bindPopup(inTitle).openPopup();
  }

  //realtime retrieval of data ordered by latest to be in top
  db.collection(collectionID).orderBy("timeCreated", "desc").onSnapshot(results => {
    retrieveData(results.docs);
  }, error => {
    console.log(error.message)
  });

  ////////////////---retrieveData Function---////////////////
  function retrieveData(events) {

    //adapted from https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
    function timeConverter(UNIX_timestamp){
      var a = new Date(UNIX_timestamp * 1000);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var year = a.getFullYear();
      var month = months[a.getMonth()];
      var date = a.getDate();
      var hour = a.getHours();
      var min = a.getMinutes();
      var sec = a.getSeconds();
      var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
      return time;
    }


    let html = '';

    //loop inside the collection
    events.forEach(event => {
      //for posts without image url, display default image
      var imageToShow = (event.data().image != null) ? event.data().image : s3bucket + "noimg.png";
      var _lat = event.data().location._lat;
      var _lng = event.data().location._long;
      addMarkOnMap(_lat, _lng, event.data().title);
      const li = `
          <li>
          <a style="color: black;" name="${event.data().title.split(' ').join('')}" <div class="collapsible-header grey lighten-4">${event.data().title}</div></a>
          <div class="collapsible-body white">
          <div>
          <img src="${imageToShow}" height="350px" style="float:left;padding:10px;">
          <p>${event.data().description}</p>
          <a href="https://www.google.com/maps/dir//${_lat},${_lng}/@15z/data=!4m2!4m1!3e2" target="_blank"><p>CLICK to get Direction to location</p></a>
          <code>postID: ${event.id}</code><br>
          <code>CreatedOn: ${timeConverter(event.data().timeCreated.seconds)}</code>
          <div style="clear:both;"></div>
          </div>
          </div>
          </li>
          `;
      html += li;
    });
    eventsToShow.innerHTML = html;
  }//END retrieveData
}//END displayEvents

//Deleting-posts form used by admin with provided post id as well as deleting the image associated with it
const post2Delete = document.getElementById("post2Delete");
const btnPost2Delete = document.getElementById("btnPost2Delete");

btnPost2Delete.addEventListener('click', (e) => {
  e.preventDefault();
  var docEntered = db.collection(collectionID).doc(post2Delete.value);

  docEntered.get().then(doc => {

    if (doc.exists) {
      firebase.storage().ref('images/' + doc.get('imageNAME')).delete().then(() => {
        console.log("Image deleted");
      }).catch(error => {
        console.log("Can't find image with this post", error.message);
      })
      docEntered.delete();
      post2Delete.value = '';
      alert("Post has been deleted");
    } else {
      alert("Post doesn't exist");
    }
  }).catch(error => {
    console.log("No such document exist", error.message);
  });
});//END btnPost2Delete listener
