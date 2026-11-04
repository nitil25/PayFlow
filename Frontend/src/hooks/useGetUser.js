import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { setUserData } from "../Redux/UserSlice"
import API from "../services/api"

const useGetUser = () => {
    const dispatch = useDispatch()
    useEffect(()=>{
        const fetchUser = async() => {
            try {
                const response = await API.get(`/auth/get-me`,{withCredentials:true})
                dispatch(setUserData(response.data.user))
            } catch (error) {
                console.log(`useGetUser error : ${error.message}`)
            }
        }
        fetchUser()
    },[dispatch])
}

export default useGetUser