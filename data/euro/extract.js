const fs = require('fs');

// Read the example.json file
const data = JSON.parse(fs.readFileSync('source.json', 'utf8'));

// Extract EuroJackpot results
const euroJackpotResults = data.items
  .filter(item => item.gameType === 'EuroJackpot')
  .map(item => ({
    drawSystemId: item.drawSystemId,
    drawDate: item.drawDate,
    resultsJson: item.results[0].resultsJson
  }));

// Write to euro.json
fs.writeFileSync('db-euro.json', JSON.stringify(euroJackpotResults, null, 2));

console.log('EuroJackpot results extracted and saved to euro.json');