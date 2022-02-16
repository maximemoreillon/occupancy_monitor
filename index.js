const express = require('express')
const http = require('http')
const dotenv = require("dotenv")
const { Server } = require("socket.io")
const axios = require('axios')
const FormData = require('form-data')

dotenv.config()

const {
  APP_PORT: app_port = 80,
  PERSON_COUNTER_URL: person_counter_url,
  PREDICTION_FREQUENCY: frequency = 0.5,
} = process.env

const socketio_options = {
  cors: { origin: '*' }
}


const rooms = [
  {
    name: 'Kitchen',
    camera_frame_url: 'http://192.168.1.223/frame',
    occupants: 0,
  },
  {
    name: 'Living',
    camera_frame_url: 'http://192.168.1.116/frame',
    occupants: 0,
  },
  {
    name: 'Bedroom',
    camera_frame_url: 'http://192.168.1.180/frame',
    occupants: 0,
  },
]

const app = express()
const server = http.createServer(app)
const io = new Server(server, socketio_options);


const get_frame = (url) => {
  const options = {
    url,
    method: 'GET',
    responseType: 'arraybuffer', // This is important
  }

  // Returns a promise
  return axios(options)
}

const get_prediction = (frame_data) => {

  const form = new FormData()
  form.append('image', frame_data, { filename : 'image.jpg' })
  const options = { headers: form.getHeaders() }
  return axios.post(person_counter_url, form, options)
}



const predict_all_rooms = () => {
  rooms.forEach( async (room) => {
    try {
      const {data: frame_data} = await get_frame(room.camera_frame_url)
      const {data: prediction} = await get_prediction(frame_data)
      room.occupants = prediction.prediction
      io.emit('occupancy',rooms)
      console.log(room)
    } catch (e) {
      //console.log(`Failed ${room.name}`);
      console.log(e)
    }

  })

}

setInterval(predict_all_rooms, 1000/frequency)


io.on('connection', () => {
  console.log('[WS] client connected')
})


server.listen(app_port, () => {
  console.log(`[HTTP] server listening on port ${app_port}`)
})
