// Function to extract Lotto data from API response
function extractLottoData(apiResponse) {
    // Filter for Lotto game type and extract required fields
    const lottoData = apiResponse
        .filter(item => item.gameType === 'Lotto')
        .map(item => ({
            drawSystemId: item.drawSystemId,
            drawDate: item.drawDate,
            resultsJson: item.resultsJson
        }));
    
    return lottoData;
}

// Example usage (this would be run on the actual API response):
// const lottoData = extractLottoData(apiResponse);
// const jsonData = JSON.stringify(lottoData, null, 2);
// Save to file (in a real environment, this would use the appropriate file system API)
// console.log(jsonData); // Would output the JSON content to be saved as lotto.json