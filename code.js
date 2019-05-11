var getJSON = function(url, successHandler, errorHandler) {
    var xhr = typeof XMLHttpRequest != 'undefined'
	? new XMLHttpRequest()
	: new ActiveXObject('Microsoft.XMLHTTP');
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
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

function initMap() {
    document.getElementById("loading").style.display = "inline";
    bound = new google.maps.LatLngBounds();
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        center: {lat: 44.397515,  lng: -52.857104  }
    });
    var runLayer = null;
    window.onpopstate = function(event) {
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
	
	if (state != null && state.bounds !=null) {
	    hideRunLayer(runLayer);
	    console.log("resetting bounds");
	    map.fitBounds(state.bounds);
	}   
    }

    getJSON('http://server.garzon.fr/maps/runs.json.cgi', 
	    function(data) {
		loadData(data);
	    },
	    function(data) {
		alert('Erreur Loading Data ' + data);
	    }
	   );
    function loadData(data) {
	var activityIcons = {
	    3: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1596-hiking-solo_4x.png&highlight=ff00000,3949ab,ff000000&scale=4;',
	    2: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1731-walking-pedestrian_4x.png&highlight=ff00000,3949ab,ff000000&scale=4;',
	    4: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1522-bicycle_4x.png&highlight=ff000000,288d1,ff000000&scale=4;',
	    10: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1538-car_4x.png&highlight=ff000000,97a7,ff000000&scale=4;',
	    6:  'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1688-ski-downhill_4x.png&highlight=ff000000,288d1,ff000000&scale=4;'
	};
	var currentMarker = null;
	var markers = [];
	for (var i = 0; i < data.length; i++) {
	    //console.log(data[i]);
	    var title = data[i].activity + ', on ' + data[i].date + ': '+ data[i].distance + ' km';
	    var marker = new google.maps.Marker(
		{
		    position: { lat:data[i].latitude, lng:data[i].longitude}, 
		    map: map,
		    title: title,
		    icon: activityIcons[data[i].activityID]
		});
	    bound.extend(marker.getPosition());
	    marker.addListener('click', createCallBack(data[i],marker));
	    function createCallBack(theObj,theMarker) {
		var myObj=  theObj;
		var myMarker = theMarker;
		return function() {
		    console.log(myObj);
		    if (currentMarker != myMarker) {
			currentMarker = myMarker;
			hideRunLayer(runLayer);
			updateInfo(myObj);
			var date = (new Date()).getTime();
			var k = myObj.kmlUrl + '?' + date ; 
			runLayer = new google.maps.KmlLayer(
			    {
				url: k,
				map: map,
				preserveViewport:  false
			    }
			);
			// Remember the current map position in the history 
			rememberMapBoundsInHistory(map,"marker");

		    } else {
			// clicks again on the same marker
			// Hiding the current Marker's runLayer if present
			if (runLayer != null) {
			    console.log("hiding my runLayer");
			    hideRunLayer(runLayer);
			} else {
			    updateInfo(myObj);
			    runLayer = new google.maps.KmlLayer(
				{
				    url: myObj.kmlUrl,
				    map: map,
				    preserveViewport: false
				}
			    );
			}
		    }
		};
	    }
	    markers.push(marker);
	}
	map.fitBounds(bound);
	// Add a marker clusterer to manage the markers.
        var markerClusterer = new MarkerClusterer(map, markers,
						  {   zoomOnClick: false, // We zoom ourselves in the clusterclick event
						      imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
						      maxZoom: 12
						  });
	google.maps.event.addListener(markerClusterer, 'clusterclick', function(cluster){
	    // We do the zoom ourselves to make sure we remember
	    // the mapBound in history AFTER it has been applied
	    // (the clusterclick event is fired BEFORE the zoom is
	    // done by Markerclusterer...)
	    map.setCenter(cluster.getCenter());
	    map.fitBounds(cluster.getBounds());
	    rememberMapBoundsInHistory(map, "clusterer")
	});
	document.getElementById("loading").style.display = "none";
	rememberMapBoundsInHistory(map,"map");
    }
    var hideRunLayer = function(){
	if (runLayer != null) {
	    runLayer.setMap(null);
	    runLayer = null;
	    updateInfo(null);
	}
    };

}
var updateInfo = function(obj){
    var div = document.getElementById('activityDetails');
    var geocoder = new google.maps.Geocoder;
    if (obj == null) {
	div.style.display= "none";
    } else {
	let iterable = ["activity", "startTime", "runTime", "stoppedTime", "distance","calories","ascent","descent","avgSpeed","maxSpeed", "avgHeartRate", "maxHeartRate", "stepsPM", "steps", "maxStepsPM", "runID"];
	
	for (let value of iterable) {
	    document.getElementById(value).innerHTML=obj[value];
	}
	let urls = ["url","kmlUrl"];
	
	for (let u of urls) {
	    document.getElementById(u).setAttribute('href', obj[u]);
	}
	geocoder.geocode({'location': {lat: obj.latitude, lng: obj.longitude}}, function(results, status) {
	    if (status === 'OK') {
		if (results[1]) {
		    document.getElementById("address").innerHTML=results[0].formatted_address;
		} else {
		    document.getElementById("address").innerHTML="QQQQ";
		}
	    } else {
		document.getElementById("address").innerHTML = 'Geocoder failed due to: ' + status;
	    }
	});
	div.style.display= "inline";
    }
};
var rememberMapBoundsInHistory = function(map, level) {
    var stateObj = {
	bounds: map.getBounds().toJSON()
    };
    console.log("remembering zoom at level " + level);
    console.log(stateObj);
    history.pushState(stateObj, "", "")
};

