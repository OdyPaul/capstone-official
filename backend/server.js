const express = require('express')
const port = process.env.PORT || 5000
const{errorHandler} = require('./middleware/errorMiddleware')
const connectDB = require('./config/db')
const dotenv = require('dotenv').config()
const colors = require('colors')


connectDB()

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: false}))



app.use('/api/users', require('./routes/userRoutes'))

app.use(errorHandler)


app.listen(port, () => console.log(`server started on ${port}`))