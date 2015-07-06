var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs');

server.maxConnections = 2;

function question(question, goodrep, rep_1, rep_2, rep_3, rep_4)
{
    this.question = question;
    this.goodrep = goodrep;
    this.rep_1 = rep_1;
    this.rep_2 = rep_2;
    this.rep_3 = rep_3;
    this.rep_4 = rep_4;
}

var allClients = {};

var allQuestions =  [
                        new question('Quelle est la couleur du cheval blanc d\'Henri IV ?', 1, 'Blanc','Rouge','Bleu','Orange'),
                        new question('Comment s\'appel le président français actuel ?', 3, 'Barak Obama','Dominique','François Hollande','Marine')
                    ];

var actual_question = 1;

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {

    allClients[socket.id] = {score:0,rep:0};

    console.log('New player connected ! (' + socket.id + ')');

    /** Mettre à jour la liste des joueurs **/
    io.sockets.emit('update_players', allClients); 
    /** ================================== **/    

    socket.on('disconnect', function() 
    {
        console.log('Player disconnected ! (' + socket.id + ')');
        delete allClients[socket.id];
    });

    socket.on('reponse_question', function (reponseq) 
    {
        console.log(socket.id + ': ' + reponseq);
        allClients[socket.id]['rep'] = reponseq;
        io.sockets.emit('update_players', allClients);
    });


    socket.on('ping', function() 
    {
        socket.emit('pong');
    });

    io.sockets.emit('update_timer', 'En attente de joueurs'); 

    //socket.emit('update_questions', {'question':allQuestions[actual_question-1].question,'rep_1':allQuestions[actual_question-1].rep_1,'rep_2':allQuestions[actual_question-1].rep_2,'rep_3':allQuestions[actual_question-1].rep_3,'rep_4':allQuestions[actual_question-1].rep_4}); 

});

var whiled = 10;
var first_loop = 0;

var timer_thread = setInterval(function ()
{
    if(Object.keys(allClients).length >= 2)
    {
        if(first_loop == 0)
        {
            io.sockets.emit('update_questions', {'question':allQuestions[actual_question-1].question,'rep_1':allQuestions[actual_question-1].rep_1,'rep_2':allQuestions[actual_question-1].rep_2,'rep_3':allQuestions[actual_question-1].rep_3,'rep_4':allQuestions[actual_question-1].rep_4}); 
            first_loop = 1;
        }

        if(whiled == 0)
        {   
            for(var x in allClients)
            {
                var value = allClients[x];
                for(var y in value)
                {
                    if(y == 'rep')
                    {
                        if(value[y] == allQuestions[actual_question-1].goodrep)
                        {
                            var score = allClients[x]['score'];
                            allClients[x]['score'] = (score+1);
                            io.sockets.connected[x].emit('result_reponse', '<font color="green">Bonne réponse !</font>'); 
                        } else {
                            io.sockets.connected[x].emit('result_reponse', '<font color="red">Mauvaise réponse !</font>'); 
                        }
                    }
                }
            }
            io.sockets.emit('update_players', allClients); 
            whiled = 11;

            if(actual_question < allQuestions.length)
            {
                actual_question++;
                io.sockets.emit('update_questions', {'question':allQuestions[actual_question-1].question,'rep_1':allQuestions[actual_question-1].rep_1,'rep_2':allQuestions[actual_question-1].rep_2,'rep_3':allQuestions[actual_question-1].rep_3,'rep_4':allQuestions[actual_question-1].rep_4}); 
            } else {
                console.log('Fin de la partie !');
                clearInterval(timer_thread);
                io.sockets.emit('update_timer', 'Fin de la partie !'); 
            }
            console.log('actual_question: ' + actual_question);
        } else {
            io.sockets.emit('update_timer', '<strong>' + (whiled) + '</strong> seconde(s)'); 
        }
        whiled--;
    } else {
        
    }
    console.log(Object.keys(allClients).length);
    
}, 1000);

server.listen(70);