var express = require('express')();
var server = require('http').createServer(express);
var io = require('socket.io')(server);
var fs = require('fs');

express.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
server.maxConnections = 2;
server.listen(70);

var Question = function(question, answers) {
    this.question = question;
    this.answers = answers;
}

var onlinePlayers = {};
var questions = [
    new Question("Quelle est la couleur du cheval blanc d'Henry IV ?", {
        'Blanc': true,
        'Rouge': false,
        'Bleu': false,
        'Orange': false
    }),
    new Question("Comment s'appelle le président français actuel ?", {
        'Barack Obama': false,
        'Dominique': false,
        'François Hollande': true,
        'Marine': false
    })
];
var currentQuestionIndex = 0;

io.on('connection', function(socket) {
    onlinePlayers[socket.id] = {
        socketid: socket.id,
        score: 0,
        answer: ''
    };
    console.log('Un joueur a rejoint le jeu ! (' + socket.id + ')');
    socket.emit('update_players', onlinePlayers);
    socket.emit('update_timer', 'En attente de joueurs');

    socket.on('answer', function(answer) {
        console.log(socket.id + ': ' + answer);
        onlinePlayers[socket.id].answer = answer;
    });

    socket.on('ping', function() {
        socket.emit('pong');
    });
});

io.on('disconnect', function(socket) {
    console.log("Un joueur s'est déconnecté ! (" + socket.id + ')');
    delete onlinePlayers[socket.id];
    io.emit('update_players', onlinePlayers);
});

var checker = setInterval(function() {
    if (Object.keys(onlinePlayers).length >= 2) {
        emitQuestion();
        clearInterval(checker);
    }
}, 1000);

var seconds = 10;

var emitQuestion = function() {
    if (currentQuestionIndex >= questions.length) {
        console.log('Fin de la partie !');
        io.emit('update_timer', 'Fin de la partie !');
        return;
    }
    var first = true;
    var interval = setInterval(function() {
        if (first) {
            first = false;
            questionObj = questions[currentQuestionIndex++];
            io.emit('update_questions', {'question': questionObj.question, 'answers': questionObj.answers});
        }
        io.emit('update_timer', '<strong>' + (seconds--) + '</strong> seconde(s)');
        if (seconds == -1) {
            seconds = 10;
            clearInterval(interval);

            for (var key in onlinePlayers) {
                var player = onlinePlayers[key];
                var socket = io.sockets.connected[player.socketid];
                if (questionObj.answers[player.answer] == null || !questionObj.answers[player.answer]) {
                    socket.emit('result', '<font color="red">Mauvaise réponse !</font>');
                } else {
                    onlinePlayers[key].score++;
                    socket.emit('update_players', onlinePlayers);
                    socket.emit('result', '<font color="green">Bonne réponse !</font>');
                }
            }
            emitQuestion();
        }
    }, 1000);
}
