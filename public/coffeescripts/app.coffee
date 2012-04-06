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
commands = {
  '/allow': (user) ->
    unless localClient.name is user
      client = clientByName user
      localClient.bannedClients[client.id] = false if client
      # console.log "Allowing messages from: #{client.name}"
    
  '/ignore': (user) ->
    unless localClient.name is user
      client = clientByName user
      localClient.bannedClients[client.id] = true if client
      # console.log "Ignoring messages from: #{client.name}"
      
}
localClient = Object.create(client)
remoteClients = []

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



sendMessage = (message, to) ->
  # console.log 'onMessageSend'
  # console.log 'From: ', localClient.name
  # console.log 'Message: ', message
  # console.log 'To: ', to if to

  re = /^(\/\w+){1}(\W){1}(\w+){1}/
  matches = re.exec(message)
  if matches and matches.length >= 4
    # console.log 'Got a command match:', matches
    command = matches[1]
    arg  = matches[3]
    
    if commands[command]
      commands[command].call(null, arg)
      appendMessage "#{message}"
      return

  if localClient.lastMessage
    # console.log 'Last message:', localClient.lastMessage
    now = new Date().getTime()
    diff = (now - localClient.lastMessage) / 1000
    if diff < 1
      appendMessage 'Please wait at least 1 second before sending a message'
      return

  appendMessage "#{localClient.name}: #{message}"
  localClient.lastMessage = new Date().getTime()
  socket.emit 'messageSend', localClient, message, to


# event listeners
onConnect = () ->
  socket.emit('clientAdd', localClient)

onDisconnect = () ->
  # console.log 'onDisconnect'
  appendMessage "You have been disconnected from the server."
  
onClientAdd = (data) ->
  # console.log 'onClientAdd', data
  appendMessage "... #{data.name} joined the chat ..."
  remoteClients.push { id: data.id, name: data.name }

onClientCount = (numClients) ->
  # console.log 'onClientCount'
  # console.log 'Total clients: ' , numClients
  # console.log 'Remote Clients: ', remoteClients

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
  # console.log 'onClientId', client
  appendMessage "Welcome, #{client.name}"
  localClient.id = client.id
  localClient.name = client.name


onClientList = (clients) ->
  remoteClients = _.reject(clients, (client) ->
    return client.id is localClient.id || client.name is localClient.name
  )
  onClientCount clients.length

onClientRemove = (data) ->
  # console.log 'onClientRemove', data
  client = clientById(data.id)
  return unless client
  appendMessage "#{client.name} left the chat"
  remoteClients.splice remoteClients.indexOf(client), 1


onMessageReceive = (from, message, type) ->
  # console.log 'onMessageReceive'
  # console.log 'From: ', from
  # console.log 'Message: ', message

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
  # console.log 'outgoingChange', event
  input = event.currentTarget
  val = input.value

  to = users.options[users.selectedIndex].value unless users.selectedIndex is -1
  users.selectedIndex = -1

  if val.length > 0
    sendMessage(val, to)
    input.value = ''
  
# bootstrap
init = () ->
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
  incoming = document.querySelector '#incoming'
  outgoing = document.querySelector '#outgoing'
  outgoing.addEventListener 'change', onOutgoingChange, false
  total = document.querySelector '#total'
  users = document.querySelector '#users'


root.init = init


