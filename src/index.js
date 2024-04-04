import dotenv from "dotenv"
import connectDB from "./db/database.js"

dotenv.config({
    path: './env'
})

connectDB()