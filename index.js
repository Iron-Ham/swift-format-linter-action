const core = require('@actions/core');
const github = require('@actions/github');

const getPullRequestNumber = async (octokit, owner, repo, commit_sha) => {
  return (await octokit.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha,
  })).data[0].number
};

const getPullRequestChangedFiles = async (octokit) => {
  const nwo = process.env['GITHUB_REPOSITORY'] || '/';
  const commit_sha = process.env['GITHUB_SHA'] || '';
  const [owner, repo] = nwo.split('/');
  const { data } = await octokit.pulls.listFiles({
    owner: owner,
    repo: repo,
    pull_number: await getPullRequestNumber(octokit, owner, repo, commit_sha),
  });

  let filesChanged = data.map((v) => v.filename);
  const fileTypeJsonString = core.getInput('exclude-types');
  const pathJsonString = core.getInput('excludes');

  const fileTypesToExclude = fileTypeJsonString || fileTypeJsonString.trim() == '' ? null : JSON.parse(core.getInput('exclude-types'));
  const filePathsToExclude = pathJsonString || pathJsonString.trim() == '' ? null : JSON.parse(core.getInput('excludes'));

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

const { exec } = require('child_process');
async function runSwiftFormat(octokit) {
  const filesChanged = await getPullRequestChangedFiles(octokit);
  return filesChanged.map(file => {
    return new Promise((resolve, reject) => {
      exec(`swift-format lint ${file}`, (error) => {
        if (error) {
          error.message
            .split('\n')
            .slice(1)
            .forEach(issue => {
              let splitIssue = issue.split(':')
              if (splitIssue.length != 6) return;
              console.log(`::${splitIssue[3].trim()} file=${splitIssue[0].trim()},line=${splitIssue[1]},col=${splitIssue[2]}::${splitIssue[4].trim()}${splitIssue[5].trim()}`)
            })
          reject()
        } else {
          resolve()
        }
      })
    })
  })
}


async function main() {
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const octokit = new github.GitHub(token);
  Promise.all(await runSwiftFormat(octokit)).then(() => {
    console.log('done');
  }).catch(() => {
    core.setFailed('swift-format failed check');
  })
}

main()