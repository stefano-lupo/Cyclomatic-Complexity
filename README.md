# Distributed Cyclomatic Complexity Calculator
This repository contains code for the master server of a distributed cyclomatic complexity calculator. The code for the worker nodes is contained in the [Cyclomatic-Complexity-Worker](https://github.com/stefano-lupo/Cyclomatic-Complexity-Worker) repo.

Stick in live link


## Implementation
The master server contains a simple REST API built in Node.js + Express. Once given a Github repository, the master server communicates with the Github API in order to fetch all of the required information to build a `Repository` object. This looks something like the following:
1. Fetch all commits in the repo.
2. Fetch meta data for each file in each commit in parallel.
3. Build `Repository` object once all files meta-data has been fetched.

### The Repository Class
The Repository class contains all of the data structures and implementations required for processing a repository. The Repository class contains two key data structures:
1 `workQueue`
  - This is a queue of jobs for workers to do - there is a job for each file in each commit.
  - As workers request work, the server simply dequeues the next job and sends it to the worker.
  - Each job contains:
    - `repoHash` - unique identifier for the repository
    - `commitSha` - unique identifier for a commit in the repository
    - `file` - the path of the file relative to the commit's root
2 `commitsMap`
  - This is a Map from a `commitSha` -> `commit` object
    - Each `commit` object contains:
      - `numFilesCompleted` - number of files that have been processed (CC calculated) in this commit
      - `cc` - the average cyclomatic complexity of the files in this commit
      - `filesToCCMap` - a Map from a filePath -> cyclomatic complexity for that file
      
The other key component of the Repository class is the `saveResult(commitSha, filename, cc)` method. This is called when a worker posts back results of a computation to the server and it does the following:
  - Extracts the commit object from the `commitsMap` using the `repoHash` contained in the POST request from the worker.
  - Sets the cyclomatic complexity in the `filesToCC` map of that commit using the `filePath` contained in the POST request from the worker.
  - Checks to see if we now have all files for a given commit by comparing `numFilesCompleted` to the number of elements in the `filesToCCMap` and computes the average if so.
    - Checks to see if we have now computed averages of all commits in the repo by comparing the `numCommitsCompleted` instance variable with the number of elements in the `commitsMap` and returns `true` if so.
    - The server can then check this functions return value and once it's true, can send on the results to the client. 

### Getting Workers to Clone Entire Repositories
- Once the server is in a stable state for a given repository, it makes a POST request to all the worker nodes, informing them to clone the specified repository.
  - This is done asynchronously allowing the workers to begin the processing as soon as they are ready.
- This method results in extra temporary bloat on each of the worker nodes as they are cloning an entire repository even though they may only need certain files of certain commits.
- However this seemed favourable in comparison to the workers having to make seperate HTTP requests to the Github API for every file that they need to process.
- Thus the workers need only make one *external* network request for every repo they must process.
- The pros / cons of this choice would depend largely on the size of the repository and the number of worker nodes. 
  - As I did not have access to a huge number of worker nodes, each worker node would end up doing a lot of the processing of a given repo and thus is likely to require a signifcant proportion of the files contained in the repository.
   - However if I was using a larger number of nodes, it would possibly be better to only fetch the files a worker would need on the fly as they would each be processing a smaller number of files.
- Once the worker has successfully cloned the repository, it can begin requesting work from the master.



## Results
Repo used: [mljs/feedforward-neural-networks](https://github.com/mljs/feedforward-neural-networks)

- 1 Worker (1 Desktop): 21.684s
- 2 Workers (2 Desktop): 12.293s
- 3 Workers (3 Desktop): 9.6s
- 4 Workers (4 Desktop): 8.955s
- 5 Workers (4 Desktop + Laptop): 7.736s
- 6 Workers (4 Desktop + 2 Laptop): 7.527s
- 7 Workers (4 Desktop + 3 Laptop): 6.918s
- 8 Workers (4 Desktop + 4 Laptop): 7.219s | 6.947s | 7.069s

- 9 Workers (4 Desktop + 4 Laptop + EC2): 6.552s
- 10 Workers (4 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.217s

- 11 Workers (5 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.41s || 6.912s
- 12 Workers (6 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.35s
- 13 Workers (7 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.82s
- 14 Workers (8 Desktop + 4 Laptop + 2 EC2 (Same machine)): 6.723s

Best Id guess: 
- 4 Desktop + 2 Laptop + 2 Ec2: 5.893s || 5.926
- 4 Desktop + 2 Laptop + 1 Ec2: 6.188s || 6.095s || 6.434s

Weird, T2 Micro gives 1 vCPU with 1 vCore

