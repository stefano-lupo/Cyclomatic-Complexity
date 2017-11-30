import fetch from 'node-fetch';

const getStuff = () => {
  return makeRequest("https://jsonplaceholder.typicode.com/posts", "get");
};

async function run() {

  getStuff().then(response => {
    console.log(response);
  });

  const work = [1, 2, 3, 4].map(() => {
    getStuff();
  });

  console.log(work);

  Promise.all(work).then(results => {
    console.log(results[0]);
    console.log(results.length);

  })

}

run();












async function makeRequest(endpoint, method, body) {
  const headers =  {'Content-Type': 'application/json', 'Authorization': "token a5091fb1b1d7a1cd26495e0d6a8a49f1f41ddb93"};
  let response;
  if(body) {
    response = await fetch(endpoint, {method, body: JSON.stringify(body), headers});
  } else {
    response = await fetch(endpoint, {method, headers})
  }

  const { ok, status } = response;

  const contentType = response.headers.get("content-type");
  if(contentType && contentType.indexOf("application/json") !== -1) {
    response = response.json();
  }

  return {ok, status, response}

}