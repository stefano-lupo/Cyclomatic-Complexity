import fetch from 'node-fetch';
import dotenv from 'dotenv';


import Repository from '../Repository';

dotenv.config();

const availableWorkers = ['http://localhost:5001'];
// const availableWorkers = ['http://192.168.1.17:5001'];
// const availableWorkers = ['http://192.168.1.17:5001', 'http://localhost:5001'];

const GITHUB_BASE_URL = "https://api.github.com";



const repos = new Map();

/**
 * POST /api/complexity
 * body: {repoUrl, repoName, repoOwner}
 * Calculates Cyclomatic Complexity of the specified repository
 */
export const calculateComplexity = async (req, res) => {
  let { repoUrl, repoName, repoOwner } = req.body;

  const repoHash = hash({repoName, repoOwner});

  // Get array of commits for this repo
  const { ok, status, response, headers } = await makeRequest(`${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/commits`);

  let commits = [];

  let { next } = parseLinkHeader(headers.link[0]);

  // Grab the sha, commit message and date and toss everything else and add it to commits array
  commits = commits.concat(response);

  console.log(`Total of ${commits.length} commits`);

  while(next) {
    console.log(`Next: ${next}`);
    // Get array of commits for this repo
    const { ok, status, response, headers } = await makeRequest(next, "get");

    next = parseLinkHeader(headers.link[0]).next;

    // Grab the sha and commit message and toss everything else and add it to commits array
    commits = commits.concat(response);

    console.log(`Appended commits: length = ${commits.length} `);
  }

  commits = commits.map(commit => {
    return {sha: commit.sha, message: commit.commit.message, date: commit.commit.author.date};
  });

  console.log(`Total of ${commits.length} commits`);

  // commits = commits.slice(0,5);

  console.log(`Processing: ${commits.length} commits`);


  // Get array of promises of files for all commits
  const work = commits.map(commit => {
    return getFilesFromCommit(repoOwner, repoName, commit);
  });

  // Wait for all to resolve
  await Promise.all(work);


  const repo = new Repository(commits, repoName, repoOwner);
  repos.set(repo.hash, {repo, res});

  console.log(`Files for each commit found - Notifying workers`);

  repoUrl = repoUrl || `${GITHUB_BASE_URL}/${repoOwner}/${repoName}`;
  const body = {repoUrl, repoName, repoHash, repoOwner};

  const notifyWorkers = availableWorkers.map(worker => {
    return getWorkerToCloneRepo(worker, body);
  });

  Promise.all(notifyWorkers).then(results => {
    // return res.send("done");
  }).catch(err => {
    console.error(`Error occured: ${err}`);
    return res.status(500).send(`Something bad happened`);
  });


};

/**
 * Gets the list of files contained in a given repository and commit
 * @param repoOwner owner of the repository
 * @param repoName name of the repository
 * @param commit sha of the commit
 */
const getFilesFromCommit = async (repoOwner, repoName, commit) => {

  console.log(`Getting files for ${commit.message}`);

  // Extract commit sha
  const { sha } = commit;


  // Get file tree for this commit by its SHA
  // Note recursive: pulls all of the files from subdirectories
  // This leaves directories in the tree (type="tree") so filter these
  const endpoint = `${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/git/trees/${sha}?recursive=1`;
  const resp = await makeRequest(endpoint, "get");
  let { tree } = resp.response;

  // Filter out only the javascript files (they are all the library can compute CC on)
  commit.files =  tree.filter(entry => {
    return entry.type === "blob" && entry.path.split('.').pop() === 'js';
  });
  // commit.nextFile = 0;
};


/**
 * Makes a request to worker node to inform them to clone a new repository
 * @param worker ip of worker node
 * @param body {repoName, repoOwner, repoUrl}
 */
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


/**
 * POST /api/work
 * @param req
 * @param res
 */
export const requestWork = (req, res) => {
  const { repo } = repos.values().next().value;
  const workJob = repo.getJob();
  if(!workJob) {
    // Get it from next repo or something
    return res.send({finished: true});
  }

  res.send(workJob);
};


/**
 * POST /api/cyclomatic
 * body: {repoName, repoOwner, sha, file, cyclomatic}
 * Saves the computed cyclomatic complexity of the file
 */
export const saveCyclomaticResult = async (req, res) => {
  const { repoHash, commitSha, file, cyclomatic } = req.body;

  const repoEntry = repos.get(repoHash);
  const repo = repoEntry.repo;
  const client = repoEntry.res;



  if(repo.saveResult(commitSha, file, cyclomatic)) {
    client.render('pages/results', {results: repo.getResults()});
  }

  res.send({message: "Good boy"});

};


/**
 * Makes a request to the given endpoint
 * @param endpoint url of endpoint
 * @param method get/post etc
 * @param body if using post
 */
async function makeRequest(endpoint, method, body) {
  let headers =  {'Content-Type': 'application/json', 'Authorization': process.env.GITHUB_KEY};
  let response;
  if(body) {
    response = await fetch(endpoint, {method, body: JSON.stringify(body), headers});
  } else {
    response = await fetch(endpoint, {method, headers})
  }

  const { ok, status } = response;
  headers = response.headers._headers;
  const contentType = response.headers.get("content-type");
  if(contentType && contentType.indexOf("application/json") !== -1) {
    response = await response.json();
  }

  return {ok, status, headers, response}
}

function hash(obj) {
  return JSON.stringify(obj);
}

function parseLinkHeader(header) {
  if (header.length === 0) {
    throw new Error("input must not be of zero length");
  }

  // Split parts by comma
  const parts = header.split(',');
  let links = {};
  // Parse each part into a named link
  for(let i=0; i<parts.length; i++) {
    let section = parts[i].split(';');
    if (section.length !== 2) {
      throw new Error("section could not be split on ';'");
    }
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const name = section[1].replace(/rel="(.*)"/, '$1').trim();
    links[name] = url;
  }
  return links;
}