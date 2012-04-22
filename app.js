var express = require('express')
  , app = module.exports = express.createServer()
  , io = require('socket.io').listen(app)
  , socket = io.sockets
  , _ = require('./public/javascripts/libs/underscore')
  , clients = [];

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  
  app.use(require('express-coffee')({
    path: __dirname + '/public',
    live: !process.env.PRODUCTION,
    uglify: process.env.PRODUCTION
  }));

  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Helper methods
function clientById(id) {
  var i, l = clients.length;
  for (i = 0; i < l; i += 1) {
    if (clients[i].id === id) {
      return clients[i];
    }
  }
}
// Event listeners
function onClientAdd() {
  var i, 
      l, 
      s,
      name,
      newClient, 
      existingClient;

  name = _.uniqueId('user_'); 
  newClient = { id: this.id, name: name };
  this.set('name', name);
  
  this.broadcast.emit('clientAdd', newClient);
  this.emit('clientId', newClient);
  
  for (i = 0, l = clients.length; i < l; i += 1) {
    existingClient = clients[i];
    this.emit('clientAdd', {id: existingClient.id, name: existingClient.name});
  }
  clients.push(newClient);
  
  socket.emit('clientCount', clients.length);
  socket.emit('clientList', clients); 
}


function onClientRemove(id) {
  // console.log('onClientRemove', this.id);  
}

function onMessageSend(from, message, to) {
  // Return if we don't have a message
  if (!message) return;

  if (this.id === from.id) {
    if (!to) {
      this.broadcast.emit('messageReceive', from, message);
    } else {
      if (socket.sockets[to]) {
        socket.sockets[to].emit('messageReceive', from, message, 'private');
      } else {
        this.emit('messageNotSent', 'User not found');
      }
    }
  }
}

function onDrawPointsSend(points) {
  this.broadcast.emit('drawPointsReceive', points);
}

function onConnect(client) {
  client.on('disconnect', onDisconnect);
  client.on('clientAdd', onClientAdd);
  client.on('clientRemove', onClientRemove);
  client.on('messageSend', onMessageSend);
  client.on('drawPointsSend', onDrawPointsSend);
}

function onDisconnect() {
  var index,
    client = clientById(this.id);
  if (client) {
    clients.splice(clients.indexOf(client), 1);
    this.broadcast.emit('clientRemove', client);
    this.broadcast.emit('clientCount', clients.length);
  }
}

socket.on('connection', onConnect);

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
