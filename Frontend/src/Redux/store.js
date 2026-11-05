import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./UserSlice"
import companySlice from "./CompanySlice"

export const store = configureStore({
    reducer:{
        user:userSlice,
        company:companySlice
    }
})