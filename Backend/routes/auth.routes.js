import express from "express"
import { getMe, signIn, signOut, SignUp } from "../controllers/auth.controller.js"
import isAuth from "../middlewares/isAuth.js"

const authRouter = express.Router()

authRouter.post("/sign-up",SignUp)
authRouter.post("/sign-in",signIn)
authRouter.get("/sign-out",signOut)
authRouter.get("/get-me",isAuth,getMe)

export default authRouter