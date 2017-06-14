#!/usr/bin/perl

use strict;
use CGI;
use JSON::XS;
use DateTime;
use DBI;

our $q = new CGI;
print $q->header(-type => "application/json");


my $dbfile = "/home/garzon/Meter.db";
my $dbh = DBI->connect("dbi:SQLite:dbname=$dbfile","","");


my $statement = << "EOF"; 
select
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
    round(distance / 1000,2) as "distance",
    round(distance / runTime * 3.6,2) as 'avgSpeed',
    round(maxSpeed * 3.6,2) as 'maxSpeed',
    time(runTime,'unixepoch') as 'runTime',
    avgHeartRate,
    maxHeartRate
from
    run,meter,coordinate
where
-- make sure we actually did some something
    runtime > 0  
-- Join with the coordinate table to get the start point
    and coordinate.runID = run.runID
-- Make sure we are at the first point...
    and sequenceID = 0
EOF

my $sth = $dbh->prepare($statement);
$sth->execute();

my @result;
my $activity = {
    3 => "Hike",
    4 => "Cycle",
    10 => "Car"
};

while (my $d = $sth->fetchrow_hashref) {
    my $dt = DateTime->from_epoch( epoch => $d->{startTime} , time_zone  => $d->{startTimeZone} );
    my $date = $dt->strftime("%Y-%m-%d");
    $d->{url} = 'http://cyclemeter.com/' .$d->{appInstanceID}  . '/'. $activity->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M");
    $d->{appInstanceID} =~ /(....)(....)(....)(....)/;
    $d->{kmlUrl} = 'http://share.abvio.com/' . "$1/$2/$3/$4/Cyclemeter-" . $activity->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M") . ".kml";
    $d->{date} = $date;
    $d->{startTime} = $dt->strftime("%Y-%m-%d %T");
    $d->{activity} = $activity->{$d->{activityID}};
# http://share.abvio.com/86f6/412c/0cdd/4565/Cyclemeter-Hike-20170506-1005.kml
    push @result , $d;
}
$dbh->disconnect;

print encode_json \@result;
