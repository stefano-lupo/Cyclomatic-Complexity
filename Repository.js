import Queue from 'queue-fifo';

export default class Repository {
  constructor(commits, repoName, repoOwner) {

    //TODO: Better hash function or GITHUB repo ID as no sha for repos :(
    this.hash = JSON.stringify({repoName, repoOwner});

    this.numCommitsCompleted = 0;

    // Create queue for giving out jobs for this repo
    this.workQueue = new Queue();

    // Create Map(commitSha -> {numFilesCompleted, cc, filesToCCMap})
    this.commitsMap = new Map();

    // Build that Map
    commits.forEach(commit => {
      // Create Map(filename -> CC)
      const filesToCCMap = new Map();
      const numFilesCompleted = 0;

      // Build map and queue
      commit.files.forEach(file => {
        filesToCCMap.set(file.path, 0);
        this.workQueue.enqueue({repoHash: this.hash, commitSha: commit.sha, file: file.path});
      });
      this.commitsMap.set(commit.sha, {numFilesCompleted, filesToCCMap, cc: 0})
    });

  }

  saveResult(commitSha, filename, cc) {
    const commit = this.commitsMap.get(commitSha);
    commit.filesToCCMap.set(filename, cc);

    // If we have processed all files in this commit
    if(++commit.numFilesCompleted === commit.filesToCCMap.size) {

      // Compute Average across this commit
      let average = 0;
      commit.filesToCCMap.forEach(cc => {
        console.log(`CC: ${cc}`);

        // Library im using sometimes fails to parse some files, workers return -1 in that case
        if(cc !== -1) {
          average += cc;
        }
      });

      commit.cc = average;
      console.log(`Average CC of commit ${this.numCommitsCompleted} was ${average}`);

      // If finished processing all commits
      if(++this.numCommitsCompleted === this.commitsMap.size) {
        console.log(`Repository completed`);
        // Return array of averages across the commits
        return this.commitsMap.map(commit => {
          return commit.cc;
        })
      }
    }
  }

  getJob() {
    // console.log(`Getting Job: queue size = ${this.workQueue.size()}`);
    if(this.workQueue.size() > 0) {
      const workItem = this.workQueue.dequeue();

      // TODO: Put these dequeud work items somewhere they can be recovered if node dies

      return workItem;
    } else {
      console.log(`No more work items in repo`);
    }
  }

}