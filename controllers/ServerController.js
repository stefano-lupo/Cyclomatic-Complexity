import fetch from 'node-fetch';
import dotenv from 'dotenv';
import moment from 'moment';
dotenv.config();


import Repository from '../Repository';
import { allWorkers } from '../config';

const GITHUB_BASE_URL = "https://api.github.com";
const NUM_NODES = parseInt(process.env.NUM_WORKERS);

const N_COMMITS_TO_PROCESS = 100;
const repos = new Map();

export const availableWorkers = NUM_NODES === -1 ? allWorkers : allWorkers.slice(0, NUM_NODES);

console.log(`Running with ${availableWorkers.length} nodes`);
availableWorkers.forEach(worker => {
  fetch(`${worker.ip}/ping`, {method: "get"})
    .then(response => {
      console.log(`Worker ${worker.ip}: ${response.ok ? "online" : "offline"}`);
      worker.online =  response.ok;
    })
    .catch(err => {
      worker.online = false;
      console.log(`Worker ${worker.ip}: offline`);
    });
});


/**
 * POST /api/complexity
 * body: {repoUrl, repoName, repoOwner}
 * Calculates Cyclomatic Complexity of the specified repository
 */
export const calculateComplexity = async (req, res) => {

  // Extract out repo data
  let { repoName, repoOwner } = req.body;
  const repoHash = hash({repoName, repoOwner});

  // Get array of commits for this repo
  const { ok, status, response, headers } = await makeRequest(`${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/commits`);

  let commits = [];

  let { next } = parseLinkHeader(headers.link[0]);

  // Grab the sha, commit message and date and toss everything else and add it to commits array
  commits = commits.concat(response);

  // TODO: Write this code properly and preferably asynchronously get commits so workers can start
  while(next) {
    // Get array of commits for this repo
    const { ok, status, response, headers } = await makeRequest(next, "get");

    next = parseLinkHeader(headers.link[0]).next;

    // Grab the sha and commit message and toss everything else and add it to commits array
    commits = commits.concat(response);
  }

  commits = commits.map(commit => {
    return {sha: commit.sha, message: commit.commit.message, date: commit.commit.author.date};
  });


  // Limit to N commits
  commits = N_COMMITS_TO_PROCESS > 0 ? commits.slice(0,N_COMMITS_TO_PROCESS) : commits;


  // Get array of promises of files for all commits
  const work = commits.map(commit => {
    return getFilesFromCommit(repoOwner, repoName, commit);
  });


  // Wait for all to resolve
  await Promise.all(work);


  // Create the repository and save in hash map for later, note starting time
  const repo = new Repository(commits, repoName, repoOwner);
  const startTime = moment();
  repos.set(repo.hash, {repo, res, startTime});

  // Notify all workers of this repository and get them to clone it
  console.log(`Files for each commit found - Notifying workers`);
  const repoUrl = `${GITHUB_BASE_URL}/${repoOwner}/${repoName}`;
  const body = {repoUrl, repoName, repoHash, repoOwner};
  availableWorkers.map(worker => {
    return getWorkerToCloneRepo(worker, body);
  });

};

/**
 * Gets the list of files contained in a given repository and commit
 * @param repoOwner owner of the repository
 * @param repoName name of the repository
 * @param commit sha of the commit
 */
const getFilesFromCommit = async (repoOwner, repoName, commit) => {

  // Extract commit sha
  const { sha } = commit;


  // Get file tree for this commit by its SHA
  // Note recursive: pulls all of the files from subdirectories
  // This leaves directories in the tree (type="tree") so filter these
  const endpoint = `${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/git/trees/${sha}?recursive=1`;
  const resp = await makeRequest(endpoint, "get");
  let { tree } = resp.response;

  if(!tree) {
    console.error(resp.message);
  }

  // Filter out only the javascript files (they are all the library can compute CC on)
  commit.files =  tree.filter(entry => {
    return entry.type === "blob" && entry.path.split('.').pop() === 'js';
  });
};


/**
 * Makes a request to worker node to inform them to clone a new repository
 * @param worker ip of worker node
 * @param body {repoName, repoOwner, repoUrl}
 */
const getWorkerToCloneRepo = (worker, body) => {
  return fetch(`${worker.ip}/job`, {
    method: "post",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  }).then(response => {
    worker.online = true;
    return response.json()
  }).catch(err => {
    console.error(`Error occured: ${err}`);
    worker.online = false;
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
    // TODO: Get it from next repo or something
    return res.send({finished: true, repoHash: repo.hash});
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
  const { repo, startTime } = repoEntry;
  const client = repoEntry.res;

  if(repo.saveResult(commitSha, file, cyclomatic)) {
    const finishTime = moment();
    const elapsedTime = finishTime.diff(startTime) / 1000;
    console.log(`ElapsedTime Time: ${elapsedTime * 1000}ms = ${elapsedTime}s`);
    const onlineWorkers = availableWorkers.filter(worker => worker.online);
    client.render('pages/results', {results: repo.getResults(), elapsedTime, availableWorkers: onlineWorkers});
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


/**
 * TODO: Make a better hash function or use Github API's Repo ID
 */
function hash(obj) {
  return JSON.stringify(obj);
}


/**
 * Extracts the pagination links from headers of Github API response
 * @param header
 * @returns {{}}
 */
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