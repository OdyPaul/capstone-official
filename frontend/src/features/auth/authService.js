import axios from 'axios'
import { API_URL } from '../../../config';



//Register user
const register = async(userData) =>{
    const response = await axios.post(`${API_URL}/api/web/users`, userData)

    if(response.data){
        console.log(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
    }
    return response.data
}

// Login user
const login = async (userData) => {
  const response = await axios.post(`${API_URL}/api/web/users/login`, userData);

  if (response.data) {
    const allowedRoles = ["admin", "staff", "developer"];

    if (allowedRoles.includes(response.data.role)) {
      localStorage.setItem("user", JSON.stringify(response.data)); // ✅ save here only
      return response.data;
    } else {
      throw new Error("Unauthorized role: only admin, staff, or developer can log in.");
    }
  }
  return null;
};



//Logout
const logout = () =>{
    localStorage.removeItem('user')
}

const authService = {
    register,
    logout,
    login
}

export default authService