(function() {
  var addLocalVideo, appendMessage, client, clientById, clientByName, commands, createVideoStream, init, localClient, localStream, onBroadcastClick, onClientAdd, onClientCount, onClientId, onClientList, onClientRemove, onConnect, onDisconnect, onMessageReceive, onOutgoingChange, onResize, onUserMediaError, onUserMediaSuccess, remoteClients, removeLocalVideo, root, sendMessage, socket, streaming;

  root = typeof window !== "undefined" && window !== null ? window : global;

  socket = {};

  client = {
    id: '',
    name: '',
    announces: {},
    trustedClients: {},
    bannedClients: {},
    lastMessage: null
  };

  localStream = null;

  streaming = false;

  commands = {
    '/allow': function(user) {
      if (localClient.name !== user) {
        client = clientByName(user);
        if (client) return localClient.bannedClients[client.id] = false;
      }
    },
    '/ignore': function(user) {
      if (localClient.name !== user) {
        client = clientByName(user);
        if (client) return localClient.bannedClients[client.id] = true;
      }
    }
  };

  localClient = Object.create(client);

  remoteClients = [];

  appendMessage = function(message) {
    var d, h, m, s;
    d = new Date();
    if (d.getHours() > 10) {
      h = d.getHours();
    } else {
      h = '0' + d.getHours();
    }
    if (d.getMinutes() > 10) {
      m = d.getMinutes();
    } else {
      m = '0' + d.getMinutes();
    }
    if (d.getSeconds() > 10) {
      s = d.getSeconds();
    } else {
      s = '0' + d.getSeconds();
    }
    return incoming.value += "" + h + ":" + m + ":" + s + " - " + message + " \n";
  };

  clientById = function(id) {
    var client, _i, _len;
    for (_i = 0, _len = remoteClients.length; _i < _len; _i++) {
      client = remoteClients[_i];
      if (client.id === id) return client;
    }
  };

  clientByName = function(name) {
    var client, _i, _len;
    for (_i = 0, _len = remoteClients.length; _i < _len; _i++) {
      client = remoteClients[_i];
      if (client.name === name) return client;
    }
  };

  sendMessage = function(message, to) {
    var arg, command, diff, matches, now, re;
    re = /^(\/\w+){1}(\W){1}(\w+){1}/;
    matches = re.exec(message);
    if (matches && matches.length >= 4) {
      command = matches[1];
      arg = matches[3];
      if (commands[command]) {
        commands[command].call(null, arg);
        appendMessage("" + message);
        return;
      }
    }
    if (localClient.lastMessage) {
      now = new Date().getTime();
      diff = (now - localClient.lastMessage) / 1000;
      if (diff < 1) {
        appendMessage('Please wait at least 1 second before sending a message');
        return;
      }
    }
    appendMessage("" + localClient.name + ": " + message);
    localClient.lastMessage = new Date().getTime();
    return socket.emit('messageSend', localClient, message, to);
  };

  onConnect = function() {
    return socket.emit('clientAdd', localClient);
  };

  onDisconnect = function() {
    return appendMessage('You have been disconnected from the server.');
  };

  onClientAdd = function(data) {
    appendMessage("... " + data.name + " joined the chat ...");
    return remoteClients.push({
      id: data.id,
      name: data.name
    });
  };

  onClientCount = function(numClients) {
    var child, client, o, _i, _j, _len, _len2, _ref;
    total.innerHTML = "Connected clients " + numClients;
    _ref = users.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      users.removeChild(child);
    }
    for (_j = 0, _len2 = remoteClients.length; _j < _len2; _j++) {
      client = remoteClients[_j];
      o = new Option();
      o.value = client.id;
      o.textContent = client.name;
      users.options.add(o);
    }
    return users.selectedIndex = -1;
  };

  onClientId = function(client) {
    appendMessage("Welcome, " + client.name);
    localClient.id = client.id;
    return localClient.name = client.name;
  };

  onClientList = function(clients) {
    remoteClients = _.reject(clients, function(client) {
      return client.id === localClient.id || client.name === localClient.name;
    });
    return onClientCount(clients.length);
  };

  onClientRemove = function(data) {
    client = clientById(data.id);
    if (!client) return;
    appendMessage("" + client.name + " left the chat");
    return remoteClients.splice(remoteClients.indexOf(client), 1);
  };

  onMessageReceive = function(from, message, type) {
    if (!localClient.bannedClients[from.id]) {
      if (type && type === 'private') {
        if (!localClient.trustedClients[from.id]) {
          if (confirm("Do you want to accept a private message from " + from.name + "?")) {
            appendMessage("[private] " + from.name + ": " + message);
            return localClient.trustedClients[from.id] = true;
          } else {
            return localClient.bannedClients[from.id] = true;
          }
        } else {
          return appendMessage("[private] " + from.name + ": " + message);
        }
      } else {
        return appendMessage("" + from.name + ": " + message);
      }
    }
  };

  onOutgoingChange = function(event) {
    var input, to, val;
    input = event.currentTarget;
    val = input.value;
    if (users.selectedIndex !== -1) to = users.options[users.selectedIndex].value;
    users.selectedIndex = -1;
    if (val.length > 0) {
      sendMessage(val, to);
      return input.value = '';
    }
  };

  addLocalVideo = function(stream) {
    var video;
    localStream = stream;
    streaming = true;
    video = createVideoStream(window.webkitURL.createObjectURL(stream));
    video.setAttribute('id', "video-" + localClient.id);
    broadcast.innerHTML = 'stop broadcasting';
    return camlist.appendChild(video);
  };

  removeLocalVideo = function() {
    var video;
    localStream.stop();
    localStream = null;
    streaming = false;
    video = document.getElementById("video-" + localClient.id);
    video.pause();
    video.setAttribute('src', '');
    broadcast.innerHTML = 'start broadcasting';
    return camlist.removeChild(video);
  };

  onUserMediaSuccess = function(stream) {
    console.log('success: ', stream);
    return addLocalVideo(stream);
  };

  onUserMediaError = function(e) {
    return console.log("onUserMediaError " + e);
  };

  onBroadcastClick = function(e) {
    if (!localClient.streaming) {
      if (navigator.webkitGetUserMedia) {
        return navigator.webkitGetUserMedia('audio, video', onUserMediaSuccess, onUserMediaError);
      } else {
        return alert('Your browser does not support webRTC.');
      }
    } else {
      return removeLocalVideo();
    }
  };

  createVideoStream = function(stream) {
    var video;
    video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('controls', '');
    video.setAttribute('src', stream);
    return video;
  };

  init = function() {
    var incoming, outgoing, total, users;
    socket = io.connect('http://localhost');
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('clientAdd', onClientAdd);
    socket.on('clientCount', onClientCount);
    socket.on('clientId', onClientId);
    socket.on('clientList', onClientList);
    socket.on('clientRemove', onClientRemove);
    socket.on('messageReceive', onMessageReceive);
    incoming = document.getElementById('incoming');
    outgoing = document.getElementById('outgoing');
    outgoing.onchange = onOutgoingChange;
    total = document.getElementById('total');
    users = document.getElementById('users');
    onResize();
    return true;
  };

  root.init = init;

  onResize = function(e) {
    var h, incoming;
    incoming = incoming || document.getElementById('incoming');
    h = document.body.clientHeight;
    return incoming.style.height = (h - 130) + 'px';
  };

  window.onresize = onResize;

}).call(this);
