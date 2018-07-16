const axios = require('axios');

async function renderTwig(twigUrl, twigData = {}) {
  const html = await axios({
    method: 'post',
    url: twigUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    data: twigData,
  });

  return html.data;
}

module.exports = renderTwig;
