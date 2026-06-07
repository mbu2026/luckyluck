const fs = require('fs');

// Read the example.json file
const data = JSON.parse(fs.readFileSync('source.json', 'utf8'));

// Extract Lotto game results
const lottoResults = data.items
  .filter(item => item.gameType === 'Lotto')
  .map(item => {
    const lottoResult = item.results.find(result => result.gameType === 'Lotto');
    return {
      drawSystemId: lottoResult.drawSystemId,
      drawDate: lottoResult.drawDate,
      resultsJson: lottoResult.resultsJson
    };
  });

// Write to db.json file
fs.writeFileSync('db.json', JSON.stringify(lottoResults, null, 2));

console.log('Lotto results extracted and saved to db.json');