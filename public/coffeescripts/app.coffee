# global
root = window ? global

socket = {}
client = {
  id: ''
  name: ''
  announces: {}
  trustedClients: {}
  bannedClients: {}
  lastMessage: null
}

localStream = null
streaming = false

commands = {
  '/allow': (user) ->
    unless localClient.name is user
      client = clientByName user
      localClient.bannedClients[client.id] = false if client
    
  '/ignore': (user) ->
    unless localClient.name is user
      client = clientByName user
      localClient.bannedClients[client.id] = true if client
      
}
localClient = Object.create(client)
remoteClients = []
# references to dom
tablist = tablistItems = activeTab = inactiveTab = canvas = context = animationId = null
drawing = false
drawPoints = []

# helpers functions
appendMessage = (message) ->
  d = new Date()
  
  if d.getHours() > 10
    h = d.getHours()
  else
    h = '0' + d.getHours()
    
  if d.getMinutes() > 10
    m = d.getMinutes()
  else
    m = '0' + d.getMinutes()
  
  if d.getSeconds() > 10
    s = d.getSeconds()
  else
    s = '0' + d.getSeconds()

  incoming.value += "#{h}:#{m}:#{s} - #{message} \n"


clientById = (id) ->
  for client in remoteClients
    return client if client.id is id

clientByName = (name) ->
  for client in remoteClients
    return client if client.name is name


getTabs = ->
  for item in tablistItems
    className = item.getAttribute('class')
    activeTab = item if className is 'active'
    inactiveTab = item if className is null or className is ''

  return [activeTab, inactiveTab]

sendMessage = (message, to) ->
  re = /^(\/\w+){1}(\W){1}(\w+){1}/
  matches = re.exec(message)
  if matches and matches.length >= 4
    command = matches[1]
    arg  = matches[3]
    
    if commands[command]
      commands[command].call(null, arg)
      appendMessage "#{message}"
      return

  if localClient.lastMessage
    now = new Date().getTime()
    diff = (now - localClient.lastMessage) / 1000
    if diff < 1
      appendMessage 'Please wait at least 1 second before sending a message'
      return

  appendMessage "#{localClient.name}: #{message}"
  localClient.lastMessage = new Date().getTime()
  socket.emit 'messageSend', localClient, message, to

toggleElementVisibility = (element) ->
  return unless element
  state = element.style.display || element.style.visibility

  if state is '' or state is not 'none' or state is 'visible'
    element.style.display = 'none'
  else if state is 'none' or state is 'hidden'
    element.style.display = ''

  element

addDrawPoint = (x, y, drag = false) ->
  drawPoints.push({x: x, y: y, drag: drag})
  return drawPoints

# event listeners
onConnect = ->
  socket.emit('clientAdd', localClient)

onDisconnect = ->
  appendMessage 'You have been disconnected from the server.'
  
onClientAdd = (data) ->
  appendMessage "... #{data.name} joined the chat ..."
  remoteClients.push { id: data.id, name: data.name }

onClientCount = (numClients) ->
  total.innerHTML = "Connected clients #{numClients}"

  for child in users.children
    users.removeChild(child)
 
  for client in remoteClients
    o = new Option()
    o.value = client.id
    o.textContent = client.name
    users.options.add(o)

  users.selectedIndex = -1


onClientId = (client) ->
  appendMessage "Welcome, #{client.name}"
  localClient.id = client.id
  localClient.name = client.name


onClientList = (clients) ->
  remoteClients = _.reject(clients, (client) ->
    return client.id is localClient.id || client.name is localClient.name
  )
  onClientCount clients.length

onClientRemove = (data) ->
  client = clientById(data.id)
  return unless client
  appendMessage "#{client.name} left the chat"
  remoteClients.splice remoteClients.indexOf(client), 1


onMessageReceive = (from, message, type) ->
  if not localClient.bannedClients[from.id]
    if type and type is 'private'
      unless localClient.trustedClients[from.id]
        if confirm "Do you want to accept a private message from #{from.name}?"
          appendMessage "[private] #{from.name}: #{message}"
          localClient.trustedClients[from.id] = true
        else
          localClient.bannedClients[from.id] = true
      else
        appendMessage "[private] #{from.name}: #{message}"
    else
      appendMessage "#{from.name}: #{message}"


onOutgoingChange = (event) ->
  input = event.currentTarget
  val = input.value

  to = users.options[users.selectedIndex].value unless users.selectedIndex is -1
  users.selectedIndex = -1

  if val.length > 0
    sendMessage(val, to)
    input.value = ''


onAnchorClick = (e) ->
  e.preventDefault()
  li = e.currentTarget.parentNode
  return if li is activeTab

  activeTab.setAttribute 'class', ''
  inactiveTab.setAttribute 'class', 'active'
  getTabs()
  toggleElementVisibility chat
  toggleElementVisibility whiteboard
  return e.currentTarget


onCanvasMouseDown = (e) ->
  console.log 'canvas is active'
  drawing = true
  addDrawPoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop)
  animationId = window.requestAnimationFrame draw
  canvas.onmousemove = onCanvasMouseMove

onCanvasMouseUp = (e) ->
  console.log 'canvas is inactive'
  drawing = false
  window.cancelRequestAnimationFrame animationId
  canvas.onmousemove = null
  
onCanvasMouseMove = (e) ->
  console.log 'mouse move', e.pageX, e.pageY
  addDrawPoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop, true) if drawing
  draw()


draw = ->
  return unless drawing
  console.log 'drawing'
  canvas.width = canvas.width
  context.strokeStyle = '#df4b26'


  for point, i in drawPoints
    context.beginPath()
    if drawPoints[i].drag
      context.moveTo(drawPoints[i - 1].x , drawPoints[i - 1].y)
    else
      context.moveTo(drawPoints[i].x, drawPoints[i].y)

    context.lineTo(drawPoints[i].x, drawPoints[i].y)
    context.closePath()
    context.stroke()

  animationId = window.requestAnimationFrame draw


# bootstrap
init = ->
  # socket event listeners
  socket = io.connect 'http://localhost'
  socket.on 'connect', onConnect
  socket.on 'disconnect', onDisconnect

  socket.on 'clientAdd', onClientAdd
  socket.on 'clientCount', onClientCount
  socket.on 'clientId', onClientId
  socket.on 'clientList', onClientList
  socket.on 'clientRemove', onClientRemove
  socket.on 'messageReceive', onMessageReceive

  # ui members and event listeners
  incoming = document.getElementById 'incoming'
  outgoing = document.getElementById 'outgoing'
  outgoing.onchange = onOutgoingChange

  total = document.getElementById 'total'
  users = document.getElementById 'users'

  # tabs
  tablist = document.getElementsByClassName('nav')[0]
  tablistItems = tablist.getElementsByTagName 'li'
  
  getTabs()
  
  for child in tablistItems
    a = child.getElementsByTagName('a')[0]
    a.onclick = onAnchorClick
  

  # chat and whiteboard "fake" screen
  chat = document.getElementById 'chat'
  whiteboard = document.getElementById 'whiteboard'
  toggleElementVisibility whiteboard

  canvas = document.getElementById 'canvas'
  canvas.onmousedown = onCanvasMouseDown
  canvas.onmouseup = onCanvasMouseUp

  context = canvas.getContext '2d'

  true


root.init = init

