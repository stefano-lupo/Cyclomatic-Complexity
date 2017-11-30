import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const availableWorkers = ['http://localhost:5001'];

const GITHUB_BASE_URL = "https://api.github.com";

// https://api.github.com/repos/stefano-lupo/DFS-File-System/git/trees/5f4b511df2949f58cbeda7687650b1c444db98b3


//TODO: Make it able to handle mutliple caculateComplexity requests at a time

/**
 * POST /api/complexity
 * body: {repoUrl, repoName, repoOwner}
 */
export const calculateComplexity = async (req, res) => {
  let { repoUrl, repoName, repoOwner } = req.body;

  // Get array of commits for this repo
  const { ok, status, response } = await makeRequest(`${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/commits`);

  // Grab the sha and commit message and toss everything else
  let commits = response.map(commit => {
    return {sha: commit.sha, message: commit.commit.message};
  });


  // Get commits in chronological order (and just first 2 for debugging)
  commits = commits.reverse().slice(0,2);


  // Get array of promises of files for all commits
  const work = commits.map(commit => {
    return getFilesFromCommit(repoOwner, repoName, commit);
  });

  // Wait for all to resolve
  await Promise.all(work);

  console.log(commits);
  res.send(commits);
  return;

  repoUrl = repoUrl || `${GITHUB_BASE_URL}/${repoOwner}/${repoName}`;
  const body = {repoUrl, repoName, repoOwner};

  const notifyWorkers = availableWorkers.map(worker => {
    return getWorkerToCloneRepo(worker, body);
  });

  Promise.all(notifyWorkers).then(results => {
    console.log(results);
    return res.send("done");
  }).catch(err => {
    console.error(`Error occured: ${err}`);
    return res.status(500).send(`Something bad happened`);
  })

};


const getFilesFromCommit = async (repoOwner, repoName, commit) => {

  console.log(`Getting files for ${commit.message}`);

  // Extract commit sha
  const { sha } = commit;
  // console.log(`${sha}: ${commit.commit.message}`);

  // Get commit by its SHA
  const endpoint = `${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/git/commits/${sha}`;
  // console.log(endpoint);
  const response2 = await makeRequest(endpoint, "get");

  // Extract tree SHA
  const treeSha = response2.response.tree.sha;
  // console.log(treeSha);

  // Get file tree for this commit by its SHA
  // Note recursive: pulls all of the files from subdirectories
  // This leaves directories in the tree (type="tree") so filter these
  const endpoint3 = `${GITHUB_BASE_URL}/repos/${repoOwner}/${repoName}/git/trees/${sha}?recursive=1`;
  // console.log(endpoint3);
  const resp = await makeRequest(endpoint3, "get");
  let { tree } = resp.response;
  commit.files =  tree.filter(entry => entry.type === "blob");
  console.log(`Set files for ${commit.message}`);

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



export const getWork = (req, res) => {
  const commitSha = "0fdb905b3517c3516418a5ac2ec8da370ce6c753"; // latest commit of node-todo scotch-io
  const file = "server.js";
  res.send({commitSha, file});
};



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