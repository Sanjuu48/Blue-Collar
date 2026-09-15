import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './Routes/aiRoutes.js'
import userRouter from './Routes/userRoutes.js'
import connectCloudinary from "./Configs/cloudinary.js"

const app = express()

await connectCloudinary()

app.use(cors())

app.use(express.json())

app.use(clerkMiddleware())

app.get('/', (req, res) => {
    res.send('Server is Live!')
})

app.use('/api/ai', requireAuth(), aiRouter)
app.use('api/user', requireAuth(), userRouter)

const PORT = process.env.PORT || 4848

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`)
})
