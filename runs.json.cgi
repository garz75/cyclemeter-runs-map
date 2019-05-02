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
    6 => "DownhillSki",
    10 => "Car",
    2 => "Walk" 
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
    $d->{url} = 'http://cyclemeter.com/' .$d->{appInstanceID}  . '/'. $activity->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M" . "$secs");
    $d->{appInstanceID} =~ /(....)(....)(....)(....)/;
    $d->{kmlUrl} = 'http://share.abvio.com/' . "$1/$2/$3/$4/Cyclemeter-" . $activity->{$d->{activityID}} . '-' . $dt->strftime("%Y%m%d-%H%M") . "$secs.kml";
    $d->{date} = $date;
    $d->{startTime} = $dt->strftime("%Y-%m-%d %T");
    $d->{activity} = $activity->{$d->{activityID}} || $d->{activityID};
    push @result , $d;
}
$dbh->disconnect;

print encode_json \@result;
