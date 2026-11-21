var map = null;
var bound = null;

var getJSON = function (url, successHandler, errorHandler) {
  var xhr = typeof XMLHttpRequest != 'undefined'
    ? new XMLHttpRequest()
    : new ActiveXObject('Microsoft.XMLHTTP');
  xhr.open('get', url, true);
  xhr.responseType = 'json';
  xhr.onreadystatechange = function () {
    var status;
    var data;
    if (xhr.readyState == 4) {
      status = xhr.status;
      if (status == 200) {
        successHandler && successHandler(xhr.response);
      } else {
        errorHandler && errorHandler(status);
      }
    }
  };
  xhr.send();
};

// Ensure libraries are loaded before initializing map
function waitForMapsAPI() {
  if (typeof google !== 'undefined' &&
    typeof google.maps !== 'undefined' &&
    typeof google.maps.LatLngBounds === 'function' &&
    typeof google.maps.marker !== 'undefined' &&
    typeof google.maps.marker.AdvancedMarkerElement === 'function') {
    initMap();
  } else {
    setTimeout(waitForMapsAPI, 500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForMapsAPI);
} else {
  waitForMapsAPI();
}

function initMap() {
  document.getElementById("loading").style.display = "flex";
  bound = new google.maps.LatLngBounds();
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 3,
    center: { lat: 44.397515, lng: -52.857104 },
    mapId: 'DEMO_MAP_ID'
  });
  map.addListener("idle",
    function () {
      rememberMapBoundsInHistory(map, "idle");
    });
  // map.addListener("zoom_changed",
  // 		   function() {
  // 		       rememberMapBoundsInHistory(map,"zoom_changed");
  // 		   });
  var runLayer = null;
  var runLayerRequest = 0;
  window.onpopstate = function (event) {
    // Tthis function fires everytime the browser history goes
    // back (back button, Zoom out button...): we previously added
    // a "page" in the history everytime after the user clicks on
    // a marker cluster, remembering in the page state the zoom
    // level we are in on the map.
    //
    // This function set the map bounds at the zoom level we
    // remembered....
    var state = event.state;
    console.log("onpop ");
    console.log(state);

    if (state != null && state.bounds != null) {
      hideRunLayer(runLayer);
      console.log("resetting bounds");
      map.fitBounds(state.bounds);
    }
  }

  getJSON('https://server.garzon.fr/maps/runs.json.cgi',
    function (data) {
      loadData(data);
    },
    function (data) {
      alert('Erreur Loading Data ' + data);
    }
  );
  function loadData(data) {
    var activityIcons = {
      3: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1596-hiking-solo_4x.png&highlight=ff00000,3949ab,ff000000&scale=4;',
      2: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1731-walking-pedestrian_4x.png&highlight=ff00000,3949ab,ff000000&scale=4;',
      10007: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1731-walking-pedestrian_4x.png&highlight=ff00000,7cb342,ff000000&scale=4;',
      10008: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1731-walking-pedestrian_4x.png&highlight=ff00000,7cb342,ff000000&scale=4;',
      4: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1522-bicycle_4x.png&highlight=ff000000,288d1,ff000000&scale=4;',
      257: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1522-bicycle_4x.png&highlight=ff000000,7cb342,ff000000&scale=4;',
      10004: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1522-bicycle_4x.png&highlight=ff000000,7cb342,ff000000&scale=4;',
      10: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1538-car_4x.png&highlight=ff000000,97a7,ff000000&scale=4;',
      6: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1688-ski-downhill_4x.png&highlight=ff000000,288d1,ff000000&scale=4;',
      5: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1701-swimming_4x.png&highlight=ff000000,288d1,ff000000&scale=4;',
      12: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1615-kayak_4x.png&highlight=ff000000,288d1,ff000000&scale=4;'
    };
    var currentMarker = null;
    var markers = [];
    for (var i = 0; i < data.length; i++) {
      //console.log(data[i]);
      var title = data[i].activity + ', on ' + data[i].date + ': ' + data[i].distance + ' km';
      var icon = document.createElement('img');
      icon.src = activityIcons[data[i].activityID] || activityIcons[2];
      icon.alt = data[i].activity;
      icon.width = 32;
      icon.height = 32;
      var marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: data[i].latitude, lng: data[i].longitude },
        map: map,
        title: title,
        content: icon,
        gmpClickable: true
      });
      bound.extend(marker.position);
      marker.addEventListener('gmp-click', createCallBack(data[i], marker));
      function createCallBack(theObj, theMarker) {
        var myObj = theObj;
        var myMarker = theMarker;
        return function () {
          console.log(myObj);
          if (currentMarker != myMarker) {
            currentMarker = myMarker;
            hideRunLayer();
            updateInfo(myObj);
            showRunLayer(myObj.kmlUrl);
            // Remember the current map position in the history
            rememberMapBoundsInHistory(map, "marker");

          } else {
            // clicks again on the same marker
            // Hiding the current Marker's runLayer if present
            if (runLayer != null) {
              console.log("hiding my runLayer");
              hideRunLayer();
            } else {
              updateInfo(myObj);
              showRunLayer(myObj.kmlUrl);
            }
          }
        };
      }
      markers.push(marker);
    }
    map.fitBounds(bound);
    // Add a marker clusterer to manage the markers.
    // Wait for MarkerClusterer to be available
    function initMarkerClusterer() {
      // Try different possible global locations
      var MC = window.MarkerClusterer || (window.markerClusterer && window.markerClusterer.MarkerClusterer) || window.googlemaps?.markerclusterer?.MarkerClusterer;
      if (!MC) {
        setTimeout(initMarkerClusterer, 100);
        return;
      }
      var markerClusterer = new MC({
        map: map,
        markers: markers,
        zoomOnClick: false
      });
      markerClusterer.addListener('clusterclick', function (cluster) {
        map.setCenter(cluster.getCenter());
        map.fitBounds(cluster.getBounds());
        rememberMapBoundsInHistory(map, "clusterer")
      });
      document.getElementById("loading").style.display = "none";
      rememberMapBoundsInHistory(map, "map");
    }
    initMarkerClusterer();
  }
  var showRunLayer = function (url) {
    var request = ++runLayerRequest;
    var loading = document.getElementById("loading");
    var loadingText = loading.querySelector(".loading-text");
    loadingText.textContent = "Loading workout track";
    loading.style.display = "flex";
    var layerUrl = 'runs.json.cgi?url=' + encodeURIComponent(url) +
      '&_=' + (new Date()).getTime();

    fetch(layerUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to load route (' + response.status + ')');
        }
        return response.text();
      })
      .then(function (kml) {
        if (request != runLayerRequest) {
          return;
        }

        var geoJson = kmlToGeoJSON(kml);
        runLayer = new google.maps.Data({ map: map });
        runLayer.setStyle(runLayerStyle);
        runLayer.addGeoJson(geoJson);

        var routeBounds = new google.maps.LatLngBounds();
        runLayer.forEach(function (feature) {
          feature.getGeometry().forEachLatLng(function (latLng) {
            routeBounds.extend(latLng);
          });
        });
        if (!routeBounds.isEmpty()) {
          map.fitBounds(routeBounds);
        }
        loading.style.display = "none";
        loadingText.textContent = "Loading hikes and rides information";
      })
      .catch(function (error) {
        if (request == runLayerRequest) {
          console.error(error);
          alert('Erreur loading route: ' + error.message);
          loading.style.display = "none";
          loadingText.textContent = "Loading hikes and rides information";
        }
      });
  };
  var hideRunLayer = function () {
    runLayerRequest++;
    var loading = document.getElementById("loading");
    loading.style.display = "none";
    loading.querySelector(".loading-text").textContent =
      "Loading hikes and rides information";
    if (runLayer != null) {
      runLayer.setMap(null);
      runLayer = null;
      updateInfo(null);
    }
  };

}
function kmlToGeoJSON(kml) {
  var documentNode = new DOMParser().parseFromString(kml, 'application/xml');
  if (documentNode.getElementsByTagName('parsererror').length) {
    throw new Error('The KML file is invalid');
  }

  var styles = {};
  var styleNodes = documentNode.getElementsByTagName('Style');
  for (var i = 0; i < styleNodes.length; i++) {
    var styleNode = styleNodes[i];
    var styleId = styleNode.getAttribute('id');
    var lineNode = styleNode.getElementsByTagName('LineStyle')[0];
    var iconNode = styleNode.getElementsByTagName('Icon')[0];

    styles['#' + styleId] = {
      lineColor: lineNode ? kmlColor(lineNode) : null,
      lineWidth: lineNode ? parseFloat(textOf(lineNode, 'width')) || 3 : 3,
      icon: iconNode ? textOf(iconNode, 'href').replace(/^http:/, 'https:') : null
    };
  }

  var features = [];
  var placemarks = documentNode.getElementsByTagName('Placemark');
  for (var j = 0; j < placemarks.length; j++) {
    var placemark = placemarks[j];
    var style = styles[textOf(placemark, 'styleUrl')] || {};
    var properties = {
      name: textOf(placemark, 'name'),
      strokeColor: style.lineColor ? style.lineColor.color : '#1976d2',
      strokeOpacity: style.lineColor ? style.lineColor.opacity : 1,
      strokeWeight: style.lineWidth || 3,
      icon: style.icon
    };
    var lineStrings = placemark.getElementsByTagName('LineString');
    var points = placemark.getElementsByTagName('Point');

    for (var k = 0; k < lineStrings.length; k++) {
      var lineCoordinates = parseKmlCoordinates(textOf(lineStrings[k], 'coordinates'));
      if (lineCoordinates.length > 1) {
        features.push(geoJsonFeature('LineString', lineCoordinates, properties));
      }
    }
    for (var p = 0; p < points.length; p++) {
      var pointCoordinates = parseKmlCoordinates(textOf(points[p], 'coordinates'));
      if (pointCoordinates.length) {
        features.push(geoJsonFeature('Point', pointCoordinates[0], properties));
      }
    }
  }

  if (!features.length) {
    throw new Error('The KML file contains no route geometry');
  }
  return { type: 'FeatureCollection', features: features };
}

function runLayerStyle(feature) {
  if (feature.getGeometry().getType() == 'Point') {
    var icon = feature.getProperty('icon');
    return {
      icon: icon || {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#1976d2',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1,
        scale: 5
      }
    };
  }
  return {
    strokeColor: feature.getProperty('strokeColor'),
    strokeOpacity: feature.getProperty('strokeOpacity'),
    strokeWeight: feature.getProperty('strokeWeight')
  };
}

function kmlColor(node) {
  var color = textOf(node, 'color');
  if (!/^[0-9a-f]{8}$/i.test(color)) {
    return null;
  }
  return {
    color: '#' + color.slice(6, 8) + color.slice(4, 6) + color.slice(2, 4),
    opacity: parseInt(color.slice(0, 2), 16) / 255
  };
}

function parseKmlCoordinates(value) {
  var coordinates = [];
  var tuples = value.trim().split(/\s+/);
  for (var i = 0; i < tuples.length; i++) {
    var values = tuples[i].split(',');
    var longitude = parseFloat(values[0]);
    var latitude = parseFloat(values[1]);
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      coordinates.push([longitude, latitude]);
    }
  }
  return coordinates;
}

function textOf(node, tagName) {
  var child = node && node.getElementsByTagName(tagName)[0];
  return child ? child.textContent.trim() : '';
}

function geoJsonFeature(type, coordinates, properties) {
  return {
    type: 'Feature',
    properties: properties,
    geometry: { type: type, coordinates: coordinates }
  };
}

var updateInfo = function (obj) {
  var div = document.getElementById('activityDetails');
  var geocoder = new google.maps.Geocoder;
  if (obj == null) {
    div.style.display = "none";
  } else {
    let iterable = ["activity", "startTime", "runTime", "stoppedTime", "distance", "calories", "ascent", "descent", "avgSpeed", "maxSpeed", "avgHeartRate", "maxHeartRate", "stepsPM", "steps", "maxStepsPM", "runID"];

    for (let value of iterable) {
      document.getElementById(value).innerHTML = obj[value];
    }
    let urls = ["url", "kmlUrl"];

    for (let u of urls) {
      document.getElementById(u).setAttribute('href', obj[u]);
    }
    geocoder.geocode({ 'location': { lat: obj.latitude, lng: obj.longitude } }, function (results, status) {
      if (status === 'OK') {
        if (results[1]) {
          document.getElementById("address").innerHTML = results[0].formatted_address;
        } else {
          document.getElementById("address").innerHTML = "QQQQ";
        }
      } else {
        document.getElementById("address").innerHTML = 'Geocoder failed due to: ' + status;
      }
    });
    div.style.display = "inline";
  }
};
var rememberMapBoundsInHistory = function (map, level) {
  var stateObj = {
    bounds: map.getBounds().toJSON()
  };
  console.log("remembering zoom at level " + level);
  console.log(stateObj);
  history.pushState(stateObj, "", "")
};
