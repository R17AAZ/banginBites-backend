import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';
let token = '';

async function login() {
  const res = await axios.post(`${API_URL}/auth/login`, {
    email: 'buyer@example.com', // Replace with a valid buyer email
    password: 'password123'
  });
  token = res.data.data.accessToken;
}

async function testToggle() {
  await login();
  const dishId = '6237b5e2-1283-45b9-a86c-39d0739bbd84'; // Use a valid dish ID
  const res = await axios.patch(`${API_URL}/favorites/toggle/${dishId}`, {}, {
    headers: { Authorization: token }
  });
  console.log('Toggle response:', res.data);
}

testToggle().catch(console.error);
