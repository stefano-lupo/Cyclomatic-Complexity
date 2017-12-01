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

    console.log(`Updated cyclomatic complexity for commit ${this.numCommitsCompleted} - ${filename} to ${cc}`)

    // If we have processed all files in this commit

    console.log(`Num Files completed in commit: ${commit.numFilesCompleted}`);
    console.log(`ftccmap.size = ${commit.filesToCCMap.size}`);

    if(++commit.numFilesCompleted === commit.filesToCCMap.size) {

      console.log(`Commit ${commit.numFilesCompleted -1} finished`);


      // Compute Average across this commit
      let average = 0;
      commit.filesToCCMap.forEach(cc => {
        average += cc;
      });

      commit.cc = average;

      console.log(`Average CC of commit ${commit.numFilesCompleted -1} was ${average}`);

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
    console.log(`Getting Job: queue size = ${this.workQueue.size()}`);
    if(this.workQueue.size() > 0) {
      const workItem = this.workQueue.dequeue();

      // TODO: Put these dequeud work items somewhere they can be recovered if node dies

      return workItem;
    } else {
      console.log(`No more work items in repo `);
    }
  }

  get repoHash() {
    return this.hash;
  }
}