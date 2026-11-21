#!/usr/bin/perl

use strict;
use CGI;
use HTTP::Tiny;
use JSON::XS;
use DateTime;
use DBI;

our $q = new CGI;
my $kml_url = $q->param('url');

if (defined $kml_url) {
    # Restrict proxying to the KML provider generated below. This prevents
    # the endpoint from becoming a general-purpose SSRF proxy.
    if ($kml_url !~ m{\Ahttps?://share[.]abvio[.]com/[A-Za-z0-9/_-]+[.]kml(?:[?][A-Za-z0-9._=&%-]*)?\z}) {
        print $q->header(-status => '400 Bad Request', -type => 'text/plain');
        print "Invalid KML URL\n";
        exit;
    }

    $kml_url =~ s{\Ahttp:}{https:};
    my $response = HTTP::Tiny->new(
        agent => 'cyclemeter-runs-map/1.0',
        timeout => 15,
        max_redirect => 0
    )->get($kml_url);

    if (!$response->{success}) {
        print $q->header(-status => '502 Bad Gateway', -type => 'text/plain');
        print "Unable to retrieve KML: $response->{status}\n";
        exit;
    }

    print $q->header(
        -type => 'application/vnd.google-earth.kml+xml; charset=UTF-8',
        -cache_control => 'public, max-age=3600'
    );
    print $response->{content};
    exit;
}

print $q->header(-type => "application/json", -cache => 'public, max-age=3600');


my $dbfile = "/home/fgarzon/Meter.db";
my $dbh = DBI->connect("dbi:SQLite:dbname=$dbfile","","");

my $statement = << "EOF";
select
    run.runID,
    latitude,
    longitude,
    appinstanceid,
    starttimezone,
    activityID,
    time(stoppedTime,'unixepoch') as 'stoppedTime',
    round(ascent,0) as ascent,
    round(descent,0) as descent,
    round(calories,0) as calories,
    strftime("%s",starttime) as 'startTime',
    strftime("%f",starttime) as 'startSeconds',
    round(distance / 1000,2) as "distance",
    round(distance / runTime * 3.6,2) as 'avgSpeed',
    round(maxSpeed * 3.6,2) as 'maxSpeed',
    time(runTime,'unixepoch') as 'runTime',
    round(steps/runTime*60,1) as 'stepsPM',
    round(maxStepsPM,1) as 'maxStepsPM',
    steps,
    avgHeartRate,
    maxHeartRate
from
    run,meter,coordinate
where
-- make sure we actually did some something
    runtime > 0
-- make sure it is not a path
    and routeID != -2
-- Join with the coordinate table to get the start point
    and coordinate.runID = run.runID
-- Make sure we are at the first point...
    and sequenceID = 0
EOF

my $sth = $dbh->prepare($statement);
$sth->execute();

my @result;

# NOTE: when using new activity types with Cyclemeter, make sure to update both $activity and
# $url_fname mappings accordingly, and icon url in code.js. May be we should fail if an unknown
# activityID is encountered... For the time being, we just use the activityID itself as a fallback,
# and in code.js we do not provide a specific icon for it, which results in a generic icon being
# used, and clicking on it will not show the path of the activity.
my $activity = {
    3 => "Hike",
    4 => "Cycle",
    6 => "DownhillSki",
    5 => "Swim",
    10 => "Car",
    12 => "Row",
    2 => "Walk",
    10007 => "Walk for distance", # Walk for distance
    10008 => "Walk for time", # Walk for time
    257 => "E-bike",
    10004 => "Cycle for time" #
};

# Mapping of activity IDs to URL: special walk/bike types keep the URL generic name
my $url_fname = {
    3 => "Hike",
    4 => "Cycle",
    6 => "DownhillSki",
    5 => "Swim",
    10 => "Car",
    12 => "Row",
    2 => "Walk",
    10007 => "Walk", # Walk for distance
    10008 => "Walk", # Walk for time
    257 => "Cycle", # E-bike is treated as a Cycle for URL purposes
    10004 => "Cycle" # Cycle for time
};


while (my $d = $sth->fetchrow_hashref) {
    # For some reason, DateTime does not understand these TZ, so work around it
    $d->{startTimeZone} = 'Europe/Paris' if $d->{startTimeZone} eq "Etc/GMT-2";
    $d->{startTimeZone} = 'Europe/Paris' if $d->{startTimeZone} eq "GMT+0200";
    my $dt = DateTime->from_epoch( epoch => $d->{startTime} , time_zone  => $d->{startTimeZone} );
    my $date = $dt->strftime("%Y-%m-%d");
    my $secs = "" ;
    # New versions of Cyclemeter after the cutoff date add seconds/milliseconds to the URL
    my $cutoff_date = DateTime->new(year=> 2018, month => 06, day => 01);
    if (DateTime->compare($cutoff_date,$dt) <= 0) {
        $secs = $d->{startSeconds};
        $secs =~ s/\.//g;
        $secs =~ /(.)(.)(.)(.)(.)/;
        # We scramble them as follows: abCDE => bECaD
        $secs = "-$2$5$3$1$4";
    }
    $d->{url} = 'http://cyclemeter.com/' .$d->{appInstanceID}  . '/'. $url_fname->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M" . "$secs");
    $d->{appInstanceID} =~ /(....)(....)(....)(....)/;
    $d->{kmlUrl} = 'http://share.abvio.com/' . "$1/$2/$3/$4/Cyclemeter-" . $url_fname->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M") . "$secs.kml";
    $d->{date} = $date;
    $d->{startTime} = $dt->strftime("%Y-%m-%d %T");
    $d->{activity} = $activity->{$d->{activityID}} || $d->{activityID};
    push @result , $d;
}
$dbh->disconnect;

print encode_json \@result;
