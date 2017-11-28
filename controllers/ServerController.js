import fetch from 'node-fetch';

let availableWorkers = ['http://localhost:5001'];

const GITHUB_BASE_URL = "https://github.com";

export const calculateComplexity = async (req, res) => {
  let { repoUrl, repoName, repoOwner } = req.body;

  repoUrl = repoUrl || `${GITHUB_BASE_URL}/${repoOwner}/${repoName}`;
  const body = {repoUrl, repoName, repoOwner};

  const promises = availableWorkers.map(worker => {
    return getWorkerToCloneRepo(worker, body);
  });

  Promise.all(promises).then(results => {
    console.log(results);
    return res.send("done");
  }).catch(err => {
    console.error(`Error occured: ${err}`);
    return res.status(500).send(`Something bad happened`);
  })


};


const getWorkerToCloneRepo = (worker, body) => {
  return fetch(`${worker}/job`, {
    method: "post",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  }).then(response => {
    return response.json()
  }).catch(err => {
    console.error(`Error occured: ${err}`);
    return Promise.reject(err);
  });
};

async function makeRequest(endpoint, method, body) {
  const headers =  {'Content-Type': 'application/json'};
  let response;
  if(body) {
    response = await fetch(endpoint, {method, body: JSON.stringify(body), headers});
  } else {
    response = await fetch(endpoint, {method, headers})
  }

  const { ok, status } = response;

  const contentType = response.headers.get("content-type");
  if(contentType && contentType.indexOf("application/json") !== -1) {
    response = await response.json();
  }

  return {ok, status, response}

}