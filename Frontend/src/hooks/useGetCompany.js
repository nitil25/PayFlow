import { useEffect } from "react"
import { useDispatch } from "react-redux"
import API from "../services/api"
import { setCompanyData } from "../Redux/CompanySlice"

const useGetCompany = () => {
    const dispatch = useDispatch()
    useEffect(()=>{
        const fetchCompany = async() => {
            try {
                const response = await API.get(`/company/me`)
                dispatch(setCompanyData(response.data.company))
            } catch (error) {
                console.log(`UseGetCompamy error : ${error.message}`)
            }
        }
        fetchCompany()
    },[dispatch])
}

export default useGetCompany