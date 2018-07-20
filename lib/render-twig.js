const axios = require('axios');

async function renderTwig(twigUrl, twigData = {}) {
  try {
    const html = await axios({
      method: 'post',
      url: twigUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      data: twigData,
    });
    return html.data;
  } catch (error) {
    console.error(error);
  }
}

module.exports = renderTwig;
