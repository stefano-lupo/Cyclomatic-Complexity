import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const availableWorkers = ['http://localhost:5001'];

const GITHUB_BASE_URL = "https://api.github.com";


//TODO: Make it able to handle multiple calculateComplexity requests at a time
const queuedRepos = new Map();

/**
 * POST /api/complexity
 * body: {repoUrl, repoName, repoOwner}
 * Calculates Cyclomatic Complexity of the specified repository
 */
export const calculateComplexity = async (req, res) => {
  let { repoUrl, repoName, repoOwner } = req.body;

  const repoHash = hash({repoName, repoOwner});

  // Get array of commits for this repo
  const { ok, status, response } = await makeRequest(`${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/commits`);


  // Grab the sha and commit message and toss everything else
  let commits = response.map(commit => {
    return {sha: commit.sha, message: commit.commit.message};
  });


  // Get commits in chronological order (and just first 2 for debugging)
  // commits = commits.reverse().slice(0,2);
  commits = commits.slice(0,2);


  // Get array of promises of files for all commits
  const work = commits.map(commit => {
    return getFilesFromCommit(repoOwner, repoName, commit);
  });

  // Wait for all to resolve
  await Promise.all(work);

  console.log(`Files for each commit found - Notifying workers`);

  repoUrl = repoUrl || `${GITHUB_BASE_URL}/${repoOwner}/${repoName}`;
  const body = {repoUrl, repoName, repoHash, repoOwner};

  const notifyWorkers = availableWorkers.map(worker => {
    return getWorkerToCloneRepo(worker, body);
  });

  Promise.all(notifyWorkers).then(results => {
    return res.send("done");
  }).catch(err => {
    console.error(`Error occured: ${err}`);
    return res.status(500).send(`Something bad happened`);
  });

  // Add it to our repos
  queuedRepos.set(repoHash, {commits, nextCommit: 0});
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
  // console.log(`${sha}: ${commit.commit.message}`);

  // // Get commit by its SHA
  // const endpoint = `${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/git/commits/${sha}`;
  // // console.log(endpoint);
  // const response2 = await makeRequest(endpoint, "get");
  //
  // // Extract tree SHA
  // const treeSha = response2.response.tree.sha;
  // // console.log(treeSha);

  // Get file tree for this commit by its SHA
  // Note recursive: pulls all of the files from subdirectories
  // This leaves directories in the tree (type="tree") so filter these
  const endpoint3 = `${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/git/trees/${sha}?recursive=1`;
  console.log(endpoint3);
  const resp = await makeRequest(endpoint3, "get");
  let { tree } = resp.response;

  // Filter out only the javascript files (they are all the library can compute CC on)
  commit.files =  tree.filter(entry => {
    return entry.type === "blob" && entry.path.split('.').pop() === 'js';
  });
  commit.nextFile = 0;
  console.log(`Set files for ${commit.message}`);

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



let work = true;
let newLine = false;

/**
 * POST /api/work
 * @param req
 * @param res
 */
export const requestWork = (req, res) => {

  if(!work){
    return res.send({finished: true});
  }

  // Not sure if this gives you second after or what
  const repoEntry = queuedRepos.entries().next().value;

  const [ hash, repo ] = repoEntry;
  let { commits, nextCommit } = repo;

  // Get the next commit
  const commit = commits[nextCommit];
  let { sha, nextFile } = commit;

  // Get the next file
  const { files } = commit;
  const file = files[nextFile].path;

  res.send({repoHash: hash, commitSha: sha, file});

  if(++nextFile === files.length) {
    commit.nextFile = 0;
    console.log(`Processed all files in commit ${nextCommit}`);
    nextCommit++;
    console.log(`Checking if there is a commit ${nextCommit}`);
    if(nextCommit === commits.length) {
      console.log(`Finished processing repo:`)
      work = false;
    } else {
      console.log(`Moving onto next commit ${nextCommit}`);
      repo.nextCommit ++;
      newLine = true;
    }
  } else {
    commit.nextFile ++;
    console.log(`Moving onto file ${commit.nextFile}`);
  }
};


/**
 * POST /api/cyclomatic
 * body: {repoName, repoOwner, sha, file, cyclomatic}
 * Saves the computed cyclomatic complexity of the file
 */
const stream = fs.createWriteStream("log.txt", {flags: 'a'});
export const saveCyclomaticResult = async (req, res) => {
  const { repoHash, commitSha, file, cyclomatic } = req.body;

  if(newLine) {
    // stream.write("\n");
    // stream.write(commitSha, "\n");

    console.log("\n");
    console.log(commitSha, "\n");
    newLine = false;
  }

  // console.log(`For Repo: ${commitSha}`);
  // console.log(`Cyclomatic of ${file}(${commitSha}): ${cyclomatic}`);
  // stream.write(`${file}: ${cyclomatic}`, '\n');
 console.log(`${file}: ${cyclomatic}`, '\n');
  res.send({message: "Good boy"});

};


/**
 * Makes a request to the given endpoint
 * @param endpoint url of endpoint
 * @param method get/post etc
 * @param body if using post
 */
async function makeRequest(endpoint, method, body) {
  const headers =  {'Content-Type': 'application/json', 'Authorization': process.env.GITHUB_KEY};
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

function hash(obj) {
  return JSON.stringify(obj);
}