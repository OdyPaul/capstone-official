import axios from 'axios'
import { API_URL } from '../../../config';



// Get all users
const getUsers = async (token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  }
  const response = await axios.get(`${API_URL}/api/web/users`, config)
  return response.data
}

export default { getUsers }
