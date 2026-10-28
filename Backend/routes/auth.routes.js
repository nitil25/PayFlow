import express from "express"
import { signIn, signOut, SignUp } from "../controllers/auth.controller.js"

const authRouter = express.Router()

authRouter.post("/sign-up",SignUp)
authRouter.post("/sign-in",signIn)
authRouter.get("/sign-out",signOut)

export default authRouter