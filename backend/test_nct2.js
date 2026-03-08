const axios = require('axios');
axios.get('https://graph.nhaccuatui.com/v1/commons/song?key=bA2k7X9d9sEw')
  .then(res => console.log(JSON.stringify(res.data, null, 2)))
  .catch(err => console.log(err));
