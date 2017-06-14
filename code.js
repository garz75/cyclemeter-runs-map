    function initMap() {
	  document.getElementById("loading").style.display = "inline";
	  bound = new google.maps.LatLngBounds();
          map = new google.maps.Map(document.getElementById('map'), {
          zoom: 3,
          center: {lat: 44.397515,  lng: -52.857104  }
        });
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
		4: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1522-bicycle_4x.png&highlight=ff000000,288d1,ff000000&scale=4;',
		10: 'https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1538-car_4x.png&highlight=ff000000,97a7,ff000000&scale=4;'
	    };
	    var runLayer = null;
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
			
			//console.log(myObj);
			if (currentMarker != myMarker) {
			    currentMarker = myMarker;
			    if (runLayer != null) { 
				runLayer.setMap(null);
			    }
			    updateInfo(myObj);
			    var date = (new Date()).getTime();
			    var k = myObj.kmlUrl + '?' + date ; 
			    console.log(k);
			    runLayer = new google.maps.KmlLayer(
				{
				  url: k,
				  map: map,
				  preserveViewport:  false
				}
				);
			    
			} else {
			    if (runLayer != null) {
				runLayer.setMap(null);
				runLayer = null;
				updateInfo(null);

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
		function updateInfo(obj){
		    var div = document.getElementById('activityDetails');
		    if (obj == null) {
			div.style.display= "none";
		    } else {
			let iterable = ["activity", "startTime", "runTime", "stoppedTime", "distance","calories","ascent","descent","avgSpeed","maxSpeed", "avgHeartRate", "maxHeartRate"];

			for (let value of iterable) {
			    document.getElementById(value).innerHTML=obj[value];
			}
			let urls = ["url","kmlUrl"];

			for (let u of urls) {
			    document.getElementById(u).setAttribute('href', obj[u]);
			}
			div.style.display= "inline";
		    }
		}
		markers.push(marker);
	    }
	    map.fitBounds(bound);
	    // Add a marker clusterer to manage the markers.
            var markerCluster = new MarkerClusterer(map, markers,
						    {
							imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
							maxZoom: 12
						    });
	    document.getElementById("loading").style.display = "none";
	}
}
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

