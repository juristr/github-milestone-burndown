var request = require('http-request');
var fs = require('fs');
var moment = require('moment');
var path = require('path');

function calculateAverageCurrentPace(progressData) {
  var paces = [];
  var paceTotal = 0;
  var avgPace = 0;

  for (var i = 1; i <= progressData.length - 1; i++) {
    var day1 = moment(progressData[i - 1].date);
    var day2 = moment(progressData[i].date);

    var daysDifference = moment.duration(day2.diff(day1)).get('days');

    var percentage = (progressData[i].percent - progressData[i - 1].percent) / daysDifference;
    paces.push(Math.round(percentage));
    paceTotal += Math.round(percentage);
  }

  avgPace = paceTotal / paces.length;
  return avgPace;
}

request.get('https://raw.githubusercontent.com/juristr/juristr.github.com/master/apps/ng2beta/data.json', function(err, githubData) {
   if(err){
      return console.log(err);
   }

  request.get('https://api.github.com/repos/angular/angular/milestones/49', function(err, githubMilestone) {
    if (err) {
      return console.log(err);
    }

    var github = JSON.parse(githubData.buffer.toString());
    var data = JSON.parse(githubMilestone.buffer.toString());

    var open = data.open_issues;
    var closed = data.closed_issues;
    var percent = Math.round(data.closed_issues * 100 / (data.open_issues + data.closed_issues));
    var avgPace = calculateAverageCurrentPace(github.milestonedata);

    console.log('Status:');
    console.log(' >> open:' + open);
    console.log(' >> closed:' + closed);
    console.log(' >> %:' + percent);
    console.log(' >> avg pace: ' + avgPace);

    console.log(github.milestonedata);

    // check whether the current date is already present
    var lastEntry = github.milestonedata[github.milestonedata.length - 1];

    var changed = true;

    if (lastEntry && moment(lastEntry.date).isSame(moment(), 'day')) {
      if(lastEntry.open !== open || lastEntry.closed !== closed) {
        // record the amount of issues being opened/resolved
        var _new = open - lastEntry.open;
        if(_new > 0) {
          lastEntry.newOpen = lastEntry.newOpen || 0;
          lastEntry.newOpen += _new;  
        }
        
        var _closed = closed - lastEntry.closed;
        if(_closed > 0) {
          lastEntry.newClosed = lastEntry.newClosed || 0;
          lastEntry.newClosed += _closed;          
        }
        
        lastEntry.open = open;
        lastEntry.closed = closed;
        lastEntry.percent = percent;
        lastEntry.pace = avgPace;
      } else {
        changed = false;
      }
    } else {
      github.milestonedata.push({
        date: moment().format('YYYY-MM-DD'),
        open: open,
        closed: closed,
        percent: percent,
        pace: avgPace,
        newOpen: 0,
        newClosed: 0
      });
    }

    if(changed) {
       github.lastupdated = moment().format();

       console.log('Writing:');
       console.log(JSON.stringify(github));

       fs.writeFileSync(path.join(__dirname, '', 'data.json'), JSON.stringify(github));
    }else{
       console.log('nothing to write');
    }
});
});
