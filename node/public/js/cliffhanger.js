$(function(){
    $('#results').html('READY');
});

function sendCommand(command) {
    $('#results').html('Sending command: ' + command);
    $.ajax({
            url: '/yodel/' + command
        })
        .done(function(data) {
            $('#results').html(JSON.stringify(data));
        });
}

function goSteps() {
    var steps = $('input#steps').val();
    if (isNaN(steps)) {
        $('#results').html('Must Be A Number!');
    } else {
        sendCommand('go/' + steps);
    }
}