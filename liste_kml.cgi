#!/usr/bin/perl

use strict;
use CGI;
use LWP::UserAgent;
use Data::Dumper;
use JSON::XS;
use Data::Dumper;
use DateTime;
our $q = new CGI;
print $q->header(-type => "application/vnd.google-earth.kml+xml");


# my @runs = get_runs();

use DBI;
my $dbfile = "./Meter.db";
my $dbh = DBI->connect("dbi:SQLite:dbname=$dbfile","","");


my $statement = << "EOF"; 
select
        latitude,
        longitude,
        appinstanceid,
        starttimezone,
        activityID,
        strftime("%s",starttime) as 'starttime',
        round(distance / 1000,2) as "distance",
        time(runTime,'unixepoch') as 'hike_time'
from
    run,meter,coordinate
where
-- make sure we actually did some something
    runTime > 0 
-- Join with the coordinate table to get the start point
    and coordinate.runID = run.runID
-- Make sure we are at the first point...
    and sequenceID = 0
EOF

my $sth = $dbh->prepare($statement);
$sth->execute();


print << "EOHE";
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
   <Style id="3">
    <IconStyle>
     <Icon><href>https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1596-hiking-solo_4x.png&amp;highlight=ff00000,3949ab,ff000000&amp;scale=4</href></Icon>
     <hotSpot x="0.5" y="0.0" xunits="fraction" yunits="fraction"/>
    </IconStyle>
   </Style>
   <Style id="4">
    <IconStyle>
     <Icon><href>https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1522-bicycle_4x.png&amp;highlight=ff000000,288d1,ff000000&amp;scale=4;</href></Icon>
     <hotSpot x="0.5" y="0.0" xunits="fraction" yunits="fraction"/>
    </IconStyle>
   </Style>
   <Style id="10">
    <IconStyle>
     <Icon><href>https://mt0.google.com/vt/icon/name=icons/onion/SHARED-mymaps-container-bg_4x.png,icons/onion/SHARED-mymaps-container_4x.png,icons/onion/1538-car_4x.png&amp;highlight=ff000000,97a7,ff000000&amp;scale=4;</href></Icon>
     <hotSpot x="0.5" y="0.0" xunits="fraction" yunits="fraction"/>
    </IconStyle>
   </Style>

EOHE
my $activity = {
    3 => "Hike",
    4 => "Cycle",
    10 => "Car"
};

while (my $d = $sth->fetchrow_hashref) {
#    print Dumper($d);
#    die;
    my $dt = DateTime->from_epoch( epoch => $d->{starttime} , time_zone  => $d->{startTimeZone} );
    my $date = $dt->strftime("%Y-%m-%d");
    my $url  = 'http://cyclemeter.com/' .$d->{appInstanceID}  . '/'. $activity->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M");
    print << "END";
    <Placemark>
      <name>$activity->{$d->{activityID}} , $d->{distance} km, on $date</name>
      <styleUrl>#$d->{activityID}</styleUrl>
      <description>
        <![CDATA[
          <p>Date: $dt</p>
          <p>Hike Duration: $d->{hike_time}</p>
          <p>URL: <a href="$url">$url</a></p>

        ]]>
      </description>
      <Point>
	<coordinates>$d->{longitude},$d->{latitude}</coordinates>
      </Point>
    </Placemark>
END
}

print << "EOHE";
  </Document>
</kml>
EOHE

$dbh->disconnect;

__DATA__

my $response = $ua->get("$url");

unless ($response->is_success) {
    error( $response->status_line);
}

my $res = call("zabbix.status",{});

if ($res->{result}) {
    print "SUCCESS: Zabbix server $url is running";
} else {
    print "FAILURE for Zabbix server $url : ". $res->{message} ;
}


sub call {
    my ($method, $params, $auth) = @_;

    my $data = {
	'id' => 0,
	'auth' => $auth,
	'jsonrpc' => '2.0',
	'method' => $method,
	'params' => $params
    };
    my $data_string = encode_json($data);
    my $request = HTTP::Request->new(POST => $jsurl);
    $request->content_type('application/json-rpc');
    $request->content($data_string);

    my $response = $ua->request($request);

    if ($response->is_success) {
	my $c = decode_json($response->decoded_content);  # or whatever
	return $c->{result};
    }
    else {
	error( $response->status_line);
    }
}


sub error {
	
	print STDERR "ERRRORRRRR " ,@_;
    	print @_;
	exit;;
}



__DATA__
exit;

5A5A
my $path_info = $q->path_info;

if ($path_info =~ m|^/article/(.*)|) {
	my $url = $1;
	if ($q->user_agent() =~ /iphone/i) {
		$url =~ s|http://www.lemonde.fr|http://mobile.lemonde.fr|;
	}
	print STDERR "redirecting to article '$url' for UA " . $q->user_agent();
	print $q->redirect($url);
	
} else {
	# assume this is an rss request

 	my %urls = (
            	"/rss/sequence/0,2-3232,1-0,0.xml" => "/rss/sequence/0,2-3232,1-0,0.xml",
		"/rss/une.xml" => "/rss/une.xml"
        );
	my $url = $urls{$path_info};

	defined $url or error( "no know path $path_info");

	my $response = $ua->get("http://www.lemonde.fr$url");

	if ($response->is_success) {
    		print $q->header(-type => "application/rss+xml");
		my $c = $response->decoded_content;  # or whatever
    		$c =~ s|<link>(.*?)</link>|<link>http://server.garzon.fr/cgi-bin/lemonde.cgi/article/$1</link>|g; 
		# Get rid of ads...
		$c =~ s|&lt;img .*?src=.http://.*?.feedsportal.com.*?&gt;||g;
		print $c;
	}
	else {
  	  	error( $response->status_line);
	}
}
