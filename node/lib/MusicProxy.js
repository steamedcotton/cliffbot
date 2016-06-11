var path = require('path');

var music = null;
var soundFile = null;
var useAplay = false;
var currentlyPlaying = false;

function MusicProxy(soundPath) {
    console.log('Creating music handle for: ' + soundPath);
    soundFile = path.basename(soundPath);
    if (process.env.NODE_ENV !== 'local') {
        console.log('Using APLAY');
        useAplay = true;
        var Sound = require('node-aplay');
        music = new Sound(soundPath);
    }
}


MusicProxy.prototype.play = function () {
    console.log('Playing Music: ' + soundFile);
    if (useAplay) {
        currentlyPlaying = true;
        console.log('Rocking n rolling!');
        music.play();
    }
};

MusicProxy.prototype.pause = function () {
    console.log('Pausing Music: ' + soundFile);
    if (useAplay && currentlyPlaying) {
        console.log('Stopping the jams');
        music.pause();
        currentlyPlaying = false;
    }
};



module.exports = MusicProxy;