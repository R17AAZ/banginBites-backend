import axios from 'axios';

async function testApi() {
  try {
    const listRes = await axios.get('http://localhost:5000/api/v1/dishes');
    const dishes = listRes.data.data;
    console.log('Total dishes from API:', dishes.length);
    
    if (dishes.length > 0) {
      const id = dishes[0].id;
      console.log('Fetching single dish ID:', id);
      const singleRes = await axios.get(`http://localhost:5000/api/v1/dishes/${id}`);
      console.log('Single Dish Response:', JSON.stringify(singleRes.data, null, 2));
    }
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

testApi();
