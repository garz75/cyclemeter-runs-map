#!/usr/bin/perl

use strict;
use CGI;
use LWP::UserAgent;
use Data::Dumper;
use JSON::XS;
use Data::Dumper;
use DateTime;
our $q = new CGI;
print $q->header(-type => "text/html");

my $t = time;
print << "EOHE";
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="initial-scale=1.0">
    <meta charset="utf-8">
    <title>Garz's Hikes and Rides</title>
<!-- Google Fonts -->
<link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic">

<!-- CSS Reset -->
<link rel="stylesheet" href="//cdn.rawgit.com/necolas/normalize.css/master/normalize.css">

<!-- Milligram CSS minified -->
<link rel="stylesheet" href="//cdn.rawgit.com/milligram/milligram/master/dist/milligram.min.css">

<!-- You should properly set the path from the main file. -->
    <style>
      /* Always set the map height explicitly to define the size of the div
       * element that contains the map. */
      #container {
        height:100%;
       display:flex;
       flex-direction:row;
       justify-content: space-around;
      }
      #map {
        height:100%;
        width: 80%;
        display:flex;
        flex-direction:column;
      }
      #left {
        width: 19%;
         display:flex;
        flex-direction:column;
      }
      /* Optional: Makes the sample page fill the window. */
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
     #loading {
       display:none
   left:50%;
   top:50%;
   -webkit-transform: translate(-50%, -50%);
    -moz-transform: translate(-50%, -50%);
   transform: translate(-50%, -50%);
   position:absolute;
   border: 1px solid black;


     }
     #activityDetails {
       display:none;
    font-size: 80%;
     }
    td {
      padding: 0
    } 
    </style>
  </head>
  <body>
    <div id="container"> 
    <div id="map">    
   
    </div>
    <div id="left">
      <h3>Garz's Hikes and Rides</h3>
    <div id="loading"><img src="img/loading.gif"></div>   
    <a onClick="map.fitBounds(bound);" href="#">Reset zoom</a>
       Zoom and click on the markers to display more info on the workout
    <div id="activityDetails">
    <table>
  <thead>
    <tr>
      <th>Activity</th>
      <th id="activity">Hike</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Starting Date</td>
      <td id="startTime"></td>
    </tr>
    <tr>
      <td>Activity Duration</td>
      <td id="runTime">02:10:24</td>
    </tr>
    <tr>
      <td>Distance (km)</td>
      <td id="distance">25.1</td>
    </tr>
    <tr>
      <td>Stopped Time</td>
      <td id="stoppedTime">00:50:54</td>
    </tr>
    <tr>
      <td>Average Speed (km/h)</td>
      <td id="avgSpeed">25.1</td>
    </tr>
    <tr>
      <td>Maximum Speed (km/h)</td>
      <td id="maxSpeed">25.1</td>
    </tr>
    <tr>
      <td>Ascent</td>
      <td id="ascent">00:50:54</td>
    </tr>
    <tr>
      <td>Descent</td>
      <td id="descent">00:50:54</td>
    </tr>
    <tr>
      <td>Calories</td>
      <td id="calories">00:50:54</td>
    </tr>
    <tr>
      <td>Average Heart Rate</td>
      <td id="avgHeartRate">00:50:54</td>
    </tr>
    <tr>
      <td>Max. Heart Rate</td>
      <td id="maxHeartRate">00:50:54</td>
    </tr>
    <tr>
      <td><a href="#" target="_blank" id="url">More details</a> </td>
      <td><a href="#"  id="kmlUrl">KML file</a> </td>
    </tr>
  </tbody>
</table>
    </div>
    </div>
    </div>
    <script>
      function initMap() {
	  document.getElementById("loading").style.display = "inline";
	  bound = new google.maps.LatLngBounds();
          map = new google.maps.Map(document.getElementById('map'), {
          zoom: 3,
          center: {lat: 44.397515,  lng: -52.857104  }
        });

//        var ctaLayer = new google.maps.KmlLayer({
 //         url: 'http://server.garzon.fr/maps/liste_kml.cgi?date=$t',
//          map: map
//       });


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
			    if (runLayer != null) { 
				runLayer.setMap(null);
			    }
			    updateInfo(myObj);
			    runLayer = new google.maps.KmlLayer(
				{
				  url: myObj.kmlUrl,
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
		
	    }
	    map.fitBounds(bound);
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

    </script>
    <script async defer
    src="https://maps.googleapis.com/maps/api/js?key=AIzaSyClD6LibYmhb33Mc6bbA2Vq8xamo9hxmWU&callback=initMap">
     var map = null;
     var bound = null; 
    </script>
  </body>
</html>


EOHE

