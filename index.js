const core = require('@actions/core');
const github = require('@actions/github');

const getPullRequestNumber = () => {
  const fs = require('fs')
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
  return ev.number;
};

const getPullRequestChangedFiles = async (octokit) => {
  const nwo = process.env['GITHUB_REPOSITORY'] || '/';
  const [owner, repo] = nwo.split('/');
  const { data } = await octokit.pulls.listFiles({
    owner: owner,
    repo: repo,
    pull_number: getPullRequestNumber(),
  });

  let filesChanged = data.map((v) => v.filename);
  const fileTypesToExclude = JSON.parse(core.getInput('exclude-types'));
  const filePathsToExclude = JSON.parse(core.getInput('excludes'));

  if (fileTypesToExclude != null && fileTypesToExclude.length != 0) {
    fileTypesToExclude.forEach(type =>
      filesChanged = filesChanged.filter(file => !file.endsWith(type))
    );
  }

  if (filePathsToExclude != null && filePathsToExclude.length != 0) {
    filePathsToExclude.forEach(path =>
      filesChanged = filesChanged.filter(file => !file.startsWith(path))
    );
  }

  return filesChanged.filter(file => file.endsWith('.swift'))
};

const { exec }  = require('child_process');
async function runSwiftFormat (octokit) {
  const filesChanged = await getPullRequestChangedFiles(octokit);
  filesChanged.forEach(file =>  {
    exec(`swift-format lint ${file}`, (error) => {
      error.message
        .split('\n')
        .slice(1)
        .forEach(issue => {
          let splitIssue = issue.split(':')
          if (splitIssue.length != 6) return;
          core.setFailed(`::${splitIssue[3].trim()} file=${splitIssue[0].trim()},line=${splitIssue[1]},col=${splitIssue[2]}::${splitIssue[4].trim()}${splitIssue[5].trim()}`)
        })
    })
  })
}


function main() {
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const octokit = new github.GitHub(token);
  runSwiftFormat(octokit).then(() => {
    console.log('done');
  }).catch( error => {
    core.setError(error);
  })
}

main()