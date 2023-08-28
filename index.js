const https = require('https');

// Example dummy function hard coded to return the same weather
// In production, this could be your backend API or an external API
function get_current_weather(location, unit = 'celsius') {
  const weather_info = {
    location: location,
    temperature: '23',
    unit: unit,
    forecast: ['sunny', 'windy'],
  };
  return JSON.stringify(weather_info);
}

async function runConversation() {
  // Step 1: send the conversation and available functions to GPT
  const messages = [{ role: 'user', content: "weather in melbourne" }];
  const functions = [
    {
      name: 'get_current_weather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location'],
      },
    },
  ];

  const requestData = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: messages,
    functions: functions,
    function_call: 'auto', // auto is default, but we'll be explicit
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-xxxxxxxxx', // Replace with your OpenAI API key
    },
  };

  const response = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestData);
    req.end();
  });

  const responseMessage = response.choices[0].message;

  // Step 2: check if GPT wanted to call a function
  if (responseMessage.function_call) {
    // Step 3: call the function
    const availableFunctions = {
      get_current_weather: get_current_weather,
    };
    const functionName = responseMessage.function_call.name;
    const functionToCall = availableFunctions[functionName];
    const functionArgs = JSON.parse(responseMessage.function_call.arguments);
    const functionResponse = functionToCall(
      functionArgs.location,
      functionArgs.unit
    );

    // Step 4: send the info on the function call and function response to GPT
    messages.push(responseMessage); // extend conversation with assistant's reply
    messages.push({
      role: 'function',
      name: functionName,
      content: functionResponse,
    }); // extend conversation with function response
    
    const secondRequestData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });

    const secondResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(secondRequestData);
      req.end();
    });    
    return secondResponse;
  }
}

runConversation()
  .then((response) => {
    console.log(response.choices[0].message.content);
  })
  .catch((error) => {
    console.error(error);
  });
