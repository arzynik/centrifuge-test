const Centrifuge = require('centrifuge')
const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const secret = process.env.JWT_SECRET

const users = process.env.CONNECTED_USERS || 10
const timeBetweenConnects = process.env.TIME_BETWEEN_CONNECTS || .01
const timeToStayConnected = process.env.TIME_TO_STAY_CONNECTED || 5
const channelToEnter = process.env.CHAT_TO_ENTER
const timeBetweenMessages = process.env.TIME_BETWEEN_MESSAGES || .3
const messagesToSend = process.env.MESSAGES_TO_SEND || 0

console.log('starting testing ', users, ' users')

let i = 0
const createTestConnection = () => {
  if (i > users) {
    return
  }
  i++

  // console.log('testing user', i)

  const profileId = uuidv4()
  const authKey = jwt.sign({ sub: profileId, name: profileId }, secret, { algorithm: 'HS256' })

  const centrifuge = new Centrifuge(process.env.CENTRIFUGE_URI, {
    websocket: WebSocket
  })

  centrifuge.setToken(authKey)

  centrifuge.on('connect', context => {
    // console.log('connected', context)
  })

  centrifuge.connect()

  const callbacks = {
    publish: (e) => {
      // console.log('publish')
    },
    join: (e) => {
      // console.log('join')
    }
  }

  const subscription = centrifuge.subscribe(channelToEnter || uuidv4(), callbacks)
  subscription.presence().then((e) => {
    // console.log('presence')
  })

  let ii = 0
  const startSendMessage = () => {
    if (ii > messagesToSend) {
      return
    }
    ii++
    const timetoken = new Date().getTime()
    const message = uuidv4()

    const data = {
      message,
      timetoken,
      publisher: profileId,
      action: 'message'
    }

    // console.log('publishing ', data)

    try {
      subscription.publish(data)
    } catch (e) {
      console.log('failed to publish')
    }

    setTimeout(() => {
      startSendMessage()
    }, timeBetweenMessages * 1000)
  }

  if (messagesToSend > 0) {
    startSendMessage()
  }

  setTimeout(() => {
    // console.log('disconnect')
    subscription.unsubscribe()
    subscription.removeAllListeners()
    centrifuge.disconnect()
    if (i === users) {
      console.log('complete')
      process.exit()
    }
  }, timeToStayConnected * 1000)

  setTimeout(() => {
    createTestConnection()
  }, timeBetweenConnects)

  // console.log('end')
}

createTestConnection()

