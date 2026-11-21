# Cyclemeter Runs Map

This is a simple map, using Google Maps JS API to display on a single Google map all your runs from your CycleMeter database. 

## How does this work

[CycleMeter](http://abvio.com/cyclemeter/) is an IOS application to record your rides, hikes and other physical activities on your phone. It records your position, speed, altitude, heart rate, etc. and stores them in an sqlite3 database on your phone, optionally synchronized across devices with iCloud.
Cyclemeter allows you to share your workoute data from their web site. Once a workout is completed, Cyclemeter uploads the data on cyclemeter.com and shows it in web page and a KML file. However, it does not provide a way to map all your rides on a single map. Hence this little project.

This web application extracts the data from the sqlite3 database and builds a map to display every run stored in the database. It displays them as "clustered" markers on Google Maps. A click on a specific marker retrieves the run's KML through a same-origin proxy, converts its geometry to GeoJSON, and displays it with the Google Maps Data layer. See screenshots below.

The CycleMeter DB file (Meter.db) needs to be uploaded from the iPhone to the web site where the web application runs. See the FAQ on [Cyclemeter Support site](http://abvio.com/question/transfer/) to see how to use iTunes file sharing to retrieve the file. You also need to have chosen to share the run information from Cyclemeter, as this app uses the hosted KML file to show the workout track on the map.
 
## Requirement / Dependencies
 
 1. A web server to host the static pages, the CGI script (perl), and the CycleMeter sqlite3 db.
 1. You will need a [Google Maps JavaScript API key](https://developers.google.com/maps/documentation/javascript/get-api-key#key-restrictions). Create it in a Google Cloud project with billing enabled, then enable both the **Maps JavaScript API** and **Geocoding API**. Restrict the key to the Maps JavaScript and Geocoding APIs and to your site's HTTP referrers.
 1. Advanced markers require a [Google Maps Map ID](https://developers.google.com/maps/documentation/get-map-id). Use your own JavaScript Map ID for production instead of `DEMO_MAP_ID`.
 1. Perl dependencies on the server: CGI, JSON::XS, DateTime, DBI, DBD::SQLite. `HTTP::Tiny` is used to proxy KML requests and is included in modern Perl distributions.
 
## How to use it:
 1. Drop the files in a web accessible directory
 1. Upload the CycleMeter Meter.db file to your server: It should be in a non web-accessible directory on the server.
 1. Edit `index.html` to set your Google Maps JavaScript API key (look for `key=` near the bottom of the file)
 1. Create a JavaScript Map ID in Google Maps Platform, then replace `DEMO_MAP_ID` in `code.js` with that ID
 1. Edit runs.json.cgi to set the path to the CycleMeter Meter.db file 
 1. Configure your web server to execute .cgi files as CGI: ex. Apache
     `AddHandler cgi-script .cgi`
     
 *Caveat*: Obviously, this web app will display personal details about your whereabouts, etc. Make sure to protect the web site with a password if you want some privacy...
     
 ## Screenshots
 
 ![Map view](img/map.png)

 ![Hike Details](img/hike_details.png)

 
