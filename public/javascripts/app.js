(function() {
  var activeTab, addDrawPoint, animationId, appendMessage, canvas, client, clientById, clientByName, commands, context, draw, drawPoints, drawing, getTabs, inactiveTab, init, localClient, localStream, onAnchorClick, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp, onClientAdd, onClientCount, onClientId, onClientList, onClientRemove, onConnect, onDisconnect, onMessageReceive, onOutgoingChange, remoteClients, root, sendMessage, socket, streaming, tablist, tablistItems, toggleElementVisibility;

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

  tablist = tablistItems = activeTab = inactiveTab = canvas = context = animationId = null;

  drawing = false;

  drawPoints = [];

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

  getTabs = function() {
    var className, item, _i, _len;
    for (_i = 0, _len = tablistItems.length; _i < _len; _i++) {
      item = tablistItems[_i];
      className = item.getAttribute('class');
      if (className === 'active') activeTab = item;
      if (className === null || className === '') inactiveTab = item;
    }
    return [activeTab, inactiveTab];
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

  toggleElementVisibility = function(element) {
    var state;
    if (!element) return;
    state = element.style.display || element.style.visibility;
    if (state === '' || state === !'none' || state === 'visible') {
      element.style.display = 'none';
    } else if (state === 'none' || state === 'hidden') {
      element.style.display = '';
    }
    return element;
  };

  addDrawPoint = function(x, y, drag) {
    if (drag == null) drag = false;
    drawPoints.push({
      x: x,
      y: y,
      drag: drag
    });
    return drawPoints;
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

  onAnchorClick = function(e) {
    var li;
    e.preventDefault();
    li = e.currentTarget.parentNode;
    if (li === activeTab) return;
    activeTab.setAttribute('class', '');
    inactiveTab.setAttribute('class', 'active');
    getTabs();
    toggleElementVisibility(chat);
    toggleElementVisibility(whiteboard);
    return e.currentTarget;
  };

  onCanvasMouseDown = function(e) {
    console.log('canvas is active');
    drawing = true;
    addDrawPoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);
    animationId = window.requestAnimationFrame(draw);
    return canvas.onmousemove = onCanvasMouseMove;
  };

  onCanvasMouseUp = function(e) {
    console.log('canvas is inactive');
    drawing = false;
    window.cancelRequestAnimationFrame(animationId);
    return canvas.onmousemove = null;
  };

  onCanvasMouseMove = function(e) {
    console.log('mouse move', e.pageX, e.pageY);
    if (drawing) {
      addDrawPoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop, true);
    }
    return draw();
  };

  draw = function() {
    var i, point, _len;
    if (!drawing) return;
    console.log('drawing');
    canvas.width = canvas.width;
    context.strokeStyle = '#df4b26';
    for (i = 0, _len = drawPoints.length; i < _len; i++) {
      point = drawPoints[i];
      context.beginPath();
      if (drawPoints[i].drag) {
        context.moveTo(drawPoints[i - 1].x, drawPoints[i - 1].y);
      } else {
        context.moveTo(drawPoints[i].x, drawPoints[i].y);
      }
      context.lineTo(drawPoints[i].x, drawPoints[i].y);
      context.closePath();
      context.stroke();
    }
    return animationId = window.requestAnimationFrame(draw);
  };

  init = function() {
    var a, chat, child, incoming, outgoing, total, users, whiteboard, _i, _len;
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
    tablist = document.getElementsByClassName('nav')[0];
    tablistItems = tablist.getElementsByTagName('li');
    getTabs();
    for (_i = 0, _len = tablistItems.length; _i < _len; _i++) {
      child = tablistItems[_i];
      a = child.getElementsByTagName('a')[0];
      a.onclick = onAnchorClick;
    }
    chat = document.getElementById('chat');
    whiteboard = document.getElementById('whiteboard');
    toggleElementVisibility(whiteboard);
    canvas = document.getElementById('canvas');
    canvas.onmousedown = onCanvasMouseDown;
    canvas.onmouseup = onCanvasMouseUp;
    context = canvas.getContext('2d');
    return true;
  };

  root.init = init;

}).call(this);
