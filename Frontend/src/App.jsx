import React from 'react'
import Signup from './Pages/SignUp'
import { Routes, Route, RouterProvider} from "react-router-dom"
import {useSelector} from "react-redux"

export const ServerUrl = import.meta.env.VITE_SERVER_URL

const App = () => {
  const {userData} = useSelector((state) => state.user)
  return (
    <Routes>
      <Route path="/signup" element={<Signup />} />
    </Routes>
  )
}

export default App