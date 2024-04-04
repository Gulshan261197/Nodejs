import mongoose from "mongoose";
import { DB_Name } from "../constant.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DATABASE_URL}/${DB_Name}`)
        console.log(`\n MongoDB connected !! DB Host:
         ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Database connection erro", error)
        process.exit(1)

    }
}

export default connectDB