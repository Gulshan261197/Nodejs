import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";

const router = Router()

router.post("/register", registerUser)



export default router