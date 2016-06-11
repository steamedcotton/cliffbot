'use strict';
var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var Twitter = require('node-tweet-stream');
var MusicProxy = require('./lib/MusicProxy');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var MAX_STEPS = 50000;
var TWEET_GOAL = 50;
var TRACK_TERM = 'EMMF16';
var CLIMBER_MUSIC_PATH = path.join(__dirname, 'yodel.wav');
var STEP_AMOUNT = Math.round(MAX_STEPS/TWEET_GOAL);
var SERIAL_PORT_NAME = '/dev/ttyS1';

var twitterSettings = require('./config/twitter.json');
var t = new Twitter(twitterSettings);

var climberMusic = new MusicProxy(CLIMBER_MUSIC_PATH);
var serialDataHandle = null;
var working = false;
var climbQueue = [];
var currentPosition = 0;

if (process.env.ARDUINO_SERIAL) {
    SERIAL_PORT_NAME = process.env.ARDUINO_SERIAL;
}

var VALID_CMDS = [ 'climberup', 'climberdown', 'smallup', 'smalldown', 'sethome',
                    'gohome', 'ledon', 'ledoff', 'flagup', 'flagdown'];

var serialPort = new SerialPort(SERIAL_PORT_NAME, {
    baudrate: 115200,
    parser: serialport.parsers.readline("\n")
});


serialPort.on("open", function () {
    console.log('Serial port open');
    serialPort.on('data', function(data) {
        if (typeof serialDataHandle === 'function') {
            var err = null;
            try {
                var parsedResults = JSON.parse(data);
            } catch(e) {
                err = 'Unable to parse results';
            }

            serialDataHandle(null, parsedResults);
            serialDataHandle = null;
            working = false;
        }
        console.log('data received: ' + data);
        climberMusic.pause();
    });
});


app.use("/", express.static(path.join(__dirname, 'public')));

app.get('/yodel/go/:value', function(req, res) {
    climberMusic.play();
    sendCommand('go:' + req.params.value, function(err, results) {
        if (err) {
            res.status(500).json({status: 'failed', error: err});
        } else {
            res.json({status: 'done', results: results});
        }
    });
});

app.post('/tweet', function(req, res) {
    var tweet = {text: req.body.message};
    handleTweet(tweet);
    res.json({status: 'done', results: {message: req.body.message}});
});

app.get('/yodel/:command', function(req, res) {
    if (VALID_CMDS.indexOf(req.params.command) > -1) {
        if (req.params.command === 'climberup') {
            climberMusic.play();
            sendCommand(req.params.command, function(err, results) {
                if (err) {
                    res.status(500).json({status: 'failed', error: err});
                } else {
                    res.json({status: 'done', results: results});
                }
            });
        } else {
            sendCommand(req.params.command, function(err, results) {
                if (err) {
                    res.status(500).json({status: 'failed', error: err});
                } else {
                    res.json({status: 'done', results: results});
                }
            });
        }
    } else {
        res.status(500).json({status: 'failed', error: 'command not found'});
    }
});

var server = app.listen(3030, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Running yodel server at: http://%s:%s', host, port);
    console.log('Step Amount: ' + STEP_AMOUNT);
    console.log('Max Position: ' + MAX_STEPS);

});


function sendCommand(command, cb) {
    console.log('Running command: ' + command);
    if (working) {
        cb('Working on request');
    } else {
        console.log('Sending command to arduino: ' + command);
        serialPort.write(command, function (err) {
            if (err) {
                cb(err);
            } else {
                working = true;
                serialDataHandle = cb;
            }
        });
    }
}

function moveClimber() {
    if (!working && climbQueue.length) {
        var workingTweet = climbQueue.shift();
        console.log('Working on TWEET', workingTweet);
        var goValue = STEP_AMOUNT;
        if (currentPosition + STEP_AMOUNT > MAX_STEPS) {
            goValue = MAX_STEPS - currentPosition;
        }

        if (goValue <= 0) {
            sendCommand('flagup', function () {
                setTimeout(function() {
                    sendCommand('flagdown', function () {
                        setTimeout(resetClimber, 1000);
                    });
                }, 10000);
            });
        } else {
            climberMusic.play();
            console.log('Sending move command');
            sendCommand('go:' + goValue, function () {
                currentPosition += goValue;
                console.log('Current Position: ' + currentPosition);
                console.log('Handled TWEET', workingTweet);
            });
        }

    } else {
        console.log('Currently working, scheduling retry');
        setTimeout(function() {
            moveClimber();
        }, 5000);
    }
}

function resetClimber() {
    console.log('Resetting Climber');
    sendCommand('gohome', function () {
        console.log('I\'m Home!!!');
        currentPosition = 0;
    });
}

function handleTweet(tweet) {
    console.log('Got Tweet:', tweet.text);
    climbQueue.push(tweet.text);
    moveClimber();
}

t.on('tweet', handleTweet);

t.on('error', function (err) {
    console.log('Oh no');
});

t.track(TRACK_TERM);
